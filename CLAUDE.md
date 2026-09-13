# Pulso (ScheduleApp)

App pessoal de lembretes (remédio, treino, etc). Telegram avisa e insiste
(retry); a confirmação acontece pelo link do Telegram **ou** direto no
painel, sem depender do aviso ter chegado. Guarda histórico pra ver
aderência/streak ao longo do tempo.

Dono/único usuário: Felipe. Uso pessoal, single-tenant, sem multiusuário.

## Onde estamos

- **Backend**: completo e testado (FastAPI + SQLModel + Alembic + Postgres).
- **Frontend**: completo e testado (React + Vite + TS + Tailwind), rodando
  contra o backend real via Docker + navegador.
- **Falta**: variáveis de produção do bot do Telegram; cadastrar os
  secrets pendentes (`PULSE_INFRA_PAT` aqui, `HUB_DISPATCH_TOKEN` e
  `SECRET_CONTENT_PULSE` no `pulse-infra`/`oks-personal-infra`); resolver
  a `NetworkPolicy isolate-postgresql` que hoje bloqueia o pulse (ver
  `pulse-infra/README.md`).
- **Este repo não tem mais `Chart.yaml`/`values.yaml`** (removidos) —
  fica só código + `Dockerfile`s + CI de imagem
  (`.github/workflows/build-and-push.yaml`, builda `pulse-api`/
  `pulse-frontend` e comita a tag no repo `pulse-infra`, que precisou de
  um PAT próprio: secret `PULSE_INFRA_PAT` aqui).
