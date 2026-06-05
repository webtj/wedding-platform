# French Romance Auth Hero 99 分素材包

这个素材包服务于最高标准版本：分层窗景 + WebGL 纱帘布料 + 粒子/光效 + 多级降级。

## 当前文件

- `visual-target-selected.png`：最终视觉基准，所有拆层和实现都应对照它。
- `background-clean-candidate.png`：无窗帘背景候选图，用于开发阶段 reveal 背景。
- `static-fallback-curtains-closed.png`：老浏览器、低性能、reduced-motion 的静态兜底。
- `curtain-left.svg` / `curtain-right.svg`：可直接用于 Level 1 DOM/SVG fallback，也可作为 WebGL 开发贴图。
- `curtain-left-displacement.svg` / `curtain-right-displacement.svg`：灰度位移图。
- `curtain-left-highlight.svg` / `curtain-right-highlight.svg`：高光图。
- `particle-atlas.svg`：花瓣、光尘、丝线粒子 atlas。
- `asset-manifest.json`：工程消费清单。
- `production-asset-brief.md`：最终 99 分美术拆层规格。

## 推荐目标路径

```text
public/assets/auth-hero/
```

## 重要说明

当前 SVG 贴图足够让工程 PR 开始实现 WebGL/降级链路。若要达到真正 99/100 的最终质感，需要按 `production-asset-brief.md` 产出透明 PNG/WebP、位移图、法线图，并替换当前工程候选贴图。
