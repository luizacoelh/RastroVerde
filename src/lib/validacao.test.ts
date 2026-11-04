import { describe, expect, it } from "vitest";
import {
  caminhoInternoSeguro,
  esquemaCadastro,
  esquemaPropriedade,
  valoresDoFormulario,
} from "./validacao";

describe("esquemaCadastro", () => {
  it("normaliza e-mail e aceita senha de 8 caracteres", () => {
    const r = esquemaCadastro.parse({ nome: " Ana ", email: " Ana@Exemplo.COM ", senha: "12345678" });
    expect(r).toEqual({ nome: "Ana", email: "ana@exemplo.com", senha: "12345678" });
  });

  it("recusa senha curta e e-mail inválido (RF01)", () => {
    const r = esquemaCadastro.safeParse({ nome: "Ana", email: "ana", senha: "1234567" });
    expect(r.success).toBe(false);
    const campos = r.error?.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["email", "senha"]));
  });
});

describe("esquemaPropriedade", () => {
  const valida = { nome: "Fazenda Boa Vista", municipio: "Luís Eduardo Magalhães", uf: "BA", cultura: "Soja", car: "" };

  it("aceita propriedade sem CAR (vira null)", () => {
    expect(esquemaPropriedade.parse(valida).car).toBeNull();
  });

  it("mantém o CAR informado", () => {
    expect(esquemaPropriedade.parse({ ...valida, car: " BA-2919553-ABC " }).car).toBe("BA-2919553-ABC");
  });

  it("recusa UF e cultura fora da lista", () => {
    expect(esquemaPropriedade.safeParse({ ...valida, uf: "XX" }).success).toBe(false);
    expect(esquemaPropriedade.safeParse({ ...valida, cultura: "Milho" }).success).toBe(false);
  });
});

describe("caminhoInternoSeguro", () => {
  it.each([
    ["/propriedades/abc", "/propriedades/abc"],
    ["http://localhost:3000/propriedades/abc?x=1", "/propriedades/abc?x=1"],
    ["https://malicioso.com", "/"],
    ["https://malicioso.com//outro.com", "/propriedades"],
    ["javascript:alert(1)", "/propriedades"],
    ["//malicioso.com", "/propriedades"],
    ["/\\malicioso.com", "/propriedades"],
    [null, "/propriedades"],
  ])("%s → %s", (entrada, esperado) => {
    expect(caminhoInternoSeguro(entrada)).toBe(esperado);
  });
});

describe("valoresDoFormulario", () => {
  it("lê só os campos pedidos e troca ausentes por string vazia", () => {
    const fd = new FormData();
    fd.set("nome", "X");
    fd.set("senha", "segredo");
    expect(valoresDoFormulario(fd, ["nome", "uf"])).toEqual({ nome: "X", uf: "" });
  });
});
