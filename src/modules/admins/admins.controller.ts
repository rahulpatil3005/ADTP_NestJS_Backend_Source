import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminsService, CreateAdminDto, UpdateAdminDto } from './admins.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new admin (super_admin only)' })
  create(@Body() dto: CreateAdminDto, @CurrentUser('id') createdBy: string) {
    return this.adminsService.create(dto, createdBy);
  }

  @Get()
  @ApiOperation({ summary: 'List all admins' })
  findAll() {
    return this.adminsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin profile' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin details (name, email, phone)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    return this.adminsService.update(id, dto);
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update admin permissions' })
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { permissions: Record<string, boolean> },
  ) {
    return this.adminsService.updatePermissions(id, body.permissions);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate admin account' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminsService.toggleActive(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate admin account' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminsService.toggleActive(id, false);
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset admin password' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { newPassword: string },
  ) {
    return this.adminsService.resetPassword(id, body.newPassword);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete admin account permanently' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminsService.remove(id);
  }
}
