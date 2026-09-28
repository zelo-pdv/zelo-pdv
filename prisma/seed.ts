import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

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

  // Cliente padrão
  const existingClient = await prisma.client.findFirst({
    where: { lojaId: loja.id, name: "Consumidor Final" }
  });
  if (!existingClient) {
    await prisma.client.create({
      data: {
        lojaId: loja.id,
        name: "Consumidor Final",
        phone: ""
      }
    });
  }

  // 2. Criar ou atualizar o grupo ADMIN para a loja
  const adminGroup = await prisma.accessGroup.upsert({
    where: {
      lojaId_name: {
        lojaId: loja.id,
        name: "ADMIN",
      },
    },
    update: {
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
    create: {
      lojaId: loja.id,
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
  });

  console.log(`Grupo configurado: ${adminGroup.name} (${adminGroup.id})`);

  // 3. Unidades padrão
  const defaultUnits = [
    { name: "Unidade", abbreviation: "UN", decimalPlaces: 0 },
    { name: "Quilo", abbreviation: "KG", decimalPlaces: 3 },
    { name: "Grama", abbreviation: "G", decimalPlaces: 0 },
    { name: "Litro", abbreviation: "L", decimalPlaces: 3 },
    { name: "Caixa", abbreviation: "CX", decimalPlaces: 0 },
    { name: "Pacote", abbreviation: "PCT", decimalPlaces: 0 },
  ];

  for (const unit of defaultUnits) {
    await prisma.unit.upsert({
      where: {
        lojaId_abbreviation: {
          lojaId: loja.id,
          abbreviation: unit.abbreviation,
        },
      },
      update: {},
      create: {
        lojaId: loja.id,
        name: unit.name,
        abbreviation: unit.abbreviation,
        decimalPlaces: unit.decimalPlaces,
      },
    });
  }

  // 4. Categoria Padrão
  await prisma.category.upsert({
    where: {
      lojaId_name: {
        lojaId: loja.id,
        name: "Diversos",
      },
    },
    update: {},
    create: {
      lojaId: loja.id,
      name: "Diversos",
    },
  });

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

  // Cliente padrão demo
  const existingDemoClient = await prisma.client.findFirst({
    where: { lojaId: demoLoja.id, name: "Consumidor Final" }
  });
  if (!existingDemoClient) {
    await prisma.client.create({
      data: {
        lojaId: demoLoja.id,
        name: "Consumidor Final",
        phone: ""
      }
    });
  }

  // 2. Criar ou atualizar o grupo ADMIN para a Loja Demo
  const demoAdminGroup = await prisma.accessGroup.upsert({
    where: {
      lojaId_name: {
        lojaId: demoLoja.id,
        name: "ADMIN",
      },
    },
    update: {
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
    create: {
      lojaId: demoLoja.id,
      name: "ADMIN",
      description: "Administrador da Demo (Acesso Total)",
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
  });

  for (const unit of defaultUnits) {
    await prisma.unit.upsert({
      where: {
        lojaId_abbreviation: {
          lojaId: demoLoja.id,
          abbreviation: unit.abbreviation,
        },
      },
      update: {},
      create: {
        lojaId: demoLoja.id,
        name: unit.name,
        abbreviation: unit.abbreviation,
        decimalPlaces: unit.decimalPlaces,
      },
    });
  }

  await prisma.category.upsert({
    where: {
      lojaId_name: {
        lojaId: demoLoja.id,
        name: "Diversos",
      },
    },
    update: {},
    create: {
      lojaId: demoLoja.id,
      name: "Diversos",
    },
  });

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
