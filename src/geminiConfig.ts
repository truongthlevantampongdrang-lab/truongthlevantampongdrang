type RuntimeConfig = {
  geminiApiKey?: string;
  VITE_GEMINI_API_KEY?: string;
};

let runtimeGeminiKeyPromise: Promise<string> | null = null;

const getRuntimeConfigUrl = () => {
  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
  return `${baseUrl}runtime-config.json?v=${Date.now()}`;
};

const loadRuntimeGeminiKey = async () => {
  try {
    const response = await fetch(getRuntimeConfigUrl(), { cache: "no-store" });
    if (!response.ok) {
      return "";
    }

    const config = (await response.json()) as RuntimeConfig;
    return (config.geminiApiKey || config.VITE_GEMINI_API_KEY || "").trim();
  } catch (error) {
    console.warn("Runtime Gemini config load skipped:", error);
    return "";
  }
};

export const getSharedGeminiApiKey = async () => {
  const envKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY || "").trim();
  if (envKey) {
    return envKey;
  }

  runtimeGeminiKeyPromise ||= loadRuntimeGeminiKey();
  const runtimeKey = await runtimeGeminiKeyPromise;
  if (runtimeKey) {
    return runtimeKey;
  }

  return (localStorage.getItem("lvt_gemini_api_key") || "").trim();
};
