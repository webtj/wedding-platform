import { Module } from '@nestjs/common';
import { QuickPromptsController } from './quick-prompts.controller';
import { QuickPromptsService } from './quick-prompts.service';

@Module({
  controllers: [QuickPromptsController],
  providers: [QuickPromptsService],
  exports: [QuickPromptsService]
})
export class QuickPromptsModule {}
