import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../auth.types';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(cfg: ConfigService);
    validate(payload: JwtPayload): Promise<AuthenticatedUser>;
}
export {};
