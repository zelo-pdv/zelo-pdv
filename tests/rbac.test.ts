import { describe, it, expect, beforeAll } from 'vitest';
import { createLoja, login, fetchApi } from './helpers';

describe('RBAC & Owner Protection', () => {
  let loja: any;
  let ownerCookies: string;
  let ownerId: string;
  let adminCookies: string;
  let adminId: string;
  let userCookies: string;
  let userId: string;
  let adminGroupId: string;
  let emptyGroupId: string;

  beforeAll(async () => {
    const res = await createLoja('rbac_' + Date.now());
    loja = res.loja;
    const loginRes = await login(res.ownerCredentials.email, res.ownerCredentials.password);
    ownerCookies = loginRes.cookies;
    ownerId = loginRes.data.user.sub;

    // Fetch groups
    const groupsRes = await fetchApi('/access-groups', { method: 'GET' }, ownerCookies);
    adminGroupId = groupsRes.data.find((g: any) => g.name === 'ADMIN').id;

    // Create an empty group
    const newGroup = await fetchApi('/access-groups', {
      method: 'POST',
      body: JSON.stringify({ name: 'EMPTY', permissions: {} })
    }, ownerCookies);
    emptyGroupId = newGroup.data.id;

    // Create Admin user
    const adminEmail = `admin_rbac_${Date.now()}@test.com`;
    const adminUser = await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Admin Test',
        email: adminEmail,
        password: 'password123',
        groupId: adminGroupId,
      })
    }, ownerCookies);
    adminId = adminUser.data.id;
    adminCookies = (await login(adminEmail, 'password123')).cookies;

    // Create No-Permission user
    const normEmail = `normal_rbac_${Date.now()}@test.com`;
    const normUser = await fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Normal Test',
        email: normEmail,
        password: 'password123',
        groupId: emptyGroupId,
      })
    }, ownerCookies);
    userId = normUser.data.id;
    userCookies = (await login(normEmail, 'password123')).cookies;
  });

  it('Owner cannot be deactivated', async () => {
    const { status } = await fetchApi(`/users/${ownerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false })
    }, ownerCookies);
    expect(status).toBe(403);
  });

  it('Owner cannot be deleted', async () => {
    const { status } = await fetchApi(`/users/${ownerId}`, {
      method: 'DELETE'
    }, adminCookies); // Even an admin cannot delete owner
    expect(status).toBe(403);
  });

  it('User without permissions receives 403 when creating products', async () => {
    const { status } = await fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Forbidden',
        code: 'FORB-' + Date.now(),
        costPrice: 10,
        salePrice: 20,
        stock: 50,
      })
    }, userCookies);
    expect(status).toBe(403);
  });

  it('Admin can create products', async () => {
    // Fetch category for Admin
    const catRes = await fetchApi('/categories', { method: 'GET' }, adminCookies);
    const categoryId = catRes.data[0].id;

    const { status } = await fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Allowed',
        code: 'ALLO-' + Date.now(),
        costPrice: 10,
        salePrice: 20,
        stock: 50,
        minStock: 5,
        unit: 'UN',
        categoryId,
      })
    }, adminCookies);
    expect(status).toBe(201);
  });

  it('Admin cannot assume ownerId or change owner', async () => {
    // The API /api/lojas/[id] PUT doesn't even accept ownerId, but let's try
    const { status, data } = await fetchApi(`/lojas/${loja.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Teste Edit', ownerId: adminId })
    }, adminCookies);
    // Zod schema should strip ownerId, so it might return 200 but ownerId shouldn't change
    if (status === 200) {
      expect(data.ownerId).not.toBe(adminId);
    }
  });
});
