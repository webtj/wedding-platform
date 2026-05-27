import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { MiniSessionInput } from '@wedding/shared';
import { TokenService } from '../identity/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { DouyinMiniProvider } from './douyin-mini-provider';
import { WechatMiniProvider } from './wechat-mini-provider';

@Injectable()
export class MiniSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly wechatMiniProvider: WechatMiniProvider,
    private readonly douyinMiniProvider: DouyinMiniProvider
  ) {}

  async exchange(input: MiniSessionInput) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    const session =
      input.channel === 'wechat_mini'
        ? await this.wechatMiniProvider.exchangeCode(input.code)
        : await this.douyinMiniProvider.exchangeCode(input.code);

    const identifier = `${session.provider}:${session.openId}`;
    const existing = await this.prisma.authAccount.findUnique({
      where: { provider_identifier: { provider: input.channel, identifier } },
      include: { user: { include: { tenantMembers: true } } }
    });

    const user =
      existing?.user ??
      (await this.prisma.user.create({
        data: {
          displayName: input.displayName ?? '小程序用户',
          authAccounts: {
            create: {
              provider: input.channel,
              identifier,
              verifiedAt: new Date(),
              metadata: { source: 'mini_exchange' }
            }
          },
          tenantMembers: { create: { tenantId: tenant.id, displayName: input.displayName ?? '小程序用户' } }
        },
        include: { tenantMembers: true }
      }));

    const member = user.tenantMembers.find((item) => item.tenantId === tenant.id);
    if (!member) {
      throw new UnauthorizedException('Mini program user is not bound to tenant');
    }

    const tokens = await this.tokenService.issueTokenPair({ sub: user.id, tenantId: tenant.id, memberId: member.id });
    return {
      provider: session.provider,
      user: { id: user.id, displayName: user.displayName },
      tokens
    };
  }
}
