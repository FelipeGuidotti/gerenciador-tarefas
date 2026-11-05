"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { botaoSecundario } from "@/components/estilos";
import { useFeedback } from "@/components/Feedback";
import { TAREFAS_POR_PAGINA, type Tarefa } from "@/lib/tarefa-schema";
import { useTRPC } from "@/trpc/client";

// Fuso fixo: servidor e navegador podem estar em fusos diferentes, e um texto
// diferente entre o HTML do SSR e o React causaria erro de hidratação.
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const baseAcao =
  "inline-flex min-h-11 items-center rounded-controle px-3 text-sm text-secundario transition-colors sm:min-h-9";

function ItemTarefa({ tarefa }: { tarefa: Tarefa }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const mostrarFeedback = useFeedback();

  const deletar = useMutation(
    trpc.tarefas.deletar.mutationOptions({
      onSuccess: () =>
        mostrarFeedback({
          tipo: "sucesso",
          texto: `Tarefa "${tarefa.titulo}" excluída.`,
        }),
      onError: (erro) =>
        mostrarFeedback({
          tipo: "erro",
          texto:
            erro.data?.code === "NOT_FOUND"
              ? erro.message
              : "Não foi possível excluir a tarefa. Tente novamente.",
        }),
      // Também após erro: um 404 indica que a lista na tela está desatualizada.
      onSettled: () =>
        queryClient.invalidateQueries(trpc.tarefas.listar.pathFilter()),
    }),
  );

  function confirmarExclusao() {
    if (window.confirm(`Excluir a tarefa "${tarefa.titulo}"?`)) {
      deletar.mutate({ id: tarefa.id });
    }
  }

  return (
    <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="min-w-0 wrap-anywhere">
        <h2 className="text-base font-medium text-tinta">{tarefa.titulo}</h2>
        {tarefa.descricao && (
          <p className="mt-1 text-sm leading-6 whitespace-pre-line text-secundario">
            {tarefa.descricao}
          </p>
        )}
        <time
          className="mt-2 block text-xs text-terciario tabular-nums"
          dateTime={tarefa.dataCriacao}
        >
          {formatoData.format(new Date(tarefa.dataCriacao))}
        </time>
      </div>
      <div className="-ml-3 flex shrink-0 gap-1 sm:-mr-3 sm:ml-0">
        {/* Sem prefetch: seria uma requisição por item, sem ganho perceptível. */}
        <Link
          href={`/tarefas/${tarefa.id}/editar`}
          prefetch={false}
          aria-label={`Editar a tarefa "${tarefa.titulo}"`}
          className={`${baseAcao} hover:bg-hover hover:text-tinta`}
        >
          Editar
        </Link>
        <button
          type="button"
          onClick={confirmarExclusao}
          disabled={deletar.isPending}
          aria-label={
            deletar.isPending ? undefined : `Excluir a tarefa "${tarefa.titulo}"`
          }
          className={`${baseAcao} hover:bg-erro-suave hover:text-erro-forte disabled:cursor-progress disabled:opacity-60`}
        >
          {deletar.isPending ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </li>
  );
}

export function ListaTarefas() {
  const trpc = useTRPC();
  const { data, isError, refetch } = useInfiniteQuery(
    trpc.tarefas.listar.infiniteQueryOptions(
      { limit: TAREFAS_POR_PAGINA },
      { getNextPageParam: (pagina) => pagina.proximoCursor },
    ),
  );

  if (!data) {
    return isError ? (
      <div role="alert" className="py-16">
        <p className="mb-4">Não foi possível carregar as tarefas.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className={botaoSecundario}
        >
          Tentar novamente
        </button>
      </div>
    ) : (
      <p role="status" className="py-16 text-secundario">
        Carregando tarefas...
      </p>
    );
  }

  const tarefas = data.pages.flatMap((pagina) => pagina.itens);

  if (tarefas.length === 0) {
    return (
      <div className="py-16">
        <p className="text-tinta">Nenhuma tarefa cadastrada ainda.</p>
        <Link
          href="/tarefas/nova"
          className="mt-2 inline-block text-destaque underline underline-offset-4"
        >
          Crie a primeira tarefa
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-borda border-y border-borda">
      {tarefas.map((tarefa) => (
        <ItemTarefa key={tarefa.id} tarefa={tarefa} />
      ))}
    </ul>
  );
}
