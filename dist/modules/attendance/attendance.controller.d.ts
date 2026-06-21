import { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { CreateSessionDto, QrScanDto, MarkAttendanceDto, AttendanceFilterDto } from './dto/attendance.dto';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    createSession(dto: CreateSessionDto, adminId: string): Promise<any>;
    getSessions(page: string, limit: string): Promise<any>;
    getSession(id: string): Promise<any>;
    getSessionAttendance(id: string, filter: AttendanceFilterDto): Promise<any>;
    exportSession(id: string, res: Response): Promise<void>;
    deleteSession(id: string): Promise<{
        message: string;
    }>;
    scan(dto: QrScanDto, adminId: string): Promise<{
        success: boolean;
        attendanceId: any;
        member: {
            id: any;
            memberId: any;
            fullName: any;
        };
        status: import("./dto/attendance.dto").AttendanceStatus.PRESENT | import("./dto/attendance.dto").AttendanceStatus.LATE;
        checkInTime: any;
        sessionTitle: any;
    }>;
    clockOut(id: string): Promise<{
        memberName: any;
        checkOutTime: any;
    }>;
    qrCheckout(dto: QrScanDto): Promise<{
        memberName: any;
        checkOutTime: any;
    }>;
    faceCheckout(file: Express.Multer.File, sessionId: string): Promise<{
        memberName: any;
        checkOutTime: any;
        confidence: number;
    }>;
    markManual(dto: MarkAttendanceDto, adminId: string): Promise<{
        message: string;
        member: any;
        status: import("./dto/attendance.dto").AttendanceStatus;
    }>;
    getMemberHistory(memberId: string, filter: AttendanceFilterDto): Promise<any>;
    faceScan(file: Express.Multer.File, sessionId: string, adminId: string): Promise<{
        success: boolean;
        attendanceId: any;
        member: {
            id: any;
            memberId: any;
            fullName: any;
        };
        status: import("./dto/attendance.dto").AttendanceStatus.PRESENT | import("./dto/attendance.dto").AttendanceStatus.LATE;
        confidence: number;
        checkInTime: any;
        sessionTitle: any;
    }>;
}
