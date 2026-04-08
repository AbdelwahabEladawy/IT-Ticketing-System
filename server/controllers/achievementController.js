import { body, validationResult } from 'express-validator';
import { createAuditLog } from '../utils/auditLog.js';
import {
  deleteAchievementForUser,
  getAchievementById,
  createAchievement,
  listAchievementsForUser,
  parseAchievementListFilters,
  updateAchievementForUser
} from '../services/achievementService.js';

export const validateCreateAchievement = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
];

const handleValidationError = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return null;
  }

  res.status(400).json({
    error: 'Validation error',
    errors: errors.array()
  });

  return true;
};

export async function postAchievement(req, res) {
  try {
    if (handleValidationError(req, res)) {
      return;
    }

    const { title, description } = req.body;
    const achievement = await createAchievement({
      userId: req.user.id,
      title,
      description
    });

    await createAuditLog(
      'ACHIEVEMENT_CREATED',
      `Achievement "${achievement.title}" created by ${req.user.name}`,
      req.user.id,
      null,
      { achievementId: achievement.id }
    );

    res.status(201).json({ achievement });
  } catch (error) {
    console.error('postAchievement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMyAchievements(req, res) {
  try {
    const filters = parseAchievementListFilters(req.query);
    const achievements = await listAchievementsForUser(req.user.id, filters);
    res.json({ achievements });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('getMyAchievements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getAchievementsByUser(req, res) {
  try {
    const filters = parseAchievementListFilters(req.query);
    const achievements = await listAchievementsForUser(req.params.userId, {
      ensureUser: true,
      ...filters
    });

    res.json({ achievements });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('getAchievementsByUser error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function patchAchievement(req, res) {
  try {
    if (handleValidationError(req, res)) {
      return;
    }

    const existingAchievement = await getAchievementById(req.params.id);
    const achievement = await updateAchievementForUser({
      achievementId: req.params.id,
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description
    });

    await createAuditLog(
      'ACHIEVEMENT_UPDATED',
      `Achievement "${achievement.title}" updated by ${req.user.name}`,
      req.user.id,
      null,
      {
        achievementId: achievement.id,
        before: existingAchievement,
        after: achievement
      }
    );

    res.json({ achievement });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('patchAchievement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function removeAchievement(req, res) {
  try {
    const achievement = await deleteAchievementForUser({
      achievementId: req.params.id,
      userId: req.user.id
    });

    await createAuditLog(
      'ACHIEVEMENT_DELETED',
      `Achievement "${achievement.title}" deleted by ${req.user.name}`,
      req.user.id,
      null,
      { achievementId: achievement.id }
    );

    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('removeAchievement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
