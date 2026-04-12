import express from 'express';
import net from 'net';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { getInternalRequestIp } from '../utils/requestIp.js';
import { assignTicketRoundRobin } from '../utils/roundRobin.js';
import { calculateSLADeadline, getSLAHours } from '../utils/sla.js';
import { createAuditLog } from '../utils/auditLog.js';
import { notifyFromTemplate } from '../utils/notifications.js';
import { broadcastTicketListUpdated } from '../services/wsTicketEvents.js';

const router = express.Router();
const prisma = new PrismaClient();

const FIREWALL_TICKET_TITLE = 'Fire wall issue';
const FIREWALL_TICKET_ANYDESK = '1-9';
const FIREWALL_TICKET_ISSUE_TYPE = 'NETWORK_FIREWALL_BLOCK';
const DUPLICATE_WINDOW_MINUTES = Number(process.env.FIREWALL_DUPLICATE_WINDOW_MINUTES || 30);
const TRUST_X_FORWARDED_FOR = String(process.env.FIREWALL_TRUST_X_FORWARDED_FOR || '').toLowerCase() === 'true';
const ALLOWED_ORIGINS = String(process.env.FIREWALL_ALLOWED_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const normalizeText = (value, max = 500) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? text.slice(0, max) : text;
};

const normalizeUrl = (value) => {
  const raw = normalizeText(value, 2048);
  if (!raw) return '';
  if (raw.includes('%%URL%%')) return '';
  return raw;
};

const normalizeIpValue = (value) => {
  if (!value) return null;
  let candidate = String(value).trim();
  if (!candidate) return null;
  if (candidate.startsWith('::ffff:')) {
    candidate = candidate.slice(7);
  }
  const colonIndex = candidate.lastIndexOf(':');
  if (colonIndex > 0 && candidate.indexOf('.') !== -1) {
    candidate = candidate.slice(0, colonIndex);
  }
  return net.isIP(candidate) ? candidate : null;
};

const isPrivateIpv4 = (ip) => {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return false;
  const [a, b] = octets;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127 ||
    (a === 169 && b === 254)
  );
};

const isPrivateIpv6 = (ip) => {
  const value = ip.toLowerCase();
  return (
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb')
  );
};

const isPrivateIp = (ip) => {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
};

const isAllowedOrigin = (origin) => {
  if (!ALLOWED_ORIGINS.length) return true;
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
};

const isInternalRequest = (req) => {
  const socketIp = normalizeIpValue(req.socket?.remoteAddress);
  const socketIsInternal = socketIp ? isPrivateIp(socketIp) : false;
  if (socketIsInternal) return true;
  if (!TRUST_X_FORWARDED_FOR) return false;
  const forwardedInternalIp = getInternalRequestIp(req);
  return Boolean(forwardedInternalIp);
};

const resolveSourceIp = (req, sourceIpFromBody) => {
  const bodyIp = normalizeText(sourceIpFromBody, 100);
  if (bodyIp && net.isIP(bodyIp)) return bodyIp;
  return getInternalRequestIp(req);
};

const ensureInternalOnly = (req, res, next) => {
  const origin = req.headers.origin ? String(req.headers.origin) : '';
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!isInternalRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

router.post(
  '/firewall-ticket',
  ensureInternalOnly,
  [
    body('blockedUrl').optional().isString(),
    body('description').optional().isString(),
    body('sourceIp').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const blockedUrl = normalizeUrl(req.body?.blockedUrl);
      const firewallDescription = normalizeText(req.body?.description, 1000);
      const sourceIp = resolveSourceIp(req, req.body?.sourceIp);

      if (!blockedUrl) {
        return res.status(400).json({ error: 'blockedUrl is required' });
      }

      const systemEmail = (process.env.FIREWALL_TICKET_SYSTEM_EMAIL || '').trim().toLowerCase();
      if (!systemEmail) {
        return res.status(500).json({ error: 'FIREWALL_TICKET_SYSTEM_EMAIL is not configured' });
      }

      const systemUser = await prisma.user.findUnique({
        where: { email: systemEmail },
        select: { id: true, name: true, email: true }
      });
      if (!systemUser) {
        return res.status(500).json({ error: 'Firewall ticket system user was not found' });
      }

      const networkSpecialization = await prisma.specialization.findUnique({
        where: { name: 'Network' },
        select: { id: true }
      });

      const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
      const duplicateTicket = await prisma.ticket.findFirst({
        where: {
          title: FIREWALL_TICKET_TITLE,
          createdById: systemUser.id,
          deviceIp: sourceIp || null,
          createdAt: { gte: duplicateSince },
          description: { contains: blockedUrl, mode: 'insensitive' }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true }
      });

      if (duplicateTicket) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          ticketId: duplicateTicket.id
        });
      }

      const descriptionLines = [
        'Firewall web-filter block detected.',
        `Category: network`,
        `Blocked URL: ${blockedUrl}`
      ];
      if (firewallDescription) {
        descriptionLines.push(`Block Description: ${firewallDescription}`);
      }
      if (sourceIp) {
        descriptionLines.push(`Source IP: ${sourceIp}`);
      }
      const finalDescription = descriptionLines.join('\n');

      const slaHours = getSLAHours();
      const slaDeadline = calculateSLADeadline(new Date());

      let assignedToId = null;
      let assignedAt = null;
      let status = 'OPEN';

      if (networkSpecialization?.id) {
        const technician = await assignTicketRoundRobin(networkSpecialization.id);
        if (technician) {
          assignedToId = technician.id;
          assignedAt = new Date();
          status = 'ASSIGNED';
        }
      }

      const ticket = await prisma.ticket.create({
        data: {
          title: FIREWALL_TICKET_TITLE,
          description: finalDescription,
          problemType: 'PREDEFINED',
          issueType: FIREWALL_TICKET_ISSUE_TYPE,
          anydeskNumber: FIREWALL_TICKET_ANYDESK,
          deviceIp: sourceIp || null,
          status,
          specializationId: networkSpecialization?.id || null,
          createdById: systemUser.id,
          assignedToId,
          assignedAt,
          slaHours,
          slaDeadline
        }
      });

      await createAuditLog(
        'FIREWALL_TICKET_CREATED',
        `Firewall auto-ticket created for blocked URL ${blockedUrl}`,
        systemUser.id,
        ticket.id,
        { blockedUrl, sourceIp, duplicateWindowMinutes: DUPLICATE_WINDOW_MINUTES }
      );

      if (assignedToId) {
        await notifyFromTemplate(
          assignedToId,
          'NEW_ASSIGNED_TICKET',
          { title: FIREWALL_TICKET_TITLE },
          'info',
          ticket.id
        );
      }

      await broadcastTicketListUpdated({
        ticketId: ticket.id,
        event: 'TICKET_CREATED',
        ticket: {
          id: ticket.id,
          createdById: ticket.createdById,
          assignedToId: ticket.assignedToId,
          specializationId: ticket.specializationId
        }
      });

      return res.status(201).json({
        success: true,
        ticketId: ticket.id
      });
    } catch (error) {
      console.error('Firewall ticket endpoint error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
