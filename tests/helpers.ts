const API_URL = process.env.API_URL || "http://localhost:3000/api";

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {},
  cookies: string = ""
) {
  const headers = new Headers(options.headers);
  if (cookies) {
    headers.set("Cookie", cookies);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", `192.168.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  const setCookieHeader = res.headers.get("set-cookie");
  let newCookies = cookies;
  if (setCookieHeader) {
    const tokenMatch = setCookieHeader.match(/token=([^;]+)/);
    const contextMatch = setCookieHeader.match(/user_context=([^;]+)/);
    
    const parts = [];
    if (tokenMatch) parts.push(`token=${tokenMatch[1]}`);
    if (contextMatch) parts.push(`user_context=${contextMatch[1]}`);
    
    if (parts.length > 0) {
      newCookies = parts.join("; ");
    } else if (setCookieHeader.includes('token=;')) {
      newCookies = ''; // Cookies cleared
    }
  }

  return { status: res.status, data, cookies: newCookies, rawCookies: setCookieHeader };
}

export async function createLoja(uniquePrefix: string) {
  const payload = {
    name: `Loja ${uniquePrefix}`,
    slug: `loja-${uniquePrefix}`,
    ownerName: `Owner ${uniquePrefix}`,
    ownerEmail: `owner_${uniquePrefix}@test.com`,
    ownerPassword: "password123",
  };

  const { status, data } = await fetchApi("/lojas", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`Failed to create loja: ${JSON.stringify(data)}`);
  }

  return { loja: data, ownerCredentials: { email: payload.ownerEmail, password: payload.ownerPassword } };
}

export async function login(email: string, password: string = "password123") {
  const { status, data, cookies } = await fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return { status, data, cookies };
}
