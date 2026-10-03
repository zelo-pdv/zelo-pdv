import { test, expect } from '@playwright/test';
import { createLoja } from './helpers';

test.describe('RBAC e Sincronização Flow', () => {
  let adminCreds: { email: string; password: string; };
  let vendedorCreds: { email: string; password: string; };

  test.beforeAll(async () => {
    const prefix = Date.now().toString();
    const result = await createLoja(prefix);
    adminCreds = result.ownerCredentials;

    const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

    const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminCreds.email, password: adminCreds.password })
    });
    const setCookie = res.headers.get('set-cookie');
    const token = setCookie?.match(/token=([^;]+)/)?.[1] || '';

    // Create a group 'Vendedores'
    const groupRes = await fetch(`${baseUrl}/api/access-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
        body: JSON.stringify({
            name: 'Vendedores',
            permissions: {
                produtos: ['Visualizar'], // only view products
                'nova-venda': ['Visualizar', 'Criar'],
                clientes: ['Visualizar']
            }
        })
    });
    const group = await groupRes.json();

    // Create vendor user
    const vendEmail = `vendedor_${prefix}@test.com`;
    const vendPass = 'vend123';
    await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': `token=${token}` },
        body: JSON.stringify({
            name: 'Vendedor Teste',
            email: vendEmail,
            password: vendPass,
            groupId: group.id,
            active: true
        })
    });
    vendedorCreds = { email: vendEmail, password: vendPass };
  });

  test('Vendedor não consegue acessar página não permitida (Configurações)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    await page.fill('input[type="email"]', vendedorCreds.email);
    await page.fill('input[type="password"]', vendedorCreds.password);
    await expect(page.locator('input[type="email"]')).toHaveValue(vendedorCreds.email);
    await page.click('button[type="submit"]');
    
    // Vendor should not see Configurações
    await expect(page.locator('nav a:has-text("Configurações")')).not.toBeVisible();

    // If tries to access directly
    await page.goto('/configuracoes');
    
    // Should be redirected or shown 403 / layout says no access
    await expect(page).not.toHaveURL(/.*\/configuracoes/);
    
    await context.close();
  });
});
