import { Controller, Get, Post, Body, Param, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('qr')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('download-all-zip')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Download all active member QR cards as a ZIP (super admin only)' })
  async downloadAllZip(@Res() res: Response) {
    const buffer = await this.qrService.downloadAllQrZip();
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="ADTP_QR_Cards_${date}.zip"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('member/:id')
  @Roles('super_admin', 'admin', 'member')
  @ApiOperation({ summary: 'Get or generate QR code for a member' })
  getQr(@Param('id', ParseUUIDPipe) id: string) {
    return this.qrService.getQrForMember(id);
  }

  @Post('member/:id/regenerate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Regenerate QR code (invalidates existing)' })
  regenerate(@Param('id', ParseUUIDPipe) id: string) {
    return this.qrService.generateForMember(id);
  }

  @Post('bulk-generate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Bulk generate QR codes for multiple members' })
  bulkGenerate(@Body() body: { memberIds: string[] }) {
    return this.qrService.generateBulk(body.memberIds);
  }
}
