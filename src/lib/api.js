export const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getToken() {
  return localStorage.getItem("sipnow_admin_token");
}

async function request(path, options = {}) {
  const { skipAuth, ...rest } = options;
  const headers = {
    ...rest.headers,
  };
  if (!skipAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}/api/v1${path}`, { ...rest, headers });
  if (res.status === 204) return undefined;
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message ?? `Request failed (${res.status})`);
  return data;
}

async function requestBlob(path) {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/v1${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }
  return res.blob();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  upload: (path, form) => request(path, { method: "POST", body: form }),
  getBlob: (path) => requestBlob(path),
};

export function saveToken(token) {
  localStorage.setItem("sipnow_admin_token", token);
}
export function clearToken() {
  localStorage.removeItem("sipnow_admin_token");
}
export { getToken };
