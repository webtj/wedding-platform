import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { SuperOverviewService } from './super-overview.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/overview')
export class SuperOverviewController {
  constructor(private readonly superOverviewService: SuperOverviewService) {}

  @Get('summary')
  summary() {
    return this.superOverviewService.getSummary();
  }
}
