import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { getSLAStatus } from '../utils/sla.js';

const router = express.Router();
const prisma = new PrismaClient();
const ENGINEER_ROLES = ['TECHNICIAN', 'SOFTWARE_ENGINEER'];

// Get dashboard data based on role
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    let dashboardData = {};

    if (user.role === 'USER') {
      // User dashboard: all tickets they created + full stats for filters
      const tickets = await prisma.ticket.findMany({
        where: { createdById: user.id },
        include: {
          assignedTo: {
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });

      dashboardData = {
        tickets: tickets.map(ticket => ({
          ...ticket,
          slaStatus: getSLAStatus(ticket.slaDeadline)
        })),
        stats: {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'OPEN').length,
          inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: tickets.filter(t => t.status === 'RESOLVED').length,
          closed: tickets.filter(t => t.status === 'CLOSED').length
        }
      };
    } else if (ENGINEER_ROLES.includes(user.role)) {
      // Engineer dashboard: assigned tickets
      const tickets = await prisma.ticket.findMany({
        where: { assignedToId: user.id },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });

      dashboardData = {
        tickets: tickets.map(ticket => ({
          ...ticket,
          slaStatus: getSLAStatus(ticket.slaDeadline)
        })),
        stats: {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'OPEN').length,
          assigned: tickets.filter(t => t.status === 'ASSIGNED').length,
          inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: tickets.filter(t => t.status === 'RESOLVED').length,
          closed: tickets.filter(t => t.status === 'CLOSED').length,
          overdue: tickets.filter(t => getSLAStatus(t.slaDeadline) === 'OVERDUE').length
        }
      };
    } else if (user.role === 'IT_ADMIN') {
      // IT Admin dashboard: only tickets assigned to IT Admin team
      // Find IT Admin specialization
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });

      const tickets = await prisma.ticket.findMany({
        where: {
          specializationId: itAdminSpec ? itAdminSpec.id : null
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: {
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });

      dashboardData = {
        tickets: tickets.map(ticket => ({
          ...ticket,
          slaStatus: getSLAStatus(ticket.slaDeadline)
        })),
        stats: {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'OPEN').length,
          assigned: tickets.filter(t => t.status === 'ASSIGNED').length,
          inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: tickets.filter(t => t.status === 'RESOLVED').length,
          closed: tickets.filter(t => t.status === 'CLOSED').length,
          overdue: tickets.filter(t => getSLAStatus(t.slaDeadline) === 'OVERDUE').length
        }
      };
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'IT_MANAGER') {
      // IT Manager dashboard: all tickets and reports
      const tickets = await prisma.ticket.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: {
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const technicians = await prisma.user.findMany({
        where: { role: { in: ENGINEER_ROLES } },
        include: {
          specialization: true,
          _count: {
            select: {
              assignedTickets: {
                where: {
                  status: { not: 'CLOSED' }
                }
              }
            }
          }
        }
      });

      dashboardData = {
        tickets: tickets.map(ticket => ({
          ...ticket,
          slaStatus: getSLAStatus(ticket.slaDeadline)
        })),
        technicians: technicians.map(tech => ({
          id: tech.id,
          name: tech.name,
          email: tech.email,
          status: tech.isOnline ? 'ONLINE' : 'OFFLINE',
          specialization: tech.specialization,
          activeTickets: tech._count.assignedTickets
        })),
        stats: {
          totalTickets: tickets.length,
          open: tickets.filter(t => t.status === 'OPEN').length,
          inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: tickets.filter(t => t.status === 'RESOLVED').length,
          closed: tickets.filter(t => t.status === 'CLOSED').length,
          overdue: tickets.filter(t => getSLAStatus(t.slaDeadline) === 'OVERDUE').length,
          totalTechnicians: technicians.length,
          availableTechnicians: technicians.filter(t => t.isOnline).length
        }
      };
    } else if (user.role === 'SUPER_ADMIN') {
      // Super Admin sees everything like IT Manager
      const tickets = await prisma.ticket.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: {
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const technicians = await prisma.user.findMany({
        where: { role: { in: ENGINEER_ROLES } },
        include: {
          specialization: true,
          _count: {
            select: {
              assignedTickets: {
                where: {
                  status: { not: 'CLOSED' }
                }
              }
            }
          }
        }
      });

      const allUsers = await prisma.user.findMany({
        include: {
          specialization: true
        }
      });

      dashboardData = {
        tickets: tickets.map(ticket => ({
          ...ticket,
          slaStatus: getSLAStatus(ticket.slaDeadline)
        })),
        technicians: technicians.map(tech => ({
          id: tech.id,
          name: tech.name,
          email: tech.email,
          status: tech.isOnline ? 'ONLINE' : 'OFFLINE',
          specialization: tech.specialization,
          activeTickets: tech._count.assignedTickets
        })),
        users: allUsers,
        stats: {
          totalTickets: tickets.length,
          open: tickets.filter(t => t.status === 'OPEN').length,
          inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: tickets.filter(t => t.status === 'RESOLVED').length,
          closed: tickets.filter(t => t.status === 'CLOSED').length,
          overdue: tickets.filter(t => getSLAStatus(t.slaDeadline) === 'OVERDUE').length,
          totalTechnicians: technicians.length,
          availableTechnicians: technicians.filter(t => t.isOnline).length,
          totalUsers: allUsers.length
        }
      };
    }

    res.json({ dashboard: dashboardData });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

