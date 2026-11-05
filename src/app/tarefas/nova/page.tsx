import type { Metadata } from "next";
import { FormularioTarefa } from "@/components/FormularioTarefa";

export const metadata: Metadata = {
  title: "Nova tarefa",
};

export default function NovaTarefa() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Nova tarefa</h1>
      <FormularioTarefa />
    </>
  );
}
