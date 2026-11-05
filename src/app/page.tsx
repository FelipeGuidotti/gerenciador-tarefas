import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import Link from "next/link";
import { ListaTarefas } from "@/components/ListaTarefas";
import { TAREFAS_POR_PAGINA } from "@/lib/tarefa-schema";
import { getQueryClient, trpc } from "@/trpc/server";
import styles from "./page.module.css";

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
    <main className={styles.pagina}>
      <header className={styles.cabecalho}>
        <h1>Tarefas</h1>
        <Link href="/tarefas/nova" prefetch={false} className={styles.nova}>
          Nova tarefa
        </Link>
      </header>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ListaTarefas />
      </HydrationBoundary>
    </main>
  );
}
