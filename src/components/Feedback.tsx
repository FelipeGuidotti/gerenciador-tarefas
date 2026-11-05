"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import styles from "./Feedback.module.css";

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
      <div className={styles.regiao} aria-live="polite">
        {mensagem && (
          <p className={`${styles.mensagem} ${styles[mensagem.tipo]}`}>
            {mensagem.texto}
          </p>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}
