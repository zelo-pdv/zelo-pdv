"use client";

import { useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHasScrolled } from "@/hooks/use-has-scrolled";

interface MobileActionFabProps {
  onAdd: () => void;
  onExport: () => void;
  onConfig?: () => void;
  onImport?: () => void;
  isExporting?: boolean;
}

export function MobileActionFab({ onAdd, onExport, onConfig, onImport, isExporting }: MobileActionFabProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const hasScrolled = useHasScrolled(200);

  if (!isMobile) return null;

  return (
    <>
      {/* Optional overlay to close when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed right-4 z-50 flex flex-col-reverse items-end gap-3 pointer-events-none transition-all duration-300 ease-in-out",
          hasScrolled
            ? "bottom-[calc(140px+env(safe-area-inset-bottom))]"
            : "bottom-[calc(80px+env(safe-area-inset-bottom))]"
        )}
      >
        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 pointer-events-auto",
            isOpen ? "bg-red-500 rotate-45" : "bg-primary"
          )}
        >
          <BoxIcon name="plus" className="text-2xl" />
        </button>

        {/* Action Buttons */}
        <div className="flex flex-col items-end gap-3">
          {/* Import Button */}
          {onImport && (
            <button
              onClick={() => {
                onImport();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
              )}
              style={{ transitionDelay: isOpen ? "75ms" : "25ms" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <BoxIcon name="upload" className="text-xl" />
              </div>
              <span className="text-sm font-semibold">Importar</span>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={() => {
              onExport();
              setIsOpen(false);
            }}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
            )}
            style={{ transitionDelay: isOpen ? "100ms" : "0ms" }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              {isExporting ? (
                <BoxIcon name="loader-alt" className="text-xl bx-spin" />
              ) : (
                <BoxIcon name="download" className="text-xl" />
              )}
            </div>
            <span className="text-sm font-semibold">Exportar</span>
          </button>

          {/* Config Button */}
          {onConfig && (
            <button
              onClick={() => {
                onConfig();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
              )}
              style={{ transitionDelay: isOpen ? "75ms" : "25ms" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <BoxIcon name="cog" className="text-xl" />
              </div>
              <span className="text-sm font-semibold">Configurações</span>
            </button>
          )}

          {/* Add Button */}
          <button
            onClick={() => {
              onAdd();
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 rounded-full bg-background border border-border pr-6 pl-1.5 py-1.5 shadow-lg transition-all duration-300 pointer-events-auto",
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
            style={{ transitionDelay: isOpen ? "50ms" : "50ms" }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <BoxIcon name="user-plus" className="text-xl" />
            </div>
            <span className="text-sm font-semibold">Novo</span>
          </button>
        </div>
      </div>
    </>
  );
}
