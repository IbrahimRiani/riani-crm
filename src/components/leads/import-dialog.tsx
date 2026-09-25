"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, CircleCheck, CircleAlert, Users } from "lucide-react";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importLeadsFromCSV, getDuplicateGroups, deleteDuplicatePhones, type ImportSummary } from "@/lib/actions/leads";
import type { DuplicateGroup } from "@/lib/utils/import";
import { buildLeadsTemplate } from "@/lib/utils/import";
import { downloadCSV } from "@/lib/utils/csv";

export function LeadImportDialog({ open, onClose, isAdmin = false }: { open: boolean; onClose: () => void; isAdmin?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);

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
    setGroups(null);
    setCleanMsg(null);
    onClose();
  }

  async function scanDuplicates() {
    setScanning(true);
    setCleanMsg(null);
    const res = await getDuplicateGroups();
    setScanning(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setGroups(res.groups);
  }

  async function confirmCleanup() {
    setCleaning(true);
    const res = await deleteDuplicatePhones();
    setCleaning(false);
    setConfirmClean(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCleanMsg(
      res.removed === 0
        ? "No quedaban duplicados por eliminar."
        : `Eliminados ${res.removed} leads duplicados (se conservó el más antiguo de cada grupo).`,
    );
    setGroups(null);
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={close} title="Importar leads" wide>
      <div className="space-y-4">
        <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">Formato del archivo (.csv o .txt)</p>
          <code className="mt-1 block overflow-x-auto whitespace-nowrap py-1">
            Empresa;Tipo;Contacto;Teléfono;WhatsApp;Email;Web;Ciudad;Provincia;Estado;Prioridad;Fuente;Responsable;Valor;Próximo seguimiento;Notas
          </code>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Solo <strong>Empresa</strong> es obligatoria.</li>
            <li>Estado: Nuevo, Contactado, WhatsApp enviado, Reunión, Demo, Propuesta, Ganado, Perdido.</li>
            <li>Prioridad: Baja, Media, Alta. Fuente: Manual, Lead Hunter, Referido, Web, Otro.</li>
            <li>Responsable: email de un usuario del equipo (vacío = sin asignar).</li>
            <li>Valor en euros («1500», «1.200 €»). Fecha como dd/mm/aaaa.</li>
            <li>Los duplicados por teléfono se omiten (también dentro del mismo archivo). Máx. 500 filas.</li>
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

        {isAdmin && (
        <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700">
          <p className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
            <Users className="h-4 w-4" /> Limpiar duplicados por teléfono
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Busca leads que comparten teléfono y elimina los repetidos conservando el más antiguo de cada grupo (con sus actividades y tareas también se eliminan los duplicados).
          </p>
          {!groups && (
            <Button size="sm" variant="outline" className="mt-2" onClick={scanDuplicates} disabled={scanning}>
              {scanning ? "Buscando…" : "Buscar duplicados"}
            </Button>
          )}
          {groups && groups.length === 0 && (
            <p className="mt-2 text-xs font-medium text-green-700 dark:text-green-300">
              Sin duplicados. Tus leads están limpios.
            </p>
          )}
          {groups && groups.length > 0 && (
            <div className="mt-2">
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-neutral-600 dark:text-neutral-400">
                {groups.map((g) => (
                  <li key={g.phone}>
                    <strong className="text-neutral-900 dark:text-neutral-100">{g.phone}</strong>
                    {" "}({g.leads.length}): {g.leads.map((l) => l.company_name).join(" · ")}
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="danger" className="mt-2" onClick={() => setConfirmClean(true)}>
                Eliminar duplicados ({groups.reduce((s, g) => s + g.leads.length - 1, 0)})
              </Button>
            </div>
          )}
          {cleanMsg && (
            <p role="status" className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800 dark:bg-green-500/10 dark:text-green-300">
              {cleanMsg}
            </p>
          )}
        </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClean}
        onClose={() => setConfirmClean(false)}
        onConfirm={confirmCleanup}
        pending={cleaning}
        title="¿Eliminar leads duplicados?"
        message="Se conservará el lead más antiguo de cada grupo y se eliminarán los demás junto con sus actividades y tareas. Esta acción no se puede deshacer."
      />
    </Dialog>
  );
}
