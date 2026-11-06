import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const FIXTURES = path.join(__dirname, "fixtures");

/** Cria uma conta nova e uma propriedade; devolve a URL da propriedade. */
export async function criarContaEPropriedade(page: Page, nomePropriedade = "Fazenda E2E"): Promise<string> {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill("Teste E2E");
  await page.getByLabel("E-mail").fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.local`);
  await page.getByLabel("Senha").fill("senha-e2e-123");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/propriedades$/, { timeout: 60_000 });

  await page.goto("/propriedades/nova");
  await page.getByLabel("Nome da propriedade").fill(nomePropriedade);
  await page.getByLabel("Município").fill("Luís Eduardo Magalhães");
  await page.getByLabel("UF").selectOption("BA");
  await page.getByLabel("Cultura").selectOption("Soja");
  await page.locator("main").locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/propriedades\/(?!nova$)[^/]+$/, { timeout: 60_000 });
  return page.url();
}

/** Lê "1.234,57 ha" (ou "5 ha") como número. */
export function lerHa(texto: string): number {
  const m = texto.match(/(\d[\d.]*(?:,\d+)?)\s*ha/);
  if (!m) throw new Error(`Área não encontrada em "${texto}"`);
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

/** Na tela de novo talhão (ou de edição), importa um GeoJSON de e2e/fixtures e salva. */
/** Editor pronto: na criação pede o desenho; na edição, o ajuste dos vértices. */
export async function esperarEditor(page: Page) {
  await expect(
    page.getByText(/Clique para marcar os cantos do talhão\.|Arraste os vértices para ajustar\./).first(),
  ).toBeVisible({ timeout: 60_000 });
}

export async function importarTalhao(page: Page, arquivo: string, nome: string) {
  await esperarEditor(page);
  await page.getByLabel("Arquivo GeoJSON do talhão").setInputFiles(path.join(FIXTURES, arquivo));
  await expect(page.getByText(`Importado ${arquivo}`)).toBeVisible();
  await expect(page.getByText("Arraste os vértices para ajustar.")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Nome do talhão").fill(nome);
  await page.getByRole("button", { name: "Salvar talhão" }).click();
}

/** Da página da propriedade: novo talhão importado, análise e espera pelo risco. */
export async function criarTalhaoAnalisado(page: Page, urlPropriedade: string, arquivo: string, nome: string) {
  await page.getByRole("link", { name: "+ Desenhar talhão" }).click();
  await importarTalhao(page, arquivo, nome);
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });
  await page.getByRole("link", { name: `Analisar — ${nome}` }).click();
  await page.getByRole("button", { name: "Analisar talhão" }).click();
  await expect(page.getByText(/Risco (baixo|atenção|alto)/).first()).toBeVisible({ timeout: 60_000 });
}
