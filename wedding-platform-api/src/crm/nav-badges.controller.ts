import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { NavBadgesService } from './nav-badges.service';

@UseGuards(JwtAuthGuard)
@Controller('nav-badges')
export class NavBadgesController {
  constructor(private readonly service: NavBadgesService) {}

  @Get()
  get(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.service.getAll(tenant.tenantId);
  }
}
