import { describe, it, expect } from "vitest";
import {
  parseLeadsCSV,
  parseImportValue,
  parseImportDate,
  splitCSVLine,
  buildLeadsTemplate,
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
  });
});
