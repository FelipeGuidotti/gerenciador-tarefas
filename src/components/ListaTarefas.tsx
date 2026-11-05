"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DialogoConfirmacao } from "@/components/DialogoConfirmacao";
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
  const [confirmando, setConfirmando] = useState(false);
  const item = useRef<HTMLLIElement>(null);

  // O item vai sumir: sem isso, quem usa teclado voltaria ao início da página.
  function moverFocoParaVizinho() {
    const vizinho =
      item.current?.nextElementSibling ?? item.current?.previousElementSibling;
    const alvo =
      vizinho?.querySelector<HTMLElement>("a") ??
      document.querySelector<HTMLElement>("main a");
    alvo?.focus();
  }

  const deletar = useMutation(
    trpc.tarefas.deletar.mutationOptions({
      onSuccess: () => {
        moverFocoParaVizinho();
        // Sai da tela já, sem depender da atualização abaixo, que pode falhar.
        queryClient.setQueryData(
          trpc.tarefas.listar.infiniteQueryKey({ limit: TAREFAS_POR_PAGINA }),
          (dados) =>
            dados && {
              ...dados,
              pages: dados.pages.map((pagina) => ({
                ...pagina,
                itens: pagina.itens.filter(({ id }) => id !== tarefa.id),
              })),
            },
        );
        mostrarFeedback({
          tipo: "sucesso",
          texto: `Tarefa "${tarefa.titulo}" excluída.`,
        });
      },
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

  return (
    <li
      ref={item}
      className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
    >
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
        {/* aria-disabled, e não disabled: um botão desabilitado perde o foco, e
            quem usa teclado ficaria sem posição se a exclusão falhasse. */}
        <button
          type="button"
          onClick={() => {
            if (!deletar.isPending) setConfirmando(true);
          }}
          aria-disabled={deletar.isPending}
          aria-label={
            deletar.isPending ? undefined : `Excluir a tarefa "${tarefa.titulo}"`
          }
          className={`${baseAcao} hover:bg-erro-suave hover:text-erro-forte aria-disabled:cursor-progress aria-disabled:opacity-60`}
        >
          {deletar.isPending ? "Excluindo..." : "Excluir"}
        </button>
      </div>
      {confirmando && (
        <DialogoConfirmacao
          titulo="Excluir esta tarefa?"
          mensagem={`"${tarefa.titulo}" será excluída. Essa ação não pode ser desfeita.`}
          rotuloConfirmar="Excluir tarefa"
          onConfirmar={() => deletar.mutate({ id: tarefa.id })}
          onFechar={() => setConfirmando(false)}
        />
      )}
    </li>
  );
}

export function ListaTarefas() {
  const trpc = useTRPC();
  const {
    data,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery(
    trpc.tarefas.listar.infiniteQueryOptions(
      { limit: TAREFAS_POR_PAGINA },
      { getNextPageParam: (pagina) => pagina.proximoCursor },
    ),
  );

  const sentinela = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Após uma falha, a nova tentativa é manual, para não repetir em loop.
    if (!sentinela.current || !hasNextPage || isFetchNextPageError) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        // isFetching, e não só isFetchingNextPage: buscar a próxima página
        // cancelaria uma atualização em andamento, e uma tarefa excluída
        // continuaria na tela.
        if (entrada.isIntersecting && !isFetching) fetchNextPage();
      },
      // Busca antes de chegar ao fim, para a rolagem não parar.
      { rootMargin: "200px" },
    );
    // Recriado ao fim de cada busca: o novo observador avisa de imediato se a
    // sentinela ainda estiver visível, o que preenche telas muito altas.
    observador.observe(sentinela.current);
    return () => observador.disconnect();
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

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

  if (tarefas.length === 0 && !hasNextPage) {
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
    <>
      <ul className="divide-y divide-borda border-y border-borda">
        {tarefas.map((tarefa) => (
          <ItemTarefa key={tarefa.id} tarefa={tarefa} />
        ))}
      </ul>
      <div ref={sentinela} aria-hidden="true" />
      {isFetchingNextPage && (
        <p role="status" className="py-6 text-sm text-secundario">
          Carregando mais tarefas...
        </p>
      )}
      {isFetchNextPageError && !isFetchingNextPage && (
        <div role="alert" className="py-6">
          <p className="mb-3 text-sm text-erro">
            Não foi possível carregar mais tarefas.
          </p>
          <button
            type="button"
            onClick={() => fetchNextPage()}
            className={botaoSecundario}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {!hasNextPage && data.pages.length > 1 && (
        <p className="py-6 text-sm text-terciario">
          Todas as tarefas foram carregadas.
        </p>
      )}
    </>
  );
}
