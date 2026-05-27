import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DouyinMiniProvider } from './douyin-mini-provider';
import { MiniSessionController } from './mini-session.controller';
import { MiniSessionService } from './mini-session.service';
import { WechatMiniProvider } from './wechat-mini-provider';

@Module({
  imports: [IdentityModule],
  controllers: [MiniSessionController],
  providers: [MiniSessionService, WechatMiniProvider, DouyinMiniProvider]
})
export class ChannelsModule {}
