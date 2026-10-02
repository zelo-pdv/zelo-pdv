import { describe, it, expect, beforeAll } from 'vitest';
import { createLoja, login, fetchApi } from './helpers';

describe('Authentication & Authorization', () => {
  let loja: any;
  let ownerCreds: any;
  let cookies: string;

  beforeAll(async () => {
    const prefix = Date.now().toString();
    const result = await createLoja(prefix);
    loja = result.loja;
    ownerCreds = result.ownerCredentials;
  });

  it('should login with correct credentials', async () => {
    const { status, data, cookies: newCookies } = await login(ownerCreds.email, ownerCreds.password);
    expect(status).toBe(200);
    expect(data.user.email).toBe(ownerCreds.email);
    expect(newCookies).toContain('token=');
    cookies = newCookies;
  });

  it('should fail login with wrong password', async () => {
    const { status } = await login(ownerCreds.email, 'wrongpassword');
    expect(status).toBe(401);
  });

  it('should fail login with non-existent user', async () => {
    const { status } = await login('nonexistent@test.com', 'password123');
    expect(status).toBe(401);
  });

  it('should logout correctly', async () => {
    const { status, rawCookies } = await fetchApi('/auth/logout', { method: 'POST' }, cookies);
    // The cookie is cleared by setting it to empty, so we might receive `token=;` or empty
    expect(rawCookies?.includes('token=;')).toBe(true);
  });

  it('should reject access to protected route without auth', async () => {
    const { status } = await fetchApi('/sales');
    // The API might redirect or return 401
    expect([401, 307, 302, 403]).toContain(status);
  });
});
