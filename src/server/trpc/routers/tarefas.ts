import { TRPCError } from "@trpc/server";
import {
  atualizarTarefaSchema,
  criarTarefaSchema,
  idTarefaSchema,
  listarTarefasSchema,
} from "@/lib/tarefa-schema";
import {
  atualizarTarefa,
  buscarTarefa,
  criarTarefa,
  deletarTarefa,
  listarTarefas,
} from "@/server/tarefas/store";
import { publicProcedure, router } from "../init";

function tarefaNaoEncontrada(id: number) {
  return new TRPCError({
    code: "NOT_FOUND",
    message: `Tarefa ${id} não encontrada`,
  });
}

export const tarefasRouter = router({
  listar: publicProcedure
    .input(listarTarefasSchema)
    .query(({ input }) => listarTarefas(input.limit, input.cursor)),

  buscarPorId: publicProcedure.input(idTarefaSchema).query(({ input }) => {
    const tarefa = buscarTarefa(input.id);
    if (!tarefa) throw tarefaNaoEncontrada(input.id);
    return tarefa;
  }),

  criar: publicProcedure
    .input(criarTarefaSchema)
    .mutation(({ input }) => criarTarefa(input)),

  atualizar: publicProcedure
    .input(atualizarTarefaSchema)
    .mutation(({ input: { id, ...dados } }) => {
      const tarefa = atualizarTarefa(id, dados);
      if (!tarefa) throw tarefaNaoEncontrada(id);
      return tarefa;
    }),

  deletar: publicProcedure.input(idTarefaSchema).mutation(({ input }) => {
    if (!deletarTarefa(input.id)) throw tarefaNaoEncontrada(input.id);
    return { id: input.id };
  }),
});
