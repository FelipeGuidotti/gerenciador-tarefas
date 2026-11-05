"use client";

import { useEffect, useId, useRef } from "react";
import { botaoPerigo, botaoSecundario } from "@/components/estilos";

type Props = {
  titulo: string;
  mensagem: string;
  rotuloConfirmar: string;
  onConfirmar: () => void;
  onFechar: () => void;
};

// <dialog> nativo: showModal já cuida do foco preso no modal, da tecla Esc, de
// bloquear o fundo e de devolver o foco a quem abriu, sem biblioteca.
export function DialogoConfirmacao({
  titulo,
  mensagem,
  rotuloConfirmar,
  onConfirmar,
  onFechar,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  function fechar() {
    dialogo.current?.close();
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      onClose={onFechar}
      onClick={(evento) => {
        // O conteúdo fica em uma div interna: só o fundo tem o próprio dialog
        // como alvo do clique.
        if (evento.target === dialogo.current) fechar();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-flutuante bg-white text-tinta shadow-flutuante backdrop:bg-tinta/40"
    >
      <div className="p-6">
        <h2 id={idTitulo} className="text-lg font-semibold tracking-tight">
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-6 wrap-anywhere text-secundario">
          {mensagem}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={fechar} className={botaoSecundario}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              fechar();
              onConfirmar();
            }}
            className={botaoPerigo}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
