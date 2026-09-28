import "dotenv/config";
import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const defaultUnits = [
  { name: "Unidade", abbreviation: "UN", decimalPlaces: 0 },
  { name: "Quilo", abbreviation: "KG", decimalPlaces: 3 },
  { name: "Grama", abbreviation: "G", decimalPlaces: 0 },
  { name: "Litro", abbreviation: "L", decimalPlaces: 3 },
  { name: "Caixa", abbreviation: "CX", decimalPlaces: 0 },
  { name: "Pacote", abbreviation: "PCT", decimalPlaces: 0 },
  { name: "Metro", abbreviation: "M", decimalPlaces: 2 },
  { name: "Par", abbreviation: "PAR", decimalPlaces: 0 },
];

const defaultGroups = [
  {
    name: "ADMIN",
    description: "Administrador do Sistema (Acesso Total)",
    active: true,
    permissions: {
      dashboard: ["Visualizar"],
      historico: ["Visualizar", "Editar", "Excluir"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      categorias: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      configuracoes: ["Visualizar", "Editar", "Excluir"],
      usuarios: ["Visualizar", "Adicionar", "Editar", "Excluir"],
    },
  },
  {
    name: "Gerente",
    description: "Acesso gerencial com controle de vendas, produtos e clientes",
    active: true,
    permissions: {
      dashboard: ["Visualizar"],
      historico: ["Visualizar", "Editar", "Excluir"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
      categorias: ["Visualizar", "Adicionar", "Editar", "Excluir"],
    },
  },
  {
    name: "Operador de Caixa",
    description: "Pode registrar vendas e consultar produtos e clientes",
    active: true,
    permissions: {
      dashboard: ["Visualizar"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar"],
      produtos: ["Visualizar"],
      historico: ["Visualizar"],
    },
  },
];

async function setupDefaultDataForLoja(lojaId: string) {
  // 1. Cliente padrão Consumidor Final
  const existingClient = await prisma.client.findFirst({
    where: { lojaId, name: "Consumidor Final" },
  });
  if (!existingClient) {
    await prisma.client.create({
      data: {
        lojaId,
        name: "Consumidor Final",
        phone: "",
      },
    });
  }

  // 2. Grupos de acesso padrão
  let adminGroup: any = null;
  for (const group of defaultGroups) {
    const upserted = await prisma.accessGroup.upsert({
      where: {
        lojaId_name: {
          lojaId,
          name: group.name,
        },
      },
      update: {
        description: group.description,
        permissions: group.permissions,
      },
      create: {
        lojaId,
        name: group.name,
        description: group.description,
        active: group.active,
        permissions: group.permissions,
      },
    });
    if (group.name === "ADMIN") {
      adminGroup = upserted;
    }
  }

  // 3. Unidades padrão
  for (const unit of defaultUnits) {
    await prisma.unit.upsert({
      where: {
        lojaId_abbreviation: {
          lojaId,
          abbreviation: unit.abbreviation,
        },
      },
      update: {},
      create: {
        lojaId,
        name: unit.name,
        abbreviation: unit.abbreviation,
        decimalPlaces: unit.decimalPlaces,
      },
    });
  }

  // 4. Categoria padrão "Geral" (migra "Diversos" se existir)
  const diversosCat = await prisma.category.findFirst({
    where: { lojaId, name: "Diversos" },
  });
  const geralCat = await prisma.category.findFirst({
    where: { lojaId, name: "Geral" },
  });

  if (diversosCat && !geralCat) {
    await prisma.category.update({
      where: { id: diversosCat.id },
      data: { name: "Geral" },
    });
  } else if (!geralCat) {
    await prisma.category.create({
      data: {
        lojaId,
        name: "Geral",
      },
    });
  }

  return { adminGroup };
}

async function main() {
  console.log("Iniciando o seed...");

  // 1. Criar ou atualizar a Loja "Zelo Shop"
  const loja = await prisma.loja.upsert({
    where: { name: "Zelo Shop" },
    update: {},
    create: {
      name: "Zelo Shop",
      ownerName: "José Lucas",
      active: true,
    },
  });

  console.log(`Loja configurada: ${loja.name} (${loja.id})`);

  // Configurar dados padrão para Zelo Shop
  const { adminGroup } = await setupDefaultDataForLoja(loja.id);
  console.log(`Grupo ADMIN configurado: ${adminGroup.name} (${adminGroup.id})`);

  // Usuário Admin
  const email = "zelopdv@gmail.com";
  const password = "Zelopdv@2026";
  const hashedPassword = await bcrypt.hash(password, 10);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      groupId: adminGroup.id,
      lojaId: loja.id,
    },
    create: {
      lojaId: loja.id,
      name: "Administrador",
      email,
      password: hashedPassword,
      active: true,
      groupId: adminGroup.id,
    },
  });

  console.log(`Usuário configurado: ${adminUser.email} (${adminUser.id})`);

  // ==========================================
  // CONTA DE DEMONSTRAÇÃO
  // ==========================================

  // 1. Criar ou atualizar a Loja "Loja Demo"
  const demoLoja = await prisma.loja.upsert({
    where: { name: "Loja Demo" },
    update: {},
    create: {
      name: "Loja Demo",
      ownerName: "Usuário Demo",
      active: true,
    },
  });

  console.log(`Loja Demo configurada: ${demoLoja.name} (${demoLoja.id})`);

  // Configurar dados padrão para Loja Demo
  const { adminGroup: demoAdminGroup } = await setupDefaultDataForLoja(demoLoja.id);

  const demoEmail = "demo@zelopdv.com";
  const demoPassword = "demo";
  const demoHashedPassword = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      password: demoHashedPassword,
      groupId: demoAdminGroup.id,
      lojaId: demoLoja.id,
    },
    create: {
      lojaId: demoLoja.id,
      name: "Administrador Demo",
      email: demoEmail,
      password: demoHashedPassword,
      active: true,
      groupId: demoAdminGroup.id,
    },
  });

  console.log(`Usuário demo configurado: ${demoUser.email} (${demoUser.id})`);

  // 3. Garantir dados padrão em todas as outras lojas existentes no banco
  const otherLojas = await prisma.loja.findMany({
    where: {
      id: { notIn: [loja.id, demoLoja.id] },
    },
  });

  for (const otherLoja of otherLojas) {
    await setupDefaultDataForLoja(otherLoja.id);
    console.log(`Dados padrão aplicados para a loja existente: ${otherLoja.name} (${otherLoja.id})`);
  }

  console.log("Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
