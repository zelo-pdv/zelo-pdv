import prisma from "../src/lib/prisma";

async function main() {
  const lojas = await prisma.loja.findMany({
    where: { ownerId: null },
  });

  for (const loja of lojas) {
    const firstUser = await prisma.user.findFirst({
      where: { lojaId: loja.id },
      orderBy: { createdAt: "asc" },
    });

    if (firstUser) {
      await prisma.loja.update({
        where: { id: loja.id },
        data: { ownerId: firstUser.id },
      });
      console.log(`Updated loja ${loja.id} with ownerId ${firstUser.id}`);
    } else {
      console.log(`Loja ${loja.id} has no users!`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
