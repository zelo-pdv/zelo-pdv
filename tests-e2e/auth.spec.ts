import { test, expect } from '@playwright/test';
import { createLoja } from './helpers';

test.describe('Auth Flows', () => {
  let credentials: { email: string; password: string; };

  test.beforeAll(async () => {
    const prefix = Date.now().toString();
    const result = await createLoja(prefix);
    credentials = result.ownerCredentials;
  });

  test('Deve realizar login válido', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    await page.locator('input[type="email"]').waitFor({ state: 'visible' });
    
    // Fill credentials
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    
    // Validate hydration didn't wipe inputs
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
    
    // Submit
    await page.click('button[type="submit"]');

    // Wait for URL to be dashboard or redirect sequence
    await expect(page).toHaveURL(/.*\/dashboard|.*\/produtos/);

    // Ensure dashboard or side menu is visible by checking a common element instead of Dashboard text which is hidden on mobile
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('Deve falhar no login com senha incorreta', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    await page.locator('input[type="email"]').waitFor({ state: 'visible' });
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', 'senhaerrada123');
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
    await page.click('button[type="submit"]');

    // Toast error or text error
    await expect(page.locator('body')).toContainText(/inválid/i, { timeout: 15000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Deve deslogar corretamente', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    await page.locator('input[type="email"]').waitFor({ state: 'visible' });
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard|.*\/produtos/);

    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      // It's in the settings item menu on mobile
      const settingsBtn = page.locator('header button:has(.bx-cog)').first();
      await expect(settingsBtn).toBeVisible({ timeout: 15000 });
      await settingsBtn.click();
      await page.locator('[data-testid="logout-button"]').waitFor({ state: 'visible' });
    }
    
    const logoutBtn = page.locator('[data-testid="logout-button"]').first();
    await expect(logoutBtn).toBeAttached({ timeout: 15000 });
    await logoutBtn.click();

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);

    // Try to access protected page
    await page.goto('/produtos');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
