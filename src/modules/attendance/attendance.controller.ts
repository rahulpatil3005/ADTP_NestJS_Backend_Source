import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';
import {
  CreateSessionDto, QrScanDto, MarkAttendanceDto, AttendanceFilterDto,
} from './dto/attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── Sessions ─────────────────────────────────────────────

  @Post('sessions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new practice/event session' })
  createSession(
    @Body() dto: CreateSessionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.attendanceService.createSession(dto, adminId);
  }

  @Get('sessions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List all sessions' })
  getSessions(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.attendanceService.getSessions(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('sessions/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get session with attendance summary' })
  getSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.getSession(id);
  }

  @Get('sessions/:id/records')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get all attendance records for a session' })
  getSessionAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filter: AttendanceFilterDto,
  ) {
    return this.attendanceService.getSessionAttendance(id, filter);
  }

  @Delete('sessions/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a session and all its attendance records' })
  deleteSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.deleteSession(id);
  }

  // ── QR Scan — critical path, throttled ───────────────────

  @Post('scan')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @ApiOperation({ summary: 'Process a QR code scan and mark attendance' })
  scan(
    @Body() dto: QrScanDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.attendanceService.processQrScan(dto, adminId);
  }

  // ── Manual mark ──────────────────────────────────────────

  @Post('mark')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually mark attendance for a member' })
  markManual(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.attendanceService.markManual(dto, adminId);
  }

  // ── Member history ───────────────────────────────────────

  @Get('member/:memberId')
  @Roles('super_admin', 'admin', 'member')
  @ApiOperation({ summary: 'Get attendance history for a specific member' })
  getMemberHistory(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query() filter: AttendanceFilterDto,
  ) {
    return this.attendanceService.getMemberHistory(memberId, filter);
  }

  // ── Face Scan — mark attendance by face recognition ──────

  @Post('face-scan')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mark attendance by face recognition (alternative to QR scan)' })
  @UseInterceptors(FileInterceptor('photo'))
  async faceScan(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId: string,
    @CurrentUser('id') adminId: string,
  ) {
    if (!file) throw new BadRequestException('Photo is required');
    if (!sessionId) throw new BadRequestException('sessionId is required');
    return this.attendanceService.processFaceScan(sessionId, file.buffer, adminId);
  }
}
