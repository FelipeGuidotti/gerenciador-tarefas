# Gerenciador de Tarefas

Aplicação simples para criar, listar, editar e excluir tarefas, feita com Next.js 15 e tRPC. As tarefas ficam em memória, e todos os dados são fictícios.

## Como executar

É preciso ter o Node.js 20 ou superior (testado na versão 24).

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

Para rodar em modo de produção:

```bash
npm run build
npm start
```

O build baixa a fonte Geist, então precisa de internet. Ao iniciar, o app já traz 30 tarefas fictícias, e tudo volta a esse estado quando o servidor reinicia.

## Testes

```bash
npm test
```

São testes em Jest e Testing Library, sem precisar de servidor rodando:

- **Regras:** os schemas Zod, como título obrigatório e limites de tamanho.
- **API:** chamadas à rota real do tRPC, passando pela validação e pelo store até a resposta HTTP. Inclui os erros 400 e 404 e a paginação com exclusão durante a rolagem.
- **Formulário e lista:** o comportamento na tela, com a API simulada. Inclui validação, erros, exclusão e infinite scroll.

## Funcionalidades

- **Listagem:** renderizada no servidor (SSR), com infinite scroll e exclusão com confirmação.
- **Criar e editar:** o mesmo formulário, com validação no navegador e no servidor.
- **Feedback:** estados de carregamento, mensagens de sucesso e erro, e página 404 para tarefas inexistentes.

## Stack

Next.js 15 (App Router), React 19, TypeScript, tRPC 11, TanStack Query 5, Zod 4, Tailwind CSS 4, Jest e Testing Library.

## Arquitetura

```text
src/
  lib/tarefa-schema.ts      Contrato: regras e tipos da tarefa
  server/
    trpc/routers/           Operações da API: validam a entrada e definem os erros
    tarefas/store.ts        Dados em memória
  app/
    api/trpc/[trpc]/        Rota HTTP do tRPC
    page.tsx                Listagem: busca os dados no servidor
    tarefas/                Páginas de criar e editar
  components/               Lista, formulário e mensagens de feedback
  trpc/                     Acesso ao tRPC no navegador e no servidor
```

Três regras mantêm as camadas separadas:

1. Só o router acessa o store.
2. Os componentes do navegador falam com o backend apenas pelo `useTRPC`.
3. Do `server/`, o front importa apenas tipos. O `server-only` faz o build falhar se isso for violado.

## Principais decisões

- **O contrato é o Zod mais o tipo `AppRouter`, sem classes.** Os schemas validam ao rodar e geram os tipos, e o front importa só o tipo do router. Se um campo mudar no backend, o `tsc` aponta o erro no front.
- **Paginação por cursor de `id`, sem offset.** Criar ou excluir tarefas durante a rolagem não desloca as páginas seguintes, então nada é pulado nem repetido.
- **SSR com `force-dynamic`, prefetch e hidratação.** A primeira página chega pronta no HTML, e o navegador reaproveita esses dados sem chamar a API de novo.
- **Sem `loading.tsx`.** Como o store responde na hora, o HTML inicial já vem com a lista, em vez de um "Carregando...".
- **Store em `globalThis`.** O Next pode carregar o mesmo módulo mais de uma vez, e sem isso a página e a API poderiam enxergar listas diferentes.
- **Fuso fixo nas datas.** Servidor e navegador em fusos diferentes gerariam textos diferentes e um erro de hidratação. Por isso, as datas sempre aparecem no horário de Brasília.
- **`router.replace` depois de salvar.** Assim, o botão Voltar não reabre o formulário com dados antigos.

## Limitações

- **Dados em memória:** somem ao reiniciar o servidor, e esse armazenamento não funciona em serverless com várias instâncias. O case dispensa banco de dados.
- **Atualização completa:** `atualizar` substitui os dados da tarefa, como um `PUT`. Enviar uma tarefa sem `descricao` apaga a descrição dela.
- **Versão do Next:** o case pede a v15, então o projeto usa o último patch dessa linha (15.5.29). O `npm audit` aponta uma vulnerabilidade moderada no `next` e uma alta no `postcss`, e a única correção oferecida é migrar para o Next 16. O risco prático é baixo, porque o projeto roda localmente, sem deploy.
- **Testes:** a suíte não abre um navegador real. Durante o desenvolvimento, os fluxos também foram verificados no Chrome, com scripts que não fazem parte do repositório.
