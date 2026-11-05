import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioTarefa } from "@/components/FormularioTarefa";
import { idTarefaSchema } from "@/lib/tarefa-schema";
import { getQueryClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar tarefa",
};

async function buscarTarefa(idUrl: string) {
  const id = Number(idUrl);
  // Number() aceita "1e2" e "05"; a comparação exige a forma canônica.
  if (String(id) !== idUrl || !idTarefaSchema.safeParse({ id }).success) {
    notFound();
  }

  try {
    return await getQueryClient().fetchQuery(
      trpc.tarefas.buscarPorId.queryOptions({ id }),
    );
  } catch (erro) {
    if (erro instanceof TRPCError && erro.code === "NOT_FOUND") notFound();
    throw erro;
  }
}

export default async function EditarTarefa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tarefa = await buscarTarefa(id);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Editar tarefa</h1>
      <FormularioTarefa tarefa={tarefa} />
    </>
  );
}
