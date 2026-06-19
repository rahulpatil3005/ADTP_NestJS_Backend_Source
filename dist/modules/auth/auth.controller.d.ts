import { AuthService } from './auth.service';
import { LoginDto, RequestOtpDto, VerifyOtpDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<import("./dto/auth.dto").TokenResponseDto>;
    requestOtp(dto: RequestOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<import("./dto/auth.dto").TokenResponseDto>;
    refresh(dto: RefreshTokenDto): Promise<import("./dto/auth.dto").TokenResponseDto>;
    getMe(user: any): Promise<any>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}
