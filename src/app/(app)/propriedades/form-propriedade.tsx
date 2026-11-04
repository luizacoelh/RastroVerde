"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Campo, CampoSelecao, classeBotao } from "@/components/ui";
import { CULTURAS, UFS, type EstadoFormulario } from "@/lib/validacao";

type Valores = { nome: string; municipio: string; uf: string; cultura: string; car: string };

export function FormPropriedade({
  acao,
  inicial,
  voltarPara,
  rotuloEnviar,
}: {
  acao: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  inicial?: Valores;
  voltarPara: string;
  rotuloEnviar: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = estado.valores ?? inicial;
  const e = estado.erros;

  return (
    // key: remonta os campos com os valores devolvidos após um erro
    <form key={JSON.stringify(v)} action={enviar} className="max-w-xl space-y-4" noValidate>
      {estado.mensagem ? <Aviso>{estado.mensagem}</Aviso> : null}
      <Campo rotulo="Nome da propriedade" nome="nome" required defaultValue={v?.nome} erros={e?.nome} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Campo rotulo="Município" nome="municipio" required defaultValue={v?.municipio} erros={e?.municipio} />
        <CampoSelecao rotulo="UF" nome="uf" opcoes={UFS} required defaultValue={v?.uf ?? ""} erros={e?.uf} />
      </div>
      <CampoSelecao
        rotulo="Cultura"
        nome="cultura"
        opcoes={CULTURAS}
        required
        defaultValue={v?.cultura ?? ""}
        erros={e?.cultura}
        dica="Produtos cobertos pelo regulamento europeu (EUDR)."
      />
      <Campo
        rotulo="Nº do CAR (opcional)"
        nome="car"
        defaultValue={v?.car}
        erros={e?.car}
        dica="Cadastro Ambiental Rural, como aparece no recibo. Ex.: BA-2919553-…"
      />
      <div className="flex gap-3 pt-2">
        <button type="submit" className={classeBotao.primario} disabled={pendente}>
          {pendente ? "Salvando…" : rotuloEnviar}
        </button>
        <Link href={voltarPara} className={classeBotao.secundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
