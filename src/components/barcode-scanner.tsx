"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
  continuous?: boolean;
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  continuous = false,
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ text: string; time: number } | null>(null);

  const startScan = async () => {
    setError("");
    lastScannedRef.current = null;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          if (decodedText && decodedText.trim() !== "") {
            if (continuous) {
              const now = Date.now();
              const last = lastScannedRef.current;
              // Prevent scanning the same barcode multiple times within 2 seconds
              if (last && last.text === decodedText && now - last.time < 2000) {
                return;
              }
              lastScannedRef.current = { text: decodedText, time: now };
              onScan(decodedText);
            } else {
              onScan(decodedText);
              stopScan();
              onOpenChange(false);
            }
          }
        },
        () => {
          // Ignore parsing errors as they fire constantly when no code is present
        },
      );
      setIsScanning(true);
    } catch {
      setError("Nenhuma câmera traseira encontrada ou permissão negada.");
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  useEffect(() => {
    if (open) {
      // Small timeout to ensure DOM is ready before injecting the video
      const timeout = setTimeout(() => startScan(), 100);
      return () => clearTimeout(timeout);
    } else {
      stopScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Impede fechamento ao clicar fora do modal (útil por causa do prompt de permissão da câmera)
        if (o) onOpenChange(o);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ler Código de Barras</DialogTitle>
          <DialogDescription>
            Aponte a câmera traseira para o código de barras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex flex-col items-center">
          {error && (
            <p className="text-sm text-red-500 font-medium text-center">
              {error}
            </p>
          )}

          <div className="w-full min-h-62.5 max-w-sm relative overflow-hidden rounded-lg bg-black flex items-center justify-center">
            {!isScanning && !error && (
              <p className="text-sm text-muted-foreground absolute z-10">
                Iniciando câmera...
              </p>
            )}
            <div id="reader" className="w-full relative z-20"></div>
          </div>
        </div>

        <div className="flex justify-end w-full mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await stopScan();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
