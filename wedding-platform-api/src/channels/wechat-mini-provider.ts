import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MiniProviderSession } from './mini-provider';

@Injectable()
export class WechatMiniProvider {
  constructor(private readonly config: ConfigService) {}

  async exchangeCode(code: string): Promise<MiniProviderSession> {
    if (code.startsWith('dev-openid-')) {
      return { provider: 'wechat_mini', openId: code };
    }

    const appid = this.config.getOrThrow<string>('WECHAT_MINI_APP_ID');
    const secret = this.config.getOrThrow<string>('WECHAT_MINI_APP_SECRET');
    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appid);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url);
    const payload = (await response.json()) as { openid?: string; unionid?: string; errmsg?: string };
    if (!response.ok || !payload.openid) {
      throw new Error(payload.errmsg ?? 'WeChat mini code exchange failed');
    }

    return { provider: 'wechat_mini', openId: payload.openid, unionId: payload.unionid };
  }
}
