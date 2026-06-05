/**
 * 容错处理 baseUrl：去掉末尾斜杠与重复的 /v1。
 * 用户在配置页输入 https://api.example.com、https://api.example.com/、
 * https://api.example.com/v1、https://api.example.com/v1/ 都应等价。
 */
export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  let url = baseUrl.trim();
  while (url.endsWith('/')) url = url.slice(0, -1);
  // 反复剥 /v1（防止 /v1/v1 这种）
  while (/\/v1$/i.test(url)) url = url.slice(0, -3);
  while (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}

/**
 * 返回标准 OpenAI 协议 baseURL，固定以 /v1 结尾。
 * 用户输入 host、host/、host/v1、host/v1/ 一律产出 host/v1。
 * 给 OpenAI SDK 的 baseURL 必须用这个，避免出现 //v1 或缺失 /v1 的 404。
 */
export function toOpenAIBaseUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return normalized;
  return `${normalized}/v1`;
}
