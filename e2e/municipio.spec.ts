// Defeito 8: o talhão precisa estar no município declarado na propriedade, porque o dossiê mostra
// esse município ao comprador. Vale na análise e na emissão do dossiê.
import { expect, test } from "@playwright/test";
import { criarContaEPropriedade, importarTalhao, mudarMunicipio } from "./auxiliares";

test.beforeEach(() => {
  test.setTimeout(240_000);
});

test("talhão fora do município declarado bloqueia a análise e a emissão do dossiê", async ({ page }, testInfo) => {
  // Propriedade declarada em Uruçuí/PI, com o talhão no município de teste "Luís Eduardo Magalhães/BA".
  const urlPropriedade = await criarContaEPropriedade(page, "Fazenda declarada no PI", { municipio: "Uruçuí", uf: "PI" });
  await page.getByRole("link", { name: "+ Desenhar talhão" }).click();
  await importarTalhao(page, "talhao-teste.geojson", "Talhão em LEM");
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });

  // Análise bloqueada, sem risco calculado.
  await page.getByRole("link", { name: "Analisar — Talhão em LEM" }).click();
  await page.getByRole("button", { name: "Analisar talhão" }).click();
  const aviso = page.getByText(/O talhão fica em Luís Eduardo Magalhães\/BA, mas a propriedade está cadastrada em Uruçuí\/PI\./);
  await expect(aviso).toBeVisible({ timeout: 60_000 });
  await expect(aviso).toContainText("o risco não foi calculado");
  await expect(page.getByText(/Risco (baixo|atenção|alto)/)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("analise-bloqueada.png"), fullPage: true });

  // Corrigido o município (sem acento, como o produtor costuma digitar), a análise passa.
  await mudarMunicipio(page, urlPropriedade, "Luis Eduardo Magalhaes", "BA");
  await page.getByRole("link", { name: "Analisar — Talhão em LEM" }).click();
  await page.getByRole("button", { name: "Analisar talhão" }).click();
  await expect(page.getByText("Risco atenção")).toBeVisible({ timeout: 60_000 });

  // Município trocado depois da análise: a emissão do dossiê também é bloqueada.
  await mudarMunicipio(page, urlPropriedade, "Uruçuí", "PI");
  await page.getByRole("link", { name: "Ver análise — Talhão em LEM" }).click();
  await page.getByRole("button", { name: "Gerar dossiê PDF" }).click();
  await expect(page.getByText(/o dossiê não foi gerado/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("dossie")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("dossie-bloqueado.png"), fullPage: true });
});
