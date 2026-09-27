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
  /** Required when role is 'student'. */
  departmentId?: string;
  courseId?: string;
}

// Asks for a new account. It stays "pending" until an Admin approves it, so no sign-in happens here.
export async function signUp(details: SignUpDetails): Promise<{ message: string }> {
  return api.post('/auth/register', details);
}

// Only the signed-in person can change their own password — nobody else, not even an Admin.
export async function changePassword(currentPassword: string, newPassword: string): Promise<User> {
  const res = await api.patch('/auth/change-password', { currentPassword, newPassword });
  return res.user;
}

// Anyone signed in can edit their own name and phone number. Email, role, department, course
// and account status are not changeable here — an Admin handles those from Manage Accounts.
export async function updateMyProfile(patch: { name?: string; phone?: string }): Promise<User> {
  const res = await api.patch('/auth/me', patch);
  return res.user;
}

// "Forgot password": emails a 6-digit code to the address, if it belongs to an account.
// The response is the same either way, so it cannot be used to check who has an account.
export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post('/auth/forgot-password', { email });
}

// Uses the emailed code to set a new password, without needing the old one.
export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  return api.post('/auth/reset-password', { email, code, newPassword });
}
