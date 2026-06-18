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
exports.MemberSearchDto = exports.UpdateMemberDto = exports.CreateMemberDto = exports.AvailabilityType = exports.InstrumentType = exports.CurrentStatus = exports.GenderType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var GenderType;
(function (GenderType) {
    GenderType["MALE"] = "male";
    GenderType["FEMALE"] = "female";
    GenderType["OTHER"] = "other";
})(GenderType || (exports.GenderType = GenderType = {}));
var CurrentStatus;
(function (CurrentStatus) {
    CurrentStatus["SCHOOL_STUDENT"] = "school_student";
    CurrentStatus["COLLEGE_STUDENT"] = "college_student";
    CurrentStatus["WORKING_PROFESSIONAL"] = "working_professional";
    CurrentStatus["BUSINESS"] = "business";
    CurrentStatus["OTHER"] = "other";
})(CurrentStatus || (exports.CurrentStatus = CurrentStatus = {}));
var InstrumentType;
(function (InstrumentType) {
    InstrumentType["DHOL"] = "dhol";
    InstrumentType["TASHA"] = "tasha";
    InstrumentType["TOOL"] = "tool";
    InstrumentType["DHWAJ"] = "dhwaj";
})(InstrumentType || (exports.InstrumentType = InstrumentType = {}));
var AvailabilityType;
(function (AvailabilityType) {
    AvailabilityType["DAILY"] = "daily";
    AvailabilityType["TWO_DAYS_WEEK"] = "two_days_week";
    AvailabilityType["THREE_DAYS_WEEK"] = "three_days_week";
    AvailabilityType["OTHER"] = "other";
})(AvailabilityType || (exports.AvailabilityType = AvailabilityType = {}));
class CreateMemberDto {
}
exports.CreateMemberDto = CreateMemberDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "mobileNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "alternateMobile", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(GenderType),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "aadhaarNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "panNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: CurrentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CurrentStatus),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "currentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "currentStatusOrg", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "parentsName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "parentsContact", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMemberDto.prototype, "hasPriorPathakExp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "priorPathakName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: InstrumentType }),
    (0, class_validator_1.IsEnum)(InstrumentType),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "instrument", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: AvailabilityType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AvailabilityType),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "availability", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "availabilityOther", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "joiningReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "healthDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMemberDto.prototype, "digitalSignature", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateMemberDto.prototype, "declarationAccepted", void 0);
class UpdateMemberDto {
}
exports.UpdateMemberDto = UpdateMemberDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsMobilePhone)('en-IN'),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "mobileNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(GenderType),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CurrentStatus),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "currentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "currentStatusOrg", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "parentsName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "parentsContact", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InstrumentType),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "instrument", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AvailabilityType),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "availability", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "availabilityOther", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "joiningReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "healthDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMemberDto.prototype, "status", void 0);
class MemberSearchDto {
}
exports.MemberSearchDto = MemberSearchDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MemberSearchDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: InstrumentType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InstrumentType),
    __metadata("design:type", String)
], MemberSearchDto.prototype, "instrument", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MemberSearchDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MemberSearchDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MemberSearchDto.prototype, "limit", void 0);
//# sourceMappingURL=member.dto.js.map