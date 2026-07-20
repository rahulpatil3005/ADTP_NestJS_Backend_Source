import {
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  sessionId?: string;
  memberId?: string;
  instrument?: string;
  format?: 'json' | 'excel' | 'csv';
}

// ── IST Timezone Utility ─────────────────────────────────────
// IST = UTC + 5 hours 30 minutes
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Converts a UTC Date/string to IST and returns a formatted string.
 * e.g. "26/6/2026, 7:45 pm" instead of "26/6/2026, 2:15 pm"
 */
function toIST(utcDate: string | Date | null | undefined): string {
  if (!utcDate) return '—';
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  if (isNaN(date.getTime())) return '—';
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns just the IST time portion e.g. "7:45 pm"
 */
function toISTTimeOnly(utcDate: string | Date | null | undefined): string {
  if (!utcDate) return '—';
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns just the IST date portion e.g. "26/6/2026"
 */
function toISTDateOnly(utcDate: string | Date | null | undefined): string {
  if (!utcDate) return '—';
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculates duration between check-in and check-out in "Xh Ym" format.
 * Both inputs should be UTC timestamps.
 */
function calcDuration(
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined,
): string {
  if (!checkIn || !checkOut) return '—';
  const inDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
  const outDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;
  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return '—';
  const diffMs = outDate.getTime() - inDate.getTime();
  if (diffMs <= 0) return '—';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async getDailyReport(date: string) {
    return this.db.query(
      `SELECT * FROM attendance.daily_summary WHERE session_date = $1`,
      [date],
    );
  }

  async getRangeReport(filters: ReportFilters) {
    const conditions = ['s.session_date IS NOT NULL'];
    const params: any[] = [];
    let idx = 1;

    if (filters.fromDate) {
      conditions.push(`s.session_date >= $${idx}`);
      params.push(filters.fromDate);
      idx++;
    }
    if (filters.toDate) {
      conditions.push(`s.session_date <= $${idx}`);
      params.push(filters.toDate);
      idx++;
    }
    if (filters.memberId) {
      conditions.push(`r.member_id = $${idx}`);
      params.push(filters.memberId);
      idx++;
    }

    return this.db.query(
      `SELECT
         r.*,
         m.full_name,
         m.member_id AS member_code,
         m.instrument,
         m.mobile_number,
         s.title AS session_title,
         s.session_date,
         s.session_type
       FROM attendance.records r
       JOIN core.members m ON m.id = r.member_id
       JOIN attendance.sessions s ON s.id = r.session_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.session_date DESC, m.full_name ASC`,
      params,
    );
  }

  async getMembersReport(filters: ReportFilters) {
    return this.db.query(`
      SELECT mas.*, m.mobile_number, m.email, m.joining_date, m.current_status
      FROM core.member_attendance_summary mas
      JOIN core.members m ON m.id = mas.member_id
      WHERE m.deleted_at IS NULL
      ORDER BY mas.attendance_percentage DESC
    `);
  }

  // ── Excel Export (IST timestamps) ────────────────────────────

  async exportExcel(filters: ReportFilters): Promise<Buffer> {
    const data = await this.getRangeReport(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // ── Header row ───────────────────────────────────────────
    sheet.columns = [
      { header: 'Member ID',   key: 'member_code',       width: 18 },
      { header: 'Full Name',   key: 'full_name',          width: 26 },
      { header: 'Instrument',  key: 'instrument',         width: 14 },
      { header: 'Mobile',      key: 'mobile_number',      width: 16 },
      { header: 'Status',      key: 'attendance_status',  width: 12 },
      { header: 'Date (IST)',  key: 'session_date',       width: 16 },
      { header: 'Check-In (IST)',  key: 'check_in_time',  width: 18 },
      { header: 'Check-Out (IST)', key: 'check_out_time', width: 18 },
      { header: 'Duration',    key: 'duration',           width: 12 },
      { header: 'Method',      key: 'check_in_method',    width: 12 },
    ];

    // Style header row
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3C3489' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 26;

    // ── Data rows — all timestamps converted to IST ──────────
    data.forEach((row: any, i: number) => {
      const excelRow = sheet.addRow({
        member_code:       row.member_code,
        full_name:         row.full_name,
        instrument:        row.instrument,
        mobile_number:     row.mobile_number,

        // Status — uppercase for clarity
        attendance_status: row.attendance_status?.toUpperCase(),

        // ✅ FIX: Convert all timestamps to IST before writing
        session_date:      toISTDateOnly(row.session_date),
        check_in_time:     toISTTimeOnly(row.check_in_time),
        check_out_time:    toISTTimeOnly(row.check_out_time),

        // ✅ FIX: Duration calculated from raw UTC values (correct)
        duration:          calcDuration(row.check_in_time, row.check_out_time),

        check_in_method:   row.check_in_method ?? '—',
      });

      // Alternating row background
      if (i % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F4FD' },
          };
        });
      }

      // Color-code status cell
      const statusCell = excelRow.getCell('attendance_status');
      if (row.attendance_status === 'present') {
        statusCell.font = { color: { argb: 'FF27500A' }, bold: true };
      } else if (row.attendance_status === 'absent') {
        statusCell.font = { color: { argb: 'FFA32D2D' }, bold: true };
      } else if (row.attendance_status === 'late') {
        statusCell.font = { color: { argb: 'FF854F0B' }, bold: true };
      }
    });

    // ── Footer row with IST note ─────────────────────────────
    sheet.addRow([]);
    const noteRow = sheet.addRow([
      `All times shown in Indian Standard Time (IST, UTC+5:30)`,
    ]);
    noteRow.getCell(1).font = {
      italic: true,
      color: { argb: 'FF666666' },
      size: 10,
    };
    sheet.mergeCells(`A${noteRow.number}:J${noteRow.number}`);

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  // ── CSV Export (IST timestamps) ───────────────────────────

  async exportCsv(filters: ReportFilters): Promise<string> {
    const data = await this.getRangeReport(filters);

    // ✅ FIX: note in header that times are IST
    const header =
      'Member ID,Full Name,Instrument,Mobile,Status,Date (IST),Check-In (IST),Check-Out (IST),Duration,Method\n';

    const rows = data.map((r: any) =>
      [
        r.member_code,
        `"${r.full_name}"`,
        r.instrument,
        r.mobile_number,
        r.attendance_status?.toUpperCase(),

        // ✅ FIX: IST conversion for all time columns
        toISTDateOnly(r.session_date),
        toISTTimeOnly(r.check_in_time),
        toISTTimeOnly(r.check_out_time),
        calcDuration(r.check_in_time, r.check_out_time),

        r.check_in_method ?? '—',
      ].join(','),
    );

    return header + rows.join('\n');
  }
}
