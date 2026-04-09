import prisma from '../utils/prisma.js';
import { getAchievementDelegate } from '../utils/achievementDelegate.js';

const achievementSelect = {
  id: true,
  title: true,
  description: true,
  userId: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
};

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const startOfDay = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const endOfDay = (date) => {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
};

const parseDateInput = (value, label) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    fail(400, `Invalid ${label}`);
  }
  return parsed;
};

export function parseAchievementListFilters(query = {}) {
  const dateFrom = query.dateFrom ? startOfDay(parseDateInput(query.dateFrom, 'dateFrom')) : null;
  const dateTo = query.dateTo ? endOfDay(parseDateInput(query.dateTo, 'dateTo')) : null;

  if (dateFrom && dateTo && dateFrom > dateTo) {
    fail(400, 'dateFrom cannot be after dateTo');
  }

  return {
    dateFrom,
    dateTo
  };
}

export async function createAchievement({ userId, title, description }) {
  return getAchievementDelegate(prisma).create({
    data: {
      userId,
      title: title.trim(),
      description: description.trim()
    },
    select: achievementSelect
  });
}

export async function getAchievementById(id) {
  return getAchievementDelegate(prisma).findUnique({
    where: { id },
    select: achievementSelect
  });
}

export async function updateAchievementForUser({ achievementId, userId, title, description }) {
  const achievement = await getAchievementDelegate(prisma).findUnique({
    where: { id: achievementId },
    select: achievementSelect
  });

  if (!achievement) {
    fail(404, 'Achievement not found');
  }

  if (achievement.userId !== userId) {
    fail(403, 'Forbidden');
  }

  return getAchievementDelegate(prisma).update({
    where: { id: achievementId },
    data: {
      title: title.trim(),
      description: description.trim()
    },
    select: achievementSelect
  });
}

export async function deleteAchievementForUser({ achievementId, userId }) {
  const achievement = await getAchievementDelegate(prisma).findUnique({
    where: { id: achievementId },
    select: achievementSelect
  });

  if (!achievement) {
    fail(404, 'Achievement not found');
  }

  if (achievement.userId !== userId) {
    fail(403, 'Forbidden');
  }

  await getAchievementDelegate(prisma).delete({
    where: { id: achievementId }
  });

  return achievement;
}

export async function listAchievementsForUser(userId, options = {}) {
  if (options.ensureUser) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      fail(404, 'User not found');
    }
  }

  const where = { userId };

  if (options.dateFrom || options.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      where.createdAt.gte = options.dateFrom;
    }
    if (options.dateTo) {
      where.createdAt.lte = options.dateTo;
    }
  }

  return getAchievementDelegate(prisma).findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: achievementSelect
  });
}
