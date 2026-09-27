import { apiRequest } from "@/lib/api-request";
import type { SaleFormValues } from "@/lib/validations/sale";
import { Sale } from "@/types";

export const salesService = {
  async list(): Promise<Sale[]> {
    return apiRequest("/sales");
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
