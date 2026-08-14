import { api } from './client';
import { PanelAvailability } from '../types';

export const listPanelAvailability = (panelistId?: string): Promise<PanelAvailability[]> =>
  api.get(panelistId ? `/panel-availability?panelistId=${panelistId}` : '/panel-availability');
export const createPanelAvailability = (input: {
  panelistId: string; dayOfWeek: string; startTime: string; endTime: string; isAvailable?: boolean;
}): Promise<PanelAvailability> => api.post('/panel-availability', input);
