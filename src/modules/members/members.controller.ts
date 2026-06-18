import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto, MemberSearchDto } from './dto/member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // POST /members — Register new member (admin+)
  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Register a new member' })
  create(
    @Body() dto: CreateMemberDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.membersService.create(dto, adminId);
  }

  // GET /members — List members with search & pagination
  @Get()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List all members (paginated, filterable)' })
  findAll(@Query() search: MemberSearchDto) {
    return this.membersService.findAll(search);
  }

  // GET /members/:id
  @Get(':id')
  @Roles('super_admin', 'admin', 'member')
  @ApiOperation({ summary: 'Get member profile' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.findOne(id);
  }

  // PATCH /members/:id
  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update member profile' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(id, dto);
  }

  // DELETE /members/:id
  @Delete(':id')
  @Roles('super_admin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate (soft-delete) a member' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.remove(id);
  }

  // GET /members/:id/attendance-summary
  @Get(':id/attendance-summary')
  @Roles('super_admin', 'admin', 'member')
  @ApiOperation({ summary: 'Get member attendance statistics' })
  attendanceSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.membersService.getAttendanceSummary(id);
  }

  // POST /members/bulk-import
  @Post('bulk-import')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Bulk import members from parsed Excel data (JSON array)' })
  bulkImport(
    @Body() body: { members: CreateMemberDto[] },
    @CurrentUser('id') adminId: string,
  ) {
    return this.membersService.bulkImport(body.members, adminId);
  }
}
