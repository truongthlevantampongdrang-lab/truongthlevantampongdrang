import express from "express";
import path from "path";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "8mb" }));

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

type AdminSession = { csrfToken: string; expiresAt: number };
type PublishSyncResult = {
  enabled: boolean;
  repository?: string;
  branch?: string;
  error?: string;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const MAX_PATCH_KEYS = 30;
const publicContentFilePath = path.join(process.cwd(), "public", "site-content.json");
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const assistantAttempts = new Map<string, { count: number; resetAt: number }>();
const adminSessions = new Map<string, AdminSession>();
const allowedSiteContentKeys = new Set([
  "schoolInfo",
  "footerInfo",
  "news",
  "clubs",
  "students",
  "schedules",
  "teachers",
  "admissionRegistrations",
  "admissionInstructions",
  "realtimeQaMessages",
  "addedLookupClasses",
  "aboutMilestones",
  "aboutLeaders",
  "homeHighlightContent",
  "updatedAt",
]);

let adminUsername = process.env.ADMIN_USERNAME || "";
let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";

const envFilePath = path.join(process.cwd(), ".env");

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const hashPasswordSha256 = (password: string) =>
  crypto.createHash("sha256").update(password).digest("hex");

const createPasswordHash = (password: string) => {
  const iterations = 210000;
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2$${iterations}$${salt}$${derived}`;
};

const verifyPassword = (password: string, storedHash: string) => {
  if (storedHash.startsWith("pbkdf2$")) {
    const [, iterationsRaw, salt, expected] = storedHash.split("$");
    const iterations = Number(iterationsRaw);
    if (!iterations || !salt || !expected) {
      return false;
    }

    const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
    return safeEqual(derived, expected);
  }

  // Backward compatibility for existing ADMIN_PASSWORD_HASH=sha256(password).
  return safeEqual(hashPasswordSha256(password), storedHash);
};

const applyAdminCredentials = (env: Record<string, string | undefined>) => {
  adminUsername = env.ADMIN_USERNAME || "";
  adminPasswordHash = env.ADMIN_PASSWORD_HASH || "";

  if (!adminPasswordHash && env.ADMIN_PASSWORD) {
    adminPasswordHash = createPasswordHash(env.ADMIN_PASSWORD);
  }
};

const refreshAdminCredentialsFromEnv = async () => {
  try {
    const raw = await readFile(envFilePath, "utf8");
    const parsed = dotenv.parse(raw);
    applyAdminCredentials({ ...process.env, ...parsed });
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn("Cannot refresh admin credentials from .env:", error);
    }
  }
};

const quoteEnvValue = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const upsertEnvValue = (raw: string, key: string, value: string) => {
  const line = `${key}=${quoteEnvValue(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(raw)) {
    return raw.replace(pattern, line);
  }

  return `${raw.replace(/\s*$/, "")}\n${line}\n`;
};

const persistAdminCredentialsToEnv = async (username: string, password: string, passwordHash: string) => {
  let raw = "";
  try {
    raw = await readFile(envFilePath, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  let nextRaw = upsertEnvValue(raw, "ADMIN_USERNAME", username);
  nextRaw = upsertEnvValue(nextRaw, "ADMIN_PASSWORD", password);
  nextRaw = upsertEnvValue(nextRaw, "ADMIN_PASSWORD_HASH", passwordHash);

  await writeFile(envFilePath, nextRaw, "utf8");
};

applyAdminCredentials(process.env);

const isAdminConfigured = () => Boolean(adminUsername && adminPasswordHash);

const checkLoginRateLimit = (key: string) => {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 1000 * 60 * 15 });
    return true;
  }
  current.count += 1;
  return current.count <= 8;
};

const checkWindowRateLimit = (
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
  windowMs: number
) => {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  current.count += 1;
  return current.count <= limit;
};

const getBearerToken = (authorization = "") => {
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
};

const parseCookies = (cookieHeader = "") => {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const index = pair.indexOf("=");
    if (index === -1) {
      return;
    }

    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
};

const getAdminSessionToken = (req: express.Request) => {
  const bearerToken = getBearerToken(req.headers.authorization);
  if (bearerToken) {
    return { token: bearerToken, source: "bearer" as const };
  }

  const cookies = parseCookies(req.headers.cookie);
  return { token: cookies.lvt_admin_session || "", source: "cookie" as const };
};

const setAdminSessionCookie = (res: express.Response, token: string) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `lvt_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`
  );
};

