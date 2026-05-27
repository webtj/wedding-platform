import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { IdentityService } from './identity.service';
import { loginDtoSchema, refreshDtoSchema } from './dto';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

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
  @Get('me')
  me(@CurrentAuth() auth: { userId: string }) {
    return this.identityService.me(auth.userId);
  }
}
