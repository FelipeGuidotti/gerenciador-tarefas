import "server-only";

import type { DadosTarefa, Tarefa } from "@/lib/tarefa-schema";

type Store = {
  tarefas: Tarefa[];
  proximoId: number;
};

const TOTAL_SEED = 30;
const UMA_HORA_MS = 60 * 60 * 1000;

function criarStoreInicial(): Store {
  const tarefas = Array.from({ length: TOTAL_SEED }, (_, indice): Tarefa => {
    const id = indice + 1;
    return {
      id,
      titulo: `Tarefa de exemplo ${id}`,
      descricao: id % 2 === 0 ? `Descrição fictícia da tarefa ${id}` : undefined,
      dataCriacao: new Date(
        Date.now() - (TOTAL_SEED - id) * UMA_HORA_MS,
      ).toISOString(),
    };
  });

  return { tarefas, proximoId: TOTAL_SEED + 1 };
}

// O Next pode carregar este módulo mais de uma vez (hot reload e bundles
// separados por rota). No globalThis, todos enxergam a mesma lista.
const globalComStore = globalThis as typeof globalThis & {
  __tarefasStore?: Store;
};
const store = (globalComStore.__tarefasStore ??= criarStoreInicial());

export function listarTarefas(limit: number, cursor?: number | null) {
  // Cursor por id, e não offset: criar ou excluir tarefas durante a rolagem
  // não desloca as páginas seguintes, então nada é pulado nem repetido.
  const restantes = store.tarefas
    .filter((tarefa) => cursor == null || tarefa.id < cursor)
    .sort((a, b) => b.id - a.id);

  const itens = restantes.slice(0, limit);
  const temMais = restantes.length > limit;

  return {
    itens,
    proximoCursor: temMais ? itens[itens.length - 1].id : null,
  };
}

export function buscarTarefa(id: number) {
  return store.tarefas.find((tarefa) => tarefa.id === id) ?? null;
}

export function criarTarefa({ titulo, descricao }: DadosTarefa) {
  const tarefa: Tarefa = {
    id: store.proximoId++,
    titulo,
    descricao: descricao || undefined,
    dataCriacao: new Date().toISOString(),
  };
  store.tarefas.push(tarefa);
  return tarefa;
}

export function atualizarTarefa(id: number, { titulo, descricao }: DadosTarefa) {
  const tarefa = buscarTarefa(id);
  if (!tarefa) return null;

  tarefa.titulo = titulo;
  tarefa.descricao = descricao || undefined;
  return tarefa;
}

export function deletarTarefa(id: number) {
  const indice = store.tarefas.findIndex((tarefa) => tarefa.id === id);
  if (indice === -1) return false;

  store.tarefas.splice(indice, 1);
  return true;
}
