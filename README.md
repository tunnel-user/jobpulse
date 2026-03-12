# Job Pulse

Aggregatore di offerte di lavoro IT con scraping automatizzato, API REST real-time e interfaccia web moderna. Raccoglie annunci da più portali italiani (DataPizza, Rete Informatica…), li persiste su MongoDB e li espone tramite un'API Elysia con aggiornamenti live via WebSocket.

---

## Architettura

```
job-pulse/
├── docker-compose.yml          # Orchestrazione completa stack
├── .env.example                # Template per sviluppo locale
├── README.md                   # Questo file
├── server/                     # Backend API + Scraper
│   ├── Dockerfile
│   ├── api.ts                 # Entry-point API (Elysia + WebSocket)
│   ├── index.ts               # Entry-point scraper
│   ├── db.ts                  # Connessione MongoDB
│   ├── redis.ts               # Client Redis + helpers
│   ├── types.ts               # Tipi TypeScript condivisi
│   ├── utils.ts               # Logger colorato
│   ├── package.json
│   ├── tsconfig.json
│   └── connectors/            # Connettori scraping
│       ├── datapizza.ts
│       └── reteinformatica.ts
└── client/                     # Frontend Next.js
    ├── Dockerfile
    ├── next.config.ts
    ├── package.json
    └── app/                   # App Router Next.js
```

---

## Stack Tecnologico

| Layer | Tecnologia |
|-------|------------|
| Runtime | [Bun](https://bun.sh) |
| API / WebSocket | [Elysia](https://elysiajs.com) |
| Frontend | [Next.js 16](https://nextjs.org) + [Tailwind CSS 4](https://tailwindcss.com) |
| Database | [MongoDB 7](https://www.mongodb.com) |
| Cache / Pub-Sub | [Redis 7](https://redis.io) |
| Scraping | [Playwright](https://playwright.dev) (Chromium) |
| Containerizzazione | [Docker](https://www.docker.com) + Docker Compose |

---

## Prerequisiti

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose plugin v2+)
- ~2GB spazio disco per le immagini

---

## Avvio Rapido

### 1. Configurazione

Modifica il file .env.example nella root del progetto

> **Nota:** Non serve definire `MONGO_URI` o `REDIS_URL` qui il `docker-compose.yml` li genera automaticamente con gli hostname corretti per la rete Docker interna.

### 2. Avvio

```bash
chmod +x start.sh
./start.sh
```

Al primo avvio:
- Vengono scaricate le immagini base (Mongo, Redis, Bun)
- Viene fatto il build dei servizi `server` e `client`
- MongoDB e Redis si avviano con persistenza su volume
- Il server copia automaticamente `.env.example` → `.env` se mancante (solo per fallback)

### 3. Verifica Servizi

| Servizio | URL | Descrizione |
|----------|-----|-------------|
| Frontend | http://localhost:3000 | UI Next.js |
| API REST + WebSocket | http://localhost:3001 | Elysia API |
| Mongo Express | http://localhost:8081 | Admin DB (credenziali in `.env`) |
| MongoDB | localhost:27017 | Database principale |
| Redis | localhost:6379 | Cache e pub/sub |

### 4. Stop

```bash
docker compose down
# Per rimuovere anche i dati persistenti:
docker compose down -v
```

---

## Sviluppo Locale (senza Docker)

### Server

```bash
cd server/
cp .env.example .env
# Modifica .env per usare localhost se necessario
bun install
bun api      # Avvia API
# oppure
bun start    # Avvia scraper
```

### Client

```bash
cd client/
bun install
bun dev         # http://localhost:3000
```

---

## API Endpoints

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET` | `/posts` | Lista paginata (query: `page`, `limit`, `connector`, `search`) |
| `GET` | `/posts/new` | Solo post ultime 24h |
| `GET` | `/posts/:id` | Singolo post |
| `DELETE` | `/posts` | Elimina tutti i post e pulisce Redis |
| `POST` | `/start` | Avvia lo scraper (processo figlio) |
| `GET` | `/connectors` | Lista connector disponibili |
| `WS` | `/status` | Stream real-time: post in chunk + stato scraping |

---

## Scraper CLI

Quando eseguito manualmente (dentro il container o in locale):

```bash
# Limita a 50 post per connector
bun index.ts --max 50

# Log esteso con tutti i campi
bun index.ts --long

# Modalità cron: ripeti ogni 30 minuti
bun index.ts --cron 30

# Combinazione
bun index.ts --max 20 --long --cron 60
```

---

## Aggiungere un Nuovo Connector

1. Crea `server/connectors/nuovo-sito.ts` che esporta un oggetto `JobConnector`
2. Definisci selettori CSS per: lista card, paginazione, titolo, azienda, descrizione, tag, logo
3. Importa e aggiungi all'array `connectors` in `server/index.ts`

Vedi `datapizza.ts` (modal, senza navigazione) e `reteinformatica.ts` (navigazione + cookie) come riferimento.