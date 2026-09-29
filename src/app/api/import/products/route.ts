import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

function parseNumber(value: any, defaultValue = 0): number {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "number") return isNaN(value) ? defaultValue : value;

  let str = String(value).trim();
  // Se contiver vírgula e ponto (ex: 1.250,50)
  if (str.includes(".") && str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    // Se contiver apenas vírgula (ex: 10,50)
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? defaultValue : num;
}

export async function POST(request: Request) {
  const auth = await requirePermission("produtos", "Adicionar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : body.products;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto enviado para importação." },
        { status: 400 },
      );
    }

    // Carrega categorias existentes da loja
    const existingCategories = await prisma.category.findMany({
      where: { lojaId: auth.user.lojaId },
    });

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      const name = item.name ? String(item.name).trim() : "";
      if (!name) {
        errors.push(`Linha ${rowNum}: Nome do produto é obrigatório.`);
        continue;
      }

      // Categoria
      let categoryId: string | null = null;
      const rawCategory = item.category || item.categoryName || item.categoria;
      const categoryName = rawCategory ? String(rawCategory).trim() : "Geral";

      let matchedCat = existingCategories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      );

      if (!matchedCat && categoryName) {
        try {
          matchedCat = await prisma.category.create({
            data: {
              name: categoryName,
              lojaId: auth.user.lojaId,
            },
          });
          existingCategories.push(matchedCat);
        } catch {
          // Se já existir por corrida concorrente, busca novamente
          matchedCat = (await prisma.category.findFirst({
            where: {
              lojaId: auth.user.lojaId,
              name: { equals: categoryName, mode: "insensitive" },
            },
          })) || undefined;
        }
      }

      if (matchedCat) {
        categoryId = matchedCat.id;
      }

      const salePrice = parseNumber(
        item.salePrice ?? item.precoVenda ?? item.preco_venda ?? item["Preço de Venda"] ?? item.valor,
        0,
      );
      const costPrice = parseNumber(
        item.costPrice ?? item.precoCusto ?? item.preco_custo ?? item["Preço de Custo"],
        0,
      );
      const stock = parseNumber(
        item.stock ?? item.estoque ?? item["Estoque"],
        0,
      );
      const minStock = parseNumber(
        item.minStock ?? item.estoqueMinimo ?? item.estoque_minimo ?? item["Estoque Mínimo"],
        0,
      );

      const unit = String(
        item.unit ?? item.unidade ?? item["Unidade"] ?? "UN",
      ).trim().toUpperCase();

      const code = item.code ?? item.codigo ?? item["Código"] ?? item["Código Interno"];
      const barcode = item.barcode ?? item.codigoBarras ?? item.codigo_barras ?? item["Código de Barras"];
      const description = item.description ?? item.descricao ?? item["Descrição"];

      try {
        await prisma.product.create({
          data: {
            name,
            unit: unit || "UN",
            costPrice,
            salePrice,
            stock,
            minStock,
            code: code ? String(code).trim() : null,
            barcode: barcode ? String(barcode).trim() : null,
            description: description ? String(description).trim() : null,
            categoryId,
            active: true,
            lojaId: auth.user.lojaId,
          },
        });
        importedCount++;
      } catch (err: any) {
        console.error(`Erro ao importar produto linha ${rowNum}:`, err);
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
    console.error("Erro na importação de produtos:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar arquivo de produtos." },
      { status: 500 },
    );
  }
}
