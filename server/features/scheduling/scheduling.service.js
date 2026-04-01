import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../../utils/auditLog.js';
import { calculateSLADeadline, getSLAHours } from '../../utils/sla.js';
import { notifyFromTemplate } from '../../utils/notifications.js';
import { broadcastTicketListUpdated } from '../../services/wsTicketEvents.js';
import {
  DEFAULT_SCHEDULE_TIME_OF_DAY,
  DEFAULT_SCHEDULE_TIMEZONE,
  SCHEDULE_RETRY_DELAY_MS,
  SCHEDULING_TARGET_ROLES,
  SCHEDULE_TYPES,
  SCHEDULE_TYPE_ONE_TIME,
  SCHEDULE_TYPE_YEARLY,
  SCHEDULING_ALLOWED_ROLES
} from './scheduling.constants.js';
import { computeNextRunAt, normalizeTimeOfDay, normalizeTimezone } from './scheduling.time.js';

const prisma = new PrismaClient();

const taskInclude = {
  targetUser: {
    select: { id: true, name: true, email: true, role: true }
  },
  createdBy: {
    select: { id: true, name: true, email: true, role: true }
  },
  runs: {
    orderBy: { executedAt: 'desc' },
    take: 1
  }
};

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const isSuperAdmin = (user) => user?.role === 'SUPER_ADMIN';

const assertAllowedRole = (user) => {
  if (!user || !SCHEDULING_ALLOWED_ROLES.includes(user.role)) {
    fail(403, 'Forbidden');
  }
};

const sanitizeTitle = (value) => {
  if (typeof value !== 'string') {
    fail(400, 'title is required');
  }
  const next = value.trim();
  if (!next) {
    fail(400, 'title is required');
  }
  if (next.length > 200) {
    fail(400, 'title is too long');
  }
  return next;
};

const sanitizeDescription = (value) => {
  if (value == null) return null;
  if (typeof value !== 'string') {
    fail(400, 'description must be a string');
  }
  const next = value.trim();
  return next || null;
};

const normalizeScheduleType = (value) => {
  if (typeof value !== 'string') {
    fail(400, 'scheduleType is required');
  }
  const next = value.trim().toUpperCase();
  if (!SCHEDULE_TYPES.includes(next)) {
    fail(400, 'Invalid scheduleType');
  }
  return next;
};

const parseInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    fail(400, `${fieldName} must be an integer`);
  }
  return parsed;
};

const ensureTargetRole = (role) => {
  if (!SCHEDULING_TARGET_ROLES.includes(role)) {
    fail(400, 'Target user role is not allowed for scheduling');
  }
};

const normalizeRunDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    fail(400, 'runDate is required for one-time schedule');
  }
  return value.trim();
};

const pickTargetUserId = (actor, payloadTargetUserId, fallbackTargetUserId) => {
  if (isSuperAdmin(actor)) {
    if (typeof payloadTargetUserId === 'string' && payloadTargetUserId.trim()) {
      return payloadTargetUserId.trim();
    }
    if (typeof fallbackTargetUserId === 'string' && fallbackTargetUserId.trim()) {
      return fallbackTargetUserId.trim();
    }
    fail(400, 'targetUserId is required');
  }
  return actor.id;
};

const fetchTargetUser = async (targetUserId) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      role: true,
      specializationId: true
    }
  });
  if (!targetUser) {
    fail(400, 'Target user not found');
  }
  ensureTargetRole(targetUser.role);
  return targetUser;
};

const toTaskDto = (task) => {
  const latestRun = task.runs?.[0] || null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    scheduleType: task.scheduleType,
    runDate: task.runDate,
    month: task.month,
    day: task.day,
    timeOfDay: task.timeOfDay,
    timezone: task.timezone,
    nextRunAt: task.nextRunAt,
    isActive: task.isActive,
    targetUser: task.targetUser,
    createdBy: task.createdBy,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    latestRun: latestRun
      ? {
          id: latestRun.id,
          scheduledFor: latestRun.scheduledFor,
          status: latestRun.status,
          trigger: latestRun.trigger,
          ticketId: latestRun.ticketId,
          errorMessage: latestRun.errorMessage,
          executedAt: latestRun.executedAt
        }
      : null
  };
};