const clearAdminSessionCookie = (res: express.Response) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `lvt_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const isAllowedOrigin = (req: express.Request) => {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  const host = req.headers.host;
  const allowedOrigins = new Set([
    host ? `http://${host}` : "",
    host ? `https://${host}` : "",
    process.env.APP_URL || "",
  ].filter(Boolean));

  return allowedOrigins.has(origin);
};

const requireSameOrigin: express.RequestHandler = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: "Nguon yeu cau khong hop le." });
  }

  next();
};

const requireAdmin: express.RequestHandler = (req, res, next) => {
  const { token, source } = getAdminSessionToken(req);
  const session = token ? adminSessions.get(token) : null;

  if (!session || session.expiresAt <= Date.now()) {
    if (token) {
      adminSessions.delete(token);
    }
    return res.status(401).json({ error: "Phien quan tri khong hop le hoac da het han." });
  }

  if (source === "cookie" && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const csrfToken = String(req.headers["x-csrf-token"] || "");
    if (!csrfToken || !safeEqual(csrfToken, session.csrfToken)) {
      return res.status(403).json({ error: "Ma xac thuc CSRF khong hop le." });
    }
  }

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  next();
};

const validateSiteContentPatch: express.RequestHandler = (req, res, next) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: "Noi dung cap nhat khong hop le." });
  }

  const keys = Object.keys(req.body);
  if (keys.length === 0 || keys.length > MAX_PATCH_KEYS) {
    return res.status(400).json({ error: "So luong truong cap nhat khong hop le." });
  }

  const invalidKey = keys.find((key) => !allowedSiteContentKeys.has(key));
  if (invalidKey) {
    return res.status(400).json({ error: `Truong cap nhat khong duoc phep: ${invalidKey}` });
  }

  next();
};

const isTextMessage = (value: unknown): value is { role?: string; content: string } => {
  return isPlainObject(value) && typeof value.content === "string";
};

const validateAssistantMessages = (messages: unknown) => {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return false;
  }

  return messages.every((message) => {
    return isTextMessage(message) && message.content.length > 0 && message.content.length <= 4000;
  });
};

const validateLeaderItems = (items: unknown) => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return false;
  }

  return items.every((item) => {
    return (
      isPlainObject(item) &&
      typeof item.name === "string" &&
      typeof item.title === "string" &&
      item.name.trim().length > 0 &&
      item.name.length <= 120 &&
      item.title.trim().length > 0 &&
      item.title.length <= 160
    );
  });
};

app.use(requireSameOrigin);

const contentFilePath = path.join(process.cwd(), "data", "site-content.json");

const getPublicSiteContent = (content: Record<string, unknown>) => {
  const publicContent = { ...content };
  delete publicContent.admissionRegistrations;
  return publicContent;
};

async function readSiteContent() {
  try {
    const raw = await readFile(contentFilePath, "utf8");
    return JSON.parse(raw);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeSiteContent(content: Record<string, unknown>) {
  await mkdir(path.dirname(contentFilePath), { recursive: true });
  await writeFile(contentFilePath, JSON.stringify(content, null, 2), "utf8");

  const publicContent = getPublicSiteContent(content);
  await mkdir(path.dirname(publicContentFilePath), { recursive: true });
  await writeFile(publicContentFilePath, JSON.stringify(publicContent, null, 2), "utf8");
}

const getGitHubSyncConfig = () => {
  const token = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN || "";
  const repository = process.env.GITHUB_SYNC_REPOSITORY || process.env.GITHUB_REPOSITORY || "";
  const branch = process.env.GITHUB_SYNC_BRANCH || "main";
  const contentPath = process.env.GITHUB_SYNC_CONTENT_PATH || "public/site-content.json";
  const enabled = process.env.GITHUB_SYNC_ENABLED === "true";

  if (!enabled || !token || !repository) {
    return null;
  }

  return { token, repository, branch, contentPath };
};

const syncPublicContentToGitHub = async (content: Record<string, unknown>): Promise<PublishSyncResult> => {
  const config = getGitHubSyncConfig();
  if (!config) {
    return { enabled: false };
  }

  const apiUrl = `https://api.github.com/repos/${config.repository}/contents/${encodeURIComponent(config.contentPath).replace(/%2F/g, "/")}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
    "User-Agent": "lvt-school-admin-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const currentResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(config.branch)}`, { headers });
  const currentData = currentResponse.ok ? await currentResponse.json() : {};

  if (!currentResponse.ok && currentResponse.status !== 404) {
    throw new Error(`GitHub read failed: ${currentResponse.status}`);
  }

  const body = {
    message: "Update public site content from admin panel",
    branch: config.branch,
    content: Buffer.from(JSON.stringify(getPublicSiteContent(content), null, 2), "utf8").toString("base64"),
    ...(currentData.sha ? { sha: currentData.sha } : {}),
  };

  const updateResponse = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text().catch(() => "");
    throw new Error(`GitHub update failed: ${updateResponse.status} ${errorText.slice(0, 200)}`);
  }

  return { enabled: true, repository: config.repository, branch: config.branch };
};

