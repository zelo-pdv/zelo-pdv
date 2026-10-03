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
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard|.*\/produtos/);
    await page.goto('/clientes');
    await page.waitForLoadState('networkidle');
    await page.locator('h1, h2, table').first().waitFor({ state: 'visible' });
  });

  test('Deve gerenciar um cliente completo', async ({ page }) => {
    // 1. Adicionar Cliente
    const desktopAdd = page.locator('button:has-text("Adicionar")').first();
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      const fabMainBtn = page.locator('div.fixed.z-50 button:has(.bx-plus)').first();
      await fabMainBtn.waitFor({ state: 'visible', timeout: 15000 });
      await fabMainBtn.click();
      const novoBtn = page.locator('div.fixed.z-50 button:has-text("Novo")').first();
      await novoBtn.waitFor({ state: 'visible', timeout: 5000 });
      await novoBtn.click();
    } else {
      await desktopAdd.waitFor({ state: 'visible', timeout: 15000 });
      await desktopAdd.click();
    }

    // Fill form
    await page.locator('input[name="name"]').last().waitFor({ state: 'visible' });
    await page.fill('input[name="name"]', 'Cliente E2E');
    await page.fill('input[name="email"]', 'cliente_e2e@test.com');
    await page.fill('input[name="phone"]', '11999999999');
    
    // Submit
    await page.locator('button:has-text("Salvar")').last().click();
    
    // Check in list
    await expect(page.locator('text=Cliente E2E').first()).toBeVisible();

    // 2. Editar Cliente
    const row = page.locator('tr:has-text("Cliente E2E")').first();
    await row.locator('button:has-text("Editar"), button .lucide-pencil, button .lucide-edit, button .bx-pencil, button[title="Editar cliente"]').first().click();
    await page.locator('input[name="name"]').last().waitFor({ state: 'visible' });

    // Change name
    await page.fill('input[name="name"]', 'Cliente E2E Editado');
    await page.locator('button:has-text("Salvar")').last().click();

    // Verify in list
    await expect(page.locator('text=Cliente E2E Editado').first()).toBeVisible();

    // 3. Excluir Cliente
    const editedRow = page.locator('tr:has-text("Cliente E2E Editado")').first();
    await editedRow.locator('button:has-text("Excluir"), button:has-text("Deletar"), button .lucide-trash, button .bx-trash, button[title="Excluir cliente"]').first().click();
    
    // Confirm exclusion
    const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Excluir"), button:has-text("Sim")').first();
    await confirmBtn.waitFor({ state: 'visible' });
    await confirmBtn.click();
    
    // Verify removal
    await expect(page.locator('text=Cliente E2E Editado').first()).not.toBeVisible();
  });
});
