import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackProvider } from "@/components/Feedback";
import { ListaTarefas } from "@/components/ListaTarefas";

const mockListar = jest.fn();
const mockDeletar = jest.fn();

jest.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    tarefas: {
      listar: {
        infiniteQueryOptions: (_input: unknown, opcoes: object) => ({
          queryKey: ["listar"],
          initialPageParam: null,
          queryFn: ({ pageParam }: { pageParam: number | null }) =>
            mockListar(pageParam),
          ...opcoes,
        }),
        pathFilter: () => ({ queryKey: ["listar"] }),
      },
      deletar: {
        mutationOptions: (opcoes: object) => ({
          mutationFn: mockDeletar,
          ...opcoes,
        }),
      },
    },
  }),
}));

// O jsdom não implementa IntersectionObserver nem os métodos do <dialog>.
let observadores: IntersectionObserverCallback[] = [];

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };

  window.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    callback: IntersectionObserverCallback;
    observe() {
      observadores.push(this.callback);
    }
    disconnect() {
      observadores = observadores.filter((c) => c !== this.callback);
    }
  } as unknown as typeof IntersectionObserver;
});

function sentinelaVisivel() {
  act(() => {
    observadores.forEach((callback) =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
  });
}

function pagina(ids: number[], proximoCursor: number | null = null) {
  return {
    itens: ids.map((id) => ({
      id,
      titulo: `Tarefa ${id}`,
      dataCriacao: "2026-01-15T15:00:00.000Z",
    })),
    proximoCursor,
  };
}

function renderizar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <ListaTarefas />
      </FeedbackProvider>
    </QueryClientProvider>,
  );
  return { usuario: userEvent.setup(), queryClient };
}

function titulos() {
  return screen.getAllByRole("heading").map((titulo) => titulo.textContent);
}

function botaoExcluir(id: number) {
  return screen.getByRole("button", { name: `Excluir a tarefa "Tarefa ${id}"` });
}

