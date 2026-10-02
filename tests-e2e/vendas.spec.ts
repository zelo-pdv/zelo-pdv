import { test, expect } from '@playwright/test';
import { createLoja, createProduct, createClient, createCategory } from './helpers';

test.describe('Nova Venda Flow', () => {
  let credentials: { email: string; password: string; };
  let apiToken = '';
  let apiUserContext = '';
  let productName = 'Produto Venda E2E';
  let clientName = 'Cliente Venda E2E';

  test.beforeAll(async () => {
    const prefix = Date.now().toString();
    const result = await createLoja(prefix);
    credentials = result.ownerCredentials;
    
    // Auth login to get token for api calls
    const res = await fetch(`${process.env.BASE_URL || 'http://127.0.0.1:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
    });
    const setCookie = res.headers.get('set-cookie');
    apiToken = setCookie?.match(/token=([^;,]+)/)?.[1] || '';
    apiUserContext = setCookie?.match(/user_context=([^;,]+)/)?.[1] || '';

    // Create a category
    const category = await createCategory(apiToken, {
        name: 'Categoria E2E'
    });

    // Create a product
    await createProduct(apiToken, {
        name: productName,
        categoryId: category.id,
        barcode: '999999999',
        costPrice: 50.00,
        salePrice: 100.00,
        stock: 10,
        minStock: 5,
        unit: 'UN',
        allowNegativeStock: false
    });

    // Create a client
    await createClient(apiToken, {
        name: clientName,
        email: `clientevenda_${prefix}@test.com`,
        document: '00000000000',
        phone: '11999999999'
    });
  });

  test.beforeEach(async ({ page, context }) => {
    // Inject auth cookie to bypass UI login
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
  });

  test('Deve realizar uma venda completa e abater estoque', async ({ page }) => {
    // 1. Nova Venda
    await page.goto('/nova-venda');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 2. Pesquisar Produto
    const addProductBtn = page.locator('button:has-text("Adicionar produto")').first();
    await addProductBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addProductBtn.evaluate((el) => (el as HTMLElement).click());
    await page.fill('input[placeholder*="Buscar produtos"]', productName);
    const productAddBtn = page.locator(`button:has-text("${productName}")`).first();
    await productAddBtn.waitFor({ state: 'visible', timeout: 5000 });
    await productAddBtn.evaluate((el) => (el as HTMLElement).click());
    // Close picker
    const closeBtn = page.locator('[data-testid="product-picker-close"]').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(1000); // Wait for drawer to close

    // Carrinho: verify product is there
    await expect(page.locator(`text=${productName}`).first()).toBeVisible();

    // 3. Selecionar cliente
    await page.locator('.cursor-pointer:has(.bx-user), .cursor-pointer:has-text("Selecionar cliente")').first().click();
    await page.fill('input[placeholder*="Buscar clientes"]', clientName);
    const clientItem = page.locator(`button:has-text("${clientName}")`).first();
    await clientItem.waitFor({ state: 'attached', timeout: 5000 });
    await clientItem.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(1000); // Wait for Drawer to close

    // 4. Finalizar Venda
    await page.locator('button:has-text("Finalizar")').click({ force: true });
    
    // Drawer/Dialog takes a bit to open
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (!isMobile) {
      await page.waitForTimeout(500);
    }
    
    // Confirm Finalizar
    const confirmBtn = page.locator('button:has-text("Confirmar")').last();
    await confirmBtn.waitFor({ state: 'attached', timeout: 5000 });
    await confirmBtn.evaluate((el) => (el as HTMLElement).click());

    // Confirm success
    await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 10000 });

    // 5. Histórico
    await page.goto('/historico');
    await expect(page.locator(`text=${clientName}`).first()).toBeVisible();

    // 6. Produtos (Estoque)
    await page.goto('/produtos');
    const row = page.locator(`tr:has-text("${productName}")`).first();
    // Assuming initial stock was 10, now it's 9. Find text 9 in the row.
    await expect(row).toContainText('9 un', { timeout: 10000 });
  });
  
  test('Deve gerenciar o carrinho (limpar, remover itens)', async ({ page, context }) => {
    await page.goto('/nova-venda');
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const cookies = await context.cookies();
    console.log('Cookies in Test 2:', cookies);
    const hasError = await page.locator('text=Você não tem permissão').count();
    if (hasError > 0) {
      console.log('Permission error found in Test 2!');
    }

    // Adicionar ao carrinho
    const addProductBtn = page.locator('button:has-text("Adicionar produto")').first();
    await addProductBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addProductBtn.evaluate((el) => (el as HTMLElement).click());
    await page.fill('input[placeholder*="Buscar produtos"]', productName);
    const productAddBtn = page.locator(`button:has-text("${productName}")`).first();
    await productAddBtn.waitFor({ state: 'visible', timeout: 5000 });
    await productAddBtn.evaluate((el) => (el as HTMLElement).click());
    
    // Close picker
    const closeBtn = page.locator('[data-testid="product-picker-close"]').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(1000); // Wait for drawer to close

    await expect(page.locator(`text=${productName}`).first()).toBeVisible();

    // Alterar quantidade (if there's a +/- button)
    const plusBtn = page.locator('button:has(.bx-plus)').first();
    if (await plusBtn.isVisible()) {
        await plusBtn.evaluate((el) => (el as HTMLElement).click());
        // Check subtotal or quantity
    }

    // Limpar Carrinho
    const clearBtn = page.locator('button[title="Limpar carrinho"]').first();
    await clearBtn.waitFor({ state: 'visible', timeout: 5000 });
    await clearBtn.evaluate((el) => (el as HTMLElement).click());
    
    // Check if dialog opened
    const dialogTitle = page.locator('text=Limpar carrinho?');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });

    // Confirmar
    const confirmClear = page.locator('button:has-text("Limpar carrinho")').last();
    await confirmClear.waitFor({ state: 'visible', timeout: 5000 });
    await confirmClear.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(1000); // Wait for dialog to close and state to update

    // Verify empty
    await expect(page.locator('text=Nenhum produto no carrinho')).toBeVisible();
  });
});
