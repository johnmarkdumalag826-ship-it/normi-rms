const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

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
