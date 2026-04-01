# Scheduling Tickets (Client)

This folder contains all frontend files for the `scheduling tickets` feature.

## Files

- `types.ts`
  - Shared TypeScript types for scheduled tasks and payloads.
- `schedulingTickets.api.ts`
  - API wrapper for scheduling endpoints.
- `SchedulingTicketsPage.tsx`
  - Full page UI: create/edit/list/pause/run/delete scheduled tasks.

## Route Entry

- `client/pages/scheduling-tickets.tsx`
  - Thin route file that renders `SchedulingTicketsPage`.
