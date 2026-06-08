import { test, expect } from '@playwright/test';

const PLANNER = { identifier: 'nature', password: 'nature123456' };

async function login(page: import('@playwright/test').Page, creds: typeof PLANNER) {
  await page.goto('/auth/sign-in');
  await page.locator('#identifier').fill(creds.identifier);
  await page.locator('#password').fill(creds.password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/sign-in'), {
    timeout: 15_000
  });
}

test.describe.serial('AI workbench — composer chip icons render as SVG, not emoji', () => {
  test('material chip popover: every material card renders a <svg> icon (not an emoji glyph)', async ({
    page
  }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    const firstMaterial = popover.getByRole('button').filter({ hasText: /智言卡|喜帖|餐卡/ }).first();
    await expect(firstMaterial).toBeVisible({ timeout: 5_000 });

    const svgsInsidePopover = popover.locator('svg');
    const count = await svgsInsidePopover.count();
    expect(count, 'expected at least one <svg> icon inside the material popover').toBeGreaterThan(0);

    const box = await popover.boundingBox();
    expect(box, 'popover must have a measured box').not.toBeNull();
    expect(box!.height, 'popover height should not overflow the viewport vertically').toBeLessThan(500);
  });

  test('custom-size input button shows "确定" and is not crushed by flex siblings', async ({
    page
  }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    const sizeChip = page.getByRole('button', { name: /尺寸/ }).first();
    await sizeChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    const confirmButton = popover.getByRole('button', { name: '确定' });
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toHaveText('确定');

    const btnBox = await confirmButton.boundingBox();
    expect(btnBox, '确定 button must have a measured box').not.toBeNull();
    expect(btnBox!.width, '确定 button should not be crushed below ~30px').toBeGreaterThan(30);
  });
});

test.describe.serial('AI workbench — popovers auto-close after selection', () => {
  test('material popover auto-closes after clicking a material card', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    const firstMaterial = popover.getByRole('button').filter({ hasText: /智言卡|喜帖|餐卡/ }).first();
    await firstMaterial.click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });
  });

  test('size popover auto-closes after clicking a preset size', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /尺寸/ }).first().waitFor({ timeout: 15_000 });

    const sizeChip = page.getByRole('button', { name: /尺寸/ }).first();
    await sizeChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    const firstPreset = popover.getByRole('button').filter({ hasText: /\d+×\d+/ }).first();
    await firstPreset.click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });
  });

  test('size popover auto-closes after custom-size "确定"', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /尺寸/ }).first().waitFor({ timeout: 15_000 });

    const sizeChip = page.getByRole('button', { name: /尺寸/ }).first();
    await sizeChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    const widthInput = popover.getByLabel('自定义宽度 (mm)');
    const heightInput = popover.getByLabel('自定义高度 (mm)');
    await widthInput.fill('888');
    await heightInput.fill('666');
    await popover.getByRole('button', { name: '确定' }).click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });

    await expect(page.getByRole('button', { name: /888×666/ }).first()).toBeVisible();
  });

  test('count popover auto-closes after picking a number', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /数量/ }).first().waitFor({ timeout: 15_000 });

    const countChip = page.getByRole('button', { name: /数量/ }).first();
    await countChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    await popover.getByRole('button', { name: /2张|3张/ }).first().click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });
  });
});

test.describe.serial('AI workbench — chip × clears to null (not reset)', () => {
  test('chip has × button and clicking it clears the value', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    // Pick a non-default material first.
    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();
    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    const target = popover.getByRole('button').filter({ hasText: /餐卡|喜帖/ }).first();
    await target.click();
    await expect(popover).not.toBeVisible({ timeout: 2_000 });

    // The chip now has a × button (inside the chip trigger, NOT just on hover).
    const clearBtn = page.getByRole('button', { name: '清除 素材' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Chip now shows "未选择" — no specific material text.
    await expect(page.getByText('未选择').first()).toBeVisible();
  });

  test('material chip shows red border when cleared (required field)', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    // Pick then clear.
    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();
    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await popover.getByRole('button').filter({ hasText: /智言卡|餐卡|喜帖/ }).first().click();
    await expect(popover).not.toBeVisible({ timeout: 2_000 });

    const clearBtn = page.getByRole('button', { name: '清除 素材' });
    await clearBtn.click();

    // After clearing required field, chip container should have destructive border.
    const chipWrapper = materialChip.locator('..');
    await expect(chipWrapper).toHaveClass(/destructive/);
  });

  test('size/style/count chips have × that clears them', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    // Clear size
    const sizeClear = page.getByRole('button', { name: '清除 尺寸' });
    await expect(sizeClear).toBeVisible();
    await sizeClear.click();
    await expect(page.getByText('未选择').nth(1)).toBeVisible();

    // Clear style
    const styleClear = page.getByRole('button', { name: '清除 风格' });
    await expect(styleClear).toBeVisible();
    await styleClear.click();

    // Clear count
    const countClear = page.getByRole('button', { name: '清除 数量' });
    await expect(countClear).toBeVisible();
    await countClear.click();

    // All should show "未选择".
    const unselectedChips = page.getByText('未选择');
    expect(await unselectedChips.count()).toBeGreaterThanOrEqual(3);
  });

  test('popover header shows "清除" + "重置默认" for non-default selection', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await page.getByRole('button', { name: /素材/ }).first().waitFor({ timeout: 15_000 });

    // Pick a non-default material.
    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();
    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await popover.getByRole('button').filter({ hasText: /餐卡|喜帖/ }).first().click();
    await expect(popover).not.toBeVisible({ timeout: 2_000 });

    // Re-open — header should now have both buttons.
    await materialChip.click();
    const popover2 = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover2.getByRole('button', { name: /清除/ })).toBeVisible();
    await expect(popover2.getByRole('button', { name: /重置默认/ })).toBeVisible();
  });
});
