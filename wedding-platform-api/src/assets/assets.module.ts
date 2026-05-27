import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { CosStorageAdapter } from './cos-storage-adapter';
import { LocalStorageAdapter } from './local-storage-adapter';
import { OssStorageAdapter } from './oss-storage-adapter';
import { StorageAdapter } from './storage-adapter';
import { resolveStorageProvider } from './storage-provider';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    {
      provide: StorageAdapter,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = resolveStorageProvider({ STORAGE_PROVIDER: config.get<string>('STORAGE_PROVIDER') });
        if (provider === 'cos') return new CosStorageAdapter(config);
        if (provider === 'oss') return new OssStorageAdapter(config);
        return new LocalStorageAdapter();
      }
    }
  ],
  exports: [AssetsService, StorageAdapter]
})
export class AssetsModule {}
