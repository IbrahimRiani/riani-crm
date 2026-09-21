"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, CircleCheck, CircleAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importLeadsFromCSV, type ImportSummary } from "@/lib/actions/leads";
import { buildLeadsTemplate } from "@/lib/utils/import";
import { downloadCSV } from "@/lib/utils/csv";

export function LeadImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function downloadTemplate() {
    downloadCSV(`plantilla-leads-${new Date().toISOString().slice(0, 10)}.csv`, buildLeadsTemplate());
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setSummary(null);
    setPending(true);
    try {
      const text = await file.text();
      const res = await importLeadsFromCSV(text);
      if (!res.ok) {
        setError(res.error);
      } else {
        setSummary(res.summary);
        router.refresh();
      }
    } catch {
      setError("No se pudo leer el archivo. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  function close() {
    setFileName(null);
    setError(null);
    setSummary(null);
    setPending(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="Importar leads" wide>
      <div className="space-y-4">
        <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">Formato del archivo (.csv o .txt)</p>
          <code className="mt-1 block overflow-x-auto whitespace-nowrap py-1">
            Empresa;Tipo;Contacto;Teléfono;WhatsApp;Email;Web;Ciudad;Provincia;Estado;Prioridad;Fuente;Valor;Próximo seguimiento;Notas
          </code>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Solo <strong>Empresa</strong> es obligatoria.</li>
            <li>Estado: Nuevo, Contactado, WhatsApp enviado, Reunión, Demo, Propuesta, Ganado, Perdido.</li>
            <li>Prioridad: Baja, Media, Alta. Fuente: Manual, Lead Hunter, Referido, Web, Otro.</li>
            <li>Valor en euros («1500», «1.200 €»). Fecha como dd/mm/aaaa.</li>
            <li>Los duplicados (misma empresa + teléfono/email) se omiten. Máx. 500 filas.</li>
          </ul>
          <Button size="sm" variant="outline" className="mt-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Descargar plantilla
          </Button>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={pending}>
            <Upload className="h-4 w-4" />
            {pending ? "Importando…" : fileName ?? "Elegir archivo"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        {summary && (
          <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700">
            <p className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
              <CircleCheck className="h-4 w-4 text-green-600" />
              {summary.imported} importados
              {summary.skipped > 0 && ` · ${summary.skipped} duplicados omitidos`}
            </p>
            {summary.errors.length > 0 && (
              <div className="mt-2">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  <CircleAlert className="h-4 w-4" /> {summary.errors.length} filas con error:
                </p>
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-neutral-600 dark:text-neutral-400">
                  {summary.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>Fila {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={close}>Cerrar</Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
