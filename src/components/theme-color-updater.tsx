"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeColorUpdater() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const checkIsDark = () => {
      if (resolvedTheme === "dark") return true;
      if (resolvedTheme === "light") return false;
      if (typeof document !== "undefined") {
        return document.documentElement.classList.contains("dark");
      }
      return false;
    };

    const updateStatusBar = () => {
      const isDark = checkIsDark();

      const activeOverlay = document.querySelector(
        [
          '[data-slot="drawer-overlay"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="dialog-overlay"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="alert-dialog-overlay"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="sheet-overlay"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="drawer-popup"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="dialog-content"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="alert-dialog-content"]:not([data-closed]):not([data-ending-style])',
          '[data-slot="sheet-content"]:not([data-closed]):not([data-ending-style])',
          '[role="dialog"]:not([data-closed]):not([data-ending-style])',
          '[role="alertdialog"]:not([data-closed]):not([data-ending-style])',
        ].join(", ")
      );

      const isModalOpen = Boolean(activeOverlay);

      // Quando aberto (drawer/modal/formulário):
      // - Modo dark: #000000 (preto profundo igual ao fundo escurecido com desfoque)
      // - Modo light: #999999 (cinza suave equivalente ao desfoque bg-black/40 sobre branco)
      // Quando fechado (padrão do app):
      // - Modo dark: #0a0a0a (cor real de fundo do app em dark mode, oklch(0.145 0 0))
      // - Modo light: #ffffff (cor de fundo branca do app em light mode)
      const color = isModalOpen
        ? isDark
          ? "#000000"
          : "#999999"
        : isDark
        ? "#0a0a0a"
        : "#ffffff";

      // Atualiza meta[name="theme-color"]
      const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
      if (existingMetas.length > 1) {
        existingMetas.forEach((el, index) => {
          if (index > 0) el.remove();
        });
      }

      let meta = existingMetas[0];
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.removeAttribute("media");
      if (meta.getAttribute("content") !== color) {
        meta.setAttribute("content", color);
      }

      // Atualiza meta[name="apple-mobile-web-app-status-bar-style"]
      // No modo light mantém "default" (ícones escuros legíveis no branco e no cinza desfoque)
      // No modo dark utiliza "black-translucent" (ícones claros no fundo escuro)
      let appleMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      );
      if (!appleMeta) {
        appleMeta = document.createElement("meta");
        appleMeta.setAttribute(
          "name",
          "apple-mobile-web-app-status-bar-style"
        );
        document.head.appendChild(appleMeta);
      }
      const appleContent = isDark ? "black-translucent" : "default";
      if (appleMeta.getAttribute("content") !== appleContent) {
        appleMeta.setAttribute("content", appleContent);
      }
    };

    // Executa inicialmente
    updateStatusBar();

    // Observa mutações no DOM para detectar abertura/fechamento de formulários/drawers
    const observer = new MutationObserver(() => {
      updateStatusBar();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-closed",
        "data-ending-style",
        "data-open",
        "open",
        "style",
      ],
    });

    // Observa alteração de classe de tema no <html>
    const htmlObserver = new MutationObserver(() => {
      updateStatusBar();
    });
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      htmlObserver.disconnect();
    };
  }, [theme, resolvedTheme]);

  return null;
}

