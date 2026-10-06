import { apiRequest } from "@/lib/api-request";

export const settingsService = {
  get: async () => {
    return apiRequest("/api/settings");
  },
  
  update: async (config: any) => {
    return apiRequest("/api/settings", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },
};
