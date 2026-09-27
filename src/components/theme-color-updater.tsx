"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === "dark";

    const updateStatusBar = () => {
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

      // When modal/drawer is open:
      // - dark mode: #000000 (deep black matching dimmed backdrop)
      // - light mode: #262626 (dark dimmed shade matching dimmed blurred backdrop)
      // When closed:
      // - dark mode: #171717 (app background in dark mode)
      // - light mode: #ffffff (white app background in light mode)
      const color = isModalOpen
        ? isDark
          ? "#000000"
          : "#262626"
        : isDark
        ? "#171717"
        : "#ffffff";

      // Update meta[name="theme-color"]
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
      if (meta.getAttribute("content") !== color) {
        meta.setAttribute("content", color);
      }

      // Update meta[name="apple-mobile-web-app-status-bar-style"]
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
      const appleContent = isModalOpen || isDark ? "black-translucent" : "default";
      if (appleMeta.getAttribute("content") !== appleContent) {
        appleMeta.setAttribute("content", appleContent);
      }
    };

    // Run initially
    updateStatusBar();

    // Observe DOM mutations to detect when modal opens or closes
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

    return () => {
      observer.disconnect();
    };
  }, [resolvedTheme]);

  return null;
}

