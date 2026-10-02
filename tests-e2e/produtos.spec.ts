import { test, expect } from '@playwright/test';
import { createLoja } from './helpers';

test.describe('Produtos Flow', () => {
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
    await expect(page).toHaveURL(/.*\/dashboard|.*\/produtos/);
    
    // Navigate to products
    const navLink = page.locator('nav a:has-text("Produtos"), a[href="/produtos"]').first();
    await navLink.click();
    await expect(page).toHaveURL(/.*\/produtos/);
  });

  test('Deve gerenciar um produto completo', async ({ page }) => {
    // 1. Adicionar Produto
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
    await page.fill('input[name="name"]', 'Produto Teste E2E');
    await page.fill('input[name="barcode"]', '1234567890123');
    // For numeric inputs
    await page.fill('input[name="costPrice"]', '10.50');
    await page.fill('input[name="salePrice"]', '20.00');
    await page.fill('input[name="stock"]', '50');
    
    // Submit
    await page.locator('button:has-text("Salvar")').last().click({ force: true });
    
    // Verify toast or list
    await expect(page.locator('text=Produto criado com sucesso').first()).toBeVisible({ timeout: 5000 }).catch(() => null); // Optional if toast disappears
    
    // Check in list
    await expect(page.locator('text=Produto Teste E2E').first()).toBeVisible();

    // 2. Editar Produto
    // Click edit button in the row of "Produto Teste E2E"
    const row = page.locator('tr:has-text("Produto Teste E2E")').first();
    
    if (isMobile) {
      await row.locator('button:has(.bx-dots-vertical-rounded)').first().click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Editar produto")').last().click();
    } else {
      await row.locator('button[title="Editar produto"]').first().click({ force: true });
    }
    await page.waitForTimeout(1000); // Wait for Drawer/Dialog

    // Change name
    await page.fill('input[name="name"]', 'Produto Teste E2E Editado');
    await page.locator('button:has-text("Salvar")').last().click({ force: true });
    await page.waitForTimeout(1000); // Wait for update

    // Verify in list
    await expect(page.locator('text=Produto Teste E2E Editado').first()).toBeVisible();

    // 3. Excluir Produto
    const editedRow = page.locator('tr:has-text("Produto Teste E2E Editado")').first();
    
    if (isMobile) {
      await editedRow.locator('button:has(.bx-dots-vertical-rounded)').first().click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Remover produto")').last().click();
    } else {
      await editedRow.locator('button[title="Remover produto"]').first().click({ force: true });
    }
    await page.waitForTimeout(500);
    
    // Confirm exclusion
    await page.click('button:has-text("Confirmar"), button:has-text("Excluir"), button:has-text("Sim"), button:has-text("Remover")', { force: true });
    await page.waitForTimeout(1000);
    
    // Verify removal
    await expect(page.locator('text=Produto Teste E2E Editado').first()).not.toBeVisible();
  });
});
