import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

await page.goto('http://localhost:3000/auth/sign-in');
await page.locator('#identifier').fill('nature');
await page.locator('#password').fill('nature123456');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForURL((u) => !u.pathname.startsWith('/auth/sign-in'), { timeout: 15_000 });

await page.goto('http://localhost:3000/studio/ai-workbench');
await page.waitForLoadState('networkidle');
// Wait for the composer chip to appear (proves data is loaded)
await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });
await page.waitForTimeout(500);

// Default state
await page.screenshot({ path: '/tmp/chips-default.png', fullPage: false });

// Open material popover
await page.getByRole('button', { name: /素材/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/chips-material-open.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Pick a non-default material, then reopen
const popover1 = page.locator('[data-radix-popper-content-wrapper]').last();
const firstMaterial = popover1.getByRole('button').filter({ hasText: /智言卡|喜帖|餐卡/ }).nth(1);
await firstMaterial.click();
await page.waitForTimeout(400);

await page.getByRole('button', { name: /素材/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/chips-material-with-reset.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Open size popover
await page.getByRole('button', { name: /尺寸/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/chips-size-open.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Open count popover
await page.getByRole('button', { name: /数量/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/chips-count-open.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

await browser.close();
console.log('Screenshots saved to /tmp/chips-*.png');
