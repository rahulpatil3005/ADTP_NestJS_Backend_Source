import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles('super_admin', 'admin')
  getAll() {
    return this.settings.getAll();
  }

  @Patch()
  @Roles('super_admin')
  async update(
    @Body() body: { key: string; value: any },
    @CurrentUser('id') userId: string,
  ) {
    return this.settings.set(body.key, body.value, userId);
  }
}
