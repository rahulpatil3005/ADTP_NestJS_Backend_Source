export declare enum SessionType {
    PRACTICE = "practice",
    EVENT = "event",
    WORKSHOP = "workshop",
    REHEARSAL = "rehearsal",
    OTHER = "other"
}
export declare enum AttendanceStatus {
    PRESENT = "present",
    ABSENT = "absent",
    LATE = "late",
    HALF_DAY = "half_day",
    LEAVE = "leave"
}
export declare class CreateSessionDto {
    title: string;
    sessionType: SessionType;
    sessionDate: string;
    startTime?: string;
    endTime?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    allowedRadiusMeters?: number;
    isLocationRestricted?: boolean;
    notes?: string;
}
export declare class QrScanDto {
    qrPayload: string;
    sessionId: string;
    latitude?: number;
    longitude?: number;
    deviceName?: string;
}
export declare class MarkAttendanceDto {
    sessionId: string;
    memberId: string;
    status: AttendanceStatus;
    overrideReason?: string;
    notes?: string;
}
export declare class AttendanceFilterDto {
    memberId?: string;
    sessionId?: string;
    fromDate?: string;
    toDate?: string;
    status?: AttendanceStatus;
    sessionType?: SessionType;
    page?: string;
    limit?: string;
}
