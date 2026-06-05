import { test as base, Page } from '@playwright/test';

type AuthFixture = {
  plannerPage: Page;
};

export const test = base.extend<AuthFixture>({
  plannerPage: async ({ page }, use) => {
    await page.goto('/auth/sign-in');
    // 占位：实际登录流程后续接入；当前空操作避免阻塞
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- this is Playwright's `use`, not React's `use`
    await use(page);
  }
});

export { expect } from '@playwright/test';
