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
  // IT Help Desk Issues
  'Access & Accounts': 'Help Desk',
  'Software installation': 'Help Desk',
  'License activation / expired': 'Help Desk',
  'Application Error or crash': 'Help Desk',
  'Device Issues': 'Help Desk',

  // IT Admin Issues
  'New laptop request': 'IT Admin',
  'Laptop replacement': 'IT Admin',
  'Accessory request (mouse / headset / bag)': 'IT Admin',
  'Asset return (resignation)': 'IT Admin',
  'Reports & Management': 'IT Admin',
  'New employee IT setup': 'IT Admin',
  'Employee exit clearance': 'IT Admin',

  // Network Engineer Issues
  'Slow internet': 'Network',
  'WiFi disconnecting': 'Network',
  'LAN port not working': 'Network',
  'Router issue': 'Network',
};

/**
 * Get all available issue types grouped by team
 * Used for UI display
 */
export const ISSUE_TYPES_BY_TEAM = {
  'IT Help Desk': [
    'Access & Accounts',
    'Software installation',
    'License activation / expired',
    'Application Error or crash',
    'Device Issues',
  ],
  'IT Admin': [
    'New laptop request',
    'Laptop replacement',
    'Accessory request (mouse / headset / bag)',
    'Asset return (resignation)',
    'Reports & Management',
    'New employee IT setup',
    'Employee exit clearance',
  ],
  'Network Engineer': [
    'Slow internet',
    'WiFi disconnecting',
    'LAN port not working',
    'Router issue',
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
  return issueType === 'CUSTOM' || issueType === null || ISSUE_TYPE_MAPPING.hasOwnProperty(issueType);
};

