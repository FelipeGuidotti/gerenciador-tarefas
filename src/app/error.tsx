"use client";

import styles from "./page.module.css";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className={styles.pagina}>
      <div role="alert" className={styles.aviso}>
        <p>Algo deu errado ao carregar esta página.</p>
        <button type="button" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
