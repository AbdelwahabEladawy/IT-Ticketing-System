import { PrismaClient } from '@prisma/client';
import { addTab, clearUserTabs, removeTab, tabCount } from '../utils/presenceStore.js';
import { rebalanceTeam } from './rebalanceService.js';

const prisma = new PrismaClient();

const HEARTBEAT_TIMEOUT_MS = Number(process.env.PRESENCE_TIMEOUT_MS || 45000);

// 🔥 حماية من spam
const lastHeartbeatMap = new Map();
const MIN_HEARTBEAT_INTERVAL = 5000; // 5 ثواني

export const markOnline = async (userId, tabId = null, triggerRebalance = true) => {
  const now = new Date();

  const prev = await prisma.user.findUnique({
    where: { id: userId },
    select: { isOnline: true, specializationId: true }
  });

  if (tabId) addTab(userId, tabId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: true,
      lastSeenAt: now,
      presenceUpdatedAt: now,
      presenceSessionId: tabId || null
    },
    include: { specialization: true }
  });

  if (triggerRebalance && !prev?.isOnline && user.specializationId) {
    await rebalanceTeam({
      specializationId: user.specializationId,
      trigger: 'LOGIN',
      actorUserId: userId
    });
  }

  return user;
};

export const heartbeat = async (userId, tabId = null) => {
  const nowTs = Date.now();
  const last = lastHeartbeatMap.get(userId) || 0;

  // ⛔ منع الضرب المتكرر
  if (nowTs - last < MIN_HEARTBEAT_INTERVAL) return;

  lastHeartbeatMap.set(userId, nowTs);

  if (tabId) addTab(userId, tabId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: true,
      lastSeenAt: new Date(),
      presenceUpdatedAt: new Date(),
      presenceSessionId: tabId || undefined
    }
  });
};

export const markOffline = async (userId, tabId = null, reason = 'TAB_CLOSED') => {
  if (tabId) {
    removeTab(userId, tabId);
  } else {
    clearUserTabs(userId);
  }

  // لو عنده tabs تانية مفتوحة → يفضل online
  if (tabCount(userId) > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
        presenceUpdatedAt: new Date()
      }
    });
    return false;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: false,
      presenceUpdatedAt: new Date()
    }
  });

  return true;
};

export const runPresenceSweeper = async () => {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

  const staleUsers = await prisma.user.findMany({
    where: {
      isOnline: true,
      OR: [
        { lastSeenAt: null },
        { lastSeenAt: { lt: cutoff } }
      ]
    }
  });

  for (const user of staleUsers) {
    await markOffline(user.id, null, 'HEARTBEAT_TIMEOUT');
  }

  return staleUsers.length;
};