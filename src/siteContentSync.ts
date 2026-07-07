const adminCsrfKey = "lvt_admin_csrf_token";

type SiteContent = Record<string, unknown>;

const SITE_CONTENT_REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SITE_CONTENT_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const waitForBrowserIdle = () =>
  new Promise<void>((resolve) => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(resolve, { timeout: 2000 });
    } else {
      window.setTimeout(resolve, 0);
    }
  });

const getPublicContentUrl = () => {
  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
  return `${baseUrl}site-content.json?v=${Date.now()}`;
};

const isJsonResponse = (response: Response) => {
  return (response.headers.get("content-type") || "").includes("application/json");
};

export const getAdminSessionToken = () => sessionStorage.getItem(adminCsrfKey) || "";

export const setAdminSessionToken = (csrfToken: string) => {
  if (csrfToken) {
    sessionStorage.setItem(adminCsrfKey, csrfToken);
  } else {
    sessionStorage.removeItem(adminCsrfKey);
  }
};

export const clearAdminSession = () => setAdminSessionToken("");

export const getAuthorizedHeaders = () => {
  const csrfToken = getAdminSessionToken();
  return {
    "Content-Type": "application/json",
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
  };
};

export const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Local content cache skipped for ${key}:`, error);
    return false;
  }
};

const localStorageWriteTimers = new Map<string, number>();

export const scheduleLocalStorageWrite = (key: string, value: unknown, delayMs = 700) => {
  const existingTimer = localStorageWriteTimers.get(key);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  const timerId = window.setTimeout(() => {
    localStorageWriteTimers.delete(key);

    const write = () => {
      const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
      safeSetLocalStorage(key, serializedValue);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleWindow.requestIdleCallback(write, { timeout: 1500 });
    } else {
      window.setTimeout(write, 0);
    }
  }, delayMs);

  localStorageWriteTimers.set(key, timerId);
};

export const loginAdmin = async (username: string, password: string) => {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.csrfToken) {
    throw new Error(data.error || "Khong the dang nhap quan tri.");
  }

  setAdminSessionToken(data.csrfToken);
  return data;
};

export const logoutAdmin = async () => {
  const csrfToken = getAdminSessionToken();
  clearAdminSession();

  if (!csrfToken) {
    return;
  }

  await fetch("/api/admin/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  }).catch(() => {});
};

export const changeAdminCredentials = async (payload: {
  currentUsername: string;
  currentPassword: string;
  newUsername: string;
  newPassword: string;
}) => {
  const response = await fetch("/api/admin/change-credentials", {
    method: "POST",
    headers: getAuthorizedHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Khong the doi thong tin quan tri.");
  }

  clearAdminSession();
  return data;
};

export const requestPasswordReset = async (email: string) => {
  const response = await fetch("/api/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Khong the gui yeu cau dat lai mat khau.");
  }

  return data;
};

export const loadSiteContent = async (): Promise<SiteContent> => {
  try {
    const response = await fetchWithTimeout("/api/site-content", { cache: "no-store" });
    if (response.ok && isJsonResponse(response)) {
      return await response.json();
    }
  } catch (error) {
    console.warn("API site content load skipped:", error);
  }

  try {
    const response = await fetchWithTimeout(getPublicContentUrl(), { cache: "no-store" });
    if (response.ok && isJsonResponse(response)) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Public site content load skipped:", error);
  }

  return {};
};

export const patchSiteContent = async (patch: SiteContent) => {
  if (!getAdminSessionToken()) {
    return { success: false, skipped: true };
  }

  await waitForBrowserIdle();

  const response = await fetchWithTimeout("/api/site-content", {
    method: "PATCH",
    headers: getAuthorizedHeaders(),
    body: JSON.stringify(patch),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Khong the luu noi dung website.");
  }

  return data;
};