async function pedirExclusao(
  usuario: ReturnType<typeof userEvent.setup>,
  id: number,
) {
  await usuario.click(botaoExcluir(id));
  await usuario.click(screen.getByRole("button", { name: "Excluir tarefa" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockListar.mockReset();
  mockDeletar.mockReset();
  observadores = [];
});

describe("listagem", () => {
  it("mostra título, data no horário de Brasília e link de edição", async () => {
    mockListar.mockResolvedValue(pagina([7]));
    renderizar();

    expect(await screen.findByText("Tarefa 7")).toBeInTheDocument();
    expect(screen.getByText("15/01/2026, 12:00")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: 'Editar a tarefa "Tarefa 7"' }),
    ).toHaveAttribute("href", "/tarefas/7/editar");
  });

  it("mostra o estado vazio com o caminho para criar a primeira tarefa", async () => {
    mockListar.mockResolvedValue(pagina([]));
    renderizar();

    expect(
      await screen.findByText("Nenhuma tarefa cadastrada ainda."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Crie a primeira tarefa" }),
    ).toHaveAttribute("href", "/tarefas/nova");
  });

  it("permite tentar de novo quando a primeira carga falha", async () => {
    mockListar.mockRejectedValueOnce(new Error("falhou"));
    mockListar.mockResolvedValue(pagina([7]));
    const { usuario } = renderizar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar as tarefas.");

    await usuario.click(
      within(alerta).getByRole("button", { name: "Tentar novamente" }),
    );
    expect(await screen.findByText("Tarefa 7")).toBeInTheDocument();
  });
});

describe("exclusão", () => {
  it("não chama a API se o usuário cancelar a confirmação", async () => {
    mockListar.mockResolvedValue(pagina([7]));
    const { usuario } = renderizar();
    await screen.findByText("Tarefa 7");

    await usuario.click(botaoExcluir(7));

    const dialogo = screen.getByRole("dialog", {
      name: "Excluir esta tarefa?",
    });
    expect(dialogo).toHaveTextContent('"Tarefa 7" será excluída.');

    await usuario.click(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockDeletar).not.toHaveBeenCalled();
    expect(screen.getByText("Tarefa 7")).toBeInTheDocument();
  });

  it("move o foco para a tarefa vizinha depois de excluir", async () => {
    mockListar.mockResolvedValueOnce(pagina([8, 7]));
    mockListar.mockResolvedValue(pagina([8]));
    mockDeletar.mockResolvedValue({ id: 7 });
    const { usuario } = renderizar();
    await screen.findByText("Tarefa 7");

    await pedirExclusao(usuario, 7);

    await screen.findByText('Tarefa "Tarefa 7" excluída.');
    expect(
      screen.getByRole("link", { name: 'Editar a tarefa "Tarefa 8"' }),
    ).toHaveFocus();
  });

  it("desabilita só o item em exclusão, avisa e atualiza a lista", async () => {
    mockListar.mockResolvedValueOnce(pagina([8, 7]));
    let concluir: (valor: { id: number }) => void = () => {};
    mockDeletar.mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve;
      }),
    );
    const { usuario } = renderizar();
    await screen.findByText("Tarefa 7");

    await pedirExclusao(usuario, 7);

    const excluindo = await screen.findByRole("button", {
      name: "Excluindo...",
    });
    expect(excluindo).toHaveAttribute("aria-disabled", "true");
    expect(botaoExcluir(8)).toHaveAttribute("aria-disabled", "false");

    await usuario.click(excluindo);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();


    mockListar.mockResolvedValue(pagina([8]));
    await act(async () => concluir({ id: 7 }));

    expect(
      await screen.findByText('Tarefa "Tarefa 7" excluída.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(titulos()).toEqual(["Tarefa 8"]));
    expect(mockDeletar.mock.calls[0][0]).toEqual({ id: 7 });
  });

  it("mostra a mensagem do backend em 404 e atualiza a lista desatualizada", async () => {
    mockListar.mockResolvedValueOnce(pagina([7]));
    mockListar.mockResolvedValue(pagina([]));
    mockDeletar.mockRejectedValue({
      message: "Tarefa 7 não encontrada",
      data: { code: "NOT_FOUND" },
    });
    const { usuario } = renderizar();
    await screen.findByText("Tarefa 7");

    await pedirExclusao(usuario, 7);

    expect(
      await screen.findByText("Tarefa 7 não encontrada"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Nenhuma tarefa cadastrada ainda."),
    ).toBeInTheDocument();
  });

  it("troca falha de rede por mensagem amigável e mantém o item", async () => {
    mockListar.mockResolvedValue(pagina([7]));
    mockDeletar.mockRejectedValue(new Error("Failed to fetch"));
    const { usuario } = renderizar();
    await screen.findByText("Tarefa 7");

    await pedirExclusao(usuario, 7);

    expect(
      await screen.findByText(
        "Não foi possível excluir a tarefa. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(botaoExcluir(7)).toHaveAttribute("aria-disabled", "false"),
    );
  });
});

describe("infinite scroll", () => {
  it("busca a próxima página com o cursor quando a sentinela aparece", async () => {
    mockListar.mockImplementation(async (cursor: number | null) =>
      cursor === null ? pagina([4, 3], 3) : pagina([2, 1]),
    );
    renderizar();
    await screen.findByText("Tarefa 4");
    expect(mockListar).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Todas as tarefas foram carregadas."),
    ).not.toBeInTheDocument();

    sentinelaVisivel();

    await screen.findByText("Todas as tarefas foram carregadas.");
    expect(mockListar).toHaveBeenLastCalledWith(3);
    expect(titulos()).toEqual(["Tarefa 4", "Tarefa 3", "Tarefa 2", "Tarefa 1"]);
  });

  it("não observa a sentinela quando não há mais páginas", async () => {
    mockListar.mockResolvedValue(pagina([1]));
    renderizar();
    await screen.findByText("Tarefa 1");

    expect(observadores).toHaveLength(0);
  });

  it("após falha, não repete sozinho e retoma pelo botão", async () => {
    mockListar.mockResolvedValueOnce(pagina([2], 2));
    mockListar.mockRejectedValueOnce(new Error("falhou"));
    mockListar.mockResolvedValue(pagina([1]));
    const { usuario } = renderizar();
    await screen.findByText("Tarefa 2");

    sentinelaVisivel();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Não foi possível carregar mais tarefas.");
    expect(screen.getByText("Tarefa 2")).toBeInTheDocument();
    expect(observadores).toHaveLength(0);
    expect(mockListar).toHaveBeenCalledTimes(2);

    await usuario.click(
      within(alerta).getByRole("button", { name: "Tentar novamente" }),
    );

    expect(await screen.findByText("Tarefa 1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Regressão: buscar a próxima página cancelava a atualização em andamento, e
  // uma tarefa excluída continuava na tela.
  it("não cancela uma atualização em andamento ao ver a sentinela", async () => {
    mockListar.mockResolvedValue(pagina([1]));
    mockListar.mockResolvedValueOnce(pagina([3, 2], 2));
    const { queryClient } = renderizar();
    await screen.findByText("Tarefa 3");

    let concluir: (valor: unknown) => void = () => {};
    mockListar.mockReturnValueOnce(
      new Promise((resolve) => {
        concluir = resolve;
      }),
    );
    act(() => {
      queryClient.invalidateQueries({ queryKey: ["listar"] });
    });
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));

    sentinelaVisivel();

    expect(mockListar).toHaveBeenCalledTimes(2);

    await act(async () => concluir(pagina([2], 2)));

    await waitFor(() =>
      expect(screen.queryByText("Tarefa 3")).not.toBeInTheDocument(),
    );
  });
});
