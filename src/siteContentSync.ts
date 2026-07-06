const adminCsrfKey = "lvt_admin_csrf_token";

type SiteContent = Record<string, unknown>;

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

export const patchSiteContent = async (patch: SiteContent) => {
  const response = await fetch("/api/site-content", {
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
