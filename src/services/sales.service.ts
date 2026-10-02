import { apiRequest } from "@/lib/api-request";
import type { SaleFormValues } from "@/lib/validations/sale";
import { Sale } from "@/types";

export const salesService = {
  async list(page?: number, limit?: number): Promise<Sale[]> {
    let url = "/sales";
    if (page !== undefined && limit !== undefined) {
      url += `?page=${page}&limit=${limit}`;
    }
    const res: any = await apiRequest(url);
    // Support both direct array and paginated response { data, meta }
    return Array.isArray(res) ? res : res.data;
  },

  async create(data: SaleFormValues) {
    return apiRequest("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateStatus(id: string, status: string): Promise<Sale> {
    return apiRequest(`/sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
