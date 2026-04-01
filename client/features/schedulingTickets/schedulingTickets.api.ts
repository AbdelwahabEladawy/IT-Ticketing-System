import api from '../../utils/api';
import { ScheduledTask, ScheduledTaskPayload, SchedulingTarget } from './types';

export const listSchedulingTargets = async (): Promise<SchedulingTarget[]> => {
  const response = await api.get('/scheduling-tickets/targets');
  return response.data?.targets || [];
};

export const listScheduledTasks = async (active?: boolean): Promise<ScheduledTask[]> => {
  const response = await api.get('/scheduling-tickets/tasks', {
    params: active === undefined ? undefined : { active }
  });
  return response.data?.tasks || [];
};

export const createScheduledTask = async (payload: ScheduledTaskPayload): Promise<ScheduledTask> => {
  const response = await api.post('/scheduling-tickets/tasks', payload);
  return response.data.task;
};

export const updateScheduledTask = async (taskId: string, payload: ScheduledTaskPayload): Promise<ScheduledTask> => {
  const response = await api.patch(`/scheduling-tickets/tasks/${taskId}`, payload);
  return response.data.task;
};

export const setScheduledTaskActive = async (taskId: string, isActive: boolean): Promise<ScheduledTask> => {
  const response = await api.patch(`/scheduling-tickets/tasks/${taskId}/active`, { isActive });
  return response.data.task;
};

export const runScheduledTaskNow = async (taskId: string) => {
  const response = await api.post(`/scheduling-tickets/tasks/${taskId}/run-now`);
  return response.data.result;
};

export const deleteScheduledTask = async (taskId: string) => {
  const response = await api.delete(`/scheduling-tickets/tasks/${taskId}`);
  return response.data;
};
