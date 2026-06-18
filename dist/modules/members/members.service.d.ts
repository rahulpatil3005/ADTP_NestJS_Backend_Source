import { DataSource } from 'typeorm';
import { CreateMemberDto, UpdateMemberDto, MemberSearchDto } from './dto/member.dto';
import { WhatsAppService } from '../../common/services/whatsapp.service';
import { SettingsService } from '../settings/settings.service';
export declare class MembersService {
    private readonly db;
    private readonly whatsapp;
    private readonly settings;
    private readonly logger;
    constructor(db: DataSource, whatsapp: WhatsAppService, settings: SettingsService);
    create(dto: CreateMemberDto, userId: string): Promise<any>;
    findAll(search: MemberSearchDto): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateMemberDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getAttendanceSummary(id: string): Promise<any>;
    bulkImport(members: CreateMemberDto[], adminId: string): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
}
