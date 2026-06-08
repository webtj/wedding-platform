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
await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });
await page.waitForTimeout(500);

// Default state — chips with defaults
await page.screenshot({ path: '/tmp/v2-chips-default.png', fullPage: false });

// Open material popover
await page.getByRole('button', { name: /素材/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/v2-material-open.png', fullPage: false });

// Pick a non-default material, then reopen to see "清除"
const matBtn = page.locator('[data-radix-popper-content-wrapper]').last().getByRole('button').filter({ hasText: /餐卡|喜帖/ }).first();
await matBtn.click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /素材/ }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/v2-material-with-clear.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// Clear material — shows 未选择 with red border
await page.getByRole('button', { name: '清除 素材' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/v2-material-cleared.png', fullPage: false });

await browser.close();
console.log('Screenshots saved to /tmp/v2-*.png');
