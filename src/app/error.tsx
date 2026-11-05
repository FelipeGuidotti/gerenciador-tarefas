"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { botaoSecundario } from "@/components/estilos";

export default function Error({ reset }: { reset: () => void }) {
  const router = useRouter();

  function tentarNovamente() {
    // Sem o refresh, o reset não refaz a busca dos Server Components.
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div role="alert" className="py-16">
      <p className="mb-4">Algo deu errado ao carregar esta página.</p>
      <button
        type="button"
        onClick={tentarNovamente}
        className={botaoSecundario}
      >
        Tentar novamente
      </button>
    </div>
  );
}
