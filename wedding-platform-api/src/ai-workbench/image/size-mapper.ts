import type { ImageSize } from '../core/provider.interfaces';

/**
 * 婚礼物料尺寸以 mm 表达 (如迎宾牌 600x900)，但图像生成 API 要求像素档。
 * 各家 OpenAI 兼容服务（OpenAI、Flux、Tongyi）都支持 1024 系列。
 *
 * 按宽高比映射：竖版 / 横版 / 方形。
 */
export function mapToProviderSize(source: ImageSize): ImageSize {
  const ratio = source.width / source.height;
  const orientation = ratio > 1.15 ? 'landscape' : ratio < 0.87 ? 'portrait' : 'square';

  if (orientation === 'landscape') return { width: 1536, height: 1024 };
  if (orientation === 'portrait') return { width: 1024, height: 1536 };
  return { width: 1024, height: 1024 };
}
