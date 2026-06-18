import { UserRole } from '../auth.types';
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class LoginWithPhoneDto {
    phone: string;
    otp: string;
}
export declare class RequestOtpDto {
    phone?: string;
    email?: string;
}
export declare class VerifyOtpDto {
    phone: string;
    otp: string;
}
export declare class TokenResponseDto {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    role: UserRole;
    userId: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
