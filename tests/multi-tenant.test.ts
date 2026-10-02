import { describe, it, expect, beforeAll } from 'vitest';
import { createLoja, login, fetchApi } from './helpers';

describe('Multi-tenant Isolation', () => {
  let lojaA: any;
  let lojaB: any;
  let cookiesA: string;
  let cookiesB: string;

  let productBId: string;
  let clientBId: string;

  beforeAll(async () => {
    // Setup Loja A
    const resA = await createLoja('tenantA_' + Date.now());
    lojaA = resA.loja;
    const loginA = await login(resA.ownerCredentials.email, resA.ownerCredentials.password);
    cookiesA = loginA.cookies;

    // Setup Loja B
    const resB = await createLoja('tenantB_' + Date.now());
    lojaB = resB.loja;
    const loginB = await login(resB.ownerCredentials.email, resB.ownerCredentials.password);
    cookiesB = loginB.cookies;
    console.log("LOGIN A STATUS:", loginA.status, "DATA:", loginA.data);
    console.log("LOGIN B STATUS:", loginB.status, "DATA:", loginB.data);

    // Create categories
    await fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Geral A' })
    }, cookiesA);
    await fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Geral B' })
    }, cookiesB);

    // Create a category for Loja B
    const catRes = await fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Category B' })
    }, cookiesB);
    const categoryBId = catRes.data.id;

    // Create a product in Loja B
    const prodRes = await fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Produto Loja B',
        code: 'PROD-B-' + Date.now(),
        costPrice: 10,
        salePrice: 20,
        stock: 50,
        minStock: 5,
        unit: 'UN',
        categoryId: categoryBId,
      })
    }, cookiesB);
    productBId = prodRes.data.id;

    // Create a client in Loja B
    const cliRes = await fetchApi('/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Cliente Loja B',
        phone: '11999999999',
      })
    }, cookiesB);
    clientBId = cliRes.data.id;
  });

  it('User from Loja A cannot fetch product from Loja B in list', async () => {
    const { status, data } = await fetchApi(`/products`, { method: 'GET' }, cookiesA);
    expect(status).toBe(200);
    const found = data.find((p: any) => p.id === productBId);
    expect(found).toBeUndefined();
  });

  it('User from Loja A cannot edit product from Loja B', async () => {
    const { status } = await fetchApi(`/products/${productBId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hacked by A' })
    }, cookiesA);
    expect([403, 404]).toContain(status);
  });

  it('User from Loja A cannot delete product from Loja B', async () => {
    const { status } = await fetchApi(`/products/${productBId}`, { method: 'DELETE' }, cookiesA);
    expect([403, 404]).toContain(status);
  });

  it('User from Loja A cannot fetch client from Loja B in list', async () => {
    const { status, data } = await fetchApi(`/clients`, { method: 'GET' }, cookiesA);
    expect(status).toBe(200);
    const found = data.find((c: any) => c.id === clientBId);
    expect(found).toBeUndefined();
  });

  it('User from Loja A cannot create a sale using product from Loja B', async () => {
    const { status, data } = await fetchApi('/sales', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ productId: productBId, productName: 'Produto B', quantity: 1, unitPrice: 20 }],
        total: 20,
        paymentMethod: 'DINHEIRO',
        status: 'PAGO'
      })
    }, cookiesA);
    expect(status).toBe(400); // Because product validation checks lojaId
  });

  it('User from Loja A cannot edit configurations of Loja B', async () => {
    const { status } = await fetchApi(`/lojas/${lojaB.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Hacked Name' })
    }, cookiesA);
    expect(status).toBe(403);
  });
});
