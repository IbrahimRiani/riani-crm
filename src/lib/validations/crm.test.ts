import { describe, it, expect } from "vitest";
import { leadSchema } from "@/lib/validations/lead";
import { activitySchema } from "@/lib/validations/activity";
import { taskSchema } from "@/lib/validations/task";
import { normalizeWhatsapp } from "@/lib/utils/whatsapp";
import { leadsToCSV } from "@/lib/utils/csv";
import { resolveTheme } from "@/lib/theme/theme";

describe("leadSchema", () => {
  it("rechaza sin company_name", () => {
    expect(leadSchema.safeParse({ company_name: "", status: "new", priority: "medium", source: "manual" }).success).toBe(false);
  });
  it("acepta un lead mínimo válido", () => {
    const r = leadSchema.safeParse({ company_name: "Clínica Test", status: "new", priority: "medium", source: "manual" });
    expect(r.success).toBe(true);
  });
  it("rechaza email inválido", () => {
    const r = leadSchema.safeParse({ company_name: "X", email: "no-es-email", status: "new", priority: "medium", source: "manual" });
    expect(r.success).toBe(false);
  });
  it("rechaza estado inválido", () => {
    const r = leadSchema.safeParse({ company_name: "X", status: "inventado", priority: "medium", source: "manual" });
    expect(r.success).toBe(false);
  });
  it("normaliza website sin protocolo", () => {
    const r = leadSchema.safeParse({ company_name: "X", website: "empresa.com", status: "new", priority: "medium", source: "manual" });
    expect(r.success && r.data.website).toBe("https://empresa.com");
  });
});

describe("activitySchema", () => {
  it("exige lead_id uuid", () => {
    expect(activitySchema.safeParse({ lead_id: "no-uuid", type: "note" }).success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("exige título", () => {
    expect(taskSchema.safeParse({ title: "" }).success).toBe(false);
  });
  it("acepta tarea mínima", () => {
    expect(taskSchema.safeParse({ title: "Llamar" }).success).toBe(true);
  });
});

describe("normalizeWhatsapp", () => {
  it("antepone 34 a móvil español de 9 dígitos", () => {
    expect(normalizeWhatsapp("600 123 456")).toBe("34600123456");
  });
  it("devuelve null si vacío", () => {
    expect(normalizeWhatsapp(null)).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("respeta la elección guardada", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("usa el sistema cuando no hay elección", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("otro", false)).toBe("light");
  });
});
describe("leadsToCSV", () => {
  it("genera cabecera + fila", () => {
    const csv = leadsToCSV([
      {
        id: "1", user_id: "u", company_name: "Test SL", business_type: null, city: "Madrid",
        province: null, website: null, phone: null, whatsapp: null, email: null,
        contact_name: "Ana", status: "new", priority: "medium", source: "manual",
        notes: null, deal_value: 1000, next_follow_up: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
    ]);
    expect(csv).toContain("Empresa");
    expect(csv).toContain("Test SL");
  });
});
