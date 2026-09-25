"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Download, ArrowUpDown, Upload } from "lucide-react";
import type { Lead, Profile } from "@/types/crm";
import { LEAD_STATUSES, LEAD_PRIORITIES, LEAD_SOURCES } from "@/lib/constants/crm";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/states";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadImportDialog } from "@/components/leads/import-dialog";
import { formatEUR, relativeDayES } from "@/lib/utils/format";
import { leadsToCSV, downloadCSV } from "@/lib/utils/csv";
import { PageHeader } from "@/components/layout/header";

type SortKey = "company" | "value" | "followup" | "created";

export function LeadsExplorer({ leads, profiles = [], isAdmin = false }: { leads: Lead[]; profiles?: Profile[]; isAdmin?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(
    // Abrir el diálogo de importación con /leads#importar
    () => typeof window !== "undefined" && window.location.hash === "#importar",
  );
  const [, startTransition] = useTransition();

  function closeImport() {
    setImportOpen(false);
    if (typeof window !== "undefined" && window.location.hash === "#importar") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (priority !== "all" && l.priority !== priority) return false;
      if (source !== "all" && l.source !== source) return false;
      if (!needle) return true;
      return [l.company_name, l.contact_name, l.phone, l.email, l.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    out = [...out].sort((a, b) => {
      if (sort === "company") return a.company_name.localeCompare(b.company_name, "es");
      if (sort === "value") return (b.deal_value ?? 0) - (a.deal_value ?? 0);
      if (sort === "followup")
        return (a.next_follow_up ?? "9999").localeCompare(b.next_follow_up ?? "9999");
      return b.created_at.localeCompare(a.created_at);
    });
    return out;
  }, [leads, q, status, priority, source, sort]);

  function exportCSV() {
    const emailById: Record<string, string> = {};
    for (const p of profiles) {
      if (p.id && p.email) emailById[p.id] = p.email;
    }
    downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCSV(filtered, emailById));
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${filtered.length} de ${leads.length} empresas`}
        action={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo lead
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa, contacto, teléfono…"
            className="pl-9"
            aria-label="Buscar leads"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
          <option value="all">Todos los estados</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filtrar por prioridad">
          <option value="all">Todas las prioridades</option>
          {LEAD_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filtrar por fuente">
          <option value="all">Todas las fuentes</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
        <button
          onClick={() =>
            setSort(sort === "company" ? "value" : sort === "value" ? "followup" : sort === "followup" ? "created" : "company")
          }
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          title="Cambiar orden"
        >
          <ArrowUpDown className="h-4 w-4" />
          {sort === "company" ? "Nombre" : sort === "value" ? "Valor" : sort === "followup" ? "Seguimiento" : "Recientes"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={leads.length === 0 ? "Todavía no tienes leads" : "Sin resultados"}
          message={
            leads.length === 0
              ? "Añade tu primer lead para empezar a gestionar tu pipeline."
              : "Prueba con otra búsqueda o ajusta los filtros."
          }
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo lead
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b border-neutral-50 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                    onClick={() => startTransition(() => router.push(`/leads/${l.id}`))}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{l.company_name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {[l.business_type, l.city].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{l.contact_name ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={l.priority} /></td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100">{formatEUR(l.deal_value)}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{relativeDayES(l.next_follow_up)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{l.company_name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {[l.business_type, l.city].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatEUR(l.deal_value)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={l.status} />
                  <PriorityBadge priority={l.priority} />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{relativeDayES(l.next_follow_up)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo lead" wide>
        <LeadForm profiles={profiles} onDone={() => setCreateOpen(false)} />
      </Dialog>
      <LeadImportDialog open={importOpen} onClose={closeImport} isAdmin={isAdmin} />
    </div>
  );
}
