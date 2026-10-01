"use client";

import { useTheme } from "next-themes";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { cn } from "@/lib/utils";

export function ModeToggle({
  className,
  title,
}: {
  className?: string;
  title?: boolean;
}) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <div className="inline-flex items-center">
      <AnimatedThemeToggler
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onThemeChange={setTheme}
        className={cn(
          "relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer select-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      />
      {title && (
        <span className="ml-2 text-sm">
          {resolvedTheme === "dark" ? "Tema claro" : "Tema escuro"}
        </span>
      )}
    </div>
  );
}