const getReadableSiteContent = async (req: express.Request) => {
  const content = await readSiteContent();
  const { token } = getAdminSessionToken(req);
  const session = token ? adminSessions.get(token) : null;

  if (session && session.expiresAt > Date.now()) {
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return content;
  }

  return getPublicSiteContent(content);
};

app.get("/api/site-content", async (req, res) => {
  try {
    return res.json(await getReadableSiteContent(req));
  } catch (error: any) {
    console.error("Read Site Content Error:", error);
    return res.status(500).json({ error: "Khong the doc noi dung website." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    await refreshAdminCredentialsFromEnv();

    if (!isAdminConfigured()) {
      return res.status(503).json({
        error: "Chua cau hinh ADMIN_USERNAME va ADMIN_PASSWORD tren may chu.",
      });
    }

    const remoteKey = req.ip || "unknown";
    if (!checkLoginRateLimit(remoteKey)) {
      return res.status(429).json({ error: "Dang nhap sai qua nhieu lan. Vui long thu lai sau." });
    }

    const { username, password } = req.body || {};
    const isValid =
      safeEqual(String(username || ""), adminUsername) &&
      verifyPassword(String(password || ""), adminPasswordHash);

    if (!isValid) {
      return res.status(401).json({ error: "Ten dang nhap hoac mat khau quan tri khong chinh xac." });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(32).toString("base64url");
    adminSessions.set(token, { csrfToken, expiresAt: Date.now() + SESSION_TTL_MS });
    setAdminSessionCookie(res, token);
    return res.json({ success: true, csrfToken, expiresInSeconds: SESSION_TTL_MS / 1000 });
  } catch (error: any) {
    console.error("Admin Login Error:", error);
    return res.status(500).json({ error: "Khong the dang nhap quan tri." });
  }
});

app.post("/api/admin/change-credentials", requireAdmin, async (req, res) => {
  try {
    await refreshAdminCredentialsFromEnv();

    const { currentUsername, currentPassword, newUsername, newPassword } = req.body || {};
    const nextUsername = String(newUsername || "").trim();
    const nextPassword = String(newPassword || "");
    const submittedCurrentUsername = String(currentUsername || "").trim();
    const isCurrentValid =
      safeEqual(submittedCurrentUsername, adminUsername) &&
      verifyPassword(String(currentPassword || ""), adminPasswordHash);
    const isSessionVerifiedForCurrentUser =
      submittedCurrentUsername.length > 0 && safeEqual(submittedCurrentUsername, adminUsername);

    if (!isCurrentValid && !isSessionVerifiedForCurrentUser) {
      return res.status(401).json({ error: "Thong tin quan tri hien tai khong chinh xac." });
    }

    if (!nextUsername || nextPassword.length < 10) {
      return res.status(400).json({ error: "Ten dang nhap moi khong duoc trong va mat khau can it nhat 10 ky tu." });
    }

    const nextPasswordHash = createPasswordHash(nextPassword);
    await persistAdminCredentialsToEnv(nextUsername, nextPassword, nextPasswordHash);

    adminUsername = nextUsername;
    adminPasswordHash = nextPasswordHash;
    adminSessions.clear();

    return res.json({
      success: true,
      message: "Da doi va luu thong tin quan tri vao cau hinh may chu.",
    });
  } catch (error: any) {
    console.error("Change Credentials Error:", error);
    return res.status(500).json({ error: "Khong the doi thong tin quan tri." });
  }
});

app.post("/api/admin/logout", requireAdmin, async (req, res) => {
  const { token } = getAdminSessionToken(req);
  if (token) {
    adminSessions.delete(token);
  }
  clearAdminSessionCookie(res);
  return res.json({ success: true });
});

app.patch("/api/site-content", requireAdmin, validateSiteContentPatch, async (req, res) => {
  try {
    const current = await readSiteContent();
    const next = { ...current, ...req.body };
    await writeSiteContent(next);

    let publishSync: PublishSyncResult = { enabled: false };
    try {
      publishSync = await syncPublicContentToGitHub(next);
    } catch (syncError: any) {
      console.error("GitHub Site Content Sync Error:", syncError);
      publishSync = { enabled: true, error: "Khong the day noi dung len GitHub Pages." };
    }

    return res.json({ success: true, content: next, publishSync });
  } catch (error: any) {
    console.error("Write Site Content Error:", error);
    return res.status(500).json({ error: "Khong the luu noi dung website." });
  }
});

// Initialize Gemini client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Prompt System Instructions to make the AI friendly, educational, and specific to Le Van Tam Primary School
const systemInstruction = `
Bạn là "Trợ lý Học tập Trường Tiểu học Lê Văn Tám" - một AI thân thiện, am hiểu và nhiệt huyết, hỗ trợ học sinh, phụ huynh và giáo viên của Trường Tiểu học Lê Văn Tám, xã Pơng Drang, tỉnh Đắk Lắk.
Hãy xưng hô thân thiện, ấm áp và gần gũi (Ví dụ: xưng "Cô", "Thầy" hoặc "Trợ lý Lê Văn Tám" và gọi người trò chuyện là "Em", "Con" với học sinh, hoặc "Anh/Chị", "Quý phụ huynh" với phụ huynh, hoặc "Đồng nghiệp", "Thầy/Cô" với giáo viên).

Nhiệm vụ của bạn:
1. Hỗ trợ học sinh (Học cấp 1 từ lớp 1 đến lớp 5): Giải thích bài tập Toán, Tiếng Việt, Khoa học, Lịch sử, Tiếng Anh một cách cực kỳ dễ hiểu, ngắn gọn, có ví dụ sinh động, khuyến khích các con tự học, không giải hộ ngay lập tức mà hướng dẫn từng bước. khen ngợi khi học sinh làm đúng.
2. Hỗ trợ phụ huynh: Giải đáp thắc mắc về tuyển sinh tiểu học, lịch học tập, phương pháp đồng hành cùng con học bài ở nhà, dạy con đọc viết, ứng xử tâm lý trẻ em tiểu học.
3. Hỗ trợ giáo viên: Gợi ý ý tưởng bài giảng sáng tạo, soạn câu hỏi trắc nghiệm vui nhộn, viết kịch bản hoạt động ngoại khóa, các trò chơi lớp học thú vị.

Lưu ý: Luôn trả lời bằng tiếng Việt lịch sự, truyền cảm hứng học tập và tràn đầy năng lượng tích cực của mái trường tiểu học. Giữ câu trả lời súc tích, dễ đọc bằng cách xuống dòng và dùng định dạng markdown đơn giản.
`;

const GEMINI_TEXT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
];

// API endpoint for AI assistant chat
app.post("/api/assistant", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!checkWindowRateLimit(assistantAttempts, req.ip || "unknown", 60, 1000 * 60 * 15)) {
      return res.status(429).json({ error: "Ban dang gui qua nhieu yeu cau AI. Vui long thu lai sau." });
    }

    if (!validateAssistantMessages(messages)) {
      return res.status(400).json({ error: "Tham số messages không hợp lệ." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình trong hệ thống. Quý thầy cô vui lòng thêm key trong bảng điều khiển Secrets."
      });
    }

    const lastMessage = messages[messages.length - 1];
    const errors: string[] = [];

    for (const model of GEMINI_TEXT_MODELS) {
      try {
        const chat = ai.chats.create({
          model,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
          history: messages.slice(0, -1).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }))
        });

        const response = await chat.sendMessage({
          message: lastMessage.content
        });

        if (response.text) {
          return res.json({
            role: "assistant",
            content: response.text
          });
        }

        errors.push(`${model}: Khong nhan duoc cau tra loi tu Gemini.`);
      } catch (modelError: any) {
        errors.push(`${model}: ${modelError.message || "Loi khong xac dinh."}`);
      }
    }

    throw new Error(errors.join(" | "));

  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    return res.status(500).json({
      error: "Đã xảy ra lỗi khi kết nối với Trợ lý AI: " + (error.message || "Lỗi không xác định.")
    });
  }
});

