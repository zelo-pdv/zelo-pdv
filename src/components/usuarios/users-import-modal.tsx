import { useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BoxIcon } from '@/components/ui/box-icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { uploadData } from '@/services/upload.service';

export function ClientsImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ total: number; inserted: number; errors: string[] } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const Papa = (await import('papaparse')).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data);
      },
      error: () => {
        toast.error("Erro ao ler arquivo CSV.");
      }
    });
  };

  const handleUploadClick = () => {
    document.getElementById("csv-upload-clients")?.click();
  };

  const handleImportData = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const result = await uploadData("clients", importFile);
      setImportResult(result);
      if (result.errors.length === 0) {
        toast.success(`${result.inserted} clientes importados com sucesso!`);
      } else {
        toast.warning(`Importação concluída com ${result.errors.length} erros.`);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro durante a importação.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl sm:rounded-xl">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <BoxIcon name="upload" className="text-xl text-foreground shrink-0" />
            <span className="truncate">Importar Clientes via CSV</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1 -mr-1">
          <div className="rounded-xl bg-muted/50 p-3 sm:p-3.5 text-xs text-muted-foreground space-y-1.5 border border-border/40">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <BoxIcon name="info-circle" className="text-sm text-foreground" />
              Instruções:
            </p>
            <p>1. Utilize o modelo oficial .csv disponibilizado para evitar divergências.</p>
            <p>2. O arquivo deve conter cabeçalho com os nomes das colunas e delimitador ponto e vírgula (;) ou vírgula (,).</p>
            <p className="text-muted-foreground font-medium pt-0.5">Aviso: E-mails e telefones são validados de forma única no sistema. Se já existirem, a respectiva linha será rejeitada.</p>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-8 bg-muted/20 hover:bg-muted/40 transition-colors">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload-clients"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              className="mb-3 rounded-xl"
            >
              <BoxIcon name="search" className="mr-2 text-base" />
              Procurar Arquivo CSV
            </Button>
            {importFile ? (
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <BoxIcon name="file" className="text-lg" />
                <span className="truncate max-w-[200px]">{importFile.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImportFile(null);
                    setParsedRows([]);
                    setImportResult(null);
                  }}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                >
                  <BoxIcon name="x" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Nenhum arquivo selecionado</span>
            )}
          </div>

          {parsedRows.length > 0 && !importResult && (
            <div className="rounded-xl border border-border/70 p-3 flex items-center justify-between bg-primary/5">
              <span className="text-sm font-medium">{parsedRows.length} linhas detectadas</span>
              <BoxIcon name="check-circle" className="text-primary text-xl" />
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
              <div className={cn(
                "rounded-xl border p-4",
                importResult.errors.length === 0 ? "border-green-500/50 bg-green-500/10" : "border-amber-500/50 bg-amber-500/10"
              )}>
                <div className="flex items-start gap-3">
                  {importResult.errors.length === 0 ? (
                    <BoxIcon name="check-circle" className="text-green-500 text-xl shrink-0 mt-0.5" />
                  ) : (
                    <BoxIcon name="error-circle" className="text-amber-500 text-xl shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn(
                      "font-semibold text-sm",
                      importResult.errors.length === 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                      Resultado da Importação
                    </p>
                    <p className="text-xs mt-1 opacity-90">
                      Total processado: {importResult.total} | Importados: {importResult.inserted} | Falhas: {importResult.errors.length}
                    </p>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="bg-muted px-3 py-2 border-b border-border/70 text-xs font-semibold">
                    Relatório de Erros ({importResult.errors.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto p-3 text-xs text-destructive space-y-1 bg-destructive/5">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="break-words">
                        • {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t border-border/40 sm:border-0 sm:pt-2 mt-2 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl sm:rounded-lg"
          >
            Fechar
          </Button>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImportData}
              disabled={!importFile || isImporting}
              className="w-full sm:w-auto rounded-xl sm:rounded-lg gap-2"
            >
              {isImporting ? (
                <>
                  <BoxIcon name="loader-alt" className="bx-spin text-base" />
                  Importando...
                </>
              ) : (
                <>
                  <BoxIcon name="check" className="text-base sm:text-sm" />
                  Confirmar Importação
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
