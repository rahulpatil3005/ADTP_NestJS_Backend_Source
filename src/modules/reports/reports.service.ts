import { Injectable } from '@nestjs/common';
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

// ── IST Timezone Utilities ────────────────────────────────────
// Railway server runs UTC. Always pass timeZone: 'Asia/Kolkata'
// explicitly — never rely on server default timezone.

function toISTDateTime(val: string | Date | null | undefined): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function toISTDateOnly(val: string | Date | null | undefined): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function calcDuration(
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined,
): string {
  if (!checkIn || !checkOut) return '—';
  const inD  = typeof checkIn  === 'string' ? new Date(checkIn)  : checkIn;
  const outD = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;
  if (isNaN(inD.getTime()) || isNaN(outD.getTime())) return '—';
  const mins = Math.round((outD.getTime() - inD.getTime()) / 60000);
  if (mins <= 0) return '—';
  return mins >= 60
    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
    : `${mins}m`;
}

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async getDailyReport(date: string) {
    return this.db.query(
      `SELECT * FROM attendance.daily_summary WHERE session_date = $1`, [date],
    );
  }

  async getRangeReport(filters: ReportFilters) {
    const conditions = ['s.session_date IS NOT NULL'];
    const params: any[] = [];
    let idx = 1;
    if (filters.fromDate) { conditions.push(`s.session_date >= $${idx}`); params.push(filters.fromDate); idx++; }
    if (filters.toDate)   { conditions.push(`s.session_date <= $${idx}`); params.push(filters.toDate);   idx++; }
    if (filters.memberId) { conditions.push(`r.member_id = $${idx}`);     params.push(filters.memberId); idx++; }

    return this.db.query(
      `SELECT r.*, m.full_name, m.member_id AS member_code, m.instrument,
              m.mobile_number,
              s.title AS session_title, s.session_date, s.session_type
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

  // ── exportExcel ───────────────────────────────────────────
  // Columns match your screenshot exactly:
  // Member ID | Full Name | Instrument | Mobile | Status |
  // Check-In (IST) | Check-Out (IST) | Duration | Method

  async exportExcel(filters: ReportFilters): Promise<Buffer> {
    const data = await this.getRangeReport(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.columns = [
      { header: 'Member ID',        key: 'member_code',       width: 18 },
      { header: 'Full Name',        key: 'full_name',         width: 28 },
      { header: 'Instrument',       key: 'instrument',        width: 14 },
      { header: 'Mobile',           key: 'mobile_number',     width: 16 },
      { header: 'Status',           key: 'attendance_status', width: 12 },
      { header: 'Check-In (IST)',   key: 'check_in_time',     width: 24 },
      { header: 'Check-Out (IST)',  key: 'check_out_time',    width: 24 },
      { header: 'Duration',         key: 'duration',          width: 12 },
      { header: 'Method',           key: 'check_in_method',   width: 12 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3C3489' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 24;

    data.forEach((row: any, i: number) => {
      const excelRow = sheet.addRow({
        member_code:       row.member_code,
        full_name:         row.full_name,
        instrument:        row.instrument
                             ? row.instrument.charAt(0).toUpperCase() + row.instrument.slice(1)
                             : '—',
        mobile_number:     row.mobile_number,
        attendance_status: row.attendance_status?.toUpperCase(),
        // ✅ IST conversion — fixes the 5:30h offset
        check_in_time:     toISTDateTime(row.check_in_time),
        check_out_time:    toISTDateTime(row.check_out_time),
        duration:          calcDuration(row.check_in_time, row.check_out_time),
        check_in_method:   row.check_in_method ?? '—',
      });

      // Status colour coding
      const statusCell = excelRow.getCell('attendance_status');
      if (row.attendance_status === 'present')
        statusCell.font = { color: { argb: 'FF27500A' }, bold: true };
      else if (row.attendance_status === 'absent')
        statusCell.font = { color: { argb: 'FFA32D2D' }, bold: true };
      else if (row.attendance_status === 'late')
        statusCell.font = { color: { argb: 'FF854F0B' }, bold: true };

      if (i % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4FD' } };
        });
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // ── exportCsv ─────────────────────────────────────────────

  async exportCsv(filters: ReportFilters): Promise<string> {
    const data = await this.getRangeReport(filters);
    const header =
      'Member ID,Full Name,Instrument,Mobile,Status,' +
      'Check-In (IST),Check-Out (IST),Duration,Method\n';
    const rows = data.map((r: any) =>
      [
        r.member_code,
        `"${r.full_name}"`,
        r.instrument
          ? r.instrument.charAt(0).toUpperCase() + r.instrument.slice(1)
          : '',
        r.mobile_number,
        r.attendance_status?.toUpperCase(),
        // ✅ IST conversion
        toISTDateTime(r.check_in_time),
        toISTDateTime(r.check_out_time),
        calcDuration(r.check_in_time, r.check_out_time),
        r.check_in_method ?? '',
      ].join(','),
    );
    return header + rows.join('\n');
  }

  // ── exportMemberList ──────────────────────────────────────

  async exportMemberList(): Promise<Buffer> {
    const rows = await this.db.query(
      `SELECT m.member_id, m.full_name, m.mobile_number, m.email,
              m.gender, m.instrument, m.availability, m.status,
              m.joining_date, m.has_prior_pathak_exp
       FROM core.members m
       WHERE m.deleted_at IS NULL
       ORDER BY m.full_name ASC`,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    const sheet = workbook.addWorksheet('Member List');

    sheet.columns = [
      { header: 'Member ID',    key: 'member_id',           width: 18 },
      { header: 'Full Name',    key: 'full_name',           width: 28 },
      { header: 'Mobile',       key: 'mobile_number',       width: 16 },
      { header: 'Email',        key: 'email',               width: 28 },
      { header: 'Gender',       key: 'gender',              width: 10 },
      { header: 'Instrument',   key: 'instrument',          width: 14 },
      { header: 'Availability', key: 'availability',        width: 14 },
      { header: 'Status',       key: 'status',              width: 12 },
      { header: 'Joining Date', key: 'joining_date',        width: 14 },
      { header: 'Prior Exp',    key: 'has_prior_pathak_exp',width: 10 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A0112' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 24;

    rows.forEach((r: any, i: number) => {
      const row = sheet.addRow({
        ...r,
        // ✅ IST conversion
        joining_date:        r.joining_date ? toISTDateOnly(r.joining_date) : '—',
        has_prior_pathak_exp: r.has_prior_pathak_exp ? 'Yes' : 'No',
        status:              r.status?.toUpperCase(),
      });
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F1' } };
        });
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // ── exportInactiveMembers ─────────────────────────────────

  async exportInactiveMembers(): Promise<Buffer> {
    const rows = await this.db.query(
      `SELECT m.member_id, m.full_name, m.mobile_number, m.instrument, m.status,
              m.joining_date,
              MAX(s.session_date) AS last_attendance_date,
              COUNT(r.id) AS total_sessions_attended
       FROM core.members m
       LEFT JOIN attendance.records r ON r.member_id = m.id
       LEFT JOIN attendance.sessions s ON s.id = r.session_id
       WHERE m.deleted_at IS NULL AND m.status != 'active'
          OR (
            m.deleted_at IS NULL AND m.status = 'active' AND (
              SELECT MAX(s2.session_date)
              FROM attendance.records r2
              JOIN attendance.sessions s2 ON s2.id = r2.session_id
              WHERE r2.member_id = m.id
            ) < CURRENT_DATE - INTERVAL '30 days'
            OR NOT EXISTS (SELECT 1 FROM attendance.records r3 WHERE r3.member_id = m.id)
          )
       GROUP BY m.id, m.member_id, m.full_name, m.mobile_number,
                m.instrument, m.status, m.joining_date
       ORDER BY last_attendance_date ASC NULLS FIRST`,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    const sheet = workbook.addWorksheet('Inactive Members');

    sheet.columns = [
      { header: 'Member ID',         key: 'member_id',               width: 18 },
      { header: 'Full Name',         key: 'full_name',               width: 28 },
      { header: 'Mobile',            key: 'mobile_number',           width: 16 },
      { header: 'Instrument',        key: 'instrument',              width: 14 },
      { header: 'Status',            key: 'status',                  width: 12 },
      { header: 'Joining Date',      key: 'joining_date',            width: 14 },
      { header: 'Last Attended',     key: 'last_attendance_date',    width: 16 },
      { header: 'Sessions Attended', key: 'total_sessions_attended', width: 18 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A0112' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 24;

    rows.forEach((r: any, i: number) => {
      const row = sheet.addRow({
        ...r,
        // ✅ IST conversion
        joining_date:        r.joining_date        ? toISTDateOnly(r.joining_date)        : '—',
        last_attendance_date: r.last_attendance_date ? toISTDateOnly(r.last_attendance_date) : 'Never',
        status:              r.status?.toUpperCase(),
      });
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F1' } };
        });
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
