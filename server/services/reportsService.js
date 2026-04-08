import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLOSED_STATUS = 'CLOSED';
const SUPPORTED_RANGES = new Set([
  'CUSTOM',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUAL',
  'YEARLY'
]);
const SUPPORTED_DATE_FIELDS = new Set(['createdAt', 'updatedAt']);

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const normalizeId = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

const normalizeDateField = (value) => {
  if (!value) return 'createdAt';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'created' || normalized === 'createdat') return 'createdAt';
  if (normalized === 'updated' || normalized === 'updatedat') return 'updatedAt';
  fail(400, 'Invalid dateField. Use createdAt or updatedAt');
};

const normalizeRange = (value) => {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'SEMIANNUAL') return 'SEMI_ANNUAL';
  if (normalized === 'HALFYEAR' || normalized === 'HALF_YEAR') return 'SEMI_ANNUAL';
  if (!SUPPORTED_RANGES.has(normalized)) {
    fail(
      400,
      'Invalid range. Use CUSTOM, WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUAL, or YEARLY'
    );
  }
  return normalized;
};

const buildPredefinedRange = (range) => {
  const now = new Date();
  const to = endOfDay(now);
  let from = null;

  if (range === 'WEEKLY') {
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - distanceFromMonday);
    from = startOfDay(weekStart);
  } else if (range === 'MONTHLY') {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  } else if (range === 'QUARTERLY') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    from = startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1));
  } else if (range === 'SEMI_ANNUAL') {
    const halfStartMonth = now.getMonth() < 6 ? 0 : 6;
    from = startOfDay(new Date(now.getFullYear(), halfStartMonth, 1));
  } else if (range === 'YEARLY') {
    from = startOfDay(new Date(now.getFullYear(), 0, 1));
  }

  return { dateFrom: from, dateTo: to };
};

export const parseReportFilters = (query = {}) => {
  const dateField = normalizeDateField(query.dateField);
  if (!SUPPORTED_DATE_FIELDS.has(dateField)) {
    fail(400, 'Invalid dateField. Use createdAt or updatedAt');
  }

  const rangeInput = query.range || query.predefinedRange || null;
  const range = normalizeRange(rangeInput);

  let dateFrom = null;
  let dateTo = null;

  if (range && range !== 'CUSTOM') {
    const predefined = buildPredefinedRange(range);
    dateFrom = predefined.dateFrom;
    dateTo = predefined.dateTo;
  } else {
    const parsedFrom = parseDateInput(query.dateFrom, 'dateFrom');
    const parsedTo = parseDateInput(query.dateTo, 'dateTo');
    dateFrom = parsedFrom ? startOfDay(parsedFrom) : null;
    dateTo = parsedTo ? endOfDay(parsedTo) : null;
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    fail(400, 'dateFrom cannot be after dateTo');
  }

  return {
    departmentId: normalizeId(query.departmentId),
    engineerId: normalizeId(query.engineerId),
    dateField,
    dateFrom,
    dateTo,
    range: range || null
  };
};

export const parseAchievementExportFilters = (query = {}) => {
  const dateFrom = query.dateFrom ? startOfDay(parseDateInput(query.dateFrom, 'dateFrom')) : null;
  const dateTo = query.dateTo ? endOfDay(parseDateInput(query.dateTo, 'dateTo')) : null;

  if (dateFrom && dateTo && dateFrom > dateTo) {
    fail(400, 'dateFrom cannot be after dateTo');
  }

  return {
    userId: normalizeId(query.userId),
    dateFrom,
    dateTo
  };
};

const buildTicketWhere = (filters) => {
  const where = {};

  if (filters.departmentId) {
    where.specializationId = filters.departmentId;
  }

  if (filters.engineerId) {
    where.assignedToId = filters.engineerId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where[filters.dateField] = {};
    if (filters.dateFrom) {
      where[filters.dateField].gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where[filters.dateField].lte = filters.dateTo;
    }
  }

  return where;
};

const summarizeStatuses = (statusCounts) => {
  let totalTickets = 0;
  let closedTickets = 0;

  statusCounts.forEach((count, status) => {
    totalTickets += count;
    if (status === CLOSED_STATUS) {
      closedTickets += count;
    }
  });

  return {
    totalTickets,
    closedTickets,
    openTickets: totalTickets - closedTickets
  };
};

