import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import Link from "next/link";
import { botaoPrimario } from "@/components/estilos";
import { ListaTarefas } from "@/components/ListaTarefas";
import { TAREFAS_POR_PAGINA } from "@/lib/tarefa-schema";
import { getQueryClient, trpc } from "@/trpc/server";

// Sem isso, o Next geraria a página uma única vez no build (SSG) e a lista
// ficaria congelada. Assim, ela é renderizada a cada requisição (SSR).
export const dynamic = "force-dynamic";

export default async function Home() {
  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery(
    trpc.tarefas.listar.infiniteQueryOptions(
      { limit: TAREFAS_POR_PAGINA },
      { getNextPageParam: (pagina) => pagina.proximoCursor },
    ),
  );

  return (
    <>
      <header className="mb-10 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
        <Link href="/tarefas/nova" className={botaoPrimario}>
          Nova tarefa
        </Link>
      </header>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ListaTarefas />
      </HydrationBoundary>
    </>
  );
}
