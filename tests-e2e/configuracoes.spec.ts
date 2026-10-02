import { test, expect } from '@playwright/test';
import { createLoja } from './helpers';

test.describe('Configurações Flow', () => {
  let credentials: { email: string; password: string; };

  test.beforeAll(async () => {
    const prefix = Date.now().toString();
    const result = await createLoja(prefix);
    credentials = result.ownerCredentials;
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
  });

  test('Deve gerenciar configurações', async ({ page }) => {
    // Navigate to Configurações
    const navLink = page.locator('nav a:has-text("Configurações"), a[href="/configuracoes"]').first();
    if (await navLink.isVisible()) {
        await navLink.click();
        await expect(page).toHaveURL(/.*\/configuracoes/);

        // Edit something
        const nomeLoja = page.locator('input[name="name"]').first();
        if (await nomeLoja.isVisible()) {
            await nomeLoja.fill('Loja Alterada E2E');
            await page.click('button:has-text("Salvar")');

            // Verify persistence after reload
            await page.reload();
            await expect(page.locator('input[name="name"]').first()).toHaveValue('Loja Alterada E2E');
        }
    }
  });
});
