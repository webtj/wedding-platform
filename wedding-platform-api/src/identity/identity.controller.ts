import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { IdentityService } from './identity.service';
import { loginDtoSchema, switchTenantDtoSchema } from './dto';

const REFRESH_COOKIE = 'wedding_refresh_token';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const result = await this.identityService.login(loginDtoSchema.parse(body));
    this.setRefreshCookie(res, result.refreshToken);
    return { ...result, refreshToken: undefined };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE] ??
      (typeof (req.body as { refreshToken?: unknown }).refreshToken === 'string'
        ? (req.body as { refreshToken: string }).refreshToken
        : undefined);
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.identityService.refresh({ refreshToken });
    this.setRefreshCookie(res, result.refreshToken);
    return { ...result, refreshToken: undefined };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.identityService.logout({ refreshToken });
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-tenant')
  async switchTenant(
    @CurrentAuth() auth: { userId: string },
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const dto = switchTenantDtoSchema.parse(body);
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.identityService.switchTenant(auth.userId, { ...dto, refreshToken });
    this.setRefreshCookie(res, result.refreshToken);
    return { ...result, refreshToken: undefined };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentAuth() auth: { userId: string }) {
    return this.identityService.me(auth.userId);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
}
