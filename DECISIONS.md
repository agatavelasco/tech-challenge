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

## Formato dos eventos

**Decisão:** envelope comum `{ eventId, type, version, occurredAt, payload }`, em JSON,
validado com zod no consumidor. A chave da mensagem no Kafka é o `transactionExternalId`.
Payloads mínimos: `transaction.created` leva `{ transactionExternalId, value }` e
`transaction.status.updated` leva `{ transactionExternalId, status }`, com `status` restrito
a `approved` ou `rejected`.

**Alternativas consideradas:** payload "cru" sem envelope; evento com a transação completa
(event-carried state transfer); Avro ou Protobuf com schema registry.

**Por quê:**

- **`eventId`** identifica cada evento para deduplicação e rastreio.
- **`version`** permite evoluir o payload sem quebrar quem consome a versão anterior.
- **`occurredAt`** separa o momento do fato do momento da entrega.
- **Chave = transação:** todos os eventos de uma transação caem na mesma partição, então
  chegam em ordem.
- **Payload mínimo:** o antifraude só precisa do valor. Enviar a transação inteira
  acoplaria o consumidor ao modelo da API sem necessidade.
- **JSON + zod em vez de Avro/Protobuf:** com produtores e consumidores em TypeScript no
  mesmo repositório, o pacote `contracts` dá a mesma garantia em compilação. Com
  serviços em outras linguagens ou times independentes, um schema registry com regras de
  compatibilidade passaria a valer o custo.

## Tratamento de falha na mensageria

**Decisão:** outbox transacional na publicação, consumidores idempotentes, nova tentativa
para falha transitória e dead letter para mensagem inválida.

- **Publicação (outbox):** a transação e o evento são gravados na mesma transação do banco.
  Um relay trava lotes pendentes com `FOR UPDATE SKIP LOCKED`, publica no Kafka com
  producer idempotente e `acks = -1` e só então marca como publicados. Com o Kafka fora, a
  API continua aceitando transações; os eventos saem quando o broker volta.
- **Consumo:** falha transitória (ex.: banco fora) sobe como erro, o offset não é
  confirmado e o Kafka entrega de novo. Mensagem que não passa na validação vai para
  `<tópico>.dlq` com o motivo e o conteúdo original, e o consumo segue.
- **Idempotência:** a entrega é pelo menos uma vez. A API só muda status
  `WHERE status = 'pending'`, então resultado repetido ou atrasado não sobrescreve o já
  gravado; o antifraude é determinístico, então reavaliar dá o mesmo resultado.
- **Subida resiliente:** os serviços sobem o HTTP primeiro e esperam o Kafka com backoff
  exponencial, em vez de cair.

**Alternativas consideradas:** publicar direto após o commit; publicar dentro da transação
do banco; reconciliação periódica das transações pendentes; Debezium (CDC) lendo o outbox;
tópicos de retry com atraso.

**Por quê:** publicar depois do commit perde o evento se o processo cair entre o commit e o
envio, e a transação fica pendente para sempre. Publicar antes do commit pode anunciar uma
transação que depois sofre rollback. O outbox elimina as duas janelas com o próprio banco.
A reconciliação de pendentes funcionaria para este fluxo, mas depende de o estado permitir
reconstruir o evento, o que não vale para eventos futuros. O Debezium seria o passo
seguinte para volume alto (sem polling), mas exige Kafka Connect só para isso. Tópicos de
retry com atraso fazem sentido quando a falha transitória é frequente; aqui, reprocessar na
própria partição mantém a ordem por transação, que é mais importante.

**Custo assumido:** o relay mantém uma transação do banco aberta durante o envio ao Kafka
(lotes pequenos e timeout limitam o impacto) e adiciona até um intervalo de polling
(500 ms) de latência.

## Cliente Kafka

**Decisão:** transporte Kafka do `@nestjs/microservices` para consumir e `kafkajs` para
publicar, encapsulado no pacote `messaging`.

**Alternativas consideradas:** `@confluentinc/kafka-javascript` (cliente oficial da
Confluent, baseado em librdkafka).

**Por quê:** o transporte do Nest dá ciclo de vida, deserialização e roteamento por tópico
prontos, e é o que o time NestJS espera encontrar. O risco é o `kafkajs` estar sem releases
desde 2023. O cliente da Confluent é mantido e oferece uma API compatível com a do kafkajs,
então a troca fica concentrada no pacote `messaging` e na configuração do transporte; é a
primeira mudança que eu faria antes de ir para produção.

## Estratégia de testes

**Decisão:** três camadas, todas no `pnpm quality` e no CI.

| Camada     | Ferramenta                      | O que cobre                                                                                      |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Unidade    | Vitest + repositório em memória | regras: limite de 1000, idempotência, validação dos contratos, dead letter                       |
| HTTP       | Vitest + supertest              | contrato da API: status, formato e erros por campo                                               |
| Integração | Vitest + Testcontainers         | Postgres e Kafka reais: migrations, atomicidade do outbox, concorrência do relay, fluxo completo |

**Alternativas consideradas:** só testes unitários com mocks; banco e broker em memória;
integração contra o docker-compose de desenvolvimento.

**Por quê:** as garantias mais importantes deste sistema — atomicidade, `SKIP LOCKED`,
`CHECK` do banco, entrega no Kafka — só existem na infraestrutura real; um mock as faria
passar por definição. Os testes de unidade continuam rápidos e cobrem as regras de negócio
sem depender de container. O Testcontainers cria e destrói o ambiente a cada execução,
então o resultado não depende do estado de um compose local, e o CI roda exatamente o mesmo
teste. As imagens são as mesmas do `docker-compose.yml`.
