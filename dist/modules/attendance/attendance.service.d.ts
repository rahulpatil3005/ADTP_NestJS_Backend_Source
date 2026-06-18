import { DataSource } from 'typeorm';
import { QrScanDto, MarkAttendanceDto, AttendanceFilterDto, CreateSessionDto, AttendanceStatus } from './dto/attendance.dto';
export declare class AttendanceService {
    private readonly db;
    private readonly logger;
    constructor(db: DataSource);
    private resolveAdminId;
    createSession(dto: CreateSessionDto, userId: string): Promise<any>;
    getSessions(page?: number, limit?: number): Promise<any>;
    getSession(sessionId: string): Promise<any>;
    deleteSession(sessionId: string): Promise<{
        message: string;
    }>;
    processQrScan(dto: QrScanDto, userId: string): Promise<{
        success: boolean;
        attendanceId: any;
        member: {
            id: any;
            memberId: any;
            fullName: any;
        };
        status: AttendanceStatus.PRESENT | AttendanceStatus.LATE;
        checkInTime: any;
        sessionTitle: any;
    }>;
    markManual(dto: MarkAttendanceDto, userId: string): Promise<{
        message: string;
        member: any;
        status: AttendanceStatus;
    }>;
    getSessionAttendance(sessionId: string, filter: AttendanceFilterDto): Promise<any>;
    getMemberHistory(memberId: string, filter: AttendanceFilterDto): Promise<any>;
    private logScan;
}
