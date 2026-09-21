import { api, setToken, clearToken, getToken } from './client';
import { User } from '../types';

export interface AuthResponse {
  user: User;
  token: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post('/auth/login', { email, password });
  setToken(res.token);
  return res;
}

export async function fetchCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    const res = await api.get('/auth/me');
    return res.user;
  } catch {
    clearToken();
    return null;
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Best-effort audit log write — the client-side session ends regardless.
  } finally {
    clearToken();
  }
}

export interface SignUpDetails {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'adviser' | 'panelist' | 'coordinator';
}

// Asks for a new account. It stays "pending" until an Admin approves it, so no sign-in happens here.
export async function signUp(details: SignUpDetails): Promise<{ message: string }> {
  return api.post('/auth/register', details);
}
