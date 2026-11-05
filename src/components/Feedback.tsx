"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

const TEMPO_VISIVEL_MS = 5000;

const FeedbackContext = createContext<((mensagem: Mensagem) => void) | null>(
  null,
);

export function useFeedback() {
  const mostrarFeedback = useContext(FeedbackContext);
  if (!mostrarFeedback) {
    throw new Error("useFeedback precisa estar dentro de FeedbackProvider");
  }
  return mostrarFeedback;
}

function Icone({ tipo }: { tipo: Mensagem["tipo"] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 size-4 shrink-0"
    >
      {tipo === "sucesso" ? (
        <path d="m4 10.5 4 4 8-9" />
      ) : (
        <path d="M10 4v7.5M10 15.5v.5" />
      )}
    </svg>
  );
}

// Fica no layout para a mensagem sobreviver à troca de página: o formulário
// mostra o sucesso depois de voltar para a listagem.
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  useEffect(() => {
    if (!mensagem) return;
    const temporizador = setTimeout(() => setMensagem(null), TEMPO_VISIVEL_MS);
    return () => clearTimeout(temporizador);
  }, [mensagem]);

  return (
    <FeedbackContext.Provider value={setMensagem}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 flex justify-center"
        aria-live="polite"
      >
        {mensagem && (
          <p
            className={`flex max-w-md animate-entrada gap-2 rounded-flutuante px-4 py-3 text-sm wrap-anywhere text-white shadow-flutuante motion-reduce:animate-none ${
              mensagem.tipo === "sucesso" ? "bg-tinta" : "bg-erro"
            }`}
          >
            <Icone tipo={mensagem.tipo} />
            {mensagem.texto}
          </p>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}
