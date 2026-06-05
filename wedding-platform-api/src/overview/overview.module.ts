import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({
  imports: [IdentityModule, PrismaModule],
  controllers: [OverviewController],
  providers: [OverviewService]
})
export class OverviewModule {}
