import { z } from "zod";

export const TAREFAS_POR_PAGINA = 10;

const id = z.number().int().positive();

export const tarefaSchema = z.object({
  id,
  titulo: z
    .string({ error: "O título é obrigatório" })
    .trim()
    .min(1, "O título é obrigatório")
    .max(120, "O título deve ter no máximo 120 caracteres"),
  descricao: z
    .string()
    .trim()
    .max(1000, "A descrição deve ter no máximo 1000 caracteres")
    .optional(),
  dataCriacao: z.iso.datetime(),
});

export type Tarefa = z.infer<typeof tarefaSchema>;

export const criarTarefaSchema = tarefaSchema.pick({
  titulo: true,
  descricao: true,
});

export const atualizarTarefaSchema = criarTarefaSchema.extend({ id });

export const idTarefaSchema = z.object({ id });

export const listarTarefasSchema = z.object({
  // O useInfiniteQuery envia cursor null na primeira página.
  cursor: id.nullish(),
  limit: z.number().int().min(1).max(50).default(TAREFAS_POR_PAGINA),
});

export type DadosTarefa = z.infer<typeof criarTarefaSchema>;
