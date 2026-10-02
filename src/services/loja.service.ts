import { apiRequest } from "@/lib/api-request";
import { LojaFormData } from "@/lib/validations/loja";

export type LojaResponse = LojaFormData & { id: string; ownerId: string | null };

export async function getLoja(): Promise<LojaResponse> {
  return apiRequest("/lojas");
}

export async function createLoja(data: LojaFormData) {
  return apiRequest("/lojas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLoja(id: string, data: LojaFormData) {
  return apiRequest(`/lojas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