- **Manifests Kubernetes**: vivem em
  [`pulse-infra`](https://github.com/felipe-e-ribeiro/pulse-infra)
  (gerado a partir do
  [`app-infra-template`](https://github.com/felipe-e-ribeiro/app-infra-template)),
  consumindo o chart compartilhado
  [`platform-chart`](https://github.com/felipe-e-ribeiro/personal-charts)
  (já publicado no GHCR, `oci://ghcr.io/felipe-e-ribeiro/charts`).
  ArgoCD/ingress-nginx/cert-manager **já estavam instalados** no
  `oks-personal` (descoberto durante a implementação, não precisou
  bootstrapar). Descoberta automática via `ApplicationSet` — sem
  `Application` escrita à mão. Design completo:
  `../personal-chard/docs/superpowers/specs/2026-09-12-vault-eso-applicationset-design.md`.
- **Postgres: não é mais self-hosted** (decisão revertida — ver abaixo).
  Usa a instância já existente do `comprasweb-prod`, banco `pulse`
  dedicado, criado sozinho pelo backend no startup
  (`backend/app/db_bootstrap.py`) — ver `pulse-infra/resources.yaml`.
- Design visual (protótipo interativo, referência de estética/UX antes do
  React existir): https://claude.ai/code/artifact/289897bc-851b-4a7b-a62e-73077231f3c0

## Decisões de arquitetura (e por quê)

- **Infra alvo: OKE (Oracle Kubernetes Engine, free tier)**, não AWS
  serverless — decidido porque o Felipe já mantém outro cluster OKE
  (ingress/TLS/monitoramento já pagos como custo operacional), então o
  incremento de rodar mais esse app ali é bem menor do que montar do zero
  um stack Lambda/DynamoDB/EventBridge. Ver histórico de conversa pra o
  raciocínio completo de custo/operação (praticamente free tier dos dois
  lados; o que decidiu foi esforço operacional marginal).
- **Postgres self-hosted, mas compartilhado com outro app** (revisão da
  decisão original de "self-hosted próprio" — nem isso, nem Oracle
  Autonomous DB): reaproveita a instância Postgres que já roda pro
  `comprasweb-prod`, banco `pulse` dedicado dentro dela. Evita subir mais
  um Postgres no cluster pessoal só pra esse app. Trade-off aceito:
  acopla o pulse ao ciclo de vida/credenciais daquele Postgres (ver
  `pulse-infra/README.md` pra pendência de rede ainda em aberto).
- **Confirmação tem dois caminhos** (mesma ação, credenciais diferentes):
  - Telegram → link com token HMAC assinado (`itsdangerous`), sem login.
  - Painel → sessão de admin (cookie), sem token — pra quando você já
    resolveu antes do aviso chegar.
  - Os dois têm "desfazer" simétrico e a trava de confirmação antecipada
    (ver abaixo).
- **Login usuário+senha fixos** (não multiusuário) — comparação em tempo
  constante (`hmac.compare_digest`).
- **`early_confirm_guard_hours`** por hábito (default 3h, 0 = desliga):
  bloqueia confirmar com muita antecedência (ex: marcar o remédio das 20h
  de manhã). Validado no backend (`425 Too Early`) e replicado no
  frontend pra feedback instantâneo sem round-trip.

## Convenção importante: datetime "naive local"

`Occurrence.scheduled_at`, `last_notified_at` e `confirmed_at` são
**datetimes sem timezone** que representam hora local de `settings.timezone`
(America/Sao_Paulo) por convenção — não UTC, não aware. Isso é deliberado
(app de fuso único, evita a complexidade de converter/exibir timezone) mas
é fácil de misturar sem perceber:

- **Nunca** faça aritmética entre um `datetime.now(TZ)` (aware) e um valor
  vindo do banco (naive) — já causou um bug real (`TypeError` na segunda
  execução do job). Sempre use `datetime.now(TZ).replace(tzinfo=None)`
  pros cálculos em Python.
- No frontend, esses ISO strings são interpretados como hora local do
  navegador (`new Date(iso)`) — funciona porque assumimos navegador e
  backend no mesmo fuso.
- Ver comentário completo em `backend/app/jobs/tick.py` (topo do arquivo).

## Comandos

```bash
# stack completa (db + api + frontend de producao via nginx)
docker compose up -d --build

# frontend com hot-reload (dia a dia)
cd frontend && npm install && npm run dev   # localhost:5173

# rodar o job manualmente (sem esperar o CronJob)
docker compose exec api python -m app.jobs.tick

# nova migration depois de mudar app/models.py
docker compose exec api alembic revision --autogenerate -m "descricao"
# ⚠️ o arquivo gerado fica só dentro do container (nao ha bind mount) --
# precisa copiar pro host e REBUILDAR a imagem antes de subir de novo:
docker cp <container>:/app/migrations/versions/<arquivo>.py backend/migrations/versions/
docker compose build api && docker compose up -d api
# e conferir se tem "import sqlmodel" no topo (autogenerate as vezes
# esquece -- bug conhecido do combo Alembic+SQLModel)
```

Login local: `admin` / senha em `backend/.env` (`ADMIN_PASSWORD`).

Detalhes completos (portas, fluxo de teste manual, gerar token de
confirmação sem bot real) estão no `README.md`.

## Armadilhas já pisadas nessa sessão (não repetir)

1. **Rebuild esquecido**: qualquer mudança em `backend/app/` só existe no
   container depois de `docker compose build api` — não há bind mount de
   código, só de dados. Migration gerada + esquecimento de rebuild =
   `UndefinedColumn`/schema desatualizado.
2. **`tsc -b` emitindo no lugar errado**: sem `outDir` no
   `tsconfig.node.json`, ele gera `vite.config.js`/`.d.ts`/`.tsbuildinfo`
   direto no `frontend/`. Já corrigido (outDir aponta pra
   `node_modules/.tsc-out`), e `*.tsbuildinfo` está no `.gitignore` — mas
   se aparecer de novo como stray file, é isso.
3. **Arquivo commitado antes do `.gitignore` ficar certo continua
   rastreado** mesmo depois de ignorado — precisa `git rm --cached`.
   (Foi o caso do `frontend/tsconfig.tsbuildinfo`.)

## Estrutura

```
backend/app/
  models.py           Habit, Occurrence (SQLModel)
  jobs/tick.py         job idempotente: gera ocorrencias do dia, notifica,
                        retry, fecha ocorrencias vencidas como "missed"
  routers/
    auth.py            login/logout/me
    habits.py           CRUD (soft-delete via active=false)
    occurrences.py       confirmar/desfazer (token e admin), today, trava
    stats.py            streak/aderencia/heatmap por habito
  telegram.py           envio via Bot API (so envio, sem webhook)

frontend/src/
  pages/                LoginPage, DashboardPage (Medicacao/Treinos via
                         rota /:category), ConfirmPage
  components/           HabitCard, HabitModal, ChannelNav, TopNav,
                         Heatmap, AlarmModal, ProtectedRoute
  context/               AuthContext, ToastContext (toast com desfazer)
  lib/                   api.ts (fetch client), types.ts, format.ts,
                         heatmap.ts, alarm.ts (beep sintetizado)
```

## Próximos passos sugeridos

1. Variáveis de produção do bot do Telegram (token/chat_id já testados
   manualmente em dev).
2. Cadastrar os secrets pendentes: `PULSE_INFRA_PAT` aqui (PAT
   fine-grained, escrita só no `pulse-infra`); `HUB_DISPATCH_TOKEN` no
   `pulse-infra` (escrita/leitura de Actions só no `oks-personal-infra`);
   `SECRET_CONTENT_PULSE` no `oks-personal-infra` (JSON dos segredos reais
   — inclui a `DATABASE_URL` do Postgres compartilhado).
3. Resolver a `NetworkPolicy isolate-postgresql` (gerida pelo
   `checklist-compras-infra`) — hoje bloqueia o pulse por padrão, ajuste
   adiado por decisão explícita (ver `pulse-infra/README.md`).
4. Testar `backend/app/db_bootstrap.py` (criação automática do banco
   `pulse`) contra um Postgres real antes do primeiro deploy — só validado
   por leitura de código nesta sessão (Docker indisponível no ambiente).