const buildTaskInput = async ({ actor, payload, existingTask = null }) => {
  const title = sanitizeTitle(payload.title ?? existingTask?.title);
  const description = sanitizeDescription(
    payload.description !== undefined ? payload.description : existingTask?.description
  );
  const scheduleType = normalizeScheduleType(payload.scheduleType ?? existingTask?.scheduleType);
  const timeOfDay = normalizeTimeOfDay(payload.timeOfDay ?? existingTask?.timeOfDay ?? DEFAULT_SCHEDULE_TIME_OF_DAY);
  const timezone = normalizeTimezone(payload.timezone ?? existingTask?.timezone ?? DEFAULT_SCHEDULE_TIMEZONE);

  let runDate = null;
  let month = null;
  let day = null;

  if (scheduleType === SCHEDULE_TYPE_ONE_TIME) {
    runDate = normalizeRunDate(payload.runDate ?? existingTask?.runDate);
  } else {
    month = parseInteger(payload.month ?? existingTask?.month, 'month');
    day = parseInteger(payload.day ?? existingTask?.day, 'day');
  }

  const targetUserId = pickTargetUserId(actor, payload.targetUserId, existingTask?.targetUserId);
  const targetUser = await fetchTargetUser(targetUserId);

  const nextRunAt = computeNextRunAt({
    scheduleType,
    runDate,
    month,
    day,
    timeOfDay,
    timezone,
    fromDate: new Date()
  });

  if (!nextRunAt) {
    fail(400, 'Scheduled date/time must be in the future');
  }

  return {
    title,
    description,
    scheduleType,
    runDate: scheduleType === SCHEDULE_TYPE_ONE_TIME ? runDate : null,
    month: scheduleType === SCHEDULE_TYPE_YEARLY ? month : null,
    day: scheduleType === SCHEDULE_TYPE_YEARLY ? day : null,
    timeOfDay,
    timezone,
    nextRunAt,
    targetUserId: targetUser.id
  };
};

const whereByAccess = (actor, id = null) => {
  if (isSuperAdmin(actor)) {
    return id ? { id } : {};
  }
  return id ? { id, targetUserId: actor.id } : { targetUserId: actor.id };
};

export const listSchedulingTargets = async ({ actor }) => {
  assertAllowedRole(actor);

  if (isSuperAdmin(actor)) {
    const users = await prisma.user.findMany({
      where: { role: { in: SCHEDULING_TARGET_ROLES } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    });
    return users;
  }

  const self = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, email: true, role: true }
  });
  return self ? [self] : [];
};

