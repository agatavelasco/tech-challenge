# Decisões

Registro das decisões estruturantes do projeto. Cada uma traz o que foi decidido, o que mais
foi considerado e por quê.

## Organização do projeto

**Decisão:** monorepo com pnpm workspaces e Turborepo como executor de tarefas —
`apps/transactions-api`, `apps/anti-fraud`, `apps/web`, `packages/contracts` e
`packages/config`. Apps só importam de `packages/*`, nunca entre si.

**Alternativas consideradas:** um repositório por serviço; pnpm workspaces sem orquestrador
(ordem codificada nos scripts ou em `postinstall`); Nx.

**Por quê:** os três serviços são TypeScript e compartilham o contrato dos eventos — no
monorepo, uma mudança incompatível no payload quebra a compilação do consumidor em vez de
quebrar em produção, e entra num único PR. Cada etapa do quality gate precisa rodar isolada,
mas typecheck, testes e build dependem do `contracts` compilado e do Prisma Client gerado.
Com pnpm puro essa ordem ficaria duplicada em cada script; o Turborepo a declara uma vez
(`dependsOn: ["^build"]`) e garante a mesma execução local e no CI. Nx resolveria o mesmo
problema com bem mais configuração do que três apps justificam. Com times e linguagens
distintas por serviço, repositórios separados e um schema registry substituiriam o pacote
compartilhado.

## Cache do Turborepo no CI

**Decisão:** persistir o diretório `.turbo/cache` entre execuções do GitHub Actions com
`actions/cache`. Testes de integração e e2e rodam com `cache: false`.

**Alternativas consideradas:** Vercel Remote Cache; nenhum cache.

**Por quê:** o cache do CI é alimentado só pelo próprio CI — um resultado gerado na máquina
de quem desenvolve nunca substitui a execução no pipeline. Não depende de conta externa nem
de segredo, então funciona igual em qualquer fork. Testes que dependem de infraestrutura
sempre rodam, porque o estado externo não entra no hash do Turbo. Com um time compartilhando
cache entre máquinas, o Vercel Remote Cache (com assinatura de artefatos) passaria a
compensar.

## Versão do TypeScript

**Decisão:** TypeScript fixado em `~6.0`.

**Alternativas consideradas:** TypeScript 7 (compilador nativo, versão `latest` no npm).

**Por quê:** o lint com informação de tipos depende do `typescript-eslint`, que hoje aceita
apenas `<6.1`. O NestJS CLI também usa a 6.0. Subir para a 7 fica para quando o ecossistema
de lint acompanhar.

## Ferramentas de qualidade

**Decisão:** ESLint (`strictTypeChecked` do typescript-eslint) e Prettier em todo o
monorepo; husky + lint-staged no pre-commit; commitlint no commit-msg; `pnpm quality`
executa formatação, lint, typecheck, testes e build, e é o mesmo comando do CI.

**Alternativas consideradas:** oxlint (padrão do NestJS 12); Biome no lugar de
ESLint + Prettier.

**Por quê:** o Next.js distribui suas regras como configuração de ESLint, então um único
linter cobre os três apps com as mesmas regras. Lint com tipos barra promessas soltas e
`any` — os erros mais comuns em código assíncrono orientado a eventos. oxlint e Biome são
mais rápidos, mas trocar significaria dois linters no monorepo (o do Next continuaria
ESLint). Com o lint ficando lento, o oxlint seria o primeiro candidato.
