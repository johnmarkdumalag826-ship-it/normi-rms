// Where the server is. If VITE_API_URL is not set, use the same address the page was opened from
// (so a phone that opens http://192.168.1.20:3001 talks to http://192.168.1.20:<port>/api, not to
// its own "localhost"). VITE_API_PORT changes the port; it defaults to the backend's 5000.
const viteEnv = (import.meta as any).env ?? {};
const API_URL: string = viteEnv.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:${viteEnv.VITE_API_PORT || 5000}/api`;

// Uploaded files are served statically from the server root (see server.js:
// app.use('/uploads', express.static('uploads'))), not under /api — so a
// relative path like 'uploads/169...pdf' returned by uploadFile() needs the
// /api suffix stripped, not appended, to become a fetchable URL.
export const resolveFileUrl = (relativeUrl: string): string =>
  `${API_URL.replace(/\/api\/?$/, '')}/${relativeUrl.replace(/^\/+/, '')}`;

export const TOKEN_KEY = 'normi_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch((): null => null) : null;

  if (!res.ok) {
    throw new ApiError(body?.message || `Request failed with status ${res.status}`, res.status);
  }
  return body;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),
};

// File uploads use multipart/form-data, so they skip the JSON Content-Type header above.
export async function uploadFile(file: File): Promise<{ fileName: string; url: string; size: number }> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const body = await res.json().catch((): null => null);
  if (!res.ok) throw new ApiError(body?.message || 'Upload failed', res.status);
  return body;
}
