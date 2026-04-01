# Scheduling Tickets (Server)

This folder contains all backend logic for the `scheduling tickets` feature.

## Files

- `scheduling.constants.js`
  - Feature constants (allowed roles, defaults, worker timing).
- `scheduling.time.js`
  - Time/date validation and timezone-aware next-run calculations.
- `scheduling.service.js`
  - Core business logic:
    - create/update/list/pause/delete scheduled tasks
    - execute due tasks and create real tickets
    - audit logs and notifications
- `scheduling.routes.js`
  - API endpoints mounted at `/api/scheduling-tickets`.
- `scheduling.worker.js`
  - Background interval worker that executes due scheduled tasks.

## Mounted In

- `server/index.js`
  - `app.use('/api/scheduling-tickets', schedulingRoutes)`
  - `startSchedulingWorker()`
