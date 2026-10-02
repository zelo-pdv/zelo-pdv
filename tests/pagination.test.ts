import { describe, it, expect, beforeAll } from 'vitest';
import { createLoja, login, fetchApi } from './helpers';

describe('Sales Pagination', () => {
  let loja: any;
  let cookies: string;
  let productId: string;

  beforeAll(async () => {
    const res = await createLoja('pag_' + Date.now());
    loja = res.loja;
    const loginRes = await login(res.ownerCredentials.email, res.ownerCredentials.password);
    cookies = loginRes.cookies;

    const catRes = await fetchApi('/categories', { method: 'GET' }, cookies);
    const categoryId = catRes.data[0].id;

    const prodRes = await fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Produto Para Paginacao',
        code: 'PROD-PAG-' + Date.now(),
        costPrice: 5,
        salePrice: 10,
        stock: 500,
        minStock: 5,
        unit: 'UN',
        categoryId,
      })
    }, cookies);
    productId = prodRes.data.id;

    // Create 15 sales sequentially to avoid saleNumber conflicts
    for (let i = 0; i < 15; i++) {
      await fetchApi('/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId, productName: 'Produto Para Paginacao', quantity: 1, unitPrice: 10 }],
          total: 10,
          paymentMethod: 'DINHEIRO',
          status: 'PAGO'
        })
      }, cookies);
    }
  });

  it('should return exactly the limit requested', async () => {
    const { status, data } = await fetchApi('/sales?page=1&limit=5', { method: 'GET' }, cookies);
    expect(status).toBe(200);
    expect(data.data.length).toBe(5);
    expect(data.meta.total).toBe(15);
    expect(data.meta.totalPages).toBe(3);
  });

  it('should return next page correctly', async () => {
    const { status, data } = await fetchApi('/sales?page=2&limit=5', { method: 'GET' }, cookies);
    expect(status).toBe(200);
    expect(data.data.length).toBe(5);
    expect(data.meta.page).toBe(2);
  });

  it('should default to 5000 items if no limit is provided', async () => {
    const { status, data } = await fetchApi('/sales', { method: 'GET' }, cookies);
    expect(status).toBe(200);
    // As per the implementation: Array.isArray(res) ? res : res.data (handled in service, but API returns { data, meta })
    expect(data.data.length).toBe(15);
    expect(data.meta.limit).toBe(5000);
  });
});
