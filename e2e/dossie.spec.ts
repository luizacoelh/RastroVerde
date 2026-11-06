// Sprint 3: dossiê PDF (US10/US11), verificação pública (US12), histórico (US09), RN03 e RN04.
// Usa a base FICTÍCIA de e2e/fixtures. O webServer roda sem GEMINI_API_KEY: o resumo é o texto padrão.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Browser } from "@playwright/test";
import { criarContaEPropriedade, criarTalhaoAnalisado, esperarEditor, importarTalhao } from "./auxiliares";

const FORMATO_CODIGO = /RV-\d{4}-[0-9A-HJKMNP-TV-Z]{6}/;

test.beforeEach(() => {
  // Na primeira execução o dev server compila cada página.
  test.setTimeout(300_000);
});

async function visitante(browser: Browser, baseURL: string) {
  const contexto = await browser.newContext({ baseURL, locale: "pt-BR" });
  return contexto.newPage();
}

test("gera o dossiê, verifica pelo QR code sem login e confere o hash do PDF", async ({ page, browser, baseURL }, testInfo) => {
  const urlPropriedade = await criarContaEPropriedade(page, "Fazenda Dossiê E2E");
  await criarTalhaoAnalisado(page, urlPropriedade, "talhao-teste.geojson", "Talhão do dossiê");
  await expect(page.getByText("Risco atenção")).toBeVisible();

  // US10/US11 — gerar o dossiê; sem chave do Gemini o resumo é o texto padrão (RNF10).
  await page.getByRole("button", { name: "Gerar dossiê PDF" }).click();
  const cartao = page.getByTestId("dossie");
  await expect(cartao).toBeVisible({ timeout: 60_000 });
  const codigo = ((await cartao.textContent()) ?? "").match(FORMATO_CODIGO)?.[0];
  expect(codigo).toBeTruthy();
  await expect(cartao).toContainText("Resumo padrão (IA indisponível)");
  await expect(cartao).toContainText("31/12/2020");
  await expect(page.getByRole("button", { name: "Gerar dossiê PDF" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("resultado-com-dossie.png"), fullPage: true });

  // Download do PDF (só o dono) e hash SHA-256 do arquivo.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Baixar dossiê PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`dossie-${codigo}.pdf`);
  const arquivoPdf = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(arquivoPdf);
  const bytes = readFileSync(arquivoPdf);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const hash = createHash("sha256").update(bytes).digest("hex");

  // US12 — verificação pública, sem login e sem dados pessoais (RNF06).
  const comprador = await visitante(browser, baseURL!);
  await comprador.goto(`/verificar/${codigo}`);
  await expect(comprador.getByRole("heading", { name: "Dossiê autêntico" })).toBeVisible({ timeout: 60_000 });
  await expect(comprador.getByTestId("hash")).toHaveText(hash);
  await expect(comprador.getByText("Risco atenção")).toBeVisible();
  await expect(comprador.getByText("Soja · Luís Eduardo Magalhães/BA")).toBeVisible();
  const textoPublico = (await comprador.locator("main").textContent()) ?? "";
  expect(textoPublico).not.toContain("Fazenda Dossiê E2E");
  expect(textoPublico).not.toContain("Teste E2E");
  expect(textoPublico).not.toContain("@");
  await comprador.screenshot({ path: testInfo.outputPath("verificacao.png"), fullPage: true });

  // Conferência do arquivo no navegador: o original confere, um alterado não.
  await comprador.getByLabel("Conferir o arquivo PDF recebido").setInputFiles(arquivoPdf);
  await expect(comprador.getByText("O arquivo confere")).toBeVisible();
  const alterado = Buffer.from(bytes);
  alterado[alterado.length - 10] ^= 0xff;
  const arquivoAlterado = testInfo.outputPath("alterado.pdf");
  writeFileSync(arquivoAlterado, alterado);
  await comprador.getByLabel("Conferir o arquivo PDF recebido").setInputFiles(arquivoAlterado);
  await expect(comprador.getByText("O arquivo não confere")).toBeVisible();

  // Código digitado em minúsculas e código inexistente.
  await comprador.goto(`/verificar?codigo=${codigo!.toLowerCase()}`);
  await expect(comprador).toHaveURL(new RegExp(`/verificar/${codigo}$`));
  await comprador.goto("/verificar/RV-2000-ZZZZZZ");
  await expect(comprador.getByRole("heading", { name: "Dossiê não encontrado" })).toBeVisible();

  // RF20 — outro usuário não baixa o PDF de quem emitiu.
  const outro = await visitante(browser, baseURL!);
  await criarContaEPropriedade(outro, "Fazenda de outra pessoa");
  const resposta = await outro.request.get(`/dossies/${codigo}/pdf`);
  expect(resposta.status()).toBe(404);
  expect((await comprador.request.get(`/dossies/${codigo}/pdf`, { maxRedirects: 0 })).status()).not.toBe(200);
  await comprador.context().close();
  await outro.context().close();

  // US09 — histórico com o código do dossiê.
  await page.getByRole("link", { name: /Ver histórico \(1\)/ }).click();
  await expect(page.getByRole("heading", { name: "Histórico de análises" })).toBeVisible({ timeout: 60_000 });
  const linha = page.getByRole("table").getByRole("row").nth(1);
  await expect(linha).toContainText("Atual");
  await expect(linha).toContainText(codigo!);

  // RN04 — talhão e propriedade com dossiê não podem ser excluídos.
  await page.goto(urlPropriedade);
  await expect(page.getByRole("button", { name: "Excluir" })).toBeDisabled();
  await expect(page.getByText("Esta propriedade tem talhão com dossiê emitido")).toBeVisible();
  await page.getByRole("link", { name: "Editar — Talhão do dossiê" }).click();
  await expect(page.getByRole("button", { name: "Excluir" })).toBeDisabled({ timeout: 60_000 });
  await expect(page.getByText("Este talhão tem dossiê emitido e não pode ser excluído")).toBeVisible();

  // Wireframe 2 — risco da última análise na lista de propriedades.
  await page.goto("/propriedades");
  await expect(page.getByTestId("risco-Fazenda Dossiê E2E")).toContainText("Risco atenção");
  await page.screenshot({ path: testInfo.outputPath("propriedades.png"), fullPage: true });
});

test("RN03: editar o polígono torna a análise obsoleta e impede novo dossiê com ela", async ({ page }, testInfo) => {
  const urlPropriedade = await criarContaEPropriedade(page, "Fazenda RN03");
  await criarTalhaoAnalisado(page, urlPropriedade, "talhao-teste.geojson", "Talhão RN03");
  await expect(page.getByRole("button", { name: "Gerar dossiê PDF" })).toBeVisible();

  // Renomear não muda o polígono: a análise continua valendo.
  await page.goto(urlPropriedade);
  await page.getByRole("link", { name: "Editar — Talhão RN03" }).click();
  await esperarEditor(page);
  await page.getByLabel("Nome do talhão").fill("Talhão RN03 renomeado");
  await page.getByRole("button", { name: "Salvar talhão" }).click();
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });
  await expect(page.getByText("Risco atenção")).toBeVisible();

  // Trocar o polígono marca a análise como obsoleta (o histórico é mantido).
  await page.getByRole("link", { name: "Editar — Talhão RN03 renomeado" }).click();
  await importarTalhao(page, "talhao-fora-cobertura.geojson", "Talhão RN03 renomeado");
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });
  await expect(page.getByText("· não analisado")).toBeVisible();
  await expect(page.getByText(/Risco (baixo|atenção|alto)/)).toHaveCount(0);

  await page.getByRole("link", { name: "Analisar — Talhão RN03 renomeado" }).click();
  await expect(page.getByText("O polígono do talhão mudou depois da última análise.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Gerar dossiê PDF" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("analise-obsoleta.png"), fullPage: true });

  await page.getByRole("link", { name: "Ver histórico (1)" }).click();
  await expect(page.getByRole("table").getByRole("row").nth(1)).toContainText("Obsoleta: o polígono mudou depois", {
    timeout: 60_000,
  });

  // Lista de propriedades: sem análise válida, a propriedade fica sem risco.
  await page.goto("/propriedades");
  await expect(page.getByTestId("risco-Fazenda RN03")).toHaveText("—");
});
