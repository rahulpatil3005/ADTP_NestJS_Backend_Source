import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get('super-admin')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Super Admin dashboard aggregates' })
  async superAdminDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const [members, today_summary, recent_regs, admins, weekly] = await Promise.all([
      this.db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') AS active_members,
          COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_members,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_members,
          COUNT(*) AS total_members
        FROM core.members WHERE deleted_at IS NULL
      `),
      this.db.query(
        `SELECT * FROM attendance.daily_summary WHERE session_date = $1`, [today],
      ),
      this.db.query(`
        SELECT id, member_id, full_name, instrument, status, joining_date, photo_url
        FROM core.members WHERE deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 10
      `),
      this.db.query(`SELECT COUNT(*) AS total_admins FROM core.admins`),
      this.db.query(`
        SELECT session_date,
               SUM(present_count) AS present,
               SUM(absent_count) AS absent,
               ROUND(AVG(attendance_percentage), 2) AS avg_percentage
        FROM attendance.daily_summary
        WHERE session_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY session_date ORDER BY session_date ASC
      `),
    ]);

    return {
      members: members[0],
      todaySummary: today_summary[0] ?? null,
      recentRegistrations: recent_regs,
      totalAdmins: Number(admins[0].total_admins),
      weeklyTrend: weekly,
    };
  }

  @Get('admin')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Admin dashboard aggregates' })
  async adminDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const [todaySummary, totalMembers, recentActivity] = await Promise.all([
      this.db.query(
        `SELECT * FROM attendance.daily_summary WHERE session_date = $1`, [today],
      ),
      this.db.query(
        `SELECT COUNT(*) FROM core.members WHERE status = 'active' AND deleted_at IS NULL`,
      ),
      this.db.query(`
        SELECT r.*, m.full_name, m.member_id AS member_code, s.title AS session_title
        FROM attendance.records r
        JOIN core.members m ON m.id = r.member_id
        JOIN attendance.sessions s ON s.id = r.session_id
        ORDER BY r.created_at DESC LIMIT 20
      `),
    ]);

    return {
      todaySummary: todaySummary[0] ?? null,
      totalActiveMembers: Number(totalMembers[0].count),
      recentActivity,
    };
  }

  @Get('member/:userId/summary')
  @Roles('super_admin', 'admin', 'member')
  @ApiOperation({ summary: 'Member personal dashboard' })
  async memberDashboard(@Query('userId') userId: string) {
    const memberRows = await this.db.query(
      `SELECT id FROM core.members WHERE user_id = $1`, [userId],
    );
    if (!memberRows.length) return null;
    const memberId = memberRows[0].id;
    const summary = await this.db.query(
      `SELECT * FROM core.member_attendance_summary WHERE member_id = $1`, [memberId],
    );
    return summary[0] ?? {};
  }
}
