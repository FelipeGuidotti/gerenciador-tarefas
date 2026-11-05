/** @jest-environment node */
import {
  atualizarTarefaSchema,
  criarTarefaSchema,
  idTarefaSchema,
  listarTarefasSchema,
} from "./tarefa-schema";

function mensagemDe(resultado: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return resultado.error?.issues[0].message;
}

describe("criarTarefaSchema", () => {
  it("remove os espaços das pontas do título", () => {
    const dados = criarTarefaSchema.parse({ titulo: "  Comprar café  " });
    expect(dados.titulo).toBe("Comprar café");
  });

  it.each([
    ["ausente", {}],
    ["vazio", { titulo: "" }],
    ["só com espaços", { titulo: "     " }],
  ])("rejeita título %s", (_caso, entrada) => {
    const resultado = criarTarefaSchema.safeParse(entrada);
    expect(resultado.success).toBe(false);
    expect(mensagemDe(resultado)).toBe("O título é obrigatório");
  });

  it("aplica o limite de 120 caracteres depois de remover os espaços", () => {
    expect(
      criarTarefaSchema.safeParse({ titulo: `  ${"x".repeat(120)}  ` }).success,
    ).toBe(true);

    const resultado = criarTarefaSchema.safeParse({ titulo: "x".repeat(121) });
    expect(mensagemDe(resultado)).toBe(
      "O título deve ter no máximo 120 caracteres",
    );
  });

  it("aceita tarefa sem descrição e limita a descrição a 1000 caracteres", () => {
    expect(criarTarefaSchema.safeParse({ titulo: "a" }).success).toBe(true);
    expect(
      criarTarefaSchema.safeParse({ titulo: "a", descricao: "d".repeat(1000) })
        .success,
    ).toBe(true);

    const resultado = criarTarefaSchema.safeParse({
      titulo: "a",
      descricao: "d".repeat(1001),
    });
    expect(mensagemDe(resultado)).toBe(
      "A descrição deve ter no máximo 1000 caracteres",
    );
  });

  it("não aceita id e data vindos do cliente", () => {
    const dados = criarTarefaSchema.parse({
      titulo: "a",
      id: 99,
      dataCriacao: "2020-01-01T00:00:00.000Z",
    });
    expect(dados).toEqual({ titulo: "a" });
  });
});

describe("atualizarTarefaSchema", () => {
  it("exige o id junto com as mesmas regras de criação", () => {
    expect(atualizarTarefaSchema.safeParse({ titulo: "a" }).success).toBe(false);
    expect(atualizarTarefaSchema.safeParse({ id: 1, titulo: " " }).success).toBe(
      false,
    );
    expect(atualizarTarefaSchema.safeParse({ id: 1, titulo: "a" }).success).toBe(
      true,
    );
  });
});

describe("idTarefaSchema", () => {
  it.each([0, -1, 1.5, "1"])("rejeita o id %p", (id) => {
    expect(idTarefaSchema.safeParse({ id }).success).toBe(false);
  });
});

describe("listarTarefasSchema", () => {
  it("usa 10 itens por página quando o limite não é informado", () => {
    expect(listarTarefasSchema.parse({}).limit).toBe(10);
  });

  it("aceita o cursor null enviado na primeira página", () => {
    expect(listarTarefasSchema.safeParse({ cursor: null }).success).toBe(true);
  });

  it.each([0, 51])("rejeita o limite %p", (limit) => {
    expect(listarTarefasSchema.safeParse({ limit }).success).toBe(false);
  });
});
