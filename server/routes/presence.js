import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { heartbeat, markOffline } from '../services/presenceService.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const resolveUserId = (req) => {
  if (req.user?.id) return req.user.id;
  const token = req.body?.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
};

router.post('/heartbeat', authenticate, [
  body('tabId').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    await heartbeat(req.user.id, req.body.tabId || null);
    res.json({ ok: true });
  } catch (err) {
    console.error('Presence heartbeat error:', err?.message || err);
    return res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

router.post('/disconnect', [
  body('tabId').optional().isString(),
  body('token').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let userId = req.user?.id;
  if (!userId) {
    userId = resolveUserId(req);
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await markOffline(userId, req.body.tabId || null, 'TAB_CLOSED');
    res.json({ ok: true });
  } catch (err) {
    console.error('Presence disconnect error:', err?.message || err);
    return res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

export default router;

