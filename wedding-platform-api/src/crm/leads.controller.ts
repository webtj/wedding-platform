import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PERMISSIONS, createContractSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { convertLeadSchema, createLeadFollowupSchema, createLeadSchema, updateLeadSchema } from './dto';
import { LeadsService } from './leads.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.list({
      tenantId: tenant.tenantId,
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get(':leadId')
  get(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.get({ tenantId: tenant.tenantId, leadId });
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('export/csv')
  async exportCsv(
    @Req() request: { auth?: AuthContext },
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('status') status?: string
  ) {
    const tenant = requireTenant(request.auth);
    const leads = await this.leadsService.listForExport({
      tenantId: tenant.tenantId,
      search,
      status
    });
    const csv = this.toCsv(leads);
    const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv);
  }

  private toCsv(leads: Array<Record<string, unknown>>): string {
    const headers = [
      '意向单编号',
      '客户姓名',
      '电话',
      '邮箱',
      '来源',
      '状态',
      '婚期',
      '预算(元)',
      '合同号',
      '跟进人',
      '备注',
      '创建时间',
      '更新时间'
    ];
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const statusLabel: Record<string, string> = {
      new: '新咨询',
      contacted: '已联系',
      qualified: '意向明确',
      negotiating: '沟通中',
      won: '已成单',
      lost: '已流失'
    };
    const sourceLabel: Record<string, string> = {
      wechat: '微信',
      xiaohongshu: '小红书',
      douyin: '抖音',
      referral: '转介绍',
      other: '其他'
    };
    const rows = leads.map((l) => [
      l.leadNo,
      l.name,
      l.phone,
      l.email,
      sourceLabel[String(l.sourceChannel)] ?? String(l.sourceChannel),
      statusLabel[String(l.status)] ?? String(l.status),
      l.weddingDate ? new Date(l.weddingDate as string).toISOString().slice(0, 10) : '',
      l.budgetCents ? String(Math.round(Number(l.budgetCents) / 100)) : '',
      (l.contract as { contractNo?: string } | null)?.contractNo ?? '',
      (l.createdBy as { displayName?: string } | null)?.displayName ?? '',
      l.note,
      l.createdAt,
      l.updatedAt
    ]);
    return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  }

  @RequirePermissions(PERMISSIONS.LEAD_CREATE)
  @Post()
  create(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      data: createLeadSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Patch(':leadId')
  update(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      leadId,
      data: updateLeadSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Post(':leadId/followups')
  addFollowup(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.addFollowup({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      leadId,
      data: createLeadFollowupSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Delete(':leadId')
  delete(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.delete({ tenantId: tenant.tenantId, leadId });
  }

  @RequirePermissions(PERMISSIONS.LEAD_CONVERT)
  @Post(':leadId/contract')
  createContract(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.createContract({
      tenantId: tenant.tenantId,
      leadId,
      data: createContractSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_CONVERT)
  @Post(':leadId/convert')
  convert(@Req() request: { auth?: AuthContext }, @Param('leadId') leadId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.leadsService.convert({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      memberId: tenant.memberId,
      leadId,
      data: convertLeadSchema.parse(body)
    });
  }
}
