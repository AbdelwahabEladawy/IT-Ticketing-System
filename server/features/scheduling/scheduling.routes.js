import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  createScheduledTask,
  deleteScheduledTask,
  listScheduledTasks,
  listSchedulingTargets,
  runTaskNow,
  setScheduledTaskActive,
  updateScheduledTask
} from './scheduling.service.js';

const router = express.Router();

const parseActiveQuery = (value) => {
  if (value === undefined) return undefined;
  const raw = String(value).trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const error = new Error('active must be true or false');
  error.statusCode = 400;
  throw error;
};

const handleError = (res, error) => {
  const statusCode = Number(error?.statusCode) || 500;
  if (statusCode >= 500) {
    console.error('Scheduling route error:', error);
  }
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Server error' : error.message
  });
};

const withErrorHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    handleError(res, error);
  }
};

router.get(
  '/targets',
  authenticate,
  withErrorHandler(async (req, res) => {
    const targets = await listSchedulingTargets({ actor: req.user });
    res.json({ targets });
  })
);

router.get(
  '/tasks',
  authenticate,
  withErrorHandler(async (req, res) => {
    const active = parseActiveQuery(req.query.active);
    const tasks = await listScheduledTasks({ actor: req.user, active });
    res.json({ tasks });
  })
);

router.post(
  '/tasks',
  authenticate,
  withErrorHandler(async (req, res) => {
    const task = await createScheduledTask({ actor: req.user, payload: req.body || {} });
    res.status(201).json({ task });
  })
);

router.patch(
  '/tasks/:id',
  authenticate,
  withErrorHandler(async (req, res) => {
    const task = await updateScheduledTask({
      actor: req.user,
      taskId: req.params.id,
      payload: req.body || {}
    });
    res.json({ task });
  })
);

router.patch(
  '/tasks/:id/active',
  authenticate,
  withErrorHandler(async (req, res) => {
    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
      const error = new Error('isActive must be a boolean');
      error.statusCode = 400;
      throw error;
    }

    const task = await setScheduledTaskActive({
      actor: req.user,
      taskId: req.params.id,
      isActive
    });
    res.json({ task });
  })
);

router.post(
  '/tasks/:id/run-now',
  authenticate,
  withErrorHandler(async (req, res) => {
    const result = await runTaskNow({
      actor: req.user,
      taskId: req.params.id
    });
    res.json({ result });
  })
);

router.delete(
  '/tasks/:id',
  authenticate,
  withErrorHandler(async (req, res) => {
    const result = await deleteScheduledTask({
      actor: req.user,
      taskId: req.params.id
    });
    res.json(result);
  })
);

export default router;
