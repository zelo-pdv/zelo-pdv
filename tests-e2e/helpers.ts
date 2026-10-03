import { request } from '@playwright/test';

const API_URL = `${process.env.BASE_URL || 'http://127.0.0.1:3000'}/api`;

export async function createLoja(uniquePrefix: string) {
  const payload = {
    name: `Loja ${uniquePrefix}`,
    slug: `loja-${uniquePrefix}`,
    ownerName: `Owner ${uniquePrefix}`,
    ownerEmail: `owner_${uniquePrefix}@test.com`,
    ownerPassword: "password123",
  };

  const reqContext = await request.newContext();
  const res = await reqContext.post(`${API_URL}/lojas`, {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }
  });

  if (!res.ok()) {
    const errorText = await res.text();
    throw new Error(`Failed to create loja: ${res.status()} ${errorText}`);
  }

  const data = await res.json();

  // Login to get the token
  const loginRes = await reqContext.post(`${API_URL}/auth/login`, {
    data: { email: payload.ownerEmail, password: payload.ownerPassword },
    headers: { 
      "Content-Type": "application/json",
      "x-forwarded-for": `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }
  });
  
  if (!loginRes.ok()) throw new Error("Failed to login after creating loja");
  
  const cookiesStr = loginRes.headers()['set-cookie'] || '';
  const token = cookiesStr.match(/token=([^;]+)/)?.[1];
  
  return { loja: data, ownerCredentials: { email: payload.ownerEmail, password: payload.ownerPassword }, token };
}

export async function createProduct(token: string, payload: any) {
  const reqContext = await request.newContext();
  const res = await reqContext.post(`${API_URL}/products`, {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "Cookie": `token=${token}`,
      "x-forwarded-for": `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }
  });
  if (!res.ok()) throw new Error(`Failed to create product: ${await res.text()}`);
  return await res.json();
}

export async function createClient(token: string, payload: any) {
  const reqContext = await request.newContext();
  const res = await reqContext.post(`${API_URL}/clients`, {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "Cookie": `token=${token}`,
      "x-forwarded-for": `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }
  });
  if (!res.ok()) throw new Error(`Failed to create client: ${await res.text()}`);
  return await res.json();
}

export async function createCategory(token: string, payload: any) {
  const reqContext = await request.newContext();
  const res = await reqContext.post(`${API_URL}/categories`, {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "Cookie": `token=${token}`,
      "x-forwarded-for": `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    }
  });
  if (!res.ok()) throw new Error(`Failed to create category: ${await res.text()}`);
  return await res.json();
}
