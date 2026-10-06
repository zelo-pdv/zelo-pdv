import prisma from "@/lib/prisma";

export async function createAuditLog({
  action,
  entity,
  entityId,
  details,
  userId,
  lojaId,
}: {
  action: string;
  entity: string;
  entityId: string;
  details: any;
  userId: string;
  lojaId: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        details,
        userId,
        lojaId,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
