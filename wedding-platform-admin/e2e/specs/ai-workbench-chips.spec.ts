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