// API endpoint to auto-generate descriptions for leaders/teachers based on name and title using Gemini AI
app.post("/api/generate-leader-descriptions", requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;

    if (!validateLeaderItems(items)) {
      return res.status(400).json({ error: "Danh sách giáo viên không hợp lệ." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Cấu hình thiếu: GEMINI_API_KEY chưa được khai báo trong bảng điều khiển Secrets. Hãy thêm key để kích hoạt tính năng tự động soạn thảo mô tả bằng AI."
      });
    }

    // Call Gemini to generate description for each item
    const prompt = `Bạn là Trợ lý AI của Trường Tiểu học Lê Văn Tám (xã Pơng Drang, huyện Krông Búk, tỉnh Đắk Lắk).
Hãy viết một câu mô tả ngắn gọn bằng tiếng Việt (khoảng 15-25 từ) giới thiệu về nhiệm vụ, trọng trách hoặc vai trò giáo dục phù hợp của từng thầy cô giáo/nhân sự dưới đây dựa trên tên và chức vụ của họ.
Phong cách mô tả: Truyền cảm hứng, ấm áp, lịch sự, tôn vinh và trang trọng, phù hợp để đăng trên website giới thiệu chính thức của nhà trường.

Danh sách giáo viên/nhân sự cần viết mô tả:
${JSON.stringify(items)}

Hãy điền thêm trường "desc" vào từng đối tượng và trả về danh sách đầy đủ. Cấu trúc JSON trả về phải là một mảng gồm các đối tượng có thuộc tính chính xác: name, title, desc.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              title: { type: Type.STRING },
              desc: { type: Type.STRING }
            },
            required: ["name", "title", "desc"]
          }
        },
        temperature: 0.7,
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Không nhận được phản hồi từ mô hình AI.");
    }

    const parsedResult = JSON.parse(resultText);
    return res.json({ success: true, leaders: parsedResult });

  } catch (error: any) {
    console.error("Generate Leader Descriptions Error:", error);
    return res.status(500).json({
      error: "Đã xảy ra lỗi khi tạo mô tả bằng AI: " + (error.message || "Lỗi không xác định.")
    });
  }
});

// API endpoint for password recovery guidance. It never returns or sends raw passwords.
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email không được để trống." });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || "465";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if SMTP is configured
    if (!smtpUser || !smtpPass || !smtpHost) {
      return res.status(503).json({
        error: "SMTP chua duoc cau hinh. Vui long lien he nguoi quan tri may chu de dat lai mat khau.",
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === "465", // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"Trường TH Lê Văn Tám" <${smtpUser}>`,
      to: email,
      subject: "🔒 Khôi phục mật khẩu tài khoản Quản trị viên - TH Lê Văn Tám",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #059669; margin-bottom: 5px;">TRƯỜNG TIỂU HỌC LÊ VĂN TÁM</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 0;">Đắk Lắk, Việt Nam</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
          <p style="font-size: 16px; color: #1e293b;">Xin chào <strong>Quản trị viên</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Hệ thống nhận được yêu cầu khôi phục thông tin tài khoản đăng nhập quản trị viên của bạn tại trang thông tin Trường Tiểu học Lê Văn Tám.
          </p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
              Vì lý do bảo mật, website không gửi mật khẩu hiện tại qua email. Vui lòng cập nhật lại biến môi trường <strong>ADMIN_PASSWORD</strong> hoặc <strong>ADMIN_PASSWORD_HASH</strong> trên máy chủ/deployment, sau đó khởi động lại ứng dụng.
            </p>
          </div>
          <p style="font-size: 13px; color: #ef4444; font-style: italic; line-height: 1.5; margin-top: 20px;">
            * Lưu ý bảo mật: Vui lòng không chia sẻ email này cho bất kỳ ai. Bạn có thể đổi mật khẩu bất kỳ lúc nào tại Bảng điều khiển Quản trị viên.
          </p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 25px 0 15px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Email này được gửi tự động bởi hệ thống website trường học.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email recovery sent successfully to ${email}`);

    return res.json({
      success: true,
      smtpConfigured: true,
      message: "Email khôi phục đã được gửi thành công!"
    });

  } catch (error: any) {
    console.error("Forgot password SMTP Error:", error);
    return res.status(500).json({
      error: "Đã xảy ra lỗi khi gửi Email: " + (error.message || "Lỗi không xác định.")
    });
  }
});

// Serve Vite dev server or production static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const basePath = "/truongthlevantampongdrang";

    app.use(express.static(distPath));
    app.use(basePath, express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
