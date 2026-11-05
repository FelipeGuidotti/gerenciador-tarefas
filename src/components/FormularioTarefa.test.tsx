import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackProvider } from "@/components/Feedback";
import { FormularioTarefa } from "@/components/FormularioTarefa";
import type { Tarefa } from "@/lib/tarefa-schema";

const mockCriar = jest.fn();
const mockAtualizar = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    tarefas: {
      criar: {
        mutationOptions: (opcoes: object) => ({
          mutationFn: mockCriar,
          ...opcoes,
        }),
      },
      atualizar: {
        mutationOptions: (opcoes: object) => ({
          mutationFn: mockAtualizar,
          ...opcoes,
        }),
      },
      listar: { pathFilter: () => ({ queryKey: ["listar"] }) },
    },
  }),
}));

const tarefa: Tarefa = {
  id: 7,
  titulo: "Tarefa existente",
  descricao: "Descrição existente",
  dataCriacao: "2026-01-15T15:00:00.000Z",
};

function renderizar(props: { tarefa?: Tarefa } = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedbackProvider>
        <FormularioTarefa {...props} />
      </FeedbackProvider>
    </QueryClientProvider>,
  );
  return {
    usuario: userEvent.setup(),
    titulo: screen.getByLabelText("Título"),
    descricao: screen.getByLabelText(/Descrição/),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("validação no navegador", () => {
  it.each([
    ["vazio", ""],
    ["só com espaços", "   "],
  ])("impede o envio com título %s", async (_caso, texto) => {
    const { usuario, titulo } = renderizar();
    if (texto) await usuario.type(titulo, texto);

    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));

    expect(screen.getByText("O título é obrigatório")).toBeInTheDocument();
    expect(titulo).toHaveFocus();
    expect(titulo).toHaveAttribute("aria-invalid", "true");
    expect(mockCriar).not.toHaveBeenCalled();
  });

  it("limpa o erro do campo quando o usuário digita", async () => {
    const { usuario, titulo } = renderizar();
    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));

    await usuario.type(titulo, "a");

    expect(screen.queryByText("O título é obrigatório")).not.toBeInTheDocument();
  });
});

describe("criar", () => {
  it("envia os dados sem espaços, avisa e volta para a lista", async () => {
    mockCriar.mockResolvedValue({ id: 31, titulo: "Comprar café" });
    const { usuario, titulo, descricao } = renderizar();

    await usuario.type(titulo, "  Comprar café  ");
    await usuario.type(descricao, "Na padaria");
    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));

    await screen.findByText('Tarefa "Comprar café" criada.');
    expect(mockCriar.mock.calls[0][0]).toEqual({
      titulo: "Comprar café",
      descricao: "Na padaria",
    });
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("não envia de novo enquanto o primeiro envio está em andamento", async () => {
    mockCriar.mockReturnValue(new Promise(() => {}));
    const { usuario, titulo } = renderizar();
    await usuario.type(titulo, "Uma vez só");

    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));
    const botao = await screen.findByRole("button", { name: "Criando..." });

    expect(botao).toBeDisabled();
    await usuario.type(titulo, "{Enter}");
    expect(mockCriar).toHaveBeenCalledTimes(1);
  });
});

describe("editar", () => {
  it("abre com os dados da tarefa", () => {
    const { titulo, descricao } = renderizar({ tarefa });

    expect(titulo).toHaveValue("Tarefa existente");
    expect(descricao).toHaveValue("Descrição existente");
    expect(
      screen.getByRole("button", { name: "Salvar alterações" }),
    ).toBeInTheDocument();
  });

  it("envia o id e permite limpar a descrição", async () => {
    mockAtualizar.mockResolvedValue({ id: 7, titulo: "Tarefa existente" });
    const { usuario, descricao } = renderizar({ tarefa });

    await usuario.clear(descricao);
    await usuario.click(
      screen.getByRole("button", { name: "Salvar alterações" }),
    );

    await screen.findByText('Tarefa "Tarefa existente" atualizada.');
    expect(mockAtualizar.mock.calls[0][0]).toEqual({
      id: 7,
      titulo: "Tarefa existente",
      descricao: "",
    });
    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockCriar).not.toHaveBeenCalled();
  });
});

describe("erros do backend", () => {
  it("mostra o erro abaixo do campo, e não a mensagem genérica", async () => {
    mockCriar.mockRejectedValue({
      message: "Dados inválidos",
      data: {
        code: "BAD_REQUEST",
        errosCampos: { titulo: ["O título é obrigatório"] },
      },
    });
    const { usuario, titulo } = renderizar();
    await usuario.type(titulo, "Válido no navegador");

    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));

    expect(await screen.findByText("O título é obrigatório")).toBeInTheDocument();
    expect(screen.queryByText("Dados inválidos")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("não mostra ao usuário o texto de um erro interno", async () => {
    mockCriar.mockRejectedValue({
      message: "Erro interno do servidor",
      data: { code: "INTERNAL_SERVER_ERROR", errosCampos: null },
    });
    const { usuario, titulo } = renderizar();
    await usuario.type(titulo, "Texto digitado");

    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar a tarefa.",
    );
    expect(titulo).toHaveValue("Texto digitado");
  });

  it("mostra a mensagem do backend quando a tarefa não existe mais", async () => {
    mockAtualizar.mockRejectedValue({
      message: "Tarefa 7 não encontrada",
      data: { code: "NOT_FOUND", errosCampos: null },
    });
    const { usuario } = renderizar({ tarefa });

    await usuario.click(
      screen.getByRole("button", { name: "Salvar alterações" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tarefa 7 não encontrada",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("troca falha de rede por mensagem amigável e preserva o que foi digitado", async () => {
    mockCriar.mockRejectedValue(new Error("Failed to fetch"));
    const { usuario, titulo } = renderizar();
    await usuario.type(titulo, "Texto digitado");

    await usuario.click(screen.getByRole("button", { name: "Criar tarefa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar a tarefa.",
    );
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
    expect(titulo).toHaveValue("Texto digitado");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Criar tarefa" })).toBeEnabled(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
