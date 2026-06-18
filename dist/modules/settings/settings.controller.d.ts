import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settings;
    constructor(settings: SettingsService);
    getAll(): Promise<any>;
    update(body: {
        key: string;
        value: any;
    }, userId: string): Promise<{
        key: string;
        value: any;
    }>;
}
