"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductThumbProps {
  name: string;
  image?: string | null;
  className?: string;
}

export function ProductThumb({ name, image, className }: ProductThumbProps) {
  const [hasError, setHasError] = useState(false);
  const [lastImage, setLastImage] = useState(image);

  if (image !== lastImage) {
    setLastImage(image);
    setHasError(false);
  }

  const letters = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Deterministic hue from name
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;

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
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-xs select-none",
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 60%), hsl(${(hue + 40) % 360} 70% 45%))`,
      }}
    >
      {letters}
    </div>
  );
}
