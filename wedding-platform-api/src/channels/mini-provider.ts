export type MiniProviderName = 'wechat_mini' | 'douyin_mini';

export type MiniProviderSession = {
  provider: MiniProviderName;
  openId: string;
  unionId?: string;
};

export abstract class MiniProvider {
  abstract exchangeCode(input: { provider: MiniProviderName; code: string }): Promise<MiniProviderSession>;
}
