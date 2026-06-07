import { test, expect } from '@playwright/test';

const PLANNER = { identifier: 'nature', password: 'nature123456' };
const SUPER_ADMIN = { identifier: 'root', password: 'root123456' };

async function login(page: import('@playwright/test').Page, creds: typeof PLANNER) {
  await page.goto('/auth/sign-in');
  await page.locator('#identifier').fill(creds.identifier);
  await page.locator('#password').fill(creds.password);
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/sign-in'), {
    timeout: 10_000
  });
}

async function logout(page: import('@playwright/test').Page) {
  // Drive logout via the API + clear in-memory token, then navigate. The
  // dev-overlay portal in Next.js can intercept UI clicks, so we don't go
  // through the sidebar menu.
  const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000';
  await page.request.post(`${apiBase}/api/identity/logout`);
  await page.context().clearCookies();
  await page.goto('/auth/sign-in');
}

test.describe.serial('Sign-in flow — cross-account transitions', () => {
  test('Bug 1: super admin login after tenant user without logout routes to /admin/* (not /studio/*)', async ({
    page
  }) => {
    // 1. Sign in as tenant user (nature) — leaves auth-context state with tenant data
    await login(page, PLANNER);
    await expect(page).toHaveURL(/\/studio\/overview/);

    // 2. Go to sign-in page WITHOUT explicitly logging out — keeps the
    //    previous session's refresh token cookie alive, mimicking the
    //    original bug condition.
    await page.goto('/auth/sign-in');

    // 3. Sign in as super admin (root) on the SAME page
    await page.locator('#identifier').fill(SUPER_ADMIN.identifier);
    await page.locator('#password').fill(SUPER_ADMIN.password);
    await page.getByRole('button', { name: '登录' }).click();

    // 4. Must land on /admin/* — NOT /studio/* and NOT bounce back to /auth/sign-in
    await page.waitForURL(/\/admin\/overview/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/admin\/overview/);
  });

  test('Bug 2: tenant user login after super admin logout stays on /studio/* (does not bounce back to sign-in)', async ({
    page
  }) => {
    // 1. Sign in as super admin
    await login(page, SUPER_ADMIN);
    await expect(page).toHaveURL(/\/admin\/overview/);

    // 2. Log out via the bottom-left button
    await logout(page);

    // 3. Sign in as tenant user (nature) on the sign-in page
    await page.locator('#identifier').fill(PLANNER.identifier);
    await page.locator('#password').fill(PLANNER.password);
    await page.getByRole('button', { name: '登录' }).click();

    // 4. Must land on /studio/overview — NOT bounce back to /auth/sign-in
    //    (the original bug: AuthGuard sees isSignedIn=false and bounces).
    await page.waitForURL(/\/studio\/overview/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/studio\/overview/);
  });
});
