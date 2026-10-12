# Decisões

Registro das decisões estruturantes do projeto. Cada uma traz o que foi decidido, o que mais
foi considerado e por quê.

- **Projeto:** [organização](#organização-do-projeto) ·
  [cache do Turborepo no CI](#cache-do-turborepo-no-ci) ·
  [versão do TypeScript](#versão-do-typescript) ·
  [ferramentas de qualidade](#ferramentas-de-qualidade) ·
  [política de dependências](#política-de-dependências)
- **Backend:** [contrato e validação](#contrato-compartilhado-e-validação) ·
  [modelagem de dados](#modelagem-de-dados) · [paginação](#paginação-da-listagem) ·
  [autenticação](#autenticação)
- **Mensageria:** [formato dos eventos](#formato-dos-eventos) ·
  [falha na mensageria](#tratamento-de-falha-na-mensageria) · [cliente Kafka](#cliente-kafka)
- **Frontend:** [status na interface](#atualização-do-status-na-interface) ·
  [camada de dados](#camada-de-dados-do-frontend) · [BFF](#backend-for-frontend) ·
  [validação do formulário](#validação-do-formulário)
- **Testes e entrega:** [test runner](#test-runner) · [estratégia](#estratégia-de-testes) ·
  [ponta a ponta](#testes-ponta-a-ponta) · [containers](#containers)
- **[Volume alto de escritas e leituras concorrentes](#volume-alto-de-escritas-e-leituras-concorrentes)**

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

## Atualização do status na interface

**Decisão:** polling com TanStack Query a cada 3 segundos, **apenas enquanto houver
transação pendente na tela** (na listagem, na página visível; no detalhe, a própria
transação). Quando nada está pendente, o polling para. Uma região `aria-live` anuncia as
atualizações para leitores de tela.

**Alternativas consideradas:** Server-Sent Events; WebSocket; polling contínuo; botão
"atualizar" manual.

**Por quê:** o antifraude responde em segundos e a transação só muda de estado uma vez
(pendente → aprovada/rejeitada). Polling condicionado resolve com zero infraestrutura nova:
nenhuma conexão persistente, nada a escalar no servidor, funciona atrás de qualquer proxy e
herda cache, deduplicação e reconexão do React Query. O custo é latência de até 3s e
requisições enquanto há pendentes — aceitável para o volume de uma tela de backoffice. Com
muitas transações pendentes simultâneas ou exigência de tempo real, SSE passaria a valer:
a API emitiria o evento ao consumir `transaction.status.updated`, e o polling viraria
fallback. WebSocket seria excessivo para comunicação em um só sentido.

**Quando algo cai:** se uma transação continua pendente por mais de 15 segundos (o normal
são poucos segundos), a tela avisa que o serviço de análise pode estar indisponível ou
voltando ao ar, que a transação está registrada e que não é preciso criá-la de novo — para
o usuário não duplicar a operação por impaciência. Se a própria API não responde (rede ou
5xx), a tela troca o erro genérico por "serviço temporariamente indisponível" e tenta
reconectar sozinha a cada 5 segundos, sem exigir clique nem recarregar a página. Erros 4xx
não são retentados, porque não se resolvem com o tempo.

## Camada de dados do frontend

**Decisão:** TanStack Query para todo estado vindo do servidor; filtros e página na URL;
nenhum store global.

**Alternativas consideradas:** Context API guardando as transações; `useEffect` + `useState`
por tela; Redux.

**Por quê:** guardar dados do servidor num Context obriga a reimplementar cache,
invalidação, loading e erro em cada tela — e não dá polling nem nova tentativa. O React
Query resolve isso por chave de consulta, e invalidar `['transactions']` após criar
atualiza listagem e detalhe. Filtros na URL tornam a busca compartilhável, preservada pelo
botão voltar e testável sem estado escondido; URL editada à mão com valor inválido vira
"sem filtro" em vez de quebrar a tela.

## Backend for frontend

**Decisão:** o navegador chama apenas `/api/*` no próprio Next; um route handler encaminha
para a API de transações, cujo endereço (`TRANSACTIONS_API_URL`) existe só no servidor.

**Alternativas consideradas:** navegador chamando a API direto, com CORS e
`NEXT_PUBLIC_API_URL`; `rewrites` do Next.

**Por quê:** a autenticação guarda o token em cookie `httpOnly`, que o JavaScript do
navegador não lê — alguém no servidor precisa transformá-lo em `Authorization`, e o route
handler é esse ponto. De quebra: a API não precisa ser exposta publicamente, não há CORS, e
falha de rede vira um 502 com mensagem legível. `rewrites` encaminharia, mas sem lugar para
essa lógica.

## Validação do formulário

**Decisão:** react-hook-form com `zodResolver(createTransactionSchema)` — o mesmo schema da
API. Erros por campo devolvidos pela API (ex.: tipo inexistente) são aplicados ao campo
correspondente.

**Alternativas consideradas:** validação manual por campo; yup com schema próprio do
frontend.

**Por quê:** uma regra, um lugar: "valor positivo com até duas casas" e "contas distintas"
valem igual no formulário e na API. O que só o servidor sabe validar volta no mesmo formato
(`errors.campo`), então a interface trata os dois casos do mesmo jeito.

**Campo de valor com máscara de moeda:** a pessoa digita só números, preenchidos a partir
dos centavos (`150075` → R$ 1.500,75), no padrão dos apps de banco. Um campo numérico do
navegador aceita "1.000" e "1,000" com significados diferentes conforme o idioma; com a
máscara, não há ambiguidade entre ponto e vírgula. A máscara vive só na interface: o
formulário guarda e envia `number`, e a validação continua sendo a do schema. Sem
biblioteca: a formatação usa o `Intl.NumberFormat` do próprio navegador.

## Política de dependências

**Decisão:** manter a idade mínima de release do pnpm ativa; quando uma versão é recente
demais, fixar a anterior (ex.: `react-hook-form ~7.89`) em vez de abrir exceção. Scripts de
instalação bloqueados por padrão e liberados um a um (`allowBuilds`).

**Alternativas consideradas:** aceitar a exceção sugerida pelo pnpm; liberar todos os
scripts de instalação.

**Por quê:** ataques de cadeia de suprimentos costumam ser publicados e removidos em
poucas horas — a janela que a política cobre. Scripts de instalação são o principal vetor
desses ataques; cada liberação é explícita e justificada no `pnpm-workspace.yaml`.

## Containers

**Decisão:** um Dockerfile multi-stage por app, com `turbo prune --docker` para recortar o
monorepo e `pnpm deploy --prod` (Nest) ou a saída `standalone` (Next) na imagem final, que
roda como usuário não-root. Migrations rodam num serviço `migrate` de execução única,
antes da API subir. Healthchecks em `/health` (a da API consulta o banco) encadeiam a ordem
de subida.

**Alternativas consideradas:** imagem única com o monorepo inteiro; rodar
`prisma migrate deploy` no start da API; `container_name` fixo como no compose original.

**Por quê:**

- **`turbo prune`:** a camada de dependências depende só do lockfile recortado, então
  muda pouco e fica em cache.
- **Imagem final enxuta:** leva só o necessário para rodar (~290–390 MB contra 1,6 GB do
  estágio de build) e não carrega o CLI do Prisma nem ferramentas de desenvolvimento.
- **Migration separada:** com várias réplicas da API, migrar no start faria cada uma
  disputar a mesma migration. O serviço `migrate` roda uma vez e a API só sobe quando ele
  termina com sucesso.
- **Sem `container_name` fixo:** nome fixo impede duas cópias da stack ao mesmo tempo. Sem
  ele, o e2e sobe um projeto isolado (`tech-challenge-e2e`, portas próprias) enquanto o
  ambiente de desenvolvimento continua no ar.
- **Portas configuráveis:** todas as portas do host vêm do ambiente, com os padrões do
  enunciado.

## Testes ponta a ponta

**Decisão:** Playwright contra a stack completa em containers, criada num projeto compose
isolado e destruída ao final (inclusive em falha). Roda como última etapa do
`pnpm quality`, depois que lint, tipos, testes e build passaram.

**Alternativas consideradas:** e2e contra os apps em `pnpm dev`; Cypress; não ter e2e.

**Por quê:** é o único teste que prova o requisito central de ponta a ponta: a transação
nasce pendente e muda de status na tela, sem recarregar, depois de passar por API, outbox,
Kafka, antifraude e consumidor. Rodar contra as imagens de produção também valida os
Dockerfiles e o compose que o README manda usar. Ficar por último evita gastar minutos
subindo containers quando uma verificação barata já falhou. O Playwright foi escolhido pela
consulta por papel acessível (`getByRole`), a mesma usada nos testes de componente.

## Autenticação

**Decisão:** JWT (HS256) emitido pela API em `POST /auth/login`, exigido por um guard
global — toda rota nasce protegida e só `/auth/login` e `/health` são `@Public()`. Senhas
com scrypt do `node:crypto`. No frontend, o token vive num cookie `httpOnly`: o route handler
de login o grava, o BFF o transforma em `Authorization: Bearer` e o `proxy.ts` do Next manda
para o login quem chega sem cookie. Um usuário de demonstração é criado na subida a partir
de `DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD`.

**Alternativas consideradas:** token em `localStorage` enviado pelo navegador; sessão
stateful no banco/Redis; NextAuth (Auth.js); argon2 ou bcrypt; cadastro de usuários.

**Por quê:**

- **Cookie `httpOnly` em vez de `localStorage`:** o script da página não lê o token, então
  um XSS não o exfiltra. `SameSite=Lax` cobre CSRF nas mutações, que são todas POST
  same-origin via BFF.
- **JWT em vez de sessão no servidor:** a API valida sem consultar banco a cada requisição
  e continua stateless para escalar horizontalmente. O custo é não revogar um token antes
  de expirar — mitigado pela validade curta (1h). Com requisito de logout imediato em
  todos os dispositivos, uma lista de revogação ou sessão no Redis entraria.
- **Guard global (negar por padrão):** esquecer o decorator numa rota nova a deixa
  fechada, não aberta. O guard ignora contextos não-HTTP, porque os consumidores Kafka do
  app híbrido passam pelos mesmos guards e não carregam token.
- **scrypt do `node:crypto`:** algoritmo recomendado pela OWASP sem dependência nativa (o
  argon2 exigiria liberar script de instalação e compilar no container). Os parâmetros
  ficam gravados junto do hash, então o custo pode subir sem invalidar senhas antigas.
- **Login sem vazamento:** e-mail inexistente e senha errada devolvem a mesma mensagem e
  pagam o mesmo custo de hash, para não revelar quais e-mails existem. O `next` do login só
  aceita caminhos internos, evitando redirecionamento aberto.
- **Sem NextAuth:** a fonte de verdade da identidade é a API; o Next só guarda e repassa o
  token, o que cabe em dois route handlers.
- **Fora do escopo:** cadastro, recuperação de senha e papéis. O usuário de demonstração
  existe para quem clona conseguir entrar sem perguntar nada.

## Volume alto de escritas e leituras concorrentes

> A aplicação pode precisar lidar com um volume alto de escritas e leituras concorrentes.
> Como você abordaria esse requisito?

**Primeiro, medir.** Antes de mudar a arquitetura, um teste de carga (k6, por exemplo)
com o perfil real — proporção de criação × listagem × detalhe, quantos usuários com
transações pendentes fazendo polling — para saber qual recurso satura primeiro: conexões
do Postgres, CPU da API, lag do consumidor ou I/O do banco. Cada item abaixo resolve um
gargalo diferente; aplicar todos de saída seria custo sem evidência.

### O que a arquitetura atual já permite

- **API e antifraude são stateless:** escalam horizontalmente atrás de um balanceador, e
  o JWT valida sem consultar o banco.
- **Escrita curta:** criar uma transação é um `INSERT` na transação e outro no outbox,
  numa única transação do banco, sem esperar o Kafka. Com UUIDv7, as inserções vão para o
  fim do índice em vez de espalhar páginas pela B-tree.
- **Relay concorrente:** `FOR UPDATE SKIP LOCKED` deixa várias instâncias publicarem o
  outbox em paralelo, sem bloqueio entre elas e sem evento duplicado.
- **Atualização de status sem contenção:** cada transação muda de status uma única vez, e o
  `UPDATE ... WHERE status = 'pending'` resolve corridas sem lock explícito. Entrega
  repetida vira no-op.
- **Kafka particionado por transação:** a partição é a unidade de paralelismo. Mais
  partições e mais instâncias do consumidor (até uma por partição) aumentam a vazão, e a
  ordem por transação continua garantida pela chave.

### Escritas

1. **Pool de conexões:** com muitas réplicas da API, o limite de conexões do Postgres chega
   antes da CPU. Um PgBouncer em modo transação na frente do banco, e o pool do Prisma
   dimensionado por instância.
2. **Consumo em lote:** trocar o processamento mensagem a mensagem por `eachBatch`,
   aplicando os status com um único `UPDATE ... FROM (VALUES ...)` por lote. Menos idas ao
   banco por evento.
3. **Outbox sem polling:** com volume alto, o polling vira carga constante no banco.
   Debezium lendo o WAL (CDC) publica o outbox sem consultas, com latência menor.
4. **Particionamento por tempo:** `transactions` e `outbox_events` particionadas por mês.
   Os índices de cada partição continuam pequenos, e a retenção vira `DROP PARTITION` em
   vez de `DELETE`.
5. **Idempotência na criação:** sob carga, o cliente faz retry por timeout. Um header
   `Idempotency-Key` com restrição única evita transações duplicadas quando a primeira
   tentativa na verdade deu certo.
6. **Proteção da entrada:** rate limiting por usuário na API e limites de lag no
   consumidor, para a sobrecarga degradar devagar em vez de derrubar tudo.

### Leituras

1. **Paginação por cursor:** `OFFSET` fica mais caro quanto mais fundo a página. Keyset
   sobre `(created_at, id)` — o índice já existe — tem custo constante. O `COUNT(*)` do
   total também pesa em tabelas grandes; pode virar contagem aproximada ou ser
   dispensado (o dashboard mostraria "próxima página" em vez do total).
2. **Réplicas de leitura:** listagem e detalhe lendo de réplicas, a escrita no primário.
   A interface já lida com o status chegando de forma assíncrona, então o atraso de
   replicação (normalmente milissegundos) não muda a experiência.
3. **Cache de transações resolvidas:** depois de aprovada ou rejeitada, a transação nunca
   mais muda. O detalhe dela pode ter cache longo (Redis, ou HTTP com `ETag`); só as
   pendentes precisam de dados frescos.
4. **Modelo de leitura separado (CQRS):** se o dashboard crescer em filtros e agregações,
   uma projeção alimentada pelos próprios eventos do Kafka (outra tabela, Elasticsearch ou
   ClickHouse) tira as consultas analíticas do banco transacional.
5. **Fim do polling:** com muitos usuários olhando pendentes, o polling multiplica as
   leituras. A API passaria a emitir o resultado por SSE assim que consumisse
   `transaction.status.updated`, e o polling ficaria só como fallback.

### Ordem em que eu faria

Pool de conexões e paginação por cursor primeiro: são baratos e atacam os gargalos mais
prováveis. Depois réplicas de leitura e cache das resolvidas. Consumo em lote,
particionamento e CDC quando a medição mostrar que a escrita ou o outbox são o limite.
CQRS só com demanda real de consultas que o modelo transacional não atende.

## Identidade visual

**Decisão:** magenta BIUD (`#D81656`, a cor do logo) como cor de marca e de ação — botões
principais, foco, links e cabeçalho —, nunca como cor de status. Status com paleta própria e
sempre acompanhados de ícone e texto: âmbar (pendente), verde (aprovada), vermelho
(rejeitada). Tipografia Figtree servida pelo próprio app (`next/font`), números tabulares em
valores e datas, ícones da Lucide. A passagem de pendente para concluída é uma transição:
a linha do tempo do detalhe preenche o trecho final na cor do resultado, e o badge anima
apenas quando o status muda diante de quem está olhando. Tudo respeita
`prefers-reduced-motion`.

**Alternativas consideradas:** biblioteca de componentes pronta (shadcn/ui, MUI); status
nas cores da marca; ilustrações em vez de ícones.

**Por quê:** a mudança é só visual — textos, papéis acessíveis e comportamento seguem
iguais, e a suíte de testes passou sem nenhuma alteração. Trocar de biblioteca de
componentes mudaria a estrutura do frontend sem ganho para o requisito. O vermelho de
"rejeitada" é próximo do magenta da marca; manter a marca fora dos status e diferenciar por
ícone evita que um botão pareça um erro (ou o contrário) e não depende só de cor, o que
também atende quem tem deficiência na percepção de cores.
