# Systatus Live — Back-end

API de monitoramento de serviços como SaaS — gerencia monitores, incidentes, páginas de status públicas, assinaturas e notificações multicanal.

## Stack Tecnológica

| Tecnologia | Versão | Papel no Projeto |
|---|---|---|
| Node.js | 24.x | Runtime da aplicação |
| TypeScript | 5.9 | Linguagem principal |
| NestJS | 11.x | Framework HTTP com injeção de dependências, guards e decorators |
| TypeORM | 0.3 | ORM e gerenciamento de migrações |
| PostgreSQL | — | Banco de dados relacional |
| JWT (@nestjs/jwt) | 11.x | Autenticação via token |
| Bcrypt | 5.x | Hash de senhas |
| Helmet | 8.x | Cabeçalhos de segurança HTTP |
| @nestjs/schedule | 6.x | Agendamento de tarefas (cron jobs) |
| @nestjs/throttler | 6.x | Rate limiting por rota |
| Stripe | 20.x | Gateway de pagamentos e gerenciamento de assinaturas |
| Google Auth Library | 9.x | Autenticação social via Google OAuth 2.0 |
| Axios | 1.x | Cliente HTTP para integrações externas |
| Moment Timezone | 0.6 | Manipulação de datas com suporte a timezone |
| PDFMake | 0.2 | Geração de relatórios em PDF |
| Ping | 0.4 | Verificação de disponibilidade de hosts (HTTP/ICMP) |
| Vercel Blob | 2.x | Armazenamento de arquivos (avatares) |
| Docker | — | Containerização da aplicação |

---

## Arquitetura e Estrutura de Pastas

```text
src/
├── main.ts                        # Ponto de entrada — configura prefixo global, versionamento, helmet e filtros
├── app.module.ts                  # Módulo raiz — registra TypeORM, JWT, throttler e módulos de domínio
├── app.controller.ts              # Controller raiz (health check e rotas públicas de página de status)
├── http-exception.filter.ts       # Filtro global de exceções HTTP
├── controllers/                   # Controladores organizados por domínio
├── services/                      # Regras de negócio e integrações externas
├── middlewares/                   # Guards de autenticação e autorização
├── modules/                       # Módulos NestJS de domínio
├── database/
│   ├── entities/                  # Entidades TypeORM (modelos de dados)
│   ├── migrations/                # Migrações de schema e seeds de dados iniciais
│   └── dataSource.ts              # Configuração do DataSource para CLI do TypeORM
├── types/                         # Enums e DTOs de domínio
├── utils/                         # Funções utilitárias
└── assets/
    └── mail/                      # Templates HTML para e-mails transacionais
```

---

## Padrões e Convenções Técnicas

### Idioma do Código

Código e nomes de identificadores em inglês. Comentários, mensagens de erro, commits e textos de interface em português (PT-BR).

### Estilo de Código e Nomenclaturas

| Elemento | Convenção | Exemplo |
|---|---|---|
| Arquivo | kebab-case com sufixo de camada | `auth.controller.ts`, `monitor.service.ts` |
| Classe | PascalCase com sufixo obrigatório | `AuthGuard`, `StripeService`, `MonitorEntity` |
| Sufixos de camada | `Controller`, `Service`, `Entity`, `Guard`, `Module`, `Enum`, `DTO` | — |
| Variáveis e funções | camelCase | `generateJWT()`, `hasPermission()`, `loggedUser` |
| Enums | PascalCase com sufixo `Enum`; valores em `UPPER_SNAKE_CASE` ou sigla | `SubscriptionStatusEnum`, `PersonTypeEnum` |
| DTOs | PascalCase com sufixo `DTO` | `SignInOptionsDTO`, `UpdateUserDTO` |

### Padrão de Dados (TypeORM)

| Aspecto | Convenção |
|---|---|
| Nomes de tabelas | `snake_case` no plural (ex: `users`, `monitors`, `status_pages`) |
| Tabelas históricas | Sufixo `_historical` (ex: `monitor_historical`, `auth_historical`) |
| Tabelas associativas | Formato `{entidade_a}_{entidade_b}s` (ex: `plan_permissions`, `monitor_integrations`) |
| Colunas | `snake_case` (ex: `created_at`, `stripe_customer_id`, `accepted_terms`) |
| Chaves primárias | `id` — UUID v4 gerado automaticamente |
| Chaves estrangeiras | `{entidade_singular}_id` (ex: `user_id`, `monitor_id`, `plan_id`) |
| Timestamps | `created_at` e `updated_at` com tipo `TIMESTAMPTZ`, gerenciados pelo TypeORM |
| Flags booleanas | Nome descritivo sem prefixo (ex: `verified`, `active`, `accepted_terms`) |
| Sincronização | Desabilitada (`synchronize: false`) — toda alteração de schema via migrations |
| Execução de migrations | Automática na inicialização (`migrationsRun: true`) |

