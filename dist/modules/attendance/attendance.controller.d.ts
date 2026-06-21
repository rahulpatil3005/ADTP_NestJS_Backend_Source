import { AttendanceService } from './attendance.service';
import { CreateSessionDto, QrScanDto, MarkAttendanceDto, AttendanceFilterDto } from './dto/attendance.dto';
export declare class AttendanceController {
    private readonly attendanceService;
    constructor(attendanceService: AttendanceService);
    createSession(dto: CreateSessionDto, adminId: string): Promise<any>;
    getSessions(page: string, limit: string): Promise<any>;
    getSession(id: string): Promise<any>;
    getSessionAttendance(id: string, filter: AttendanceFilterDto): Promise<any>;
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