export const listScheduledTasks = async ({ actor, active }) => {
  assertAllowedRole(actor);
  const where = whereByAccess(actor);
  if (typeof active === 'boolean') {
    where.isActive = active;
  }

  const tasks = await prisma.scheduledTicketTask.findMany({
    where,
    include: taskInclude,
    orderBy: [
      { isActive: 'desc' },
      { nextRunAt: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  return tasks.map(toTaskDto);
};

export const createScheduledTask = async ({ actor, payload }) => {
  assertAllowedRole(actor);
  const taskData = await buildTaskInput({ actor, payload });

  const created = await prisma.scheduledTicketTask.create({
    data: {
      ...taskData,
      createdById: actor.id
    },
    include: taskInclude
  });

  await createAuditLog(
    'SCHEDULED_TASK_CREATED',
    `Scheduled task "${created.title}" created`,
    actor.id,
    null,
    {
      scheduledTaskId: created.id,
      targetUserId: created.targetUserId,
      scheduleType: created.scheduleType
    }
  );

  return toTaskDto(created);
};

export const updateScheduledTask = async ({ actor, taskId, payload }) => {
  assertAllowedRole(actor);

  const existing = await prisma.scheduledTicketTask.findFirst({
    where: whereByAccess(actor, taskId),
    include: taskInclude
  });

  if (!existing) {
    fail(404, 'Scheduled task not found');
  }

  const taskData = await buildTaskInput({
    actor,
    payload,
    existingTask: existing
  });

  const updated = await prisma.scheduledTicketTask.update({
    where: { id: existing.id },
    data: {
      ...taskData,
      isActive: existing.isActive
    },
    include: taskInclude
  });

  await createAuditLog(
    'SCHEDULED_TASK_UPDATED',
    `Scheduled task "${updated.title}" updated`,
    actor.id,
    null,
    { scheduledTaskId: updated.id }
  );

  return toTaskDto(updated);
};

export const setScheduledTaskActive = async ({ actor, taskId, isActive }) => {
  assertAllowedRole(actor);
  const desiredActive = Boolean(isActive);

  const existing = await prisma.scheduledTicketTask.findFirst({
    where: whereByAccess(actor, taskId),
    include: taskInclude
  });

  if (!existing) {
    fail(404, 'Scheduled task not found');
  }

  const patch = { isActive: desiredActive };
  if (desiredActive) {
    const nextRunAt = computeNextRunAt({
      scheduleType: existing.scheduleType,
      runDate: existing.runDate,
      month: existing.month,
      day: existing.day,
      timeOfDay: existing.timeOfDay,
      timezone: existing.timezone,
      fromDate: new Date()
    });
    if (!nextRunAt) {
      fail(400, 'Cannot activate task with schedule in the past');
    }
    patch.nextRunAt = nextRunAt;
  }

  const updated = await prisma.scheduledTicketTask.update({
    where: { id: existing.id },
    data: patch,
    include: taskInclude
  });

  await createAuditLog(
    desiredActive ? 'SCHEDULED_TASK_ACTIVATED' : 'SCHEDULED_TASK_PAUSED',
    `Scheduled task "${updated.title}" ${desiredActive ? 'activated' : 'paused'}`,
    actor.id,
    null,
    { scheduledTaskId: updated.id }
  );

  return toTaskDto(updated);
};

export const deleteScheduledTask = async ({ actor, taskId }) => {
  assertAllowedRole(actor);

  const existing = await prisma.scheduledTicketTask.findFirst({
    where: whereByAccess(actor, taskId),
    select: { id: true, title: true }
  });
  if (!existing) {
    fail(404, 'Scheduled task not found');
  }

  await prisma.scheduledTicketTask.delete({ where: { id: existing.id } });
  await createAuditLog(
    'SCHEDULED_TASK_DELETED',
    `Scheduled task "${existing.title}" deleted`,
    actor.id,
    null,
    { scheduledTaskId: existing.id }
  );

  return { success: true };
};

const createTicketFromTask = async (task) => {
  const targetUser = await fetchTargetUser(task.targetUserId);
  const now = new Date();
  const slaHours = getSLAHours();
  const ticket = await prisma.ticket.create({
    data: {
      title: task.title,
      description: task.description || `Scheduled task: ${task.title}`,
      problemType: 'CUSTOM',
      issueType: null,
      status: 'ASSIGNED',
      anydeskNumber: null,
      createdById: targetUser.id,
      assignedToId: targetUser.id,
      assignedAt: now,
      specializationId: targetUser.specializationId || null,
      slaHours,
      slaDeadline: calculateSLADeadline(now)
    }
  });

  await broadcastTicketListUpdated({
    ticketId: ticket.id,
    event: 'TICKET_CREATED',
    ticket: {
      id: ticket.id,
      createdById: ticket.createdById,
      assignedToId: ticket.assignedToId,
      specializationId: ticket.specializationId
    }
  });

  await notifyFromTemplate(
    targetUser.id,
    'NEW_ASSIGNED_TICKET',
    { title: task.title },
    'info',
    ticket.id
  );

  return ticket;
};

const getNextAfterSuccess = (task, referenceDate) => {
  if (task.scheduleType === SCHEDULE_TYPE_ONE_TIME) {
    return { isActive: false };
  }

  const nextRunAt = computeNextRunAt({
    scheduleType: task.scheduleType,
    runDate: task.runDate,
    month: task.month,
    day: task.day,
    timeOfDay: task.timeOfDay,
    timezone: task.timezone,
    fromDate: new Date(referenceDate.getTime() + 1000)
  });
  return { nextRunAt, isActive: true };
};

const getRetryPatch = () => {
  return {
    isActive: true,
    nextRunAt: new Date(Date.now() + SCHEDULE_RETRY_DELAY_MS)
  };
};

const errorToMessage = (error) => {
  const base = error?.message || 'Unknown schedule execution error';
  return String(base).slice(0, 1000);
};

export const executeScheduledTaskById = async ({ taskId, trigger = 'AUTO' }) => {
  const task = await prisma.scheduledTicketTask.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    return { status: 'missing', taskId };
  }
  if (!task.isActive) {
    return { status: 'inactive', taskId };
  }

  const scheduledFor = task.nextRunAt;
  let run;
  try {
    run = await prisma.scheduledTaskRun.create({
      data: {
        scheduledTaskId: task.id,
        scheduledFor,
        status: 'FAILED',
        trigger,
        errorMessage: 'Execution started'
      }
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return { status: 'duplicate', taskId };
    }
    throw error;
  }

  try {
    const ticket = await createTicketFromTask(task);
    const nextPatch = getNextAfterSuccess(task, scheduledFor);

    await prisma.$transaction([
      prisma.scheduledTaskRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          ticketId: ticket.id,
          errorMessage: null,
          executedAt: new Date()
        }
      }),
      prisma.scheduledTicketTask.update({
        where: { id: task.id },
        data: nextPatch
      })
    ]);

    await createAuditLog(
      'SCHEDULED_TASK_EXECUTED',
      `Scheduled task "${task.title}" executed successfully`,
      task.createdById,
      ticket.id,
      { scheduledTaskId: task.id, trigger, scheduledFor }
    );

    return { status: 'success', taskId: task.id, ticketId: ticket.id };
  } catch (error) {
    const message = errorToMessage(error);
    await prisma.$transaction([
      prisma.scheduledTaskRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: message,
          executedAt: new Date()
        }
      }),
      prisma.scheduledTicketTask.update({
        where: { id: task.id },
        data: getRetryPatch()
      })
    ]);

    await createAuditLog(
      'SCHEDULED_TASK_FAILED',
      `Scheduled task "${task.title}" failed`,
      task.createdById,
      null,
      { scheduledTaskId: task.id, trigger, error: message }
    );

    return { status: 'failed', taskId: task.id, error: message };
  }
};

export const executeDueScheduledTasks = async ({ limit = 20 } = {}) => {
  const dueTasks = await prisma.scheduledTicketTask.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: new Date() }
    },
    select: { id: true },
    orderBy: { nextRunAt: 'asc' },
    take: limit
  });

  const summary = {
    due: dueTasks.length,
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const task of dueTasks) {
    const result = await executeScheduledTaskById({ taskId: task.id, trigger: 'AUTO' });
    if (result.status === 'success') summary.success += 1;
    else if (result.status === 'failed') summary.failed += 1;
    else summary.skipped += 1;
  }

  return summary;
};

export const runTaskNow = async ({ actor, taskId }) => {
  assertAllowedRole(actor);

  const task = await prisma.scheduledTicketTask.findFirst({
    where: whereByAccess(actor, taskId),
    select: { id: true, isActive: true }
  });
  if (!task) {
    fail(404, 'Scheduled task not found');
  }
  if (!task.isActive) {
    fail(400, 'Task is paused. Activate it first.');
  }

  const now = new Date();
  await prisma.scheduledTicketTask.update({
    where: { id: task.id },
    data: { nextRunAt: now }
  });

  return executeScheduledTaskById({ taskId: task.id, trigger: 'MANUAL' });
};