---

## Rotas e Segurança

### Roteamento

Todas as rotas são versionadas via URI. O prefixo global `/v1` é configurado em `main.ts` usando `VersioningType.URI` do NestJS. Cada controller declara `{ version: "1", path: "/recurso" }`, resultando no padrão `/v1/{recurso}`.

### Autenticação e Autorização

- **Mecanismo:** JWT via header `Authorization: Bearer {token}`.
- **Guard principal:** `AuthGuard` — valida o token JWT, busca o usuário no banco e executa uma cadeia de verificações: existência do usuário → e-mail verificado → assinatura ativa ou em trial. Em caso de falha em qualquer etapa, lança `UnauthorizedException` ou `ForbiddenException` com mensagens descritivas.
- **Injeção de contexto:** Após validação bem-sucedida, o guard injeta `loggedUser`, `loggedSubscription` e `loggedPlan` no objeto de requisição para uso nas camadas subsequentes.
- **Verificação de e-mail:** Usuários com `verified = false` recebem resposta HTTP 403 com a flag `needVerifyFlow`, sinalizando ao cliente que o fluxo de confirmação por código OTP (6 dígitos) deve ser iniciado.
- **Controle de acesso por plano:** Permissões são verificadas via `hasPermission(planId, permission)` e `assertPermission(planId, permission, message)`, consultando a tabela associativa do plano antes de executar operações restritas.
- **Rate limiting:** `@nestjs/throttler` aplicado globalmente; rotas específicas utilizam `@SkipThrottle()` para contornar o limite (ex: verificação de token).
- **Segurança de senhas:** Hash com bcrypt; dados sensíveis cifrados com chave configurada via `ENCRYPT_KEY`.

---

## Conexões e Integrações Externas

| Serviço | Finalidade |
|---|---|
| **Stripe** | Gateway de pagamentos — gerencia customers, checkout sessions, subscriptions e processamento de webhooks de cobrança |
| **Google OAuth 2.0** | Autenticação social — valida tokens de identidade do Google para login sem senha |
| **Resend** | Envio de e-mails transacionais (confirmação de conta, recuperação de senha, suporte) com templates HTML |
| **Geoapify** | Geolocalização por IP — enriquece o histórico de autenticação com cidade, estado e país |
| **Vercel Blob** | Armazenamento de avatares dos usuários com acesso público |
| **WhatsApp Business API** | Envio de notificações de incidentes via templates de mensagem |
| **Cloudflare Turnstile** | Proteção de formulários públicos contra bots (substituto do reCAPTCHA) |

---

## Ambiente e Configurações (Environment)

Crie o arquivo `.env` a partir do `.env.template`:

```env
# Banco de Dados
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_NAME=
TYPEORM_ENTITIES=
TYPEORM_MIGRATIONS=
QUERY_SIZE=50

# Autenticação
JWT_KEY=
ENCRYPT_KEY=

# Aplicação
ENV=DEV
PORT=
WEB_URL=

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=

# E-mail (Resend)
RESEND_API_URL=https://api.resend.com
RESEND_API_KEY=

# Pagamentos (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_ANDORINHA=
STRIPE_PRICE_ID_CORUJA=
STRIPE_PRICE_ID_AGUIA=

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_KEY=

# Geolocalização
GEOAPIFY_API_KEY=

# Storage
VERCEL_VERCEL_BLOB_READ_WRITE_TOKEN=
```

---

## Execução e Comandos Úteis

### Desenvolvimento local

```bash
npm ci
npm run dev
```

O comando `dev` inicia o servidor com `nest start --debug --watch`, habilitando hot-reload e modo de depuração.

### Containerização e CI/CD

O projeto possui um `Dockerfile` com build multistágio (dependências → compilação → runner de produção com usuário não-root) e um `docker-compose.yml` para orquestração local. O container de produção executa diretamente o artefato compilado via `node dist/main.js`.

### Comandos customizados

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor em modo de desenvolvimento com hot-reload |
| `npm run build` | Compila o TypeScript para `dist/` via SWC |
| `npm run start` | Inicia a aplicação compilada (produção) |
| `npm run typeorm migration:generate -- ./src/database/migrations/nome-migration -d ./src/database/dataSource.ts` | Gera uma migration com base nas diferenças entre entidades e schema |
| `npm run typeorm migration:create -- ./src/database/migrations/nome-migration` | Cria uma migration vazia |
| `npm run typeorm migration:run -- -d ./src/database/dataSource.ts` | Executa as migrations pendentes manualmente |
