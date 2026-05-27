import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { IdentityModule } from '../identity/identity.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [IdentityModule],
  controllers: [TenantsController],
  providers: [TenantsService, PlatformAdminGuard],
  exports: [TenantsService]
})
export class TenantsModule {}
