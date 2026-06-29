export interface AppUser {
  id: string;
  email: string;
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export async function api<T = void>(path: string, options: ApiOptions = {}): Promise<T> {
  const body = options.body && typeof options.body === "object" &&
    !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)
    ? JSON.stringify(options.body)
    : options.body;
  const response = await fetch(path, {
    ...options,
    body: body as BodyInit | null | undefined,
    credentials: "same-origin",
    headers: {
      ...(body && typeof body === "string" ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  session: () => api<{ user: AppUser }>("/api/auth/session"),
  login: (email: string, password: string) =>
    api<{ user: AppUser }>("/api/auth/login", { method: "POST", body: { email, password } }),
  signup: (email: string, password: string) =>
    api<{ user: AppUser }>("/api/auth/signup", { method: "POST", body: { email, password } }),
  logout: () => api("/api/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api("/api/auth/password", { method: "PUT", body: { currentPassword, newPassword } }),
};
