import { processDueReassignmentRequests } from './reassignmentRequestService.js';

const REASSIGNMENT_REQUEST_WORKER_MS = Number(
  process.env.REASSIGNMENT_REQUEST_WORKER_MS || 30000
);

let workerTimer = null;
let isTickRunning = false;

const runWorkerTick = async () => {
  if (isTickRunning) return;
  isTickRunning = true;

  try {
    await processDueReassignmentRequests();
  } catch (error) {
    console.error('Reassignment request worker tick failed:', error?.message || error);
  } finally {
    isTickRunning = false;
  }
};

export const startReassignmentRequestWorker = () => {
  if (workerTimer) return;

  runWorkerTick();
  workerTimer = setInterval(runWorkerTick, REASSIGNMENT_REQUEST_WORKER_MS);
};

export const stopReassignmentRequestWorker = () => {
  if (!workerTimer) return;
  clearInterval(workerTimer);
  workerTimer = null;
};

