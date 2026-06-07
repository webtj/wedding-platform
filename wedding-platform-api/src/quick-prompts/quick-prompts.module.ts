import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { QuickPromptsController } from './quick-prompts.controller';
import { QuickPromptsService } from './quick-prompts.service';

@Module({
  imports: [IdentityModule],
  controllers: [QuickPromptsController],
  providers: [QuickPromptsService],
  exports: [QuickPromptsService]
})
export class QuickPromptsModule {}
