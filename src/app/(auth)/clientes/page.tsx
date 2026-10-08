"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { clientsService } from "@/services/clients.service";
import { salesService } from "@/services/sales.service";
import { getClientColumns } from "./columns";
import { GlobalLoader } from "@/components/ui/global-loader";
import { ClientsDataTable } from "./data-table";
import { ClientForm } from "@/components/clients/client-form";
import ClientDetail from "@/components/clients/client-detail";
import DeleteClient from "@/components/clients/delete-client";
import type { ClientWithAddress, Sale } from "@/types";
import { usePermissions } from "@/components/auth/permissions-provider";
import { BoxIcon } from "@/components/ui/box-icon";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";
import { MobileActionFab } from "@/components/ui/mobile-action-fab";
import { handleExportClients } from "@/lib/export";
import { ClientsImportModal } from "@/components/clients/clients-import-modal";

export default function ClientesPage() {
  const { can } = usePermissions();
  const [clients, setClients] = useState<ClientWithAddress[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editing, setEditing] = useState<ClientWithAddress | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<ClientWithAddress | null>(null);
  const [deleting, setDeleting] = useState<ClientWithAddress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await handleExportClients();
    setIsExporting(false);
  };

  // Carrega ou atualiza os dados (com suporte a atualização silenciosa em tempo real)
  const refreshData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [fetchedClients, fetchedSales] = await Promise.all([
        clientsService.list(),
        salesService.list(),
      ]);
      setClients(fetchedClients);
      setSales(fetchedSales as Sale[]);
    } catch (error) {
      if (!silent) {
        toast.error("Erro ao carregar a lista de clientes.");
      }
      console.error("Erro ao carregar clientes ou vendas:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!can("clientes", "Visualizar")) {
      setIsLoading(false);
      return;
    }
    refreshData(false);
  }, [can]);

  // Sincronização em tempo real entre dispositivos e abas
  useDataSync({
    types: ["clients", "sales"],
    onSync: () => {
      refreshData(true);
    },
    enabled: can("clientes", "Visualizar"),
  });

  // Mescla os clientes com os dados das vendas
  const enrichedClients = useMemo(() => {
    return clients.map((c) => {
      const clientSales = sales.filter((s) => s.clientId === c.id) || [];
      return {
        ...c,
        totalSpent: clientSales
          .filter((s) => s.status === "PAGO")
          .reduce(
            (sum, s) => sum + (Number(s.total) || 0),
            0,
          ),
        pendingAmount: clientSales
          .filter((s) => s.status === "PENDENTE")
          .reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      };
    });
  }, [clients, sales]);

  const handleToggleActive = async (client: ClientWithAddress) => {
    try {
      const newStatus = !(client.active ?? true);
      const updated = await clientsService.update(client.id, { active: newStatus });
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, ...updated } : c)),
      );
      toast.success(
        newStatus
          ? "Cliente ativado com sucesso!"
          : "Cliente desativado com sucesso!",
      );
      notifyLocalSync("clients");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar status do cliente.",
      );
    }
  };

  const columns = useMemo(
    () =>
      getClientColumns({
        onView: setDetail,
        onEdit: setEditing,
        onDelete: setDeleting,
        onToggleActive: handleToggleActive,
        can,
      }),
    [can],
  );

  // Tela de Loading enquanto os dados são buscados
  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!can("clientes", "Visualizar")) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <BoxIcon name="error" className="text-5xl text-destructive opacity-50" />
        <p className="text-sm font-medium">Você não tem permissão para visualizar clientes.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <ClientsDataTable
        columns={columns}
        data={enrichedClients}
        onCreateClick={() => setCreating(true)}
        canAdd={can("clientes", "Adicionar")}
        onImportClick={can("clientes", "Adicionar") ? () => setIsImportOpen(true) : undefined}
        onExportClick={handleExport}
        isExporting={isExporting}
      />

      {can("clientes", "Adicionar") && (
        <MobileActionFab 
          onAdd={() => setCreating(true)} 
          onExport={handleExport} 
          onImport={() => setIsImportOpen(true)}
          isExporting={isExporting} 
        />
      )}

      <ClientsImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      <ClientForm
        key={editing?.id ?? "new"}
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing ?? undefined}
        isEdit={!!editing}
        onSubmit={async (data) => {
          try {
            if (editing) {
              const updatedClient = await clientsService.update(
                editing.id,
                data,
              );
              setClients((prev) =>
                prev.map((c) =>
                  c.id === editing.id ? { ...c, ...updatedClient } : c,
                ),
              );
              toast.success("Cliente atualizado com sucesso!");
              notifyLocalSync("clients");
            } else {
              const newClient = await clientsService.create(data);
              setClients((prev) => [newClient, ...prev]);
              toast.success("Cliente cadastrado com sucesso!");
              notifyLocalSync("clients");
            }
            setCreating(false);
            setEditing(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Ocorreu um erro inesperado.";
            toast.error(message);
          }
        }}
      />

      <ClientDetail
        client={detail}
        sales={sales}
        onClose={() => setDetail(null)}
      />

      <DeleteClient
        client={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={(id) => {
          setClients((prev) => prev.filter((c) => c.id !== id));
          setDeleting(null);
          notifyLocalSync("clients");
        }}
      />
    </div>
  );
}
