import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ConfirmationsModule } from '../confirmations/confirmations.module';
import { TasksModule } from '../tasks/tasks.module';
import { TimelinesModule } from '../timelines/timelines.module';
import { CoupleAccessService } from './couple-access.service';
import { CoupleAssetsController } from './couple-assets.controller';
import { CoupleConfirmationsController } from './couple-confirmations.controller';
import { CoupleDashboardController } from './couple-dashboard.controller';
import { CoupleDashboardService } from './couple-dashboard.service';
import { CoupleTasksController } from './couple-tasks.controller';
import { CoupleStorageController } from './couple-storage.controller';
import { CoupleTimelineController } from './couple-timeline.controller';

@Module({
  imports: [IdentityModule, AssetsModule, ConfirmationsModule, TasksModule, TimelinesModule],
  controllers: [
    CoupleDashboardController,
    CoupleTasksController,
    CoupleConfirmationsController,
    CoupleAssetsController,
    CoupleTimelineController,
    CoupleStorageController
  ],
  providers: [CoupleAccessService, CoupleDashboardService],
  exports: [CoupleAccessService, CoupleDashboardService]
})
export class CoupleModule {}
