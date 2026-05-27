import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createProjectExpenseSchema, updateProjectExpenseSchema } from './dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('projects/:projectId/expenses')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.expensesService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.PAYMENT_RECORD)
  @Post('projects/:projectId/expenses')
  create(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.expensesService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createProjectExpenseSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.PAYMENT_RECORD)
  @Patch('expenses/:expenseId')
  update(@Req() request: { auth?: AuthContext }, @Param('expenseId') expenseId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.expensesService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      expenseId,
      data: updateProjectExpenseSchema.parse(body)
    });
  }
}
