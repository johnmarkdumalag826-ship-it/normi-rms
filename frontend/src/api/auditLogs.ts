import { api } from './client';
import { AuditLog } from '../types';

export const listAuditLogs = (): Promise<AuditLog[]> => api.get('/audit-logs');
export const backupDatabase = (): Promise<void> => api.post('/audit-logs/backup');
export const restoreDatabase = (): Promise<void> => api.post('/audit-logs/restore');
