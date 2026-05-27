import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MiniController } from './mini.controller';
import { MiniProjectsService } from './mini-projects.service';

@Module({
  imports: [IdentityModule],
  controllers: [MiniController],
  providers: [MiniProjectsService]
})
export class MiniModule {}
