import { api } from './client';
import { SystemNotification } from '../types';

export const listNotifications = (): Promise<SystemNotification[]> => api.get('/notifications');
export const markAllNotificationsRead = (): Promise<void> => api.patch('/notifications/read-all');
