import { api } from './client';
import { Announcement } from '../types';

export const listAnnouncements = (): Promise<Announcement[]> => api.get('/announcements');
export const createAnnouncement = (input: {
  title: string; content: string; isPinned?: boolean; category: Announcement['category'];
}): Promise<Announcement> => api.post('/announcements', input);
export const deleteAnnouncement = (id: string): Promise<void> => api.del(`/announcements/${id}`);
