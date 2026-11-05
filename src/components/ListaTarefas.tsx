"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useFeedback } from "@/components/Feedback";
import { TAREFAS_POR_PAGINA, type Tarefa } from "@/lib/tarefa-schema";
import { useTRPC } from "@/trpc/client";
import styles from "./ListaTarefas.module.css";

// Fuso fixo: servidor e navegador podem estar em fusos diferentes, e um texto
// diferente entre o HTML do SSR e o React causaria erro de hidratação.
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

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
    <li className={styles.item}>
      <div className={styles.conteudo}>
        <h2 className={styles.titulo}>{tarefa.titulo}</h2>
        {tarefa.descricao && (
          <p className={styles.descricao}>{tarefa.descricao}</p>
        )}
        <time className={styles.data} dateTime={tarefa.dataCriacao}>
          {formatoData.format(new Date(tarefa.dataCriacao))}
        </time>
      </div>
      <div className={styles.acoes}>
        <Link href={`/tarefas/${tarefa.id}/editar`} prefetch={false}>
          Editar
        </Link>
        <button
          type="button"
          onClick={confirmarExclusao}
          disabled={deletar.isPending}
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
      <div role="alert" className={styles.aviso}>
        <p>Não foi possível carregar as tarefas.</p>
        <button type="button" onClick={() => refetch()}>
          Tentar novamente
        </button>
      </div>
    ) : (
      <p role="status" className={styles.aviso}>
        Carregando tarefas...
      </p>
    );
  }

  const tarefas = data.pages.flatMap((pagina) => pagina.itens);

  if (tarefas.length === 0) {
    return <p className={styles.aviso}>Nenhuma tarefa cadastrada ainda.</p>;
  }

  return (
    <ul className={styles.lista}>
      {tarefas.map((tarefa) => (
        <ItemTarefa key={tarefa.id} tarefa={tarefa} />
      ))}
    </ul>
  );
}
