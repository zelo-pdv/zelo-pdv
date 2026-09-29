/**
 * Utilitários de máscaras padrão brasileiro para inputs de formulários
 */

/**
 * Remove todos os caracteres não numéricos
 */
export function unmask(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Máscara dinâmica para Telefone fixo (10 dígitos) ou celular (11 dígitos)
 * Exemplo: (00) 00000-0000  ou (11) 3344-5566
 */
export function maskPhone(value?: string | null): string {
  if (!value) return "";
  // Remove eventual prefixo de país (+55)
  const clean = value.replace(/^\+55/, "").replace(/\D/g, "").slice(0, 11);
  if (!clean) return "";

  if (clean.length <= 2) {
    return `(${clean}`;
  }
  // Se for um número fixo completo de 10 dígitos (não começa com 9 após DDD)
  if (clean.length === 10 && clean[2] !== "9") {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6, 10)}`;
  }
  // Padrão celular brasileiro (DDD + 9 dígitos: (XX) 9XXXX-XXXX)
  if (clean.length <= 7) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  }
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

/**
 * Máscara dinâmica para CPF (11 dígitos) ou CNPJ (14 dígitos)
 * Exemplo CPF: 123.456.789-01
 * Exemplo CNPJ: 12.345.678/0001-90
 */
export function maskCpfCnpj(value?: string | null): string {
  if (!value) return "";
  const clean = value.replace(/\D/g, "").slice(0, 14);
  if (!clean) return "";

  // CPF (até 11 dígitos)
  if (clean.length <= 11) {
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9)
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }

  // CNPJ (12 a 14 dígitos)
  if (clean.length <= 12) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  }
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

/**
 * Máscara para CEP (8 dígitos)
 * Exemplo: 49000-000
 */
export function maskCep(value?: string | null): string {
  if (!value) return "";
  const clean = value.replace(/\D/g, "").slice(0, 8);
  if (!clean) return "";

  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}
