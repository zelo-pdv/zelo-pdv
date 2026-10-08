export const storageService = {
  async uploadProductImage(file: File): Promise<{ url: string; path: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao fazer upload da imagem para o Supabase Storage");
    }

    return data;
  },
};
