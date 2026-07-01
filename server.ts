import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// API endpoint for AI assistant chat
app.post("/api/assistant", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Tham số messages không hợp lệ." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình trong hệ thống. Quý thầy cô vui lòng thêm key trong bảng điều khiển Secrets."
      });
    }

    // Format chat messages for @google/genai SDK
    // The chats.create takes a model and config, and sendMessage sends a message.
    // For single turn or keeping history, we can initialize a chat.
    // Let's create a chat session with history
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      // Note: we can pass previous history to chats.create, but format it appropriately
      // Let's map history from the client to the format required: { role: 'user' | 'model', parts: [{ text: '...' }] }
      history: messages.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
    });

    const lastMessage = messages[messages.length - 1];
    const response = await chat.sendMessage({
      message: lastMessage.content
    });

    return res.json({
      role: "assistant",
      content: response.text || "Xin lỗi, tôi chưa hiểu ý của bạn. Hãy nói lại rõ hơn nhé!"
    });

  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    return res.status(500).json({
      error: "Đã xảy ra lỗi khi kết nối với Trợ lý AI: " + (error.message || "Lỗi không xác định.")
    });
  }
});

// API endpoint to auto-generate descriptions for leaders/teachers based on name and title using Gemini AI
app.post("/api/generate-leader-descriptions", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
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

// API endpoint for forgot password
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email không được để trống." });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || "465";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if SMTP is configured
    if (!smtpUser || !smtpPass || !smtpHost) {
      console.log("SMTP not configured. Responding with mock/fallback mode.");
      return res.json({
        success: true,
        smtpConfigured: false,
        message: "SMTP chưa được cấu hình. Đang chạy ở chế độ mô phỏng / dự phòng.",
        credentials: { username, password }
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
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>Thông tin tài khoản hiện tại:</strong></p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
              <li style="margin-bottom: 5px;">Tên đăng nhập: <strong style="color: #0f172a;">${username}</strong></li>
              <li>Mật khẩu: <strong style="color: #0f172a;">${password}</strong></li>
            </ul>
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
