import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { specialization: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Super Admin has access to everything
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Super Admin has all permissions
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const permissions = {
      USER: ['create_ticket'],
      TECHNICIAN: ['create_ticket', 'update_ticket_status'],
      SOFTWARE_ENGINEER: ['create_ticket', 'update_ticket_status'],
      IT_ADMIN: ['create_ticket', 'update_ticket_status'],
      IT_MANAGER: ['create_ticket', 'add_specialization', 'add_user', 'add_technician', 'add_admin', 'view_all_tickets']
    };

    const userPermissions = permissions[req.user.role] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
};

