import { describe, expect, it } from "vitest";
import type { Polygon } from "geojson";
import { conferirMunicipio, mensagemMunicipioDivergente, normalizarNomeMunicipio, type LimiteMunicipio } from "./municipio";

const quadrado = (x: number, y: number, lado: number): Polygon => ({
  type: "Polygon",
  coordinates: [[[x, y], [x + lado, y], [x + lado, y + lado], [x, y + lado], [x, y]]],
});

// Dois "municípios" vizinhos de 0,1° de lado, lado a lado no eixo x.
const LEM: LimiteMunicipio = { nome: "Luís Eduardo Magalhães", uf: "BA", geometria: quadrado(-46, -12, 0.1) };
const SD: LimiteMunicipio = { nome: "São Desidério", uf: "BA", geometria: quadrado(-45.9, -12, 0.1) };
const LIMITES = [LEM, SD];

describe("normalizarNomeMunicipio", () => {
  it.each([
    ["Uruçuí", "urucui"],
    [" URUCUI ", "urucui"],
    ["Luís Eduardo  Magalhães", "luis eduardo magalhaes"],
    ["Pau-d'Arco", "pau d arco"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarNomeMunicipio(entrada)).toBe(esperado);
  });
});

describe("conferirMunicipio (defeito 8)", () => {
  const dentroDeLem = quadrado(-45.97, -11.97, 0.01);
  const naDivisa = quadrado(-45.905, -11.97, 0.01); // 50% em cada município
  const longe = quadrado(-44, -12, 0.01);

  it("confere com o município declarado, ignorando acento e maiúsculas", () => {
    expect(conferirMunicipio(dentroDeLem, { municipio: "luis eduardo magalhaes", uf: "ba" }, LIMITES)).toEqual({
      situacao: "confere",
    });
  });

  it("diverge quando o talhão está em outro município e informa onde ele está", () => {
    expect(conferirMunicipio(dentroDeLem, { municipio: "Uruçuí", uf: "PI" }, LIMITES)).toEqual({
      situacao: "diverge",
      encontrado: { nome: "Luís Eduardo Magalhães", uf: "BA" },
    });
  });

  it("mesmo nome em outra UF não confere", () => {
    const r = conferirMunicipio(dentroDeLem, { municipio: "Luís Eduardo Magalhães", uf: "PI" }, LIMITES);
    expect(r.situacao).toBe("diverge");
  });

  it("talhão na divisa é aceito em qualquer dos dois municípios", () => {
    expect(conferirMunicipio(naDivisa, { municipio: "São Desidério", uf: "BA" }, LIMITES).situacao).toBe("confere");
    expect(conferirMunicipio(naDivisa, { municipio: "Luís Eduardo Magalhães", uf: "BA" }, LIMITES).situacao).toBe(
      "confere",
    );
  });

  it("na divisa e declarado em terceiro município: aponta o de maior área", () => {
    const maisEmSd = quadrado(-45.902, -11.97, 0.01); // 20% em LEM, 80% em SD
    expect(conferirMunicipio(maisEmSd, { municipio: "Barreiras", uf: "BA" }, LIMITES)).toEqual({
      situacao: "diverge",
      encontrado: { nome: "São Desidério", uf: "BA" },
    });
  });

  it("sem limite conhecido no lugar: desconhecido (não bloqueia; vira região sem dados)", () => {
    expect(conferirMunicipio(longe, { municipio: "Qualquer", uf: "BA" }, LIMITES)).toEqual({ situacao: "desconhecido" });
    expect(conferirMunicipio(dentroDeLem, { municipio: "Qualquer", uf: "BA" }, [])).toEqual({ situacao: "desconhecido" });
  });

  it("encostar só na borda (área < 1 m²) não conta", () => {
    const encostado = quadrado(-45.9, -11.97, 0.01); // começa exatamente na divisa, todo em SD
    expect(conferirMunicipio(encostado, { municipio: "Luís Eduardo Magalhães", uf: "BA" }, LIMITES).situacao).toBe(
      "diverge",
    );
  });
});

describe("mensagemMunicipioDivergente", () => {
  const encontrado = { nome: "Luís Eduardo Magalhães", uf: "BA" };
  it("análise e dossiê dizem o que aconteceu e como corrigir", () => {
    const a = mensagemMunicipioDivergente(encontrado, { municipio: " Uruçuí ", uf: "pi" }, "analise");
    expect(a).toContain("O talhão fica em Luís Eduardo Magalhães/BA, mas a propriedade está cadastrada em Uruçuí/PI.");
    expect(a).toContain("o risco não foi calculado");
    expect(a).toContain("Corrija o município da propriedade");
    expect(mensagemMunicipioDivergente(encontrado, { municipio: "Uruçuí", uf: "PI" }, "dossie")).toContain(
      "o dossiê não foi gerado",
    );
  });
});
