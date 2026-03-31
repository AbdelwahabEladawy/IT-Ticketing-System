import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  validateCreateSuggestion,
  postSuggestion,
  getSuggestions,
  getUnseenCount,
  getSuggestion,
  patchMarkSeen
} from '../controllers/suggestionController.js';

const router = express.Router();

router.post('/', authenticate, validateCreateSuggestion, postSuggestion);

router.get(
  '/unseen-count',
  authenticate,
  authorize('SUPER_ADMIN', 'SOFTWARE_ENGINEER'),
  getUnseenCount
);

router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'SOFTWARE_ENGINEER'),
  getSuggestions
);

router.get(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'SOFTWARE_ENGINEER'),
  getSuggestion
);

router.patch(
  '/:id/seen',
  authenticate,
  authorize('SUPER_ADMIN', 'SOFTWARE_ENGINEER'),
  patchMarkSeen
);

export default router;
