const githubOwner = "truongthlevantampongdrang-lab";
const githubRepo = "truongthlevantampongdrang";
const githubBranch = "main";
const githubContentPath = "public/site-content.json";
const githubTokenKey = "lvt_github_token";

type SiteContent = Record<string, unknown>;

const getPublicContentUrl = () => {
  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
  return `${baseUrl}site-content.json?v=${Date.now()}`;
};

const isJsonResponse = (response: Response) => {
  return (response.headers.get("content-type") || "").includes("application/json");
};

const parseGitHubContent = (content = "") => {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const encodeGitHubContent = (content: string) => {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const getGitHubPublishToken = () => localStorage.getItem(githubTokenKey) || "";

export const setGitHubPublishToken = (token: string) => {
  const trimmedToken = token.trim();
  if (trimmedToken) {
    localStorage.setItem(githubTokenKey, trimmedToken);
  } else {
    localStorage.removeItem(githubTokenKey);
  }
};

export const loadSiteContent = async (): Promise<SiteContent> => {
  try {
    const response = await fetch("/api/site-content", { cache: "no-store" });
    if (response.ok && isJsonResponse(response)) {
      return await response.json();
    }
  } catch (error) {
    console.warn("API site content load skipped:", error);
  }

  try {
    const response = await fetch(getPublicContentUrl(), { cache: "no-store" });
    if (response.ok && isJsonResponse(response)) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Public site content load skipped:", error);
  }

  return {};
};

const patchServerContent = async (patch: SiteContent) => {
  try {
    const response = await fetch("/api/site-content", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    return response.ok && isJsonResponse(response);
  } catch (error) {
    console.warn("API site content sync skipped:", error);
    return false;
  }
};

const publishContentToGitHub = async (patch: SiteContent) => {
  const token = getGitHubPublishToken();
  if (!token) {
    return false;
  }

  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${githubContentPath}?ref=${githubBranch}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let sha = "";
  let currentContent: SiteContent = {};

  const currentResponse = await fetch(url, { headers });
  if (currentResponse.ok) {
    const currentFile = await currentResponse.json();
    sha = currentFile.sha || "";
    currentContent = JSON.parse(parseGitHubContent(currentFile.content || "{}"));
  } else if (currentResponse.status !== 404) {
    const errorText = await currentResponse.text();
    throw new Error(`GitHub khong doc duoc file noi dung: ${errorText}`);
  }

  const currentComparable = { ...currentContent };
  delete currentComparable.updatedAt;
  const nextComparable = {
    ...currentContent,
    ...patch,
  };
  delete nextComparable.updatedAt;

  if (JSON.stringify(currentComparable) === JSON.stringify(nextComparable)) {
    return true;
  }

  const nextContent = {
    ...nextComparable,
    updatedAt: new Date().toISOString(),
  };

  const body: Record<string, unknown> = {
    message: "Update website content from admin",
    content: encodeGitHubContent(JSON.stringify(nextContent, null, 2)),
    branch: githubBranch,
  };

  if (sha) {
    body.sha = sha;
  }

  const updateResponse = await fetch(url.replace(`?ref=${githubBranch}`, ""), {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`GitHub khong luu duoc noi dung: ${errorText}`);
  }

  return true;
};

export const patchSiteContent = async (patch: SiteContent) => {
  await patchServerContent(patch);

  try {
    await publishContentToGitHub(patch);
  } catch (error) {
    console.warn("GitHub site content publish failed:", error);
  }
};
