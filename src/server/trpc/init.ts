import { initTRPC, type TRPCError } from "@trpc/server";
import { ZodError, z } from "zod";

function mensagemPublica(error: TRPCError, mensagem: string) {
  // Por padrão, a message seria o JSON do Zod. O detalhe fica em errosCampos.
  if (error.cause instanceof ZodError) return "Dados inválidos";
  // O texto de um erro interno pode trazer detalhes que não devem sair daqui.
  if (error.code === "INTERNAL_SERVER_ERROR") return "Erro interno do servidor";
  return mensagem;
}

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: mensagemPublica(error, shape.message),
      data: {
        ...shape.data,
        errosCampos:
          error.cause instanceof ZodError
            ? z.flattenError(error.cause).fieldErrors
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
