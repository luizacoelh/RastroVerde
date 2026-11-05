import { expect, type Page } from "@playwright/test";

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
