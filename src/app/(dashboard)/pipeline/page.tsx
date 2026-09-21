import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { Lead } from "@/types/crm";

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });

  if (error) {
    console.error("[PipelinePage]", error);
    return <p className="text-sm text-neutral-500">No se pudo cargar el pipeline. Inténtalo de nuevo.</p>;
  }

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Arrastra las tarjetas para cambiar de etapa" />
      <PipelineBoard initialLeads={(data ?? []) as Lead[]} />
    </div>
  );
}
