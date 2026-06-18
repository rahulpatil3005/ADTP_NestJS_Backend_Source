import { DataSource } from 'typeorm';
export interface ReportFilters {
    fromDate?: string;
    toDate?: string;
    sessionId?: string;
    memberId?: string;
    instrument?: string;
    format?: 'json' | 'excel' | 'csv';
}
export declare class ReportsService {
    private readonly db;
    constructor(db: DataSource);
    getDailyReport(date: string): Promise<any>;
    getRangeReport(filters: ReportFilters): Promise<any>;
    getMembersReport(filters: ReportFilters): Promise<any>;
    exportExcel(filters: ReportFilters): Promise<Buffer>;
    exportCsv(filters: ReportFilters): Promise<string>;
    exportMemberList(): Promise<Buffer>;
    exportInactiveMembers(): Promise<Buffer>;
}
