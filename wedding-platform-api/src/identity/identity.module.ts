import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [IdentityController],
  providers: [IdentityService, PasswordService, TokenService, JwtAuthGuard],
  exports: [IdentityService, PasswordService, TokenService, JwtAuthGuard, JwtModule]
})
export class IdentityModule {}
