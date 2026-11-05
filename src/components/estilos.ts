// Strings, e não componentes, porque as mesmas classes servem a <Link> e <button>.
const baseBotao =
  "inline-flex min-h-11 items-center justify-center rounded-controle px-4 text-sm font-medium transition-colors disabled:cursor-progress disabled:opacity-60 sm:min-h-10";

export const botaoPrimario = `${baseBotao} bg-destaque text-white hover:bg-destaque-forte`;

export const botaoSecundario = `${baseBotao} border border-borda-campo bg-white text-tinta hover:bg-hover`;

export const botaoPerigo = `${baseBotao} bg-erro text-white hover:bg-erro-forte`;
