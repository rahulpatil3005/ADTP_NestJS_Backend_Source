export declare enum GenderType {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other"
}
export declare enum CurrentStatus {
    SCHOOL_STUDENT = "school_student",
    COLLEGE_STUDENT = "college_student",
    WORKING_PROFESSIONAL = "working_professional",
    BUSINESS = "business",
    OTHER = "other"
}
export declare enum InstrumentType {
    DHOL = "dhol",
    TASHA = "tasha",
    TOOL = "tool",
    DHWAJ = "dhwaj",
    ZANJ = "zanj",
    SUPPORT = "support"
}
export declare enum AvailabilityType {
    DAILY = "daily",
    TWO_DAYS_WEEK = "two_days_week",
    THREE_DAYS_WEEK = "three_days_week",
    OTHER = "other"
}
export declare class CreateMemberDto {
    fullName: string;
    dateOfBirth?: string;
    mobileNumber: string;
    alternateMobile?: string;
    gender?: GenderType;
    email?: string;
    address?: string;
    aadhaarNumber: string;
    panNumber?: string;
    currentStatus?: CurrentStatus;
    currentStatusOrg?: string;
    parentsName: string;
    parentsContact: string;
    hasPriorPathakExp?: boolean;
    priorPathakName?: string;
    instrument: InstrumentType;
    availability?: AvailabilityType;
    availabilityOther?: string;
    joiningReason?: string;
    healthDetails?: string;
    digitalSignature?: string;
    declarationAccepted?: boolean;
}
export declare class UpdateMemberDto {
    fullName?: string;
    dateOfBirth?: string;
    mobileNumber?: string;
    gender?: GenderType;
    email?: string;
    address?: string;
    currentStatus?: CurrentStatus;
    currentStatusOrg?: string;
    parentsName?: string;
    parentsContact?: string;
    instrument?: InstrumentType;
    availability?: AvailabilityType;
    availabilityOther?: string;
    joiningReason?: string;
    healthDetails?: string;
    status?: string;
}
export declare class MemberSearchDto {
    query?: string;
    instrument?: InstrumentType;
    status?: string;
    page?: string;
    limit?: string;
}
