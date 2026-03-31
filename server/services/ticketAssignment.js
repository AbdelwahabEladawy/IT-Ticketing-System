import { assignTicketRoundRobin as selectEngineerRoundRobin } from '../utils/roundRobin.js';
import { rebalanceTeam } from './rebalanceService.js';

/**
 * Select an online engineer for the given ticket using round-robin.
 * This does NOT mutate the DB; it only decides the assignee.
 */
export const assignTicketRoundRobin = async (ticket) => {
  if (!ticket?.specializationId) return null;
  return selectEngineerRoundRobin(ticket.specializationId);
};

/**
 * Partial balancing for ASSIGNED tickets only.
 * Triggered when engineers come online (handled by presenceService).
 */
export const rebalanceAssignedTickets = async (specializationId, { trigger = 'LOGIN', actorUserId = null } = {}) => {
  return rebalanceTeam({ specializationId, trigger, actorUserId });
};

