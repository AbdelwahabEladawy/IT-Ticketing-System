import { executeDueScheduledTasks } from './scheduling.service.js';
import { SCHEDULE_WORKER_INTERVAL_MS } from './scheduling.constants.js';

let workerTimer = null;
let isTickRunning = false;

const runWorkerTick = async () => {
  if (isTickRunning) return;
  isTickRunning = true;

  try {
    await executeDueScheduledTasks();
  } catch (error) {
    console.error('Scheduling worker tick failed:', error?.message || error);
  } finally {
    isTickRunning = false;
  }
};

export const startSchedulingWorker = () => {
  if (workerTimer) return;

  runWorkerTick();
  workerTimer = setInterval(runWorkerTick, SCHEDULE_WORKER_INTERVAL_MS);
};

export const stopSchedulingWorker = () => {
  if (!workerTimer) return;
  clearInterval(workerTimer);
  workerTimer = null;
};
