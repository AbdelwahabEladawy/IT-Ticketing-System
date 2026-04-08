import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAchievementsByUser,
  getMyAchievements,
  patchAchievement,
  postAchievement,
  removeAchievement,
  validateCreateAchievement
} from '../controllers/achievementController.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('TECHNICIAN', 'IT_ADMIN'),
  validateCreateAchievement,
  postAchievement
);

router.get('/me', authenticate, authorize('TECHNICIAN', 'IT_ADMIN'), getMyAchievements);

router.get('/user/:userId', authenticate, authorize('IT_ADMIN'), getAchievementsByUser);

router.patch(
  '/:id',
  authenticate,
  authorize('TECHNICIAN', 'IT_ADMIN'),
  validateCreateAchievement,
  patchAchievement
);

router.delete('/:id', authenticate, authorize('TECHNICIAN', 'IT_ADMIN'), removeAchievement);

export default router;
