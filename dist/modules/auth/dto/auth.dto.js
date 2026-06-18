"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePasswordDto = exports.RefreshTokenDto = exports.TokenResponseDto = exports.VerifyOtpDto = exports.RequestOtpDto = exports.LoginWithPhoneDto = exports.LoginDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'admin@avishkardhtp.org' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Admin@ADTP2025' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class LoginWithPhoneDto {
}
exports.LoginWithPhoneDto = LoginWithPhoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+919876543210' }),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], LoginWithPhoneDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], LoginWithPhoneDto.prototype, "otp", void 0);
class RequestOtpDto {
}
exports.RequestOtpDto = RequestOtpDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+919876543210' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], RequestOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'member@email.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RequestOtpDto.prototype, "email", void 0);
class VerifyOtpDto {
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+919876543210' }),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "otp", void 0);
class TokenResponseDto {
}
exports.TokenResponseDto = TokenResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TokenResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TokenResponseDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TokenResponseDto.prototype, "expiresIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['super_admin', 'admin', 'member'] }),
    __metadata("design:type", String)
], TokenResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TokenResponseDto.prototype, "userId", void 0);
class RefreshTokenDto {
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minLength: 8 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
//# sourceMappingURL=auth.dto.js.map