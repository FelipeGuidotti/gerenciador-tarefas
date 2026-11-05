"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { botaoPrimario, botaoSecundario } from "@/components/estilos";
import { useFeedback } from "@/components/Feedback";
import { criarTarefaSchema, type Tarefa } from "@/lib/tarefa-schema";
import type { AppRouter } from "@/server/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";

type Erros = {
  titulo?: string[];
  descricao?: string[];
};

const classesCampo =
  "mt-2 block w-full rounded-controle border border-borda-campo bg-white px-3 py-2.5 text-base text-tinta aria-[invalid=true]:border-erro";

function ErroCampo({ id, mensagens }: { id: string; mensagens?: string[] }) {
  if (!mensagens?.length) return null;
  return (
    <p id={id} className="mt-2 text-sm text-erro">
      {mensagens[0]}
    </p>
  );
}

export function FormularioTarefa({ tarefa }: { tarefa?: Tarefa }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mostrarFeedback = useFeedback();

  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const tituloRef = useRef<HTMLInputElement>(null);
  const descricaoRef = useRef<HTMLTextAreaElement>(null);

  // Erros do cliente e do backend têm o mesmo formato e seguem o mesmo caminho.
  function exibirErrosCampos(campos: Erros) {
    setErros(campos);
    (campos.titulo ? tituloRef : descricaoRef).current?.focus();
  }

  function aoFalhar(erro: TRPCClientErrorLike<AppRouter>) {
    const campos = erro.data?.errosCampos as Erros | null | undefined;
    if (campos?.titulo || campos?.descricao) {
      exibirErrosCampos(campos);
      return;
    }
    // Só o 404 tem message legível: nos demais casos, ela pode ser o JSON do
    // Zod ou um texto de rede em inglês.
    setErroGeral(
      erro.data?.code === "NOT_FOUND"
        ? erro.message
        : "Não foi possível salvar a tarefa. Verifique sua conexão e tente novamente.",
    );
  }

  function aoConcluir(texto: string) {
    mostrarFeedback({ tipo: "sucesso", texto });
    // replace, e não push: o Voltar não reabre o formulário com dados antigos,
    // que sobrescreveriam a edição se fossem salvos de novo.
    router.replace("/");
  }

  const invalidarLista = () =>
    queryClient.invalidateQueries(trpc.tarefas.listar.pathFilter());

  const criar = useMutation(
    trpc.tarefas.criar.mutationOptions({
      onSuccess: (nova) => aoConcluir(`Tarefa "${nova.titulo}" criada.`),
      onError: aoFalhar,
      onSettled: invalidarLista,
    }),
  );

  const atualizar = useMutation(
    trpc.tarefas.atualizar.mutationOptions({
      onSuccess: (salva) => aoConcluir(`Tarefa "${salva.titulo}" atualizada.`),
      onError: aoFalhar,
      onSettled: invalidarLista,
    }),
  );

  const envio = tarefa ? atualizar : criar;
  // isSuccess mantém o botão bloqueado durante a navegação de volta à lista.
  const enviando = envio.isPending || envio.isSuccess;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    setErros({});
    setErroGeral(null);

    const resultado = criarTarefaSchema.safeParse({ titulo, descricao });
    if (!resultado.success) {
      exibirErrosCampos(z.flattenError(resultado.error).fieldErrors);
      return;
    }

    if (tarefa) {
      atualizar.mutate({ id: tarefa.id, ...resultado.data });
    } else {
      criar.mutate(resultado.data);
    }
  }

  const rotuloEnvio = tarefa
    ? enviando
      ? "Salvando..."
      : "Salvar alterações"
    : enviando
      ? "Criando..."
      : "Criar tarefa";

  return (
    <form onSubmit={enviar} noValidate className="mt-10 flex flex-col gap-6">
      <div>
        <label htmlFor="titulo" className="text-sm font-medium text-tinta">
          Título
        </label>
        <input
          ref={tituloRef}
          id="titulo"
          name="titulo"
          type="text"
          required
          value={titulo}
          onChange={(evento) => {
            setTitulo(evento.target.value);
            setErros((atuais) => ({ ...atuais, titulo: undefined }));
          }}
          aria-invalid={Boolean(erros.titulo)}
          aria-describedby={erros.titulo ? "titulo-erro" : undefined}
          className={classesCampo}
        />
        <ErroCampo id="titulo-erro" mensagens={erros.titulo} />
      </div>

      <div>
        <label htmlFor="descricao" className="text-sm font-medium text-tinta">
          Descrição <span className="font-normal text-terciario">(opcional)</span>
        </label>
        <textarea
          ref={descricaoRef}
          id="descricao"
          name="descricao"
          rows={5}
          value={descricao}
          onChange={(evento) => {
            setDescricao(evento.target.value);
            setErros((atuais) => ({ ...atuais, descricao: undefined }));
          }}
          aria-invalid={Boolean(erros.descricao)}
          aria-describedby={erros.descricao ? "descricao-erro" : undefined}
          className={`${classesCampo} resize-y`}
        />
        <ErroCampo id="descricao-erro" mensagens={erros.descricao} />
      </div>

      {erroGeral && (
        <p
          role="alert"
          className="rounded-controle bg-erro-suave px-4 py-3 text-sm text-erro"
        >
          {erroGeral}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={enviando} className={botaoPrimario}>
          {rotuloEnvio}
        </button>
        <Link href="/" className={botaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
