"use client";

import { useHasScrolled } from "@/hooks/use-has-scrolled";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTop({ threshold = 200, className }: ScrollToTopProps) {
  const isScrolled = useHasScrolled(threshold);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    if (document.documentElement.scrollTop > 0) {
      document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      className={cn(
        // Posicionamento flutuante global:
        // No mobile: fica acima da navegação inferior (80px + safe area)
        // No desktop: fica no canto inferior direito padrão (bottom-6 right-6)
        "fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] md:right-6 md:bottom-6 z-40",
        "flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-out",
        // Tema Light: fundo escuro e ícone claro
        "bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700/40 active:bg-zinc-950",
        // Tema Dark: fundo branco e ícone escuro
        "dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 dark:border-zinc-200 dark:active:bg-zinc-200",
        // Efeitos de foco e hover
        "hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
        // Visibilidade suave: surge somente ao rolar a página
        isScrolled
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : "opacity-0 scale-75 translate-y-3 pointer-events-none",
        className
      )}
    >
      <ArrowUp className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
    </button>
  );
}
