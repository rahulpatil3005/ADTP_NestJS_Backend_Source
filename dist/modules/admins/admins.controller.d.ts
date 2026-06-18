import { AdminsService, CreateAdminDto, UpdateAdminDto } from './admins.service';
export declare class AdminsController {
    private readonly adminsService;
    constructor(adminsService: AdminsService);
    create(dto: CreateAdminDto, createdBy: string): Promise<any>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateAdminDto): Promise<any>;
    updatePermissions(id: string, body: {
        permissions: Record<string, boolean>;
    }): Promise<any>;
    activate(id: string): Promise<{
        message: string;
    }>;
    deactivate(id: string): Promise<{
        message: string;
    }>;
    resetPassword(id: string, body: {
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
