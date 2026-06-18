import { DataSource } from 'typeorm';
export declare class SettingsService {
    private readonly db;
    constructor(db: DataSource);
    getAll(): Promise<any>;
    get(key: string): Promise<any>;
    set(key: string, value: any, userId: string): Promise<{
        key: string;
        value: any;
    }>;
    getBool(key: string, defaultValue?: boolean): Promise<boolean>;
}
