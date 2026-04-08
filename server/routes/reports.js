import express from 'express';
import * as XLSX from 'xlsx';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDepartmentReport,
  getAchievementExportRows,
  getEngineerReport,
  getSummaryReport,
  normalizeExportType,
  parseAchievementExportFilters,
  parseReportFilters,
  serializeAppliedFilters
} from '../services/reportsService.js';

const router = express.Router();

const handleError = (res, error, context) => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error(`${context} error:`, error);
  return res.status(500).json({ error: 'Server error' });
};

router.use(authenticate, authorize('IT_ADMIN', 'SUPER_ADMIN'));

router.get('/department', async (req, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const rows = await getDepartmentReport(filters);
    res.json({
      rows,
      filters: serializeAppliedFilters(filters)
    });
  } catch (error) {
    return handleError(res, error, 'Get department report');
  }
});

router.get('/engineer', async (req, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const rows = await getEngineerReport(filters);
    res.json({
      rows,
      filters: serializeAppliedFilters(filters)
    });
  } catch (error) {
    return handleError(res, error, 'Get engineer report');
  }
});

router.get('/summary', async (req, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const summary = await getSummaryReport(filters);
    res.json({
      ...summary,
      filters: serializeAppliedFilters(filters)
    });
  } catch (error) {
    return handleError(res, error, 'Get summary report');
  }
});

router.get('/export', async (req, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const reportType = normalizeExportType(req.query.reportType);

    const rows =
      reportType === 'engineer'
        ? await getEngineerReport(filters)
        : await getDepartmentReport(filters);

    const sheetRows = rows.map((row) => ({
      Name: row.name,
      'Total Tickets': row.totalTickets,
      'Open Tickets': row.openTickets,
      'Closed Tickets': row.closedTickets
    }));
    const worksheet =
      sheetRows.length > 0
        ? XLSX.utils.json_to_sheet(sheetRows)
        : XLSX.utils.aoa_to_sheet([['Name', 'Total Tickets', 'Open Tickets', 'Closed Tickets']]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      reportType === 'engineer' ? 'Engineer Report' : 'Department Report'
    );

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `report-${reportType}-${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    return handleError(res, error, 'Export report');
  }
});

router.get('/achievements/export', async (req, res) => {
  try {
    const filters = parseAchievementExportFilters(req.query);
    const rows = await getAchievementExportRows(filters);

    const sheetRows = rows.map((row) => ({
      'User Name': row.userName,
      'Achievement Title': row.title,
      'Achievement Description': row.description,
      'Created Date': row.createdAt.toISOString()
    }));
    const worksheet =
      sheetRows.length > 0
        ? XLSX.utils.json_to_sheet(sheetRows)
        : XLSX.utils.aoa_to_sheet([
            ['User Name', 'Achievement Title', 'Achievement Description', 'Created Date']
          ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Achievements');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `achievements-report-${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    return handleError(res, error, 'Export achievements report');
  }
});

router.get('/achievements', async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const filters = parseAchievementExportFilters(req.query);
    if (!filters.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const achievements = await getAchievementExportRows(filters);
    res.json({
      achievements,
      filters: {
        userId: filters.userId,
        dateFrom: filters.dateFrom ? filters.dateFrom.toISOString() : null,
        dateTo: filters.dateTo ? filters.dateTo.toISOString() : null
      }
    });
  } catch (error) {
    return handleError(res, error, 'Get achievements report data');
  }
});

export default router;
