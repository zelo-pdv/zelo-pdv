import { test, expect } from '@playwright/test';
import { createLoja } from './helpers';

test.describe('Clientes Flow', () => {
  let credentials: { email: string; password: string; };
  let apiToken = '';
  let apiUserContext = '';

  test.beforeAll(async () => {
    const prefix = Date.now().toString();
    const result = await createLoja(prefix);
    credentials = result.ownerCredentials;

    const res = await fetch(`${process.env.BASE_URL || 'http://127.0.0.1:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });
    const setCookie = res.headers.get('set-cookie');
    apiToken = setCookie?.match(/token=([^;,]+)/)?.[1] || '';
    apiUserContext = setCookie?.match(/user_context=([^;,]+)/)?.[1] || '';
  });

  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'token',
        value: apiToken,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000'
      },
      {
        name: 'user_context',
        value: apiUserContext,
        url: process.env.BASE_URL || 'http://127.0.0.1:3000'
      }
    ]);
    await page.goto('/clientes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('Deve gerenciar um cliente completo', async ({ page }) => {
    // 1. Adicionar Cliente
    const desktopAdd = page.locator('button:has-text("Adicionar")').first();
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      const fabMainBtn = page.locator('div.fixed.z-50 button:has(.bx-plus)').first();
      await fabMainBtn.waitFor({ state: 'visible', timeout: 15000 });
      await fabMainBtn.click();
      await page.waitForTimeout(500); // Wait for fab to expand
      const novoBtn = page.locator('div.fixed.z-50 button:has-text("Novo")').first();
      await novoBtn.click({ force: true });
    } else {
      await desktopAdd.waitFor({ state: 'visible', timeout: 15000 });
      await desktopAdd.click({ force: true });
    }
    await page.waitForTimeout(1000); // Wait for Drawer/Dialog animations to complete

    // Fill form
    await page.locator('input[name="name"]').last().waitFor({ state: 'visible' });
    await page.fill('input[name="name"]', 'Cliente E2E');
    await page.fill('input[name="email"]', 'cliente_e2e@test.com');
    await page.fill('input[name="phone"]', '11999999999');
    
    // Submit
    await page.locator('button:has-text("Salvar")').last().click({ force: true });
    
    // Check in list
    await expect(page.locator('text=Cliente E2E').first()).toBeVisible();

    // 2. Editar Cliente
    const row = page.locator('tr:has-text("Cliente E2E")').first();
    await row.locator('button:has-text("Editar"), button .lucide-pencil, button .lucide-edit, button .bx-pencil, button[title="Editar cliente"]').first().click({ force: true });
    await page.waitForTimeout(1000); // Wait for Drawer/Dialog

    // Change name
    await page.fill('input[name="name"]', 'Cliente E2E Editado');
    await page.locator('button:has-text("Salvar")').last().click({ force: true });
    await page.waitForTimeout(1000); // Wait for update

    // Verify in list
    await expect(page.locator('text=Cliente E2E Editado').first()).toBeVisible();

    // 3. Excluir Cliente
    const editedRow = page.locator('tr:has-text("Cliente E2E Editado")').first();
    await editedRow.locator('button:has-text("Excluir"), button:has-text("Deletar"), button .lucide-trash, button .bx-trash, button[title="Excluir cliente"]').first().click({ force: true });
    await page.waitForTimeout(500);
    
    // Confirm exclusion
    await page.click('button:has-text("Confirmar"), button:has-text("Excluir"), button:has-text("Sim")', { force: true });
    await page.waitForTimeout(1000);
    
    // Verify removal
    await expect(page.locator('text=Cliente E2E Editado').first()).not.toBeVisible();
  });
});
