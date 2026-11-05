import { router } from "../init";
import { tarefasRouter } from "./tarefas";

export const appRouter = router({
  tarefas: tarefasRouter,
});

export type AppRouter = typeof appRouter;
