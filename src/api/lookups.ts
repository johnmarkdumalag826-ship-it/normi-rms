import { api } from './client';
import { Department, Course, SchoolYear, Room } from '../types';

export const listDepartments = (): Promise<Department[]> => api.get('/departments');
export const listCourses = (departmentId?: string): Promise<Course[]> =>
  api.get(departmentId ? `/courses?departmentId=${departmentId}` : '/courses');
export const listSchoolYears = (): Promise<SchoolYear[]> => api.get('/school-years');
export const listRooms = (): Promise<Room[]> => api.get('/rooms');

export interface DefenseTypeRecord {
  id: string;
  name: string;
}
export const listDefenseTypes = (): Promise<DefenseTypeRecord[]> => api.get('/defense-types');
export const createDefenseType = (name: string): Promise<DefenseTypeRecord> => api.post('/defense-types', { name });
export const deleteDefenseType = (id: string): Promise<void> => api.del(`/defense-types/${id}`);
