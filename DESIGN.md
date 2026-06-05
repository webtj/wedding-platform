# Design System — Wedding AI Studio

## Product Context
- **What this is:** 对话式婚礼视觉 AI 助手，帮助婚礼策划师通过自然语言对话生成婚礼物料
- **Who it's for:** 婚礼策划师、婚礼设计师、备婚新人
- **Space/industry:** 婚礼行业，AI 图片生成
- **Project type:** Web 应用（管理后台）

## Aesthetic Direction
- **Direction:** Luxury/Refined — 婚礼行业的自然语言
- **Decoration level:** Intentional — 精致的纹理和细节，不过度
- **Mood:** 温暖、专业、值得信赖
- **Theme system:** 使用现有 shadcn/ui 主题系统，支持主题切换

## Typography
- **Display/Hero:** Noto Serif Display — 经典衬线，优雅高级
- **Body:** system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif — 现代无衬线，清晰易读
- **UI/Labels:** system-ui — 与正文一致
- **Data/Tables:** system-ui (tabular-nums) — 数据对齐
- **Code:** Space Mono, 'Courier New', ui-monospace, monospace
- **Loading:** 系统字体，无需额外加载
- **Scale:** 使用 Tailwind CSS 默认字体大小

## Color
- **Approach:** Balanced — 温暖中性色 + 精致强调色
- **Primary:** `oklch(65% 0.12 15)` (玫瑰红) — 婚礼行业的自然语言
- **Secondary:** `oklch(96% 0.01 15)` (柔和温暖) — 辅助色
- **Neutrals:** 温暖灰色系 `oklch(97% 0.006 80)` → `oklch(25% 0.015 60)`
- **Semantic:** success `oklch(62% 0.17 145)`, warning `oklch(75% 0.15 75)`, error `oklch(62% 0.2 25)`, info `oklch(55% 0.1 250)`
- **Dark mode:** 温暖深色，减少饱和度 10-20%

## Spacing
- **Base unit:** 4px (Tailwind CSS 默认)
- **Density:** Comfortable — 舒适不拥挤
- **Scale:** 使用 Tailwind CSS 默认间距

## Layout
- **Approach:** Hybrid — 应用部分网格，营销部分创意
- **Grid:** 12 列
- **Max content width:** 1280px
- **Border radius:** sm(calc(var(--radius) - 4px)) md(calc(var(--radius) - 2px)) lg(var(--radius)) xl(calc(var(--radius) + 4px))
- **默认 radius:** 0.75rem

## Motion
- **Approach:** Intentional — 精致有意义的动画
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)

## Theme System
项目使用 shadcn/ui 主题系统，支持以下主题：
- **Wedding** (默认) — 温暖玫瑰红，婚礼行业标准
- **Claude** — Claude 风格
- **Neobrutualism** — 新粗野主义
- **Supabase** — Supabase 风格
- **Vercel** — Vercel 风格
- **Mono** — 单色风格
- **Notebook** — 笔记本风格
- **Light Green** — 浅绿风格
- **Zen** — 禅意风格
- **Astro Vista** — Astro 风格
- **WhatsApp** — WhatsApp 风格

主题切换通过 cookie `active_theme` 控制，AI 工作台自动跟随当前主题。

## Design Principles for AI Workbench
1. **温暖感** — 婚礼行业的自然语言，使用温暖色调
2. **专业感** — 工具属性，高效清晰
3. **一致性** — 与整个管理后台保持一致
4. **可切换** — 支持主题切换，用户可以选择喜欢的主题

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-01 | 使用现有 Wedding 主题系统 | 保持一致性，支持主题切换，减少维护成本 |
| 2026-06-01 | AI 工作台跟随全局主题 | 用户可以选择喜欢的主题，不需要单独设计 |
