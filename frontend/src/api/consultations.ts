import { api } from './client';
import { Consultation } from '../types';

export const listConsultations = (): Promise<Consultation[]> => api.get('/consultations');
export const createConsultation = (input: {
  adviserId: string; studentId: string; dateTime: string; topic: string;
}): Promise<Consultation> => api.post('/consultations', input);
export const updateConsultation = (id: string, patch: Partial<Consultation>): Promise<Consultation> =>
  api.patch(`/consultations/${id}`, patch);
export const approveConsultation = (id: string): Promise<Consultation> =>
  api.patch(`/consultations/${id}`, { status: 'approved' });
