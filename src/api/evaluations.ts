import { api } from './client';
import { Evaluation } from '../types';

export const listEvaluations = (): Promise<Evaluation[]> => api.get('/evaluations');
export const listEvaluationsForSchedule = (scheduleId: string): Promise<Evaluation[]> =>
  api.get(`/evaluations/schedule/${scheduleId}`);
export const createEvaluation = (input: {
  scheduleId: string; score1: number; score2: number; score3: number; score4: number;
  comment: string; recommendation: Evaluation['recommendation'];
}): Promise<Evaluation> => api.post('/evaluations', input);
