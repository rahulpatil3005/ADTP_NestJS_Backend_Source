import { DataSource } from 'typeorm';
export declare class CreateAdminDto {
    email: string;
    fullName: string;
    password: string;
    phone?: string;
    permissions?: Record<string, boolean>;
}
export declare class UpdateAdminDto {
    fullName?: string;
    email?: string;
    phone?: string;
}
export declare class AdminsService {
    private readonly db;
    constructor(db: DataSource);
    create(dto: CreateAdminDto, createdBy: string): Promise<any>;
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, dto: UpdateAdminDto): Promise<any>;
    updatePermissions(id: string, permissions: Record<string, boolean>): Promise<any>;
    toggleActive(id: string, active: boolean): Promise<{
        message: string;
    }>;
    resetPassword(id: string, newPassword: string): Promise<{
        message: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
