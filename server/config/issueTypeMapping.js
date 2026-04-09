/**
 * Issue Type to Specialization Mapping Configuration
 * 
 * This configuration maps predefined issue types to specializations.
 * The routing priority is:
 * 1. If issueType is provided → Route directly to mapped specialization
 * 2. If issueType is null or "CUSTOM" → Use existing routing logic (unchanged)
 * 
 * IMPORTANT: This is an additive feature. All existing routing logic remains untouched.
 */

export const ISSUE_TYPE_MAPPING = {
  // Network Engineer Issues
  'Network / Internet Issue': 'Network',

  // IT Help Desk Issues
  'Hardware / Software': 'Help Desk',
  'Hardware / licence': 'Help Desk',

  // IT Admin Issues
  'Request Laptop': 'IT Admin',
  'Request Accessories': 'IT Admin',
  'Request Report and Management Docs': 'IT Admin',
  'Custom Problem': 'IT Admin',

  // Software Engineering Issues
  'Software issues': 'Software Engineering',
};

/**
 * Get all available issue types grouped by team
 * Used for UI display
 */
export const ISSUE_TYPES_BY_TEAM = {
  'Network Engineer': [
    'Network / Internet Issue',
  ],
  'IT Help Desk': [
    'Hardware / licence',
  ],
  'IT Admin': [
    'Request Laptop',
    'Request Accessories',
    'Request Report and Management Docs',
    'Custom Problem',
  ],
  'Software / Programming': [
    'Software issues',
  ],
};

/**
 * Get all issue types as a flat list
 */
export const getAllIssueTypes = () => {
  return Object.keys(ISSUE_TYPE_MAPPING);
};

/**
 * Check if an issue type exists
 */
export const isValidIssueType = (issueType) => {
  const normalizedIssueType =
    typeof issueType === 'string' ? issueType.trim() : issueType;

  return (
    normalizedIssueType === 'CUSTOM' ||
    normalizedIssueType === null ||
    ISSUE_TYPE_MAPPING.hasOwnProperty(normalizedIssueType)
  );
};

