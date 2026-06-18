import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LoginDto, TokenResponseDto, RefreshTokenDto, RequestOtpDto, VerifyOtpDto, ChangePasswordDto } from './dto/auth.dto';
export declare class AuthService {
    private readonly db;
    private readonly jwtService;
    private readonly cfg;
    private readonly logger;
    constructor(db: DataSource, jwtService: JwtService, cfg: ConfigService);
    login(dto: LoginDto): Promise<TokenResponseDto>;
    requestOtp(dto: RequestOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<TokenResponseDto>;
    refreshTokens(dto: RefreshTokenDto): Promise<TokenResponseDto>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    private generateTokens;
    private incrementFailedLogins;
}
