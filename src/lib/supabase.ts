import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export const BUCKET_PRODUCTS = "products";

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl =
    process.env.SUPABASE_URL || "https://sohqgyizqddasvhgxhqa.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      "Chave de acesso ao Supabase não configurada. Defina SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY no arquivo .env.",
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

export async function uploadImageToSupabase(
  fileBuffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  contentType: string,
  bucket = BUCKET_PRODUCTS,
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Falha no upload para o Supabase Storage: ${error.message}`,
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    path: data.path,
  };
}
