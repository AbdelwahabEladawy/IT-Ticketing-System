import { PrismaClient } from '@prisma/client';
import { ISSUE_TYPE_MAPPING } from '../config/issueTypeMapping.js';
import { assignTicketRoundRobin } from './roundRobin.js';

const prisma = new PrismaClient();

/**
 * Route ticket based on issue type selection
 * 
 * ROUTING PRIORITY:
 * 1. If issueType is provided and exists in mapping → Route directly to mapped specialization
 * 2. If issueType is null or "CUSTOM" → Return null (let existing logic handle it)
 * 
 * IMPORTANT: This function does NOT modify existing routing logic.
 * It only handles the new issue type routing. Existing logic remains untouched.
 * 
 * @param {string|null} issueType - The selected issue type (or null/CUSTOM for existing logic)
 * @param {string|null} existingSpecializationId - Existing specializationId from request (for backward compatibility)
 * @returns {Object|null} - { specializationId, technician } or null to use existing logic
 */
export const routeByIssueType = async (issueType, existingSpecializationId = null) => {
  try {
    // If no issue type or CUSTOM, return null to use existing routing logic
    // This ensures backward compatibility and preserves existing behavior
    if (!issueType || issueType === 'CUSTOM') {
      return null;
    }

    // Check if issue type exists in mapping
    const specializationName = ISSUE_TYPE_MAPPING[issueType];
    if (!specializationName) {
      // Invalid issue type, fall back to existing logic
      console.warn(`Issue type "${issueType}" not found in mapping. Falling back to existing routing.`);
      return null;
    }

    // Find specialization by name
    const specialization = await prisma.specialization.findUnique({
      where: { name: specializationName }
    });

    if (!specialization) {
      // Specialization not found, log warning and fall back to existing logic
      console.warn(`Specialization "${specializationName}" not found for issue type "${issueType}". Falling back to existing routing.`);
      return null;
    }

    console.log(`Routing issue type "${issueType}" to specialization "${specializationName}" (ID: ${specialization.id})`);

    // Route directly to the mapped specialization using existing round-robin logic
    // This reuses the existing assignment mechanism without modification
    const technician = await assignTicketRoundRobin(specialization.id);
    
    if (!technician) {
      console.warn(`No available technician found for specialization "${specializationName}" (ID: ${specialization.id}). Ticket will remain unassigned.`);
    } else {
      console.log(`Assigned ticket to technician: ${technician.name} (${technician.email})`);
    }

    return {
      specializationId: specialization.id,
      technician: technician
    };
  } catch (error) {
    // If any error occurs, log it and fall back to existing routing logic
    console.error('Error in routeByIssueType:', error);
    return null;
  }
};

