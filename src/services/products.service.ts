import { apiRequest } from "@/lib/api-request";
import type { ProductFormValues } from "../lib/validations/product";

export const productsService = {
  async list(): Promise<any[]> {
    return apiRequest<any[]>("/products");
  },

  async create(data: ProductFormValues) {
    return apiRequest("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ProductFormValues>) {
    return apiRequest(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async remove(id: string) {
    return apiRequest(`/products/${id}`, {
      method: "DELETE",
    });
  },

  async addStock(id: string, qty: number) {
    return apiRequest(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ incrementStock: qty }),
    });
  },
};
