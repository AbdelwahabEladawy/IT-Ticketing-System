export type SchedulingRole = 'TECHNICIAN' | 'IT_ADMIN' | 'SUPER_ADMIN';
export type ScheduleType = 'ONE_TIME' | 'YEARLY';

export interface SchedulingTarget {
  id: string;
  name: string;
  email: string;
  role: SchedulingRole;
}

export interface ScheduledTaskRunSummary {
  id: string;
  scheduledFor: string;
  status: 'SUCCESS' | 'FAILED';
  trigger: 'AUTO' | 'MANUAL' | string;
  ticketId: string | null;
  errorMessage: string | null;
  executedAt: string;
}

export interface ScheduledTask {
  id: string;
  title: string;
  description: string | null;
  scheduleType: ScheduleType;
  runDate: string | null;
  month: number | null;
  day: number | null;
  timeOfDay: string;
  timezone: string;
  nextRunAt: string;
  isActive: boolean;
  targetUser: SchedulingTarget;
  createdBy: SchedulingTarget;
  createdAt: string;
  updatedAt: string;
  latestRun: ScheduledTaskRunSummary | null;
}

export interface ScheduledTaskPayload {
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  runDate?: string;
  month?: number;
  day?: number;
  timeOfDay?: string;
  timezone?: string;
  targetUserId?: string;
}
