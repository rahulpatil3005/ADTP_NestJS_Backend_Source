import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, AuthenticatedUser } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
