import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Evita refazer no navegador a busca que o servidor acabou de fazer.
        staleTime: 30 * 1000,
      },
    },
  });
}
