import { apiRequest } from "@/lib/api-request";

export const settingsService = {
  get: async () => {
    return apiRequest("/settings");
  },
  
  update: async (config: any) => {
    return apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },
};
