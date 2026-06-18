import {
  Controller, Get, Query, Res, UseGuards, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Daily attendance summary' })
  daily(@Query('date') date: string) {
    return this.reportsService.getDailyReport(date ?? new Date().toISOString().split('T')[0]);
  }

  @Get('range')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Attendance for a date range (JSON)' })
  range(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Query('memberId') memberId: string,
  ) {
    return this.reportsService.getRangeReport({ fromDate, toDate, memberId });
  }

  @Get('members')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'All-members attendance summary' })
  members() {
    return this.reportsService.getMembersReport({});
  }

  @Get('export/excel')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export attendance report as Excel (.xlsx)' })
  async exportExcel(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportExcel({ fromDate, toDate });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ADTP_Attendance_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('export/csv')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export attendance report as CSV' })
  async exportCsv(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.exportCsv({ fromDate, toDate });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ADTP_Attendance_${Date.now()}.csv`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('export/attendance-summary')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export attendance summary as Excel' })
  async exportAttendanceSummary(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportExcel({ fromDate, toDate });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ADTP_Attendance_Summary_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('export/member-list')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export full member list as Excel' })
  async exportMemberList(@Res() res: Response) {
    const buffer = await this.reportsService.exportMemberList();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ADTP_Member_List_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('export/inactive-members')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export inactive/absent members as Excel' })
  async exportInactiveMembers(@Res() res: Response) {
    const buffer = await this.reportsService.exportInactiveMembers();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ADTP_Inactive_Members_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(buffer);
  }
}
