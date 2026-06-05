import { Module } from '@nestjs/common';
import { PlatformGuard } from '../common/auth/platform.guard';
import { IdentityModule } from '../identity/identity.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [IdentityModule],
  controllers: [TenantsController],
  providers: [TenantsService, PlatformGuard],
  exports: [TenantsService]
})
export class TenantsModule {}
