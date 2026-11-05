import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <div className="py-16">
      <p className="text-sm text-terciario tabular-nums">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Página não encontrada
      </h1>
      <p className="mt-3 text-secundario">
        O endereço pode estar errado ou a tarefa pode ter sido excluída.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-destaque underline underline-offset-4"
      >
        Voltar para as tarefas
      </Link>
    </div>
  );
}
