import { api } from './client';
import { Schedule } from '../types';

export const listSchedules = (researchId?: string): Promise<Schedule[]> =>
  api.get(researchId ? `/schedules?researchId=${researchId}` : '/schedules');

export const createSchedule = (input: {
  researchId?: string; studentId?: string; date: string; startTime: string; endTime: string;
  roomId: string; panelistIds: string[]; type: Schedule['type'];
}): Promise<Schedule> => api.post('/schedules', input);

// null clears the paper or the student when a defense is moved from one to the other
export type SchedulePatch = Partial<Omit<Schedule, 'researchId' | 'studentId'>> & {
  researchId?: string | null; studentId?: string | null;
};

export const updateSchedule = (id: string, patch: SchedulePatch): Promise<Schedule> =>
  api.patch(`/schedules/${id}`, patch);

export const cancelSchedule = (id: string): Promise<Schedule> => api.patch(`/schedules/${id}/cancel`);

export const deleteSchedule = (id: string): Promise<void> => api.del(`/schedules/${id}`);

export const clearDraftSchedules = (): Promise<void> => api.del('/schedules/clear-drafts');

export interface AutoGenerateResult {
  scheduled: Schedule[];
  logs: string[];
}
export const autoGenerateSchedules = (dates?: string[]): Promise<AutoGenerateResult> =>
  api.post('/schedules/auto-generate', { dates });
