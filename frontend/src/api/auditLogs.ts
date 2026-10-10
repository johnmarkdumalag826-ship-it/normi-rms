import { api } from './client';
import { AuditLog } from '../types';

export const listAuditLogs = (): Promise<AuditLog[]> => api.get('/audit-logs');
