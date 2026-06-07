import { test } from '@playwright/test';

const PLANNER = { identifier: 'nature', password: 'nature123456' };

test('screenshot: AI workbench composer — current state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/auth/sign-in');
  await page.locator('#identifier').fill(PLANNER.identifier);
  await page.locator('#password').fill(PLANNER.password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/sign-in'), { timeout: 10_000 });

  await page.goto('/studio/ai-workbench');
  await page.getByRole('heading', { name: 'AI 工作台' }).waitFor();
  await page.waitForTimeout(500);

  // Hover over a summary chip to reveal ×
  const materialChip = page.getByRole('button', { name: /素材/ }).first();
  await materialChip.hover();
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/composer-current-hover.png' });

  // Move away to show non-hover state
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/composer-current-nohover.png' });

  // Type some text to see if chips are reflected
  const textarea = page.locator('textarea').first();
  await textarea.fill('在海边拍一个温馨的场景，夕阳西下，新人相拥');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/composer-current-typed.png' });
});
