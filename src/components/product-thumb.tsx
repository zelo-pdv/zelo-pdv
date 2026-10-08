"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BoxIcon } from "@/components/ui/box-icon";
import { useSettingsStore } from "@/store/useSettingsStore";

interface ProductThumbProps {
  name: string;
  image?: string | null;
  className?: string;
  forceShow?: boolean;
}

export function ProductThumb({ name, image, className, forceShow }: ProductThumbProps) {
  const showProductImages = useSettingsStore((s) => s.products?.showProductImages ?? true);
  const [hasError, setHasError] = useState(false);
  const [lastImage, setLastImage] = useState(image);

  if (image !== lastImage) {
    setLastImage(image);
    setHasError(false);
  }

  if (!forceShow && !showProductImages) {
    return null;
  }

  const validImage = Boolean(image && image.trim() && !hasError);

  if (validImage) {
    return (
      <div
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-xs",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image!}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground shadow-xs select-none",
        className
      )}
    >
      <BoxIcon name="image-alt" className="text-lg text-muted-foreground" />
    </div>
  );
}
