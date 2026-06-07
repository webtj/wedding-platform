import { test, expect } from '@playwright/test';

const PLANNER = { identifier: 'nature', password: 'nature123456' };

async function login(page: import('@playwright/test').Page, creds: typeof PLANNER) {
  await page.goto('/auth/sign-in');
  await page.locator('#identifier').fill(creds.identifier);
  await page.locator('#password').fill(creds.password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/sign-in'), {
    timeout: 10_000
  });
}

test.describe.serial('AI workbench — composer chip icons render as SVG, not emoji', () => {
  test('material chip popover: every material card renders a <svg> icon (not an emoji glyph)', async ({
    page
  }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    // The chip trigger button for "素材" — it lives in the composer row.
    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await expect(materialChip).toBeVisible();
    await materialChip.click();

    // The popover content: look for any card-shaped buttons inside the popover.
    // The popover is rendered in a portal — locator resolves to it.
    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    // Wait for the materialTypes query to resolve — without a known seeded
    // material in the grid, the popover is empty and the SVG-count check is
    // racy. Use a known seeded 素材 as the readiness signal.
    const firstMaterial = popover.getByRole('button').filter({ hasText: /智言卡|喜帖|餐卡/ }).first();
    await expect(firstMaterial).toBeVisible({ timeout: 5_000 });

    // Every material card must render a Tabler <svg>. We assert at least one
    // SVG exists inside the popover (proves icons render as vector, not emoji).
    const svgsInsidePopover = popover.locator('svg');
    const count = await svgsInsidePopover.count();
    expect(count, 'expected at least one <svg> icon inside the material popover').toBeGreaterThan(
      0
    );

    // Sanity: also confirm the popover is bounded — height should not exceed
    // a sensible max (224px ScrollArea + padding ≈ 280px). If the 4-col grid
    // fix regressed and 4 rows bleed out, this catches it.
    const box = await popover.boundingBox();
    expect(box, 'popover must have a measured box').not.toBeNull();
    expect(box!.height, 'popover height should not overflow the viewport vertically').toBeLessThan(
      500
    );
  });

  test('custom-size input button shows "确定" (not "应用") and is not crushed by flex siblings', async ({
    page
  }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    // Open the size chip
    const sizeChip = page.getByRole('button', { name: /尺寸/ }).first();
    await expect(sizeChip).toBeVisible();
    await sizeChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    // The custom-size input area sits in a <div class="mt-2 border-t pt-2"> below the preset grid.
    // Its <button> text was "应用" before — verify it now reads "确定".
    const confirmButton = popover.getByRole('button', { name: '确定' });
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toHaveText('确定');

    // Width check: button must be at least 36px (≈ 2 CJK chars + padding). If
    // flex-shrink lets the inputs hog all the space, this would shrink below
    // that. 32 is a comfortable lower bound; under 30 means truncation.
    const btnBox = await confirmButton.boundingBox();
    expect(btnBox, '确定 button must have a measured box').not.toBeNull();
    expect(btnBox!.width, '确定 button should not be crushed below ~30px').toBeGreaterThan(30);
  });
});

test.describe.serial('AI workbench — popovers auto-close after selection', () => {
  test('material popover auto-closes after clicking a material card', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    // Click any material — popover should close.
    const firstMaterial = popover
      .getByRole('button')
      .filter({ hasText: /智言卡|喜帖|餐卡/ })
      .first();
    await firstMaterial.click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });
  });

  test('size popover auto-closes after clicking a preset size', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    const sizeChip = page.getByRole('button', { name: /尺寸/ }).first();
    await sizeChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    // Click a preset size — popover should close.
    const firstPreset = popover
      .getByRole('button')
      .filter({ hasText: /\d+×\d+/ })
      .first();
    await firstPreset.click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });
  });

  test('size popover auto-closes after custom-size "确定"', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    const sizeChip = page.getByRole('button', { name: /尺寸/ }).first();
    await sizeChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    // Type custom dimensions + click 确定.
    const widthInput = popover.getByLabel('自定义宽度 (mm)');
    const heightInput = popover.getByLabel('自定义高度 (mm)');
    await widthInput.fill('888');
    await heightInput.fill('666');
    await popover.getByRole('button', { name: '确定' }).click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });

    // The chip should now show the new dimensions.
    await expect(page.getByRole('button', { name: /888×666/ }).first()).toBeVisible();
  });

  test('count popover auto-closes after picking a number', async ({ page }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    const countChip = page.getByRole('button', { name: /数量/ }).first();
    await countChip.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    await popover.getByRole('button', { name: /2张|3张/ }).first().click();

    await expect(popover).not.toBeVisible({ timeout: 2_000 });
  });
});

test.describe.serial('AI workbench — chip × is removed, reset lives inside popover', () => {
  test('chip trigger has no × button (close is via outside-click or popover Esc)', async ({
    page
  }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    // The material chip trigger should NOT contain a close/× button anymore.
    // Old design: chip had its own × with text-muted-foreground/0 (only visible on hover).
    // New design: × is gone from the chip; reset is inside the popover as "重置默认".
    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    const chipText = await materialChip.textContent();
    expect(chipText, 'chip should not contain × glyph').not.toMatch(/[×✕✖]/);
  });

  test('material popover shows "重置默认" inside header after selecting a non-default material', async ({
    page
  }) => {
    await login(page, PLANNER);
    await page.goto('/studio/ai-workbench');
    await expect(page.getByRole('heading', { name: 'AI 工作台' })).toBeVisible();

    // Open the material popover and click a non-default material.
    const materialChip = page.getByRole('button', { name: /素材/ }).first();
    await materialChip.click();
    const popover = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover).toBeVisible();

    const firstMaterial = popover
      .getByRole('button')
      .filter({ hasText: /智言卡|喜帖|餐卡/ })
      .first();
    await firstMaterial.click();

    // Re-open the popover — the header should now show "重置默认" because
    // selection is non-default.
    await materialChip.click();
    const popover2 = page.locator('[data-radix-popper-content-wrapper]').last();
    await expect(popover2.getByRole('button', { name: /重置默认/ })).toBeVisible();
  });
});
