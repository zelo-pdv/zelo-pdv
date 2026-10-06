import { apiRequest } from "@/lib/api-request";

export const categoriesService = {
  async list() {
    return apiRequest("/categories");
  },
  async create(data: { name: string; lowStockThreshold?: number | null }) {
    return apiRequest("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async update(id: string, data: { name: string; lowStockThreshold?: number | null }) {
    return apiRequest(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  async delete(id: string) {
    return apiRequest(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};
