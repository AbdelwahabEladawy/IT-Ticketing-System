import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { ISSUE_TYPES_BY_TEAM, getAllIssueTypes } from '../config/issueTypeMapping.js';

const router = express.Router();

/**
 * Get all available issue types grouped by team
 * Used by frontend to display issue type selection
 */
router.get('/', authenticate, async (req, res) => {
  try {
    res.json({
      issueTypesByTeam: ISSUE_TYPES_BY_TEAM,
      allIssueTypes: getAllIssueTypes()
    });
  } catch (error) {
    console.error('Get issue types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

