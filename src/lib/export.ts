import { clientsService } from "@/services/clients.service";
import { usersService } from "@/services/users.service";
import { productsService } from "@/services/products.service";
import { salesService } from "@/services/sales.service";
import { currency, dateTime } from "@/lib/format";
import { maskPhone } from "@/lib/masks";
import { PaymentMethod, PAYMENT_LABELS } from "@/types";
import { toast } from "sonner";

// Helper para download de CSV com UTF-8 BOM e delimitador ;
export const downloadCsv = (
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) => {
  const csvContent =
    "\uFEFF" +
    [
      headers.join(";"),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = cell === null || cell === undefined ? "" : String(cell);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(";"),
      ),
    ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const handleExportClients = async () => {
  try {
    const clients = await clientsService.list();
    if (!clients || clients.length === 0) {
      toast.warning("Nenhum cliente cadastrado para exportar.");
      return;
    }

    const headers = [
      "Nome",
      "Telefone",
      "E-mail",
      "Status",
      "CEP",
      "Logradouro",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "UF",
      "Observações",
      "Cadastrado em",
    ];

    const rows = clients.map((c) => {
      const addr = Array.isArray(c.address) ? c.address[0] : c.address;
      return [
        c.name,
        maskPhone(c.phone),
        c.email || "",
        c.active ? "Ativo" : "Inativo",
        addr?.zipCode || "",
        addr?.street || "",
        addr?.number || "",
        addr?.complement || "",
        addr?.neighborhood || "",
        addr?.city || "",
        addr?.state || "",
        c.notes || "",
        c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : "",
      ];
    });

    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`clientes_zelo_${today}.csv`, headers, rows);
    toast.success(`${clients.length} cliente(s) exportado(s) com sucesso!`);
  } catch (error) {
    console.error(error);
    toast.error("Erro ao exportar clientes.");
  }
};

export const handleExportUsers = async () => {
  try {
    const users = await usersService.list();
    if (!users || users.length === 0) {
      toast.warning("Nenhum usuário cadastrado para exportar.");
      return;
    }

    const headers = [
      "Nome",
      "E-mail",
      "Telefone",
      "Grupo de Acesso",
      "Status",
      "Cadastrado em",
    ];

    const rows = users.map((u: any) => [
      u.name,
      u.email,
      maskPhone(u.phone),
      u.group?.name || "Sem grupo",
      u.active ? "Ativo" : "Inativo",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "",
    ]);

    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`usuarios_zelo_${today}.csv`, headers, rows);
    toast.success(`${users.length} usuário(s) exportado(s) com sucesso!`);
  } catch (error) {
    console.error(error);
    toast.error("Erro ao exportar usuários.");
  }
};

export const handleExportProducts = async () => {
  try {
    const products = await productsService.list();
    if (!products || products.length === 0) {
      toast.warning("Nenhum produto cadastrado para exportar.");
      return;
    }

    const headers = [
      "Nome",
      "Categoria",
      "Unidade",
      "Preço de Venda",
      "Preço de Custo",
      "Estoque",
      "Estoque Mínimo",
      "Código Interno",
      "Código de Barras",
      "Status",
      "Descrição",
    ];

    const rows = products.map((p: any) => [
      p.name,
      p.category?.name || "Geral",
      p.unit || "UN",
      currency(p.salePrice),
      currency(p.costPrice),
      Number(p.stock ?? 0),
      Number(p.minStock ?? 0),
      p.code || "",
      p.barcode || "",
      p.active ? "Ativo" : "Inativo",
      p.description || "",
    ]);

    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`produtos_zelo_${today}.csv`, headers, rows);
    toast.success(`${products.length} produto(s) exportado(s) com sucesso!`);
  } catch (error) {
    console.error(error);
    toast.error("Erro ao exportar produtos.");
  }
};

export const handleExportSales = async () => {
  try {
    const sales = await salesService.list();
    if (!sales || sales.length === 0) {
      toast.warning("Nenhuma venda cadastrada para exportar.");
      return;
    }

    const headers = [
      "Número da Venda",
      "Data e Hora",
      "Cliente",
      "Forma de Pagamento",
      "Status",
      "Desconto",
      "Total",
    ];

    const rows = sales.map((s: any) => [
      s.saleNumber ? String(s.saleNumber) : s.id,
      dateTime(s.date),
      s.clientName || "Consumidor Final",
      PAYMENT_LABELS[s.paymentMethod as PaymentMethod] || s.paymentMethod,
      s.status === "PAGO" ? "Pago" : "Pendente",
      s.discount ? currency(s.discount) : "R$ 0,00",
      currency(s.total),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`vendas_zelo_${today}.csv`, headers, rows);
    toast.success(`${sales.length} venda(s) exportada(s) com sucesso!`);
  } catch (error) {
    console.error(error);
    toast.error("Erro ao exportar vendas.");
  }
};

export const handleExportLowStockPdf = async (lowStockProducts: any[], globalThreshold: number) => {
  try {
    if (!lowStockProducts || lowStockProducts.length === 0) {
      toast.warning("Nenhum produto com estoque baixo para gerar a lista.");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Lista de Compras (Estoque Baixo)", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

    const headers = [["Produto", "Categoria", "Estoque Atual", "Estoque Mínimo", "Sugestão de Reposição"]];

    const data = lowStockProducts.map((p) => {
      const min = p.minStock !== null && p.minStock !== undefined ? Number(p.minStock) : globalThreshold;
      const current = Number(p.stock ?? 0);
      const suggest = Math.max(0, min - current + 1); // Sugestão para ficar acima do mínimo

      return [
        p.name,
        p.category?.name || p.category || "Geral",
        current.toString(),
        min.toString(),
        suggest.toString()
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
    });

    const today = new Date().toISOString().slice(0, 10);
    doc.save(`lista_de_compras_${today}.pdf`);
    toast.success("Lista de compras em PDF gerada com sucesso!");
  } catch (error) {
    console.error(error);
    toast.error("Erro ao gerar o PDF.");
  }
};
