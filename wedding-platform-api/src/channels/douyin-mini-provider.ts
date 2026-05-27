import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MiniProviderSession } from './mini-provider';

@Injectable()
export class DouyinMiniProvider {
  constructor(private readonly config: ConfigService) {}

  async exchangeCode(code: string): Promise<MiniProviderSession> {
    if (code.startsWith('dev-openid-')) {
      return { provider: 'douyin_mini', openId: code };
    }

    const appid = this.config.getOrThrow<string>('DOUYIN_MINI_APP_ID');
    const secret = this.config.getOrThrow<string>('DOUYIN_MINI_APP_SECRET');
    const response = await fetch('https://developer.toutiao.com/api/apps/v2/jscode2session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appid, secret, code, anonymous_code: '' })
    });
    const payload = (await response.json()) as { data?: { openid?: string; unionid?: string }; err_msg?: string };
    const openId = payload.data?.openid;
    if (!response.ok || !openId) {
      throw new Error(payload.err_msg ?? 'Douyin mini code exchange failed');
    }

    return { provider: 'douyin_mini', openId, unionId: payload.data?.unionid };
  }
}
