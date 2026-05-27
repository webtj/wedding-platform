import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssetsModule } from '../assets/assets.module';
import { ArchivePackagesController } from './archive-packages.controller';
import { ArchivePackagesService } from './archive-packages.service';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';

@Module({
  imports: [IdentityModule, AuditModule, AssetsModule],
  controllers: [ArchiveController, ArchivePackagesController],
  providers: [ArchiveService, ArchivePackagesService],
  exports: [ArchiveService, ArchivePackagesService]
})
export class ArchiveModule {}
