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

    if (filters.fromDate) {
      conditions.push(`s.session_date >= $${idx}`); params.push(filters.fromDate); idx++;
    }
    if (filters.toDate) {
      conditions.push(`s.session_date <= $${idx}`); params.push(filters.toDate); idx++;
    }
    if (filters.memberId) {
      conditions.push(`r.member_id = $${idx}`); params.push(filters.memberId); idx++;
    }

    return this.db.query(
      `SELECT r.*, m.full_name, m.member_id AS member_code, m.instrument,
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

  async exportExcel(filters: ReportFilters): Promise<Buffer> {
    const data = await this.getRangeReport(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.columns = [
      { header: 'Member ID',  key: 'member_code',        width: 18 },
      { header: 'Full Name',  key: 'full_name',           width: 25 },
      { header: 'Instrument', key: 'instrument',          width: 14 },
      { header: 'Session',    key: 'session_title',       width: 30 },
      { header: 'Date',       key: 'session_date',        width: 14 },
      { header: 'Status',     key: 'attendance_status',   width: 12 },
      { header: 'Check-In',   key: 'check_in_time',       width: 20 },
      { header: 'Check-Out',  key: 'check_out_time',      width: 20 },
      { header: 'Duration',   key: 'duration',            width: 12 },
      { header: 'Method',     key: 'check_in_method',     width: 12 },
    ];

    // Header styling
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3C3489' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 24;

    data.forEach((row: any, i: number) => {
      const checkIn  = row.check_in_time  ? new Date(row.check_in_time)  : null;
      const checkOut = row.check_out_time ? new Date(row.check_out_time) : null;
      let duration = '—';
      if (checkIn && checkOut) {
        const mins = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
        duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      }

      const excelRow = sheet.addRow({
        member_code:       row.member_code,
        full_name:         row.full_name,
        instrument:        row.instrument ? (row.instrument.charAt(0).toUpperCase() + row.instrument.slice(1)) : '—',
        session_title:     row.session_title,
        session_date:      row.session_date ? new Date(row.session_date).toLocaleDateString('en-IN') : '',
        attendance_status: row.attendance_status?.toUpperCase(),
        check_in_time:     checkIn  ? checkIn.toLocaleString('en-IN')  : '—',
        check_out_time:    checkOut ? checkOut.toLocaleString('en-IN') : '—',
        duration,
        check_in_method:   row.check_in_method ?? '—',
      });
      if (i % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4FD' } };
        });
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async exportCsv(filters: ReportFilters): Promise<string> {
    const data = await this.getRangeReport(filters);
    const header = 'Member ID,Full Name,Instrument,Session,Date,Status,Check-In,Check-Out,Duration,Method\n';
    const rows = data.map((r: any) => {
      const checkIn  = r.check_in_time  ? new Date(r.check_in_time)  : null;
      const checkOut = r.check_out_time ? new Date(r.check_out_time) : null;
      let duration = '';
      if (checkIn && checkOut) {
        const mins = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
        duration = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      }
      return [
        r.member_code, `"${r.full_name}"`, r.instrument ? (r.instrument.charAt(0).toUpperCase() + r.instrument.slice(1)) : '',
        `"${r.session_title}"`, r.session_date,
        r.attendance_status,
        checkIn  ? checkIn.toLocaleString('en-IN')  : '',
        checkOut ? checkOut.toLocaleString('en-IN') : '',
        duration,
        r.check_in_method ?? '',
      ].join(',');
    });
    return header + rows.join('\n');
  }

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
      { header: 'Full Name',    key: 'full_name',            width: 28 },
      { header: 'Mobile',       key: 'mobile_number',        width: 16 },
      { header: 'Email',        key: 'email',                width: 28 },
      { header: 'Gender',       key: 'gender',               width: 10 },
      { header: 'Instrument',   key: 'instrument',           width: 14 },
      { header: 'Availability', key: 'availability',         width: 14 },
      { header: 'Status',       key: 'status',               width: 12 },
      { header: 'Joining Date', key: 'joining_date',         width: 14 },
      { header: 'Prior Exp',    key: 'has_prior_pathak_exp', width: 10 },
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
        joining_date: r.joining_date ? new Date(r.joining_date).toLocaleDateString('en-IN') : '—',
        has_prior_pathak_exp: r.has_prior_pathak_exp ? 'Yes' : 'No',
        status: r.status?.toUpperCase(),
      });
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F1' } };
        });
      }
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

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
       GROUP BY m.id, m.member_id, m.full_name, m.mobile_number, m.instrument, m.status, m.joining_date
       ORDER BY last_attendance_date ASC NULLS FIRST`,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Avishkar DHTP System';
    const sheet = workbook.addWorksheet('Inactive Members');

    sheet.columns = [
      { header: 'Member ID',          key: 'member_id',              width: 18 },
      { header: 'Full Name',          key: 'full_name',              width: 28 },
      { header: 'Mobile',             key: 'mobile_number',          width: 16 },
      { header: 'Instrument',         key: 'instrument',             width: 14 },
      { header: 'Status',             key: 'status',                 width: 12 },
      { header: 'Joining Date',       key: 'joining_date',           width: 14 },
      { header: 'Last Attended',      key: 'last_attendance_date',   width: 16 },
      { header: 'Sessions Attended',  key: 'total_sessions_attended', width: 18 },
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
        joining_date: r.joining_date ? new Date(r.joining_date).toLocaleDateString('en-IN') : '—',
        last_attendance_date: r.last_attendance_date ? new Date(r.last_attendance_date).toLocaleDateString('en-IN') : 'Never',
        status: r.status?.toUpperCase(),
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
