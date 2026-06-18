import { DataSource } from 'typeorm';
export declare class DashboardController {
    private readonly db;
    constructor(db: DataSource);
    superAdminDashboard(): Promise<{
        members: any;
        todaySummary: any;
        recentRegistrations: any;
        totalAdmins: number;
        weeklyTrend: any;
    }>;
    adminDashboard(): Promise<{
        todaySummary: any;
        totalActiveMembers: number;
        recentActivity: any;
    }>;
    memberDashboard(userId: string): Promise<any>;
}
