import { PrismaClient } from '@prisma/client';
import { notifyFromTemplate } from '../utils/notifications.js';

const prisma = new PrismaClient();

const RECIPIENT_ROLES = ['SUPER_ADMIN', 'SOFTWARE_ENGINEER'];

export async function createSuggestion({ createdById, title, description }) {
  const suggestion = await prisma.suggestion.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      createdById
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  const recipients = await prisma.user.findMany({
    where: { role: { in: RECIPIENT_ROLES } },
    select: { id: true }
  });

  for (const r of recipients) {
    await notifyFromTemplate(
      r.id,
      'SUGGESTION_NEW',
      {
        authorName: suggestion.createdBy.name,
        suggestionTitle: suggestion.title
      },
      'info',
      null,
      suggestion.id
    );
  }

  return suggestion;
}

export async function listSuggestions() {
  return prisma.suggestion.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });
}

export async function countUnseenSuggestions() {
  return prisma.suggestion.count({
    where: { status: 'UNSEEN' }
  });
}

export async function getSuggestionById(id) {
  return prisma.suggestion.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, createdAt: true }
      }
    }
  });
}

export async function markSuggestionSeen(suggestionId) {
  const suggestion = await prisma.suggestion.findUnique({
    where: { id: suggestionId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!suggestion) {
    const err = new Error('Suggestion not found');
    err.statusCode = 404;
    throw err;
  }

  if (suggestion.status === 'SEEN') {
    return suggestion;
  }

  const updated = await prisma.suggestion.update({
    where: { id: suggestionId },
    data: { status: 'SEEN' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  await notifyFromTemplate(
    suggestion.createdById,
    'SUGGESTION_REVIEWED',
    {},
    'success',
    null,
    suggestion.id
  );

  return updated;
}
