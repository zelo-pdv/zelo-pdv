"use client";

import { useEffect, useState } from "react";

/**
 * Hook para detectar se a página sofreu rolagem vertical acima de um determinado limiar (threshold).
 * Otimizado com listener passivo e atualização de estado apenas na mudança de status.
 */
export function useHasScrolled(threshold = 200) {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      setHasScrolled(scrollY > threshold);
    };

    // Checagem inicial ao montar e ao trocar de rota
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return hasScrolled;
}
