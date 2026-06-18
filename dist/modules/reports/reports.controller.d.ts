import { Response } from 'express';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    daily(date: string): Promise<any>;
    range(fromDate: string, toDate: string, memberId: string): Promise<any>;
    members(): Promise<any>;
    exportExcel(fromDate: string, toDate: string, res: Response): Promise<void>;
    exportCsv(fromDate: string, toDate: string, res: Response): Promise<void>;
    exportAttendanceSummary(fromDate: string, toDate: string, res: Response): Promise<void>;
    exportMemberList(res: Response): Promise<void>;
    exportInactiveMembers(res: Response): Promise<void>;
}
