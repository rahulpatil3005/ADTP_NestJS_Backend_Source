import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QrScanDto, MarkAttendanceDto, AttendanceFilterDto, CreateSessionDto, AttendanceStatus } from './dto/attendance.dto';
import { MembersService } from '../members/members.service';
import { FaceService } from '../members/face.service';
export declare class AttendanceService implements OnModuleInit {
    private readonly db;
    private readonly membersService;
    private readonly faceService;
    private readonly logger;
    constructor(db: DataSource, membersService: MembersService, faceService: FaceService);
    onModuleInit(): Promise<void>;
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
    processFaceScan(sessionId: string, imageBuffer: Buffer, userId: string): Promise<{
        success: boolean;
        attendanceId: any;
        member: {
            id: any;
            memberId: any;
            fullName: any;
        };
        status: AttendanceStatus.PRESENT | AttendanceStatus.LATE;
        confidence: number;
        checkInTime: any;
        sessionTitle: any;
    }>;
    clockOut(recordId: string): Promise<{
        memberName: any;
        checkOutTime: any;
    }>;
    clockOutByQr(dto: QrScanDto): Promise<{
        memberName: any;
        checkOutTime: any;
    }>;
    clockOutByFace(sessionId: string, photoBuffer: Buffer): Promise<{
        memberName: any;
        checkOutTime: any;
        confidence: number;
    }>;
    exportSessionExcel(sessionId: string): Promise<Buffer>;
    private logScan;
}
