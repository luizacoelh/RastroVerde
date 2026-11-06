import { describe, expect, it } from "vitest";
import { mensagemRegiaoSemDados } from "./cobertura";

describe("mensagemRegiaoSemDados (UC4)", () => {
  it("cita os municípios da base", () => {
    const m = mensagemRegiaoSemDados(["Luís Eduardo Magalhães e São Desidério (BA)"]);
    expect(m).toContain("Região sem dados");
    expect(m).toContain("A base atual cobre Luís Eduardo Magalhães e São Desidério (BA).");
    expect(m).toContain("azul tracejado");
  });

  it("várias bases, sem repetir descrições iguais nem vazias", () => {
    const m = mensagemRegiaoSemDados(["A (BA)", null, "B (PI)", " A (BA) ", "", "C (MA)"]);
    expect(m).toContain("As bases atuais cobrem A (BA), B (PI) e C (MA).");
  });

  it("base sem descrição: remete ao mapa", () => {
    const m = mensagemRegiaoSemDados([null, undefined]);
    expect(m).not.toMatch(/A base atual cobre|As bases atuais cobrem/);
    expect(m).toContain("mapa de edição do talhão");
  });
});
