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
exports.AttendanceFilterDto = exports.MarkAttendanceDto = exports.QrScanDto = exports.CreateSessionDto = exports.AttendanceStatus = exports.SessionType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var SessionType;
(function (SessionType) {
    SessionType["PRACTICE"] = "practice";
    SessionType["EVENT"] = "event";
    SessionType["WORKSHOP"] = "workshop";
    SessionType["REHEARSAL"] = "rehearsal";
    SessionType["OTHER"] = "other";
})(SessionType || (exports.SessionType = SessionType = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["LATE"] = "late";
    AttendanceStatus["HALF_DAY"] = "half_day";
    AttendanceStatus["LEAVE"] = "leave";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
class CreateSessionDto {
}
exports.CreateSessionDto = CreateSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: SessionType }),
    (0, class_validator_1.IsEnum)(SessionType),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "sessionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-06-16' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "sessionDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '09:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '11:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "locationName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "allowedRadiusMeters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSessionDto.prototype, "isLocationRestricted", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "notes", void 0);
class QrScanDto {
}
exports.QrScanDto = QrScanDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Raw JSON string decoded from QR code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], QrScanDto.prototype, "qrPayload", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], QrScanDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QrScanDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QrScanDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QrScanDto.prototype, "deviceName", void 0);
class MarkAttendanceDto {
}
exports.MarkAttendanceDto = MarkAttendanceDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "memberId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AttendanceStatus }),
    (0, class_validator_1.IsEnum)(AttendanceStatus),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "overrideReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "notes", void 0);
class AttendanceFilterDto {
}
exports.AttendanceFilterDto = AttendanceFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "memberId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "fromDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "toDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: AttendanceStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AttendanceStatus),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: SessionType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SessionType),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "sessionType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=attendance.dto.js.map