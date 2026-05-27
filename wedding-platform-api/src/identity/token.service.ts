import { randomBytes, createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type AccessTokenPayload = {
  sub: string;
  tenantId: string | null;
  memberId: string | null;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async issueTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- expiresIn requires branded StringValue from `ms` which is not a direct dependency
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as any
    });

    const refreshToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashRefreshToken(refreshToken);
    const ttlDays = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 30;

    await this.prisma.refreshSession.create({
      data: {
        userId: payload.sub,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET')
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
