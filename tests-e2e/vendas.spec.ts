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
        headers: { 
          'Content-Type': 'application/json',
          "x-forwarded-for": `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        },
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

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for React hydration
    
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    
    // Ensure hydration didn't wipe the inputs
    await expect(page.locator('input[type="email"]')).toHaveValue(credentials.email);
    
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard|.*\/produtos/);
  });

  test('Deve realizar uma venda completa e abater estoque', async ({ page }) => {
    // 1. Nova Venda
    await page.goto('/nova-venda');
    await page.waitForLoadState('networkidle');
    await page.locator('h1, h2, button:has-text("Adicionar produto")').first().waitFor({ state: 'visible' });

    // 2. Pesquisar Produto
    const addProductBtn = page.locator('button:has-text("Adicionar produto")').first();
    await addProductBtn.waitFor({ state: 'visible', timeout: 15000 });
    await addProductBtn.click();
    await page.fill('input[placeholder*="Buscar produtos"]', productName);
    const productAddBtn = page.locator(`button:has-text("${productName}")`).first();
    await productAddBtn.waitFor({ state: 'visible', timeout: 5000 });
    await productAddBtn.click();
    // Close picker
    const closeBtn = page.locator('[data-testid="product-picker-close"]').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();
    await expect(page.locator('[data-slot="drawer-portal"]').last()).toBeHidden({ timeout: 5000 }).catch(() => {});

    // Carrinho: verify product is there
    await expect(page.locator(`text=${productName}`).first()).toBeVisible();

    // 3. Selecionar cliente
    await page.locator('.cursor-pointer:has(.bx-user), .cursor-pointer:has-text("Selecionar cliente")').first().click();
    await page.fill('input[placeholder*="Buscar clientes"]', clientName);
    const clientItem = page.locator(`button:has-text("${clientName}")`).first();
    await clientItem.waitFor({ state: 'attached', timeout: 5000 });
    await clientItem.click();
    await page.locator('input[placeholder*="Buscar clientes"]').waitFor({ state: 'hidden', timeout: 5000 });

    // 4. Finalizar Venda
    await page.locator('button:has-text("Finalizar")').click();
    
    // Drawer/Dialog takes a bit to open
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    
    // Confirm Finalizar
    const confirmBtn = page.locator('button:has-text("Confirmar")').last();
    await confirmBtn.waitFor({ state: 'attached', timeout: 5000 });
    await confirmBtn.click();

    // Confirm success
    await expect(page.locator('text=sucesso')).toBeVisible({ timeout: 10000 });

    // 5. HistÃ³rico
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
    await page.waitForLoadState('networkidle');
    await page.locator('h1, h2, button:has-text("Adicionar produto")').first().waitFor({ state: 'visible' });

    // Adicionar ao carrinho
    const addProductBtn = page.locator('button:has-text("Adicionar produto")').first();
    await addProductBtn.waitFor({ state: 'visible', timeout: 15000 });
    await addProductBtn.click();
    await page.fill('input[placeholder*="Buscar produtos"]', productName);
    const productAddBtn = page.locator(`button:has-text("${productName}")`).first();
    await productAddBtn.waitFor({ state: 'visible', timeout: 5000 });
    await productAddBtn.click();
    
    // Close picker
    const closeBtn = page.locator('[data-testid="product-picker-close"]').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();
    await expect(page.locator('[data-slot="drawer-portal"]').last()).toBeHidden({ timeout: 5000 }).catch(() => {});

    await expect(page.locator(`text=${productName}`).first()).toBeVisible();

    // Alterar quantidade (if there's a +/- button)
    // The first .bx-plus is the "Adicionar produto" button, the second is the item quantity increment
    const plusBtn = page.locator('button:has(.bx-plus)').nth(1);
    await expect(plusBtn).toBeVisible({ timeout: 5000 });
    await plusBtn.click();

    // Limpar Carrinho
    const clearBtn = page.locator('button[title="Limpar carrinho"]').first();
    await clearBtn.waitFor({ state: 'visible', timeout: 5000 });
    await clearBtn.click();

    
    // Check if dialog opened
    const dialogTitle = page.locator('text=Limpar carrinho?');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });

    // Confirmar
    const confirmClear = page.locator('button:has-text("Limpar carrinho")').last();
    await confirmClear.waitFor({ state: 'visible', timeout: 5000 });
    await confirmClear.click();
    // Wait for dialog to close by checking the title is gone
    await dialogTitle.waitFor({ state: 'hidden' });

    // Verify empty
    await expect(page.locator('text=Nenhum produto no carrinho')).toBeVisible();
  });
});
