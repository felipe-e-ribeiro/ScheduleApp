# ScheduleApp

App pessoal de lembretes (remédio, academia, etc): avisa pelo Telegram e a
confirmação pode ser feita tanto pelo link do Telegram quanto direto no
painel (sem depender do aviso ter chegado). Guarda histórico pra visão de
longo prazo (aderência, streak).

## Arquitetura

- **Backend**: Python + FastAPI + SQLModel + Alembic + Postgres.
- **Job**: mesmo código do backend, rodado via CLI (`python -m app.jobs.tick`).
  Em produção roda como `CronJob` do Kubernetes a cada 10–15 min; localmente
  roda manualmente (ver abaixo). É idempotente. Datas/horas de `Occurrence`
  são "naive" e representam hora local de `TIMEZONE` (ver comentário no topo
  de `app/jobs/tick.py`) — nunca misturar com `datetime` aware nessas contas.
- **Confirmação — dois caminhos pra mesma ação**:
  - **Telegram** (sem login): link assinado (HMAC, `itsdangerous`) mandado na
    notificação, resolvido em `/confirm` no frontend via
    `GET/POST /api/occurrences/confirm?occurrence=&token=`.
  - **Painel** (sessão de admin, sem token): pra quando você já resolveu
    antes do aviso chegar — `POST /api/occurrences/{id}/confirm`.
  - Os dois tem um "desfazer" simétrico (`/unconfirm`) contra clique sem
    querer, com janela de alguns segundos no frontend.
- **Admin**: usuário + senha fixos (`.env`), gera um cookie de sessão
  assinado (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).
- **Frontend**: React + Vite + TypeScript + Tailwind (mais CSS customizado
  pra estética "painel de instrumento"). Rotas: `/login`, `/medicacao`,
  `/treinos` (protegidas), `/confirm` (pública, via token).
- **Infra alvo**: OKE (Oracle Kubernetes Engine, free tier) + Postgres
  self-hosted no cluster.

Modelo de dados e fluxo do job documentados em `backend/app/models.py` e
`backend/app/jobs/tick.py`.

## Rodando localmente (Docker)

```bash
cp backend/.env.example backend/.env
# edite backend/.env: pelo menos ADMIN_USERNAME/ADMIN_PASSWORD e SECRET_KEY.
# TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID sao opcionais pra dev (sem eles o job
# falha ao tentar notificar, mas o resto funciona normalmente).

docker compose up -d --build
```

- API: http://localhost:8000 (docs interativos em `/docs`)
- Frontend (build de produção, via nginx): http://localhost:4173
- Postgres: `localhost:5432` (user/senha/db: `app`/`app`/`scheduleapp`)

Migrations rodam automaticamente no start do container `api`
(`alembic upgrade head`).

### Frontend em modo dev (hot-reload)

O container `frontend` do compose é o build de produção (nginx) — bom pra
testar o pacote final, mas sem hot-reload. No dia a dia, rode direto:

```bash
cd frontend
cp .env.example .env.local   # VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev                  # http://localhost:5173
```

`backend/.env` (`FRONTEND_BASE_URL`) já aponta pra `localhost:5173` — é o
domínio usado no CORS e nos links de confirmação gerados pelo job.

### Rodar o job manualmente (sem esperar o CronJob)

```bash
docker compose exec api python -m app.jobs.tick
```

### Gerar uma nova migration depois de mudar `app/models.py`

```bash
docker compose exec api alembic revision --autogenerate -m "descricao da mudanca"
```
> A pasta `backend/migrations` já está no host (COPY do Dockerfile), então o
> arquivo gerado fica só dentro do container — copie pro host com
> `docker cp <container>:/app/migrations/versions/<arquivo>.py backend/migrations/versions/`
> e adicione `import sqlmodel` no topo se o autogenerate não incluir (bug
> conhecido do combo Alembic+SQLModel).

### Fluxo de teste manual (sem Telegram configurado)

```bash
# login
curl -c cookies.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"<sua senha>"}'

# criar um habit
curl -b cookies.txt -X POST http://localhost:8000/api/habits \
  -H "Content-Type: application/json" \
  -d '{"name":"Remedio X","type":"medication","times":["08:00","20:00"]}'

# gerar ocorrencias + tentar notificar
docker compose exec api python -m app.jobs.tick

# ver hoje / stats
curl -b cookies.txt http://localhost:8000/api/occurrences/today
curl -b cookies.txt "http://localhost:8000/api/stats/habits/1?days=30"
```

Pra testar a confirmação via link sem um bot real do Telegram, gere um token
manualmente:

```bash
docker compose exec api python -c "
from app.auth import make_confirm_token
print(make_confirm_token(1))  # id da occurrence
"
```

E abra `http://localhost:5173/confirm?occurrence=1&token=<token>` no
frontend (ou chame `GET/POST /api/occurrences/confirm` direto na API).

## Status

- [x] Backend: models, migrations, API (auth, habits CRUD, confirm por token e por admin, unconfirm, today, stats), job de notificação/retry — testado via Docker Compose.
- [x] Frontend (React + Vite + Tailwind): login, dashboard por categoria (Medicação/Treinos) com CRUD de hábitos, confirmação direta + via link, desfazer, estados de loading/erro — testado ponta a ponta contra o backend real.
- [ ] Bot do Telegram real (BotFather) + variáveis de ambiente — token/chat_id já testados manualmente, faltam envs de produção.
- [ ] Manifests Kubernetes (Deployment, CronJob, Service, Ingress, Secrets) pro OKE.
