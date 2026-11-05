// Fluxo da Sprint 1 no navegador: cadastro → propriedade → desenho do talhão (US01, US03, US04).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { criarContaEPropriedade, lerHa } from "./auxiliares";

const AREA_ALVO_HA = 5;

/** Metros por pixel no centro do mapa, a partir da barra de escala do MapLibre. */
async function metrosPorPixel(mapa: Locator): Promise<number> {
  const escala = mapa.locator(".maplibregl-ctrl-scale");
  const texto = (await escala.textContent()) ?? "";
  const largura = await escala.evaluate((el) => el.getBoundingClientRect().width);
  const m = texto.match(/([\d.,]+)\s*(km|m)/);
  if (!m) throw new Error(`Escala ilegível: "${texto}"`);
  const metros = Number(m[1].replace(",", ".")) * (m[2] === "km" ? 1000 : 1);
  return metros / largura;
}

async function aproximar(page: Page, mapa: Locator, vezes: number) {
  const botao = mapa.getByRole("button", { name: "Aproximar" });
  for (let i = 0; i < vezes; i++) {
    await botao.click();
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(600);
}

/** Clica num ponto com o mouse passando antes por ele (a linha segue o cursor). */
async function marcar(page: Page, x: number, y: number) {
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.click(x, y);
  await page.waitForTimeout(150);
}

test("desenha um talhão de ~5 ha com vértices visíveis, desfazer e Esc", async ({ page }, testInfo) => {
  // Na primeira execução o dev server compila cada página.
  test.setTimeout(240_000);
  const errosConsole: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errosConsole.push(msg.text());
  });
  page.on("pageerror", (err) => errosConsole.push(err.message));

  // Cadastro e propriedade (US01, US03)
  const urlPropriedade = await criarContaEPropriedade(page);

  // Desenho (US04)
  await page.getByRole("link", { name: "+ Desenhar talhão" }).click();
  const mapa = page.getByRole("application", { name: "Mapa para desenhar o talhão" });
  await expect(page.getByText("Clique para marcar os cantos do talhão.")).toBeVisible();
  await expect(mapa).toHaveClass(/maplibregl-map/);
  await expect(mapa.locator("canvas")).toBeVisible();

  await aproximar(page, mapa, 12);
  const caixa = (await mapa.boundingBox())!;
  const cx = caixa.x + caixa.width / 2;
  const cy = caixa.y + caixa.height / 2;
  const ladoPx = Math.sqrt(AREA_ALVO_HA * 10_000) / (await metrosPorPixel(mapa));
  const h = ladoPx / 2;
  expect(ladoPx).toBeGreaterThan(40);
  expect(ladoPx).toBeLessThan(caixa.height - 40);

  const desfazer = page.getByRole("button", { name: "Desfazer último ponto" });
  await expect(desfazer).toBeDisabled();

  // Esc cancela um desenho começado.
  await marcar(page, cx - h, cy - h);
  await marcar(page, cx + h, cy - h);
  await expect(page.getByText("Pontos marcados: 2.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Pontos marcados/)).toHaveCount(0);

  // Desenha o quadrado, com um ponto errado desfeito no meio.
  await marcar(page, cx - h, cy - h);
  await marcar(page, cx + h, cy - h);
  await marcar(page, cx + h, cy + h);
  await expect(page.getByText("Pontos marcados: 3.")).toBeVisible();
  await expect(page.getByTestId("area-rascunho")).toBeVisible();
  await marcar(page, cx - h / 3, cy + h * 0.9);
  await expect(page.getByText("Pontos marcados: 4.")).toBeVisible();
  await desfazer.click();
  await expect(page.getByText("Pontos marcados: 3.")).toBeVisible();
  await marcar(page, cx - h, cy + h);
  await expect(page.getByText("Pontos marcados: 4.")).toBeVisible();
  // Área em tempo real enquanto o cursor está sobre o 4º ponto.
  expect(lerHa((await page.getByTestId("area-rascunho").textContent()) ?? "")).toBeGreaterThan(4);
  await page.screenshot({ path: testInfo.outputPath("desenhando.png") });

  // Fecha clicando no primeiro ponto.
  await marcar(page, cx - h, cy - h);
  await expect(page.getByText("Arraste os vértices para ajustar.")).toBeVisible();
  const painelArea = page.getByText("Área do talhão").locator("..");
  const area = lerHa((await painelArea.textContent()) ?? "");
  expect(area).toBeGreaterThan(AREA_ALVO_HA * 0.9);
  expect(area).toBeLessThan(AREA_ALVO_HA * 1.1);
  await page.screenshot({ path: testInfo.outputPath("fechado.png") });

  // Redesenhar e fechar com dois cliques (triângulo).
  await page.getByRole("button", { name: "Redesenhar" }).click();
  await marcar(page, cx - h, cy + h);
  await marcar(page, cx + h, cy + h);
  await page.mouse.move(cx, cy - h, { steps: 5 });
  await page.mouse.dblclick(cx, cy - h);
  await expect(page.getByText("Arraste os vértices para ajustar.")).toBeVisible();
  const areaTriangulo = lerHa((await painelArea.textContent()) ?? "");
  expect(areaTriangulo).toBeGreaterThan(AREA_ALVO_HA * 0.45);
  expect(areaTriangulo).toBeLessThan(AREA_ALVO_HA * 0.55);

  await page.getByRole("button", { name: "Salvar talhão" }).click();
  await expect(page).toHaveURL(urlPropriedade, { timeout: 60_000 });

  // Mapa somente leitura dentro do próprio container (bug do Strict Mode).
  const mapaLeitura = page.getByRole("img", { name: /Mapa com 1 talhão/ });
  await expect(mapaLeitura).toHaveClass(/maplibregl-map/);
  const canvas = mapaLeitura.locator("canvas");
  await expect(canvas).toBeVisible();
  const [caixaMapa, caixaCanvas] = [(await mapaLeitura.boundingBox())!, (await canvas.boundingBox())!];
  expect(Math.abs(caixaCanvas.x - caixaMapa.x)).toBeLessThan(3);
  expect(Math.abs(caixaCanvas.y - caixaMapa.y)).toBeLessThan(3);
  await expect(mapaLeitura.locator(".maplibregl-canvas")).toHaveCount(1);
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath("propriedade.png"), fullPage: true });

  expect(errosConsole.filter((e) => /worker/i.test(e))).toEqual([]);
});
