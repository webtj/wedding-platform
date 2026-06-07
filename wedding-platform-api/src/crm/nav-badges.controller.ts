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
    // Platform admins in platform mode (no active tenant) have no tenant-
    // scoped badge data, since every NAV_BADGE_SOURCES entry is tenant-owned.
    // The /admin/* sidebar still calls this endpoint, so we must return an
    // empty map rather than 403 — otherwise the page would show a hard error
    // even though there is nothing for the user to act on.
    // A platform admin who is also acting as a tenant (tenantId set) is
    // treated as a normal tenant user for this endpoint.
    if (request.auth?.isPlatformAdmin && !request.auth.tenantId) {
      return { badges: {} };
    }
    const tenant = requireTenant(request.auth);
    return this.service.getAll(tenant.tenantId);
  }
}
