/** @jest-environment node */

// Chama os handlers reais da rota: cobre validação, procedures, store e o
// formato de erro, exatamente como o front recebe, mas sem subir um servidor.
type Rota = typeof import("./route");

type Tarefa = {
  id: number;
  titulo: string;
  descricao?: string;
  dataCriacao: string;
};

let rota: Rota;

beforeEach(async () => {
  // O store fica no globalThis: limpar garante 30 tarefas novas em cada teste.
  delete (globalThis as { __tarefasStore?: unknown }).__tarefasStore;
  jest.resetModules();
  rota = await import("./route");
});

async function responder(resposta: Response) {
  const corpo = await resposta.json();
  return {
    status: resposta.status,
    dados: corpo.result?.data,
    erro: corpo.error,
  };
}

async function consultar(procedure: string, input: unknown) {
  const busca = encodeURIComponent(JSON.stringify(input));
  return responder(
    await rota.GET(
      new Request(`http://teste/api/trpc/tarefas.${procedure}?input=${busca}`),
    ),
  );
}

async function executar(procedure: string, input: unknown) {
  return responder(
    await rota.POST(
      new Request(`http://teste/api/trpc/tarefas.${procedure}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    ),
  );
}

function ids(itens: Tarefa[]) {
  return itens.map((tarefa) => tarefa.id);
}

describe("tarefas.listar", () => {
  it("retorna a primeira página com as mais recentes primeiro", async () => {
    const { status, dados } = await consultar("listar", { limit: 3 });

    expect(status).toBe(200);
    expect(ids(dados.itens)).toEqual([30, 29, 28]);
    expect(dados.proximoCursor).toBe(28);
  });

  it("termina com proximoCursor null na última página", async () => {
    const { dados } = await consultar("listar", { limit: 3, cursor: 4 });

    expect(ids(dados.itens)).toEqual([3, 2, 1]);
    expect(dados.proximoCursor).toBeNull();
  });

  it("não pula nem repete tarefas se uma for excluída durante a rolagem", async () => {
    const primeira = await consultar("listar", { limit: 3 });
    await executar("deletar", { id: 29 });

    const segunda = await consultar("listar", {
      limit: 3,
      cursor: primeira.dados.proximoCursor,
    });

    expect(ids(segunda.dados.itens)).toEqual([27, 26, 25]);
  });

  it("mostra uma tarefa nova no topo sem afetar a página seguinte", async () => {
    const primeira = await consultar("listar", { limit: 3 });
    await executar("criar", { titulo: "Nova" });

    const segunda = await consultar("listar", {
      limit: 3,
      cursor: primeira.dados.proximoCursor,
    });
    const topo = await consultar("listar", { limit: 1 });

    expect(ids(segunda.dados.itens)).toEqual([27, 26, 25]);
    expect(topo.dados.itens[0].titulo).toBe("Nova");
  });
});

describe("tarefas.criar", () => {
  it("gera id e data, e remove os espaços do título", async () => {
    const { status, dados } = await executar("criar", {
      titulo: "  Comprar café  ",
      descricao: "Na padaria",
    });

    expect(status).toBe(200);
    expect(dados).toMatchObject({
      id: 31,
      titulo: "Comprar café",
      descricao: "Na padaria",
    });
    expect(new Date(dados.dataCriacao).toISOString()).toBe(dados.dataCriacao);
  });

  it.each([
    ["sem título", {}],
    ["com título só de espaços", { titulo: "   " }],
  ])("responde 400 com o erro no campo ao criar %s", async (_caso, entrada) => {
    const { status, erro } = await executar("criar", entrada);

    expect(status).toBe(400);
    expect(erro.message).toBe("Dados inválidos");
    expect(erro.data.code).toBe("BAD_REQUEST");
    expect(erro.data.errosCampos.titulo).toEqual(["O título é obrigatório"]);
  });

  it("não cria nada quando a validação falha", async () => {
    await executar("criar", { titulo: "" });
    const { dados } = await consultar("listar", { limit: 1 });
    expect(dados.itens[0].id).toBe(30);
  });
});

describe("tarefas.buscarPorId", () => {
  it("retorna a tarefa existente", async () => {
    const { status, dados } = await consultar("buscarPorId", { id: 5 });
    expect(status).toBe(200);
    expect(dados.id).toBe(5);
  });

  it("responde 404 com mensagem clara para id inexistente", async () => {
    const { status, erro } = await consultar("buscarPorId", { id: 9999 });

    expect(status).toBe(404);
    expect(erro.message).toBe("Tarefa 9999 não encontrada");
    expect(erro.data.errosCampos).toBeNull();
  });
});

describe("tarefas.atualizar", () => {
  it("troca os dados, limpa a descrição omitida e mantém id e data", async () => {
    const original = await consultar("buscarPorId", { id: 30 });
    expect(original.dados.descricao).toBeDefined();

    const { status, dados } = await executar("atualizar", {
      id: 30,
      titulo: "Editada",
    });

    expect(status).toBe(200);
    expect(dados.id).toBe(30);
    expect(dados.titulo).toBe("Editada");
    expect(dados.descricao).toBeUndefined();
    expect(dados.dataCriacao).toBe(original.dados.dataCriacao);
  });

  it("responde 400 com título vazio e não altera a tarefa", async () => {
    const { status } = await executar("atualizar", { id: 30, titulo: " " });
    const { dados } = await consultar("buscarPorId", { id: 30 });

    expect(status).toBe(400);
    expect(dados.titulo).toBe("Tarefa de exemplo 30");
  });

  it("responde 404 para id inexistente", async () => {
    const { status, erro } = await executar("atualizar", {
      id: 9999,
      titulo: "a",
    });

    expect(status).toBe(404);
    expect(erro.message).toBe("Tarefa 9999 não encontrada");
  });
});

describe("erros internos", () => {
  afterEach(() => {
    jest.dontMock("@/server/tarefas/store");
  });

  it("responde 500 sem expor o texto do erro original", async () => {
    jest.resetModules();
    jest.doMock("@/server/tarefas/store", () => ({
      listarTarefas: () => {
        throw new Error("detalhe interno");
      },
    }));
    rota = await import("./route");

    const { status, erro } = await consultar("listar", {});

    expect(status).toBe(500);
    expect(erro.message).toBe("Erro interno do servidor");
  });
});

describe("tarefas.deletar", () => {
  it("remove a tarefa", async () => {
    const { status, dados } = await executar("deletar", { id: 30 });
    const busca = await consultar("buscarPorId", { id: 30 });

    expect(status).toBe(200);
    expect(dados).toEqual({ id: 30 });
    expect(busca.status).toBe(404);
  });

  it("responde 404 para id inexistente", async () => {
    const { status, erro } = await executar("deletar", { id: 9999 });

    expect(status).toBe(404);
    expect(erro.message).toBe("Tarefa 9999 não encontrada");
  });
});
