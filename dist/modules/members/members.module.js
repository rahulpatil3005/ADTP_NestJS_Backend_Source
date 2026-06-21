"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembersModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const members_controller_1 = require("./members.controller");
const members_service_1 = require("./members.service");
const face_service_1 = require("./face.service");
const whatsapp_service_1 = require("../../common/services/whatsapp.service");
const settings_module_1 = require("../settings/settings.module");
let MembersModule = class MembersModule {
};
exports.MembersModule = MembersModule;
exports.MembersModule = MembersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            settings_module_1.SettingsModule,
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.memoryStorage)(),
                limits: { fileSize: 5 * 1024 * 1024 },
                fileFilter: (_req, file, cb) => {
                    if (!file.mimetype.startsWith('image/')) {
                        return cb(new Error('Only image files allowed'), false);
                    }
                    cb(null, true);
                },
            }),
        ],
        controllers: [members_controller_1.MembersController],
        providers: [members_service_1.MembersService, face_service_1.FaceService, whatsapp_service_1.WhatsAppService],
        exports: [members_service_1.MembersService, face_service_1.FaceService],
    })
], MembersModule);
//# sourceMappingURL=members.module.js.map