import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { IdentityService } from './identity.service';
import { loginDtoSchema, refreshDtoSchema, switchTenantDtoSchema } from './dto';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() body: unknown) {
    return this.identityService.login(loginDtoSchema.parse(body));
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    return this.identityService.refresh(refreshDtoSchema.parse(body));
  }

  @Post('logout')
  logout(@Body() body: unknown) {
    return this.identityService.logout(refreshDtoSchema.parse(body));
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch-tenant')
  switchTenant(
    @CurrentAuth() auth: { userId: string },
    @Body() body: unknown
  ) {
    const dto = switchTenantDtoSchema.parse(body);
    const previousRefreshToken =
      typeof (body as { refreshToken?: unknown }).refreshToken === 'string'
        ? (body as { refreshToken: string }).refreshToken
        : undefined;
    return this.identityService.switchTenant(auth.userId, dto, previousRefreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentAuth() auth: { userId: string }) {
    return this.identityService.me(auth.userId);
  }
}
