import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { checkEmailConflict, checkPhoneConflict, normalizePhone } from "@/lib/validations/uniqueness";

export async function POST(request: Request) {
  const auth = await requirePermission("clientes", "Adicionar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const textBody = await request.text();
    // Limita o tamanho do payload (5MB) para evitar DoS
    if (textBody.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "O arquivo de importação excede o tamanho máximo permitido (5MB)." }, { status: 413 });
    }
    const body = JSON.parse(textBody);
    const items = Array.isArray(body) ? body : body.clients;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente enviado para importação." },
        { status: 400 },
      );
    }

    if (items.length > 1000) {
      return NextResponse.json(
        { error: "A importação está limitada a 1000 itens por vez. Divida seu arquivo e tente novamente." },
        { status: 413 }
      );
    }

    let importedCount = 0;
    const errors: string[] = [];

    // Conjuntos para rastrear duplicatas dentro do próprio lote importado
    const batchEmails = new Set<string>();
    const batchPhones = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      const name = item.name ? String(item.name).trim() : "";
      if (!name) {
        errors.push(`Linha ${rowNum}: Nome do cliente é obrigatório.`);
        continue;
      }

      const rawPhone = item.phone ?? item.telefone ?? item["Telefone"] ?? "";
      const phoneStr = String(rawPhone).trim();
      const normPhone = normalizePhone(phoneStr);

      const rawEmail = item.email ?? item["E-mail"] ?? item["Email"] ?? "";
      const emailStr = String(rawEmail).trim().toLowerCase();

      // Validação de unicidade de e-mail no lote e banco
      if (emailStr) {
        if (batchEmails.has(emailStr)) {
          errors.push(`Linha ${rowNum} (${name}): E-mail "${emailStr}" duplicado no próprio arquivo.`);
          continue;
        }

        const emailConflict = await checkEmailConflict({
          email: emailStr,
          lojaId: auth.user.lojaId,
        });

        if (emailConflict) {
          errors.push(`Linha ${rowNum} (${name}): ${emailConflict}`);
          continue;
        }
      }

      // Validação de unicidade de telefone no lote e banco
      if (normPhone && normPhone.length >= 8) {
        if (batchPhones.has(normPhone)) {
          errors.push(`Linha ${rowNum} (${name}): Telefone "${phoneStr}" duplicado no próprio arquivo.`);
          continue;
        }

        const phoneConflict = await checkPhoneConflict({
          phone: phoneStr,
          lojaId: auth.user.lojaId,
        });

        if (phoneConflict) {
          errors.push(`Linha ${rowNum} (${name}): ${phoneConflict}`);
          continue;
        }
      }

      // Endereço
      const zipCode = item.zipCode ?? item.cep ?? item["CEP"] ?? "";
      const street = item.street ?? item.logradouro ?? item.rua ?? item["Logradouro"] ?? item["Endereço"] ?? "";
      const number = item.number ?? item.numero ?? item["Número"] ?? "";
      const complement = item.complement ?? item.complemento ?? item["Complemento"] ?? "";
      const neighborhood = item.neighborhood ?? item.bairro ?? item["Bairro"] ?? "";
      const city = item.city ?? item.cidade ?? item["Cidade"] ?? "";
      const state = item.state ?? item.uf ?? item.estado ?? item["UF"] ?? "";
      const notes = item.notes ?? item.observacoes ?? item.obs ?? item["Observações"] ?? "";

      const hasAddress = Boolean(zipCode || street || number || neighborhood || city || state);

      try {
        await prisma.client.create({
          data: {
            name,
            phone: phoneStr,
            email: emailStr || null,
            notes: notes ? String(notes).trim() : null,
            active: true,
            lojaId: auth.user.lojaId,
            address: hasAddress
              ? {
                  create: {
                    zipCode: zipCode ? String(zipCode).trim() : "",
                    street: street ? String(street).trim() : "",
                    number: number ? String(number).trim() : "",
                    complement: complement ? String(complement).trim() : "",
                    neighborhood: neighborhood ? String(neighborhood).trim() : "",
                    city: city ? String(city).trim() : "",
                    state: state ? String(state).trim().toUpperCase() : "",
                    lojaId: auth.user.lojaId,
                  },
                }
              : undefined,
          },
        });

        if (emailStr) batchEmails.add(emailStr);
        if (normPhone && normPhone.length >= 8) batchPhones.add(normPhone);

        importedCount++;
      } catch (err: any) {
        console.error(`Erro ao importar cliente linha ${rowNum}:`, err);
        errors.push(`Linha ${rowNum} (${name}): ${err.message || "Erro ao salvar"}`);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalReceived: items.length,
      errors,
    });
  } catch (error: any) {
    console.error("Erro na importação de clientes:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar arquivo de clientes." },
      { status: 500 },
    );
  }
}
