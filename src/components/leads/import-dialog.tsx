"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, CircleCheck, CircleAlert, Users } from "lucide-react";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importLeadsFromCSV, getDuplicateGroups, deleteDuplicateLeads, type ImportSummary } from "@/lib/actions/leads";
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
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({});
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
    // Por defecto se conserva el más antiguo de cada grupo
    const defaults: Record<string, string> = {};
    for (const g of res.groups) {
      if (g.leads.length > 0) defaults[`${g.kind}:${g.key}`] = g.leads[0].id;
    }
    setKeepByGroup(defaults);
  }

  function idsToDelete(): string[] {
    if (!groups) return [];
    return groups.flatMap((g) => {
      const keep = keepByGroup[`${g.kind}:${g.key}`] ?? g.leads[0]?.id;
      return g.leads.map((l) => l.id).filter((id) => id !== keep);
    });
  }

  async function confirmCleanup() {
    setCleaning(true);
    const res = await deleteDuplicateLeads(idsToDelete());
    setCleaning(false);
    setConfirmClean(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCleanMsg(
      res.removed === 0
        ? "No quedaban duplicados por eliminar."
        : `Eliminados ${res.removed} leads duplicados.`,
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
            <Users className="h-4 w-4" /> Limpiar duplicados (teléfono o web)
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Agrupados por teléfono o web. Elige cuál conservar de cada grupo y elimina el resto (con sus actividades y tareas).
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
            <div className="mt-2 space-y-3">
              <div className="max-h-56 space-y-3 overflow-y-auto">
                {groups.map((g) => {
                  const gk = `${g.kind}:${g.key}`;
                  return (
                    <fieldset key={gk} className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
                      <legend className="px-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {g.kind === "phone" ? "Tel: " : "Web: "}{g.key} ({g.leads.length})
                      </legend>
                      {g.leads.map((l) => (
                        <label key={l.id} className="flex cursor-pointer items-center gap-2 py-1 text-xs text-neutral-700 dark:text-neutral-300">
                          <input
                            type="radio"
                            name={gk}
                            checked={(keepByGroup[gk] ?? g.leads[0]?.id) === l.id}
                            onChange={() => setKeepByGroup({ ...keepByGroup, [gk]: l.id })}
                            className="accent-neutral-900 dark:accent-white"
                          />
                          <span>
                            Conservar <strong>{l.company_name}</strong>
                            {l.id === g.leads[0]?.id && <span className="text-neutral-400"> (más antiguo)</span>}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </div>
              <Button size="sm" variant="danger" onClick={() => setConfirmClean(true)}>
                Eliminar los no seleccionados ({idsToDelete().length})
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
        message="Se eliminarán los leads no seleccionados junto con sus actividades y tareas. Siempre queda al menos uno por grupo. Esta acción no se puede deshacer."
      />
    </Dialog>
  );
}
