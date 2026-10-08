import { apiRequest } from "@/lib/api-request";
import type { SaleFormValues } from "@/lib/validations/sale";
import { Sale } from "@/types";

export async function listSales(page?: number, limit?: number): Promise<Sale[]> {
  let url = "/sales";
  if (page !== undefined && limit !== undefined) {
    url += `?page=${page}&limit=${limit}`;
  }
  const res: any = await apiRequest(url);
  return Array.isArray(res) ? res : res.data;
}

export async function createSale(data: SaleFormValues) {
  return apiRequest("/sales", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSaleStatus(id: string, status: string): Promise<Sale> {
  return apiRequest(`/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateSale(id: string, data: SaleFormValues): Promise<Sale> {
  return apiRequest(`/sales/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function cancelSale(id: string): Promise<Sale> {
  return apiRequest(`/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "CANCELADO" }),
  });
}

export const salesService = {
  list: listSales,
  create: createSale,
  updateStatus: updateSaleStatus,
  update: updateSale,
  cancel: cancelSale,
};

export default salesService;
