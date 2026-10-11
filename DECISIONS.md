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

## Contrato compartilhado e validação

**Decisão:** schemas zod no pacote `contracts` são a única definição de entrada, resposta e
eventos. A API valida com eles (via `ZodValidationPipe`), o dashboard usará os mesmos no
formulário e os consumidores Kafka validarão cada mensagem recebida. Erros de validação
voltam por campo: `{ statusCode, message, errors: { campo: [mensagens] } }`.

**Alternativas consideradas:** `class-validator` com DTOs (padrão do NestJS); OpenAPI como
fonte e geração de tipos para o frontend.

**Por quê:** `class-validator` amarra a validação a classes do Nest, que o Next e os
consumidores não reaproveitam — a regra "valor positivo com até duas casas" existiria em
dois lugares e divergiria. Com zod, o tipo é inferido do schema, então tipo e validação não
se separam. OpenAPI com geração de código resolveria o mesmo problema entre linguagens
diferentes, mas com três apps TypeScript é um passo de build a mais sem ganho.

## Modelagem de dados

**Decisão:** tabela `transactions` com chave primária UUIDv7 gerada pelo Prisma e exposta
como `transactionExternalId`; valor em `decimal(14,2)`; status em enum do Postgres;
`transfer_types` como tabela de referência populada pela própria migration. Índices em
`(created_at, id)`, `(status, created_at)` e `(transfer_type_id, created_at)`. As regras
"valor positivo" e "contas distintas" também existem como `CHECK` no banco.

**Alternativas consideradas:** id numérico interno + UUID externo separado; UUIDv4; valor
em `float` ou em centavos inteiros; tipos de transferência como enum; seed separado para os
tipos.

**Por quê:**

- **UUIDv7 como chave:** um único identificador evita a tradução id interno ↔ externo, e
  por ser ordenado no tempo as inserções vão para o fim do índice — com UUIDv4 cada insert
  cai num ponto aleatório da B-tree, o que fragmenta o índice sob volume alto de escrita.
- **`decimal(14,2)`:** dinheiro não pode ter erro de arredondamento no armazenamento. A API
  expõe `number` porque o contrato do desafio usa número, e catorze dígitos cabem num double
  sem perda; a conversão acontece num único ponto (o repositório).
- **Tipos como tabela, populados na migration:** a resposta exige `transactionType.name`, e
  a chave estrangeira garante que só existam tipos válidos. Por ser dado de referência, e
  não dado de teste, entra na migration: existe em todo ambiente sem depender de rodar seed.
- **Índices:** cada filtro do dashboard ordena por data decrescente, então cada índice
  combina o filtro com `created_at`. O `id` no primeiro desempata a ordenação, para que a
  paginação seja estável.
- **`CHECK` no banco:** a validação da API é a primeira barreira; a do banco garante a
  regra mesmo para escritas que não passem por ela.

## Paginação da listagem

**Decisão:** paginação por offset (`page` e `pageSize`, máximo de 100), com `total` e
`totalPages` na resposta; página e contagem lidas na mesma transação.

**Alternativas consideradas:** paginação por cursor (keyset).

**Por quê:** o dashboard mostra números de página e o total, que o cursor não oferece de
forma barata. O custo do offset cresce com a profundidade da página, aceitável para
navegação humana. Para volume alto ver a seção de concorrência: a primeira mudança seria
trocar para cursor sobre o índice `(created_at, id)`, que já existe.

## Test runner

**Decisão:** Vitest em todos os pacotes.

**Alternativas consideradas:** Jest no backend (padrão histórico do NestJS) e Vitest no
frontend.

**Por quê:** o NestJS 12 já gera projetos ESM com Vitest, e o Jest com ESM ainda depende de
flags experimentais. Um único runner significa uma configuração e uma API de testes para
todo o monorepo.
