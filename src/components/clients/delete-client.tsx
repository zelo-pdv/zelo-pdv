"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clientsService } from "@/services/clients.service";
import { toast } from "sonner";
import { useState } from "react";
import { Client } from "@/prisma/client";

export default function DeleteClient({
  client,
  onClose,
  onConfirm,
}: {
  client: Client | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <AlertDialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{client?.name}&quot; será removido. O histórico de vendas deste
            cliente será mantido intacto no sistema. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={async (e) => {
              e.preventDefault();
              if (!client) return;
              try {
                setLoading(true);
                await clientsService.remove(client.id);
                toast.success("Cliente removido com sucesso");
                onConfirm(client.id);
                onClose();
              } catch (error) {
                console.error("Erro ao remover cliente:", error);
                toast.error("Erro ao remover cliente.");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
