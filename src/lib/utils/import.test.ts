import { describe, it, expect } from "vitest";
import {
  parseLeadsCSV,
  parseImportValue,
  parseImportDate,
  splitCSVLine,
  buildLeadsTemplate,
  phoneKeyVariants,
  canonicalPhone,
  findDuplicateGroups,
  IMPORT_HEADERS,
} from "@/lib/utils/import";

describe("splitCSVLine", () => {
  it("respeta campos entrecomillados con separador dentro", () => {
    expect(splitCSVLine('a;"b;c";d', ";")).toEqual(["a", "b;c", "d"]);
  });
  it("soporta comillas escapadas", () => {
    expect(splitCSVLine('"di ""hola""";x', ";")).toEqual(['di "hola"', "x"]);
  });
});

describe("parseImportValue", () => {
  it("entiende formato español", () => {
    expect(parseImportValue("1.200 €")).toBe(1200);
    expect(parseImportValue("1500")).toBe(1500);
    expect(parseImportValue("2,500")).toBe(2500);
    expect(parseImportValue("")).toBeNull();
    expect(Number.isNaN(parseImportValue("abc"))).toBe(true);
  });
});

describe("parseImportDate", () => {
  it("acepta dd/mm/aaaa y aaaa-mm-dd", () => {
    expect(parseImportDate("25/09/2026")).toBe("2026-09-25");
    expect(parseImportDate("2026-09-25")).toBe("2026-09-25");
    expect(parseImportDate("no-fecha")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });
});

describe("parseLeadsCSV", () => {
  it("importa CSV válido con etiquetas en español", () => {
    const csv = [
      "Empresa;Tipo;Contacto;Teléfono;Email;Estado;Prioridad;Fuente;Valor;Próximo seguimiento;Notas",
      "Clínica Test;Dental;Ana;600123456;ana@test.com;Propuesta;Alta;Web;1.200 €;25/09/2026;Interesada",
    ].join("\n");
    const { rows, errors } = parseLeadsCSV(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({
      company_name: "Clínica Test",
      status: "proposal",
      priority: "high",
      source: "website",
      deal_value: 1200,
      next_follow_up: "2026-09-25",
    });
  });

  it("detecta separador por comas y aplica valores por defecto", () => {
    const { rows, errors } = parseLeadsCSV("Empresa,Ciudad\n fontanero pepe,Toledo");
    expect(errors).toEqual([]);
    expect(rows[0].data).toMatchObject({
      company_name: "fontanero pepe",
      city: "Toledo",
      status: "new",
      priority: "medium",
      source: "manual",
    });
  });

  it("exige la columna Empresa", () => {
    const { rows, errors } = parseLeadsCSV("Nombre,Ciudad\nx,y");
    expect(rows).toHaveLength(0);
    expect(errors[0].message).toContain("Empresa");
  });

  it("reporta filas con email o fecha inválidos sin tumbar las válidas", () => {
    const csv = [
      "Empresa;Email;Próximo seguimiento",
      "Bien;bien@ok.com;01/10/2026",
      "Mal email;no-es-email;",
      "Mal fecha;f@ok.com;ayer",
      ";sin empresa;",
    ].join("\n");
    const { rows, errors } = parseLeadsCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({ company_name: "Bien" });
    expect(errors.map((e) => e.row)).toEqual([3, 4, 5]);
  });

  it("la plantilla oficial se parsea sin errores", () => {
    const { rows, errors } = parseLeadsCSV(buildLeadsTemplate());
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(IMPORT_HEADERS).toContain("Empresa");
    expect(IMPORT_HEADERS).toContain("Responsable");
  });

  it("pasa el responsable como email para resolver en servidor", () => {
    const { rows, errors } = parseLeadsCSV("Empresa,Responsable\nClínica X,Ibra@Mail.com");
    expect(errors).toEqual([]);
    expect(rows[0].assigneeEmail).toBe("ibra@mail.com");
  });
});

describe("duplicados por teléfono", () => {
  it("detecta variantes del mismo número", () => {
    expect(phoneKeyVariants("600 123 456")).toContain("34600123456");
    expect(phoneKeyVariants("+34 600 123 456")).toContain("600123456");
    expect(phoneKeyVariants("")).toEqual([]);
    expect(phoneKeyVariants("123")).toEqual([]);
    expect(canonicalPhone("34600123456")).toBe("600123456");
  });

  it("agrupa leads que comparten teléfono aunque el nombre difiera", () => {
    const groups = findDuplicateGroups([
      { id: "1", company_name: "Clínica Sonrisa", phone: "600123456", whatsapp: null, website: null, created_at: "2026-09-01T00:00:00Z" },
      { id: "2", company_name: "CLINICA DENTAL SONRISA", phone: "+34 600 123 456", whatsapp: null, website: null, created_at: "2026-09-02T00:00:00Z" },
      { id: "3", company_name: "Otra empresa", phone: "611111111", whatsapp: null, website: null, created_at: "2026-09-03T00:00:00Z" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("600123456");
    expect(groups[0].kind).toBe("phone");
    // El más antiguo primero (es el que se conserva por defecto)
    expect(groups[0].leads.map((l) => l.id)).toEqual(["1", "2"]);
  });

  it("también mira el campo whatsapp", () => {
    const groups = findDuplicateGroups([
      { id: "1", company_name: "A", phone: null, whatsapp: "600123456", website: null, created_at: "2026-09-01T00:00:00Z" },
      { id: "2", company_name: "B", phone: "600123456", whatsapp: null, website: null, created_at: "2026-09-02T00:00:00Z" },
    ]);
    expect(groups).toHaveLength(1);
  });

  it("agrupa por web aunque no haya teléfono", () => {
    const groups = findDuplicateGroups([
      { id: "1", company_name: "Clínica Sonrisa", phone: null, whatsapp: null, website: "sonrisa.com", created_at: "2026-09-01T00:00:00Z" },
      { id: "2", company_name: "Sonrisa Dental", phone: null, whatsapp: null, website: "https://www.sonrisa.com/", created_at: "2026-09-02T00:00:00Z" },
      { id: "3", company_name: "Otra", phone: null, whatsapp: null, website: "otra.com", created_at: "2026-09-03T00:00:00Z" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("web");
  });

  it("no agrupa perfiles distintos de redes genéricas", () => {
    const groups = findDuplicateGroups([
      { id: "1", company_name: "A", phone: null, whatsapp: null, website: "facebook.com/negocio-a", created_at: "2026-09-01T00:00:00Z" },
      { id: "2", company_name: "B", phone: null, whatsapp: null, website: "facebook.com/negocio-b", created_at: "2026-09-02T00:00:00Z" },
    ]);
    expect(groups).toHaveLength(0);
  });
});
