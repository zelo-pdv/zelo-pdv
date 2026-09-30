"use client";

import { useEffect, useRef } from "react";

export type SyncType = "products" | "clients" | "sales" | "categories" | "users" | "access_groups" | "session";

type SyncVersions = Record<SyncType, string>;

type Listener = {
  types: SyncType[];
  callback: (changedTypes: SyncType[], versions?: SyncVersions) => void | Promise<void>;
};

const listeners = new Set<Listener>();
let cachedVersions: Partial<SyncVersions> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isChecking = false;
let broadcastChannel: BroadcastChannel | null = null;

// Inicializa canal de broadcast para comunicação instantânea entre abas no mesmo navegador
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("zelo_data_sync");
    broadcastChannel.onmessage = (event) => {
      const { type } = event.data || {};
      if (type) {
        // Checa imediatamente se houver evento de outra aba
        checkForUpdates();
      }
    };
  } catch (e) {
    console.warn("BroadcastChannel não suportado neste ambiente:", e);
  }
}

/**
 * Notifica imediatamente outras abas e o sistema de que houve uma mutação local.
 */
export function notifyLocalSync(type: SyncType) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, timestamp: Date.now() });
    } catch {
      // Ignore broadcast errors
    }
  }
  // Dá um pequeno delay para a API/DB ter concluído a escrita e força verificação
  setTimeout(() => {
    checkForUpdates();
  }, 300);
}

async function checkForUpdates() {
  if (isChecking || typeof window === "undefined") return;
  if (document.visibilityState !== "visible" && !document.hasFocus()) return;
  if (!navigator.onLine) return;

  isChecking = true;
  try {
    const res = await fetch("/api/sync", {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Se a sessão for inválida (ex: user excluído ou inativado), force o logout
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }
      return;
    }

    const latestVersions = (await res.json()) as SyncVersions;

    if (!cachedVersions) {
      // Primeira leitura: apenas memoriza o estado inicial atual
      cachedVersions = latestVersions;
      return;
    }

    const changedTypes: SyncType[] = [];
    const allTypes: SyncType[] = ["products", "clients", "sales", "categories", "users", "access_groups", "session"];

    for (const t of allTypes) {
      if (latestVersions[t] && latestVersions[t] !== cachedVersions[t]) {
        changedTypes.push(t);
      }
    }

    // Atualiza o cache com as novas versões
    cachedVersions = latestVersions;

    if (changedTypes.length > 0) {
      // Dispara callbacks dos listeners inscritos
      listeners.forEach((listener) => {
        const hasOverlap = listener.types.some((t) => changedTypes.includes(t));
        if (hasOverlap) {
          try {
            listener.callback(changedTypes, latestVersions);
          } catch (err) {
            console.error("Erro no callback de sincronização:", err);
          }
        }
      });
    }
  } catch (error) {
    // Falha silenciosa para não incomodar o usuário com oscilações de rede
    console.debug("Verificação de sincronização falhou:", error);
  } finally {
    isChecking = false;
  }
}

function startSyncLoop() {
  if (pollTimer || typeof window === "undefined") return;

  // Checa a cada 4 segundos se a janela estiver visível
  pollTimer = setInterval(() => {
    if (document.visibilityState === "visible") {
      checkForUpdates();
    }
  }, 4000);

  // Checagem imediata quando a aba ganha foco ou volta a ser visível
  window.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleFocus);
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    checkForUpdates();
  }
}

function handleFocus() {
  checkForUpdates();
}

function stopSyncLoopIfEmpty() {
  if (listeners.size === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    }
  }
}

interface UseDataSyncOptions {
  types: SyncType[];
  onSync: (changedTypes: SyncType[], versions?: SyncVersions) => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Hook para escutar alterações em tempo real de entidades do sistema (produtos, clientes, vendas, etc.).
 * Sincroniza entre múltiplos dispositivos e entre abas sem necessidade de reload da página.
 */
export function useDataSync({ types, onSync, enabled = true }: UseDataSyncOptions) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const listener: Listener = {
      types,
      callback: (changed, versions) => {
        onSyncRef.current(changed, versions);
      },
    };

    listeners.add(listener);
    startSyncLoop();

    return () => {
      listeners.delete(listener);
      stopSyncLoopIfEmpty();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, types.join(",")]);
}
