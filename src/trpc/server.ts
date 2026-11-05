import "server-only";

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { appRouter } from "@/server/trpc/routers/_app";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);

// Chama as procedures direto no processo, sem passar por HTTP.
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: {},
  queryClient: getQueryClient,
});
