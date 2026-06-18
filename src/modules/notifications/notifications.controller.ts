import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService, SendNotificationDto } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Send push notification to users or a role' })
  send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Post('register-token')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  registerToken(
    @CurrentUser('id') userId: string,
    @Body() body: { fcmToken: string; platform: string; deviceName?: string },
  ) {
    return this.notificationsService.registerToken(
      userId, body.fcmToken, body.platform, body.deviceName,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my notifications' })
  myNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.notificationsService.getUserNotifications(
      userId, Number(page ?? 1), Number(limit ?? 20),
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markRead(id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
