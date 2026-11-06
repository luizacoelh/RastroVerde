// Download do PDF do dossiê, só para o dono (RF20). O comprador confere pela página pública.
import { auth } from "@/auth";
import { obterPdfDoDossie } from "@/lib/dados/dossies";
import { normalizarCodigo } from "@/lib/dossie/conteudo";

export async function GET(_req: Request, { params }: RouteContext<"/dossies/[codigo]/pdf">) {
  const sessao = await auth();
  const usuarioId = sessao?.user?.id;
  if (!usuarioId) return new Response("Não autenticado.", { status: 401 });

  const codigo = normalizarCodigo((await params).codigo);
  const dossie = codigo ? await obterPdfDoDossie(usuarioId, codigo) : null;
  if (!dossie) return new Response("Dossiê não encontrado.", { status: 404 });

  return new Response(dossie.pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="dossie-${dossie.codigo}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
