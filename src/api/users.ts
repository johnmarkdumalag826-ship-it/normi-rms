import { api } from './client';
import { User, UserRole } from '../types';

// Full roster with all fields — admin only.
export const listUsers = (): Promise<User[]> => api.get('/users');

// Minimal-field roster any authenticated role can read (adviser/panelist pickers, etc.)
export const listDirectory = (role?: UserRole): Promise<User[]> =>
  api.get(role ? `/users/directory?role=${role}` : '/users/directory');

export const createUser = (input: {
  email: string; password: string; name: string; role: UserRole;
  departmentId?: string; courseId?: string; phone?: string;
}): Promise<User> => api.post('/users', input);

export const updateUser = (id: string, patch: Partial<{
  status: User['status']; role: UserRole; name: string; avatar: string;
  departmentId: string; courseId: string; phone: string; email: string;
}>): Promise<User> => api.patch(`/users/${id}`, patch);

export const deleteUser = (id: string): Promise<void> => api.del(`/users/${id}`);
