// Esquemas de validação dos formulários (usados nas Server Actions).
import * as z from "zod";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Commodities cobertas pelo EUDR (Regulamento (UE) 2023/1115, art. 1º). */
export const CULTURAS = [
  "Soja",
  "Café",
  "Cacau",
  "Gado bovino",
  "Madeira",
  "Borracha",
  "Óleo de palma",
] as const;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

export const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(100, "Nome muito longo."),
  email,
  // bcrypt só considera os primeiros 72 bytes
  senha: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1, "Informe a senha.").max(72),
});

export const esquemaPropriedade = z.object({
  nome: z.string().trim().min(2, "Informe o nome da propriedade.").max(120, "Nome muito longo."),
  municipio: z.string().trim().min(2, "Informe o município.").max(100, "Nome muito longo."),
  uf: z.enum(UFS, "Selecione a UF."),
  cultura: z.enum(CULTURAS, "Selecione a cultura."),
  car: z
    .string()
    .trim()
    .max(60, "Número do CAR muito longo.")
    .transform((v) => (v === "" ? null : v)),
});

export const esquemaTalhao = z.object({
  nome: z.string().trim().min(1, "Informe o nome do talhão.").max(80, "Nome muito longo."),
  geometria: z
    .string()
    .min(1, "Desenhe o talhão no mapa.")
    // RF07: arquivo de até 1 MB; a geometria normalizada não passa disso.
    .max(1_100_000, "Polígono detalhado demais (mais de 1 MB). Simplifique antes de importar."),
});

/** Estado devolvido pelas Server Actions de formulário (useActionState). */
export type EstadoFormulario = {
  erros?: Record<string, string[] | undefined>;
  mensagem?: string;
  /** Valores enviados, para repreencher o formulário após um erro. */
  valores?: Record<string, string>;
};

export function valoresDoFormulario(formData: FormData, campos: readonly string[]) {
  const valores: Record<string, string> = {};
  for (const campo of campos) {
    const v = formData.get(campo);
    valores[campo] = typeof v === "string" ? v : "";
  }
  return valores;
}

/**
 * Devolve só o caminho interno ("/x?y") de um callbackUrl, descartando qualquer host,
 * para evitar redirecionamento aberto.
 */
export function caminhoInternoSeguro(valor: unknown, padrao = "/propriedades"): string {
  if (typeof valor !== "string" || valor === "") return padrao;
  let caminho = valor;
  if (/^https?:\/\//i.test(valor)) {
    try {
      const url = new URL(valor);
      caminho = url.pathname + url.search;
    } catch {
      return padrao;
    }
  }
  if (!caminho.startsWith("/") || caminho.startsWith("//") || caminho.startsWith("/\\")) return padrao;
  return caminho;
}
