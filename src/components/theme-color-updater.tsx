"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    const color = isDark ? "#000000" : "#ffffff";

    // Remove any existing theme-color meta tags to prevent media-query precedence issues
    const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
    existingMetas.forEach((el) => el.remove());

    // Create a fresh theme-color meta tag
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", color);
    document.head.appendChild(meta);

    // Update apple-mobile-web-app-status-bar-style
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleMeta) {
      appleMeta = document.createElement("meta");
      appleMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
      document.head.appendChild(appleMeta);
    }
    appleMeta.setAttribute("content", isDark ? "black-translucent" : "default");
  }, [resolvedTheme]);

  return null;
}
