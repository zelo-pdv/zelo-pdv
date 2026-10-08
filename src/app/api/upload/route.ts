import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/require-permission";
import { uploadImageToSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const auth = await requirePermission("produtos", "Visualizar");
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato de imagem inválido. Formatos suportados: JPG, PNG, WEBP, GIF, AVIF." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "A imagem não pode exceder 5MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanExt = ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)
      ? ext
      : "jpg";
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const fileName = `product-${auth.user.lojaId}-${timestamp}-${uniqueId}.${cleanExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, path } = await uploadImageToSupabase(
      buffer,
      fileName,
      file.type
    );

    return NextResponse.json({ url, path, fileName });
  } catch (error: any) {
    console.error("Erro no upload de imagem:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao fazer upload da imagem" },
      { status: 500 }
    );
  }
}
