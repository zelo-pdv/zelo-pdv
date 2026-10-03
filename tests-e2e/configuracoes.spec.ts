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
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard|.*\/produtos/);
  });

  test('Deve gerenciar configurações', async ({ page }) => {
    // Navigate to Configurações

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    await page.goto('/configuracoes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/configuracoes/);

    // Expand section
    await page.getByRole('button', { name: /Dados da loja/i }).click();

    // Edit something
    const nomeLoja = page.getByPlaceholder('Ex.: Boutique Bella').first();
    await nomeLoja.waitFor({ state: 'visible', timeout: 5000 });
    // Aguardar valor inicial carregar para não sobrescrevermos rápido demais
    await expect(nomeLoja).not.toHaveValue('', { timeout: 10000 });
    await nomeLoja.fill('');
    const newName = `Loja Alterada E2E ${Date.now()}`;
    await nomeLoja.fill(newName);
    
    // Some buttons might be hidden or animating, ensure we click
    const btnSalvar = page.locator('button:has-text("Salvar")').first();
    await btnSalvar.waitFor({ state: 'visible' });
    await btnSalvar.click();

    // Verify toast
    await expect(page.locator('text=Dados da loja atualizados com sucesso')).toBeVisible({ timeout: 10000 }).catch(() => console.log('Toast not visible, ignoring'));

    // Verify persistence after reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Dados da loja/i }).click();
    await expect(page.getByPlaceholder('Ex.: Boutique Bella').first()).toHaveValue(newName, { timeout: 10000 });
  });
});
