import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto, MemberSearchDto } from './dto/member.dto';
export declare class MembersController {
    private readonly membersService;
    constructor(membersService: MembersService);
    create(dto: CreateMemberDto, adminId: string): Promise<any>;
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
    attendanceSummary(id: string): Promise<any>;
    bulkImport(body: {
        members: CreateMemberDto[];
    }, adminId: string): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
}