export const getDepartmentReport = async (filters) => {
  let selectedDepartment = null;
  if (filters.departmentId) {
    selectedDepartment = await prisma.specialization.findUnique({
      where: { id: filters.departmentId },
      select: { id: true, name: true }
    });
    if (!selectedDepartment) {
      fail(404, 'Department not found');
    }
  }

  const grouped = await prisma.ticket.groupBy({
    by: ['specializationId', 'status'],
    where: buildTicketWhere(filters),
    _count: { _all: true }
  });

  const countsByDepartment = new Map();
  grouped.forEach((row) => {
    const key = row.specializationId || '__UNASSIGNED__';
    if (!countsByDepartment.has(key)) {
      countsByDepartment.set(key, new Map());
    }
    const statusMap = countsByDepartment.get(key);
    statusMap.set(row.status, (statusMap.get(row.status) || 0) + row._count._all);
  });

  const specializationIds = Array.from(countsByDepartment.keys())
    .filter((key) => key !== '__UNASSIGNED__');
  const departments = specializationIds.length
    ? await prisma.specialization.findMany({
        where: { id: { in: specializationIds } },
        select: { id: true, name: true }
      })
    : [];
  const departmentNameById = new Map(departments.map((item) => [item.id, item.name]));

  const rows = Array.from(countsByDepartment.entries()).map(([departmentKey, statusMap]) => {
    const summary = summarizeStatuses(statusMap);
    const isUnassigned = departmentKey === '__UNASSIGNED__';
    const departmentId = isUnassigned ? null : departmentKey;
    const departmentName = isUnassigned
      ? 'Unassigned'
      : departmentNameById.get(departmentKey) || 'Unknown';

    return {
      id: departmentId,
      name: departmentName,
      departmentName,
      totalTickets: summary.totalTickets,
      openTickets: summary.openTickets,
      closedTickets: summary.closedTickets
    };
  });

  if (filters.departmentId && rows.length === 0 && selectedDepartment) {
    rows.push({
      id: selectedDepartment.id,
      name: selectedDepartment.name,
      departmentName: selectedDepartment.name,
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
};

export const getEngineerReport = async (filters) => {
  let selectedEngineer = null;
  if (filters.engineerId) {
    selectedEngineer = await prisma.user.findUnique({
      where: { id: filters.engineerId },
      select: { id: true, name: true }
    });
    if (!selectedEngineer) {
      fail(404, 'Engineer not found');
    }
  }

  const where = buildTicketWhere(filters);
  if (!filters.engineerId) {
    where.assignedToId = { not: null };
  }

  const grouped = await prisma.ticket.groupBy({
    by: ['assignedToId', 'status'],
    where,
    _count: { _all: true }
  });

  const countsByEngineer = new Map();
  grouped.forEach((row) => {
    const key = row.assignedToId || '__UNASSIGNED__';
    if (!countsByEngineer.has(key)) {
      countsByEngineer.set(key, new Map());
    }
    const statusMap = countsByEngineer.get(key);
    statusMap.set(row.status, (statusMap.get(row.status) || 0) + row._count._all);
  });

  const engineerIds = Array.from(countsByEngineer.keys()).filter(
    (key) => key !== '__UNASSIGNED__'
  );
  const engineers = engineerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: engineerIds } },
        select: { id: true, name: true }
      })
    : [];
  const engineerNameById = new Map(engineers.map((item) => [item.id, item.name]));

  const rows = Array.from(countsByEngineer.entries()).map(([engineerKey, statusMap]) => {
    const summary = summarizeStatuses(statusMap);
    const isUnassigned = engineerKey === '__UNASSIGNED__';
    const engineerId = isUnassigned ? null : engineerKey;
    const engineerName = isUnassigned
      ? 'Unassigned'
      : engineerNameById.get(engineerKey) || 'Unknown';

    return {
      id: engineerId,
      name: engineerName,
      engineerName,
      totalTickets: summary.totalTickets,
      openTickets: summary.openTickets,
      closedTickets: summary.closedTickets
    };
  });

  if (filters.engineerId && rows.length === 0 && selectedEngineer) {
    rows.push({
      id: selectedEngineer.id,
      name: selectedEngineer.name,
      engineerName: selectedEngineer.name,
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
};

export const getSummaryReport = async (filters) => {
  const grouped = await prisma.ticket.groupBy({
    by: ['status'],
    where: buildTicketWhere(filters),
    _count: { _all: true }
  });

  let totalTickets = 0;
  let closedTickets = 0;

  grouped.forEach((row) => {
    totalTickets += row._count._all;
    if (row.status === CLOSED_STATUS) {
      closedTickets += row._count._all;
    }
  });

  return {
    totalTickets,
    openTickets: totalTickets - closedTickets,
    closedTickets
  };
};

export const getAchievementExportRows = async (filters) => {
  if (filters.userId) {
    const selectedUser = await prisma.user.findUnique({
      where: { id: filters.userId },
      select: { id: true }
    });

    if (!selectedUser) {
      fail(404, 'User not found');
    }
  }

  const where = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.createdAt.lte = filters.dateTo;
    }
  }

  const achievements = await prisma.achievement.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return achievements.map((achievement) => ({
    id: achievement.id,
    userId: achievement.user.id,
    userName: achievement.user.name,
    title: achievement.title,
    description: achievement.description,
    createdAt: achievement.createdAt
  }));
};

export const normalizeExportType = (value) => {
  if (!value) return 'department';
  const normalized = String(value).trim().toLowerCase();
  if (normalized !== 'department' && normalized !== 'engineer') {
    fail(400, 'Invalid reportType. Use department or engineer');
  }
  return normalized;
};

export const serializeAppliedFilters = (filters) => ({
  departmentId: filters.departmentId,
  engineerId: filters.engineerId,
  dateField: filters.dateField,
  dateFrom: filters.dateFrom ? filters.dateFrom.toISOString() : null,
  dateTo: filters.dateTo ? filters.dateTo.toISOString() : null,
  range: filters.range
});
