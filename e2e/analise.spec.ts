// Fluxo da Sprint 2: importar talhão GeoJSON (US05) → analisar (US07) → resultado no mapa (US08).
// Usa a base FICTÍCIA de e2e/fixtures, importada pelo setup global (US13).
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { criarContaEPropriedade, lerHa } from "./auxiliares";

const FIXTURES = path.join(__dirname, "fixtures");

async function importarTalhao(page: Page, arquivo: string, nome: string) {
  await page.getByRole("link", { name: "+ Desenhar talhão" }).click();
  await expect(page.getByText("Clique para marcar os cantos do talhão.")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Arquivo GeoJSON do talhão").setInputFiles(path.join(FIXTURES, arquivo));
  await expect(page.getByText(`Importado ${arquivo}`)).toBeVisible();
  await expect(page.getByText("Arraste os vértices para ajustar.")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Nome do talhão").fill(nome);
  await page.getByRole("button", { name: "Salvar talhão" }).click();
}

test.beforeEach(() => {
  // Na primeira execução o dev server compila cada página.
  test.setTimeout(240_000);
});

test("importa GeoJSON, analisa e mostra risco Atenção com a sobreposição em vermelho", async ({ page }, testInfo) => {
  const urlPropriedade = await criarContaEPropriedade(page);

  // US05 — arquivo inválido: três polígonos no mesmo arquivo.
  await page.getByRole("link", { name: "+ Desenhar talhão" }).click();
  await expect(page.getByText("Clique para marcar os cantos do talhão.")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Arquivo GeoJSON do talhão").setInputFiles(path.join(FIXTURES, "alertas-teste.geojson"));
  await expect(page.getByText("O arquivo tem 3 polígonos. Importe um talhão por vez.")).toBeVisible();
  await page.goto(urlPropriedade);

  // US05 — arquivo válido (~120 ha).
  await importarTalhao(page, "talhao-teste.geojson", "Talhão importado");
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });
  await expect(page.getByText("· não analisado")).toBeVisible();

  // US07 — análise.
  await page.getByRole("link", { name: "Analisar — Talhão importado" }).click();
  await expect(page.getByText("Este talhão ainda não foi analisado.")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Analisar talhão" }).click();

  // US08 — resultado: só o alerta de 2023 conta (o de 2019 é anterior ao corte, RN01).
  await expect(page.getByText("Risco atenção")).toBeVisible({ timeout: 60_000 });
  const area = (await page.getByTestId("area-sobreposta").textContent()) ?? "";
  expect(lerHa(area)).toBeCloseTo(0.3, 1);
  expect(area).toContain("0,25%");
  const tabela = page.getByRole("table", { name: "Alertas sobrepostos" });
  await expect(tabela.getByRole("row")).toHaveCount(2);
  await expect(tabela).toContainText("TESTE-001");
  await expect(tabela).toContainText("10/05/2023");
  await expect(tabela).not.toContainText("TESTE-002");
  await expect(page.getByText("Dados fictícios (teste) e2e-1")).toBeVisible();

  const mapa = page.getByRole("img", { name: /1 área\(s\) sobreposta\(s\) a alertas em vermelho/ });
  await expect(mapa).toHaveClass(/maplibregl-map/);
  await expect(mapa.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: testInfo.outputPath("resultado.png"), fullPage: true });

  // Risco aparece na lista da propriedade.
  await page.goto(urlPropriedade);
  await expect(page.getByText("Risco atenção")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver análise — Talhão importado" })).toBeVisible();
});

test("talhão fora da cobertura da base: região sem dados, sem risco calculado", async ({ page }) => {
  const urlPropriedade = await criarContaEPropriedade(page, "Fazenda fora da cobertura");
  await importarTalhao(page, "talhao-fora-cobertura.geojson", "Talhão sem dados");
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });

  await page.getByRole("link", { name: "Analisar — Talhão sem dados" }).click();
  await page.getByRole("button", { name: "Analisar talhão" }).click();
  await expect(page.getByText(/Região sem dados/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Risco (baixo|atenção|alto)/)).toHaveCount(0);

  await page.goto(urlPropriedade);
  await expect(page.getByText("· não analisado")).toBeVisible();
});
