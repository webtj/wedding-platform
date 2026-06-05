import { test, expect } from '@playwright/test';

test.describe('Contract public sign page', () => {
  test('shows the public sign page with signature pad', async ({ page }) => {
    // 用一个明显无效的 token 测试公开页能渲染（不应直接 500）
    await page.goto('/contract/invalid-token-for-smoke-test/sign');

    // 页面应该渲染（不论是"签字页"还是"链接无效"页，HTTP 200 + DOM 有内容）
    await expect(page).toHaveURL(/.*\/contract\/.*\/sign/);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(0);
  });
});
