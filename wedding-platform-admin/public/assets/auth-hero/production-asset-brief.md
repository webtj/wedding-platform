# 99 分最终美术拆层规格

目标：以 `visual-target-selected.png` 为唯一视觉基准，产出可被 WebGL 布料系统消费的真实分层素材。

## 必交素材

1. `background-clean.png`
   - 无窗帘、无前景遮挡。
   - 保留窗户、花、婚礼拱门、巴黎屋顶、右侧留白。
   - 尺寸建议 2400 x 1350 或更高。

2. `curtain-left.png` / `curtain-right.png`
   - 透明 RGBA。
   - 必须有真实半透明纱质边缘、褶皱和细节。
   - 不要带背景、阴影地面或窗口内容。
   - 顶部可略厚，底部轻薄。

3. `curtain-left-displacement.png` / `curtain-right-displacement.png`
   - 灰度图。
   - 白色代表凸起褶皱，黑色代表凹陷。
   - 与 curtain PNG 完全同尺寸同 UV。

4. `curtain-left-highlight.png` / `curtain-right-highlight.png`
   - 黑底或透明高光图。
   - 主要在布料折线、边缘、顶部垂坠处。

5. `curtain-left-normal.png` / `curtain-right-normal.png`
   - 可选但推荐。
   - 用于 WebGL 中更真实的折射和受光。

6. `particle-atlas.png`
   - 至少包含：3 个玫瑰花瓣、3 个光尘、2 个丝线光纤。
   - 透明背景。
   - 花瓣不要卡通，不要高饱和粉。

7. `static-fallback-curtains-closed.webp`
   - 窗帘关闭状态。
   - 用于老浏览器和 reduced-motion。

## 输出格式

- 源文件：PSD 或分层 Figma/Photopea 文件。
- 工程文件：PNG/WebP/AVIF。
- 所有透明图必须有干净 alpha 边缘。
- 禁止把绿色/粉色抠图边缘残留带进最终文件。

## 验收方式

- 将 `background-clean.png` 与左右窗帘 PNG 叠回后，静态画面应接近 `visual-target-selected.png`。
- 左右窗帘单独查看时，边缘不应有背景残留。
- 位移图与窗帘褶皱位置必须一致。
- 右侧留白区域不得出现影响登录表单可读性的纹理或粒子。
