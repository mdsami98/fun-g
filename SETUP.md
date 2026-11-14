# Setup Guide

Everything needed to install, run, and operate this project: Docker setup,
database migrations, and seeding.

> 🔑 For a plain list of every login (Super Admin, Agency Admin, test User,
> Adminer), see **[CREDENTIALS.md](./CREDENTIALS.md)** instead.

## 1. Project Structure

```
FinalApp/
├── backend/     NestJS API (TypeORM + migrations, PostgreSQL)
├── frontend/    React (Vite) app
├── docker-compose.yml            base service definitions
├── docker-compose.override.yml   dev-mode bind mounts (auto-merged by `docker compose up`)
└── .env                          shared config for docker compose
```

## 2. Frontend routes

Each role has its own login route — there is no single shared login page.

| Route | Who | Notes |
|---|---|---|
| `/login` | Global User | public-facing, has a link to `/register` |
| `/register` | Global User | self-registration with an Agency Code |
| `/` | Global User | dashboard, redirects to `/login` if unauthenticated |
| `/admin/login` | Super Admin | no register page — accounts are seeded/created manually |
| `/admin` | Super Admin | dashboard: create agencies, view agency list |
| `/agency/login` | Agency Admin | no register page — accounts are created by a Super Admin via `/admin` |
| `/agency` | Agency Admin | dashboard: view own agency info |

Logging in with the wrong role on a given login page (e.g. an Agency Admin's
credentials on `/admin/login`) is rejected client-side with an inline error
and the session is not persisted. Visiting a protected route while logged in
as the wrong role redirects to that role's own home (`/`, `/admin`, or
`/agency`); visiting one while logged out redirects to that route's matching
login page.

## 3. Ports

| Service  | Port | Notes |
|----------|------|-------|
| Backend API  | 1001 | http://localhost:1001 |
| Frontend     | 1002 | http://localhost:1002 |
| Adminer      | 1111 | http://localhost:1111 |
| Postgres     | 5334 (host) → 5432 (container) | 5334 used because 5432 is commonly taken by a local Postgres install |

## 4. Dev workflow — when do you need to rebuild?

`docker compose up` automatically merges `docker-compose.override.yml` on
top of `docker-compose.yml` (no flags needed — this is standard Docker
Compose behavior). The override adds bind mounts so **editing source files
takes effect immediately, with no rebuild and no restart**:

- `backend/` runs `nest start --watch` (recompiles + restarts the Nest
  process on save) instead of the production `node dist/main`.
- `frontend/` already ran `vite` (dev server with HMR) even before the
  override existed — the override just makes host edits visible inside the
  container.
- `node_modules` is excluded from the bind mount in both services (an
  anonymous volume shadows it) so the container's own Linux-built
  `node_modules` is never clobbered by your host's.

**You only need `docker compose up -d --build <service>` when:**
- `package.json` / `package-lock.json` changed (new/updated/removed dependency)
- The `Dockerfile` / `Dockerfile.dev` itself changed
- You want a clean rebuild for some other reason (e.g. suspect stale layers)

Everyday source edits (`.ts`, `.tsx`, `.jsx`, `.css`, entities, controllers,
etc.) need **no Docker command at all** — just save the file and the running
container picks it up.

```bash
# Normal day-to-day: containers already running, just edit files.
docker compose up -d       # first time / after pulling changes

# Only needed after touching package.json or a Dockerfile:
docker compose up -d --build backend
docker compose up -d --build frontend
```

## 5. Prerequisites

- Docker + Docker Compose
- Node.js 22+ and npm (only needed if you want to run backend/frontend outside Docker)

## 6. First-time install

```bash
cd FinalApp
cp .env.example .env               # already present with dev defaults, edit if needed
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up --build -d
```

This builds and starts 4 containers: `postgres`, `adminer`, `backend`, `frontend`.

The backend **runs pending migrations automatically on container start**
(see `backend/docker-entrypoint.sh`), so the schema is created the first
time the `backend` container boots. It does **not** seed any data — see
[Seeding](#8-seeding) below.

Check everything is up:

```bash
docker compose ps
curl http://localhost:1001/health   # {"status":"ok","database":"connected",...}
```

## 7. Environment variables

All variables live in `FinalApp/.env` (used by `docker-compose.yml`) and are
mirrored in `backend/.env` (used when running the backend outside Docker).

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST` | `postgres` | DB host as seen by containers (service name) |
| `DB_PORT` | `5432` | DB port inside the Docker network |
| `DB_HOST_PORT` | `5334` | DB port published to your host machine |
| `DB_USERNAME` | `postgres` | Postgres user |
| `DB_PASSWORD` | `postgres` | Postgres password |
| `DB_NAME` | `gaming_platform` | Database name |
| `BACKEND_PORT` | `1001` | Backend host port |
| `FRONTEND_PORT` | `1002` | Frontend host port |
| `ADMINER_PORT` | `1111` | Adminer host port |
| `JWT_SECRET` | `dev-secret-change-me` | JWT signing secret — **change in production** |
| `JWT_EXPIRES_IN` | `7d` | JWT token lifetime |
| `SEED_SUPER_ADMIN_PHONE` | `+8801700000000` | Phone used by the super admin seed script |
| `SEED_SUPER_ADMIN_PASSWORD` | `ChangeMe123!` | Password used by the super admin seed script |
| `SEED_SUPER_ADMIN_NAME` | `Super Admin` | Display name used by the super admin seed script |

When running the backend **outside Docker** (`npm run start:dev`),
`backend/.env` is used instead, with `DB_HOST=localhost` and
`DB_PORT=5334` (pointing at the Dockerized Postgres's published port).

## 8. Seeding

The only automatic seeding is the Aviator crash-score pool (see
[Aviator crash scores](#aviator-crash-scores) below). Everything else starts
empty, so you need to create the initial Super Admin manually, once, after
migrations have run.

### Seed the Super Admin

From `backend/`, with the Postgres container running:

```bash
cd backend
npm install            # if not already installed locally
npm run seed:super-admin
```

This reads `SEED_SUPER_ADMIN_PHONE` / `SEED_SUPER_ADMIN_PASSWORD` /
`SEED_SUPER_ADMIN_NAME` from `backend/.env` and inserts one `super_admin`
user. Running it again is safe — it skips creation if that phone number
already exists.

**Default seeded Super Admin login (dev defaults — change before going to production):**

| Field | Value |
|---|---|
| Phone | `+8801700000000` |
| Password | `ChangeMe123!` |

Log in via `POST /auth/login` or the frontend `/login` page.

### Creating Agencies (and their Agency Admin)

Agencies aren't seeded either. The easiest way is logging in as the Super
Admin at `/admin/login` and using the "Create Agency" form on `/admin`. The
same thing via `curl`, if you'd rather script it:

```bash
TOKEN=$(curl -s -X POST http://localhost:1001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8801700000000","password":"ChangeMe123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

curl -s -X POST http://localhost:1001/agencies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
        "name": "Dhaka Agency",
        "agencyCode": "DHAKA01",
        "bkashNumber": "01711111111",
        "adminName": "Dhaka Admin",
        "adminPhone": "+8801711111111",
        "adminPassword": "AgencyPass123"
      }'
```

This creates the `agencies` row **and** its `agency_admin` user in one call.
Global users can then self-register at `/register` using `agencyCode: DHAKA01`.

### Aviator crash scores

Aviator does not generate crash points at runtime. Each round takes its crash
point from the `aviator_crash_point` table (1000 rows: `crashScore`, `nextPick`):

1. The row with `nextPick = true` is used for the round that is starting.
2. If no row is flagged, a random row is used instead.
3. The used row's flag is cleared and a different random row is flagged for
   the round after.

The round's `randomSeed` column records which row it used (`aviator_crash_point:<id>`).

The backend fills `aviator_crash_point` automatically on startup if the table is
empty, using `GAME_HOUSE_EDGE` and `GAME_MAX_MULTIPLIER`. The values are
deterministic and built so that no fixed cash-out target returns players more
than `1 - GAME_HOUSE_EDGE`. To regenerate them (for example after changing
`GAME_HOUSE_EDGE`):

```bash
cd backend
npm run seed:crash-seeds -- --reset
```

Without `--reset` the script does nothing if the table already has rows.
Editing `crashScore` values by hand changes the house edge. Anyone who can
read this table knows the next round's crash point, so keep database access
restricted.

## 9. Database Migrations (TypeORM)

All migration commands are run from `backend/` and use the CLI wrapper
`typeorm-ts-node-commonjs` (needed because TypeORM's plain CLI breaks under
`ts-node` — see [Known issues](#11-known-issues-worth-knowing)).

The DataSource config lives at `backend/src/database/data-source.ts` and
migration files live in `backend/src/database/migrations/`.

### Generate a migration from entity changes

After editing/adding a TypeORM entity (e.g. `src/users/entities/user.entity.ts`),
generate a migration that diffs the current DB schema against your entities:

```bash
cd backend
npm run migration:generate -- src/database/migrations/<DescriptiveName>
```

Example: `npm run migration:generate -- src/database/migrations/AddMemberRole`

This connects to the DB (so it must be running — `docker compose up -d postgres`),
compares it to your entities, and writes a migration file with the necessary
`up()`/`down()` SQL.

### Create an empty migration (for manual SQL / data migrations)

```bash
npm run migration:create -- src/database/migrations/<DescriptiveName>
```

Unlike `generate`, this doesn't inspect the DB — it gives you an empty
`up()`/`down()` to fill in by hand (useful for seed-like data changes, index
tweaks, etc. that TypeORM can't auto-diff).

### Run pending migrations

```bash
npm run migration:run
```

Applies all migrations that haven't been recorded in the `migrations` table
yet, in order. This also happens **automatically** whenever the `backend`
Docker container starts (see `backend/docker-entrypoint.sh`), so in normal
Docker usage you rarely need to run this by hand — mainly useful when
developing against the DB locally before rebuilding the container.

### Revert the last migration

```bash
npm run migration:revert
```

Rolls back only the most-recently-applied migration (runs its `down()`).
Run it multiple times to step back further.

### Check migration status

```bash
npm run typeorm -- migration:show
```

Lists all migrations with `[X]` (applied) or `[ ]` (pending).

### Notes

- **Never** run the app with `synchronize: true` — this project always uses
  `synchronize: false` and migrations as the single source of truth for schema.
- Migrations target whatever `DB_HOST`/`DB_PORT` resolve to in `backend/.env`.
  Locally that's `localhost:5334` (the Dockerized Postgres's published port).
- If you added a **new entity file**, make sure it's picked up — entities are
  auto-globbed via `src/**/*.entity.ts`, so no manual registration is needed.

## 10. Adminer (DB admin UI)

URL: **http://localhost:1111**

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `postgres` (the docker-compose service name — **not** `localhost`) |
| Username | `postgres` |
| Password | `postgres` |
| Database | `gaming_platform` |

These come straight from `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` in `.env`.
Adminer runs inside the same Docker network as Postgres, so it must address
it by service name, not by the host-published port (5334).

## 11. Known issues worth knowing

- **TypeORM CLI + ts-node + ESM `yargs`**: TypeORM's bundled `yargs` (v18) is
  ESM-only and breaks under `ts-node`'s CommonJS `require()`. Fixed via an
  `overrides` entry in `backend/package.json` pinning `yargs` to `^17.7.2`,
  plus using the `typeorm-ts-node-commonjs` binary instead of raw `cli.js`.
  If migration commands suddenly start throwing `ERR_REQUIRE_ESM`, check that
  override is still in place and `node_modules` was reinstalled after it was
  added.
- **Postgres port 5432 conflict**: if your machine already runs a native
  Postgres on 5432, the `postgres` container publishes on **5334** instead
  (`DB_HOST_PORT` in `.env`). Internal container-to-container traffic still
  uses 5432 as normal — only the host-facing port changed.
- **Vite 8 / Rolldown**: the frontend was initially scaffolded with Vite 8,
  which defaults to an experimental Rolldown bundler whose native binding
  isn't published for all platforms (`@rolldown/binding-darwin-universal`
  404s). Pinned `vite` to `^7.3.6` and `@vitejs/plugin-react` to `^5.2.0` to
  avoid it.
- **Entrypoint script "not executable" under bind mounts**: `backend/Dockerfile`
  and `Dockerfile.dev` both `chmod +x` their entrypoint script during the
  image build, but `docker-compose.override.yml` bind-mounts the whole
  `backend/` directory over `/app`, which replaces that baked-in file with
  the host's copy — and Git/the host filesystem may not have the executable
  bit set on it. When that happens, Node's official base image entrypoint
  can't `exec` the script directly and instead tries to load it as a
  CommonJS module, producing a confusing `SyntaxError: Unexpected identifier`
  crash loop. Fixed two ways: (1) `chmod +x backend/docker-entrypoint*.sh` on
  the host so the executable bit survives the bind mount, and (2) both
  Dockerfiles invoke the script as `CMD ["sh", "./docker-entrypoint*.sh"]`
  instead of relying on the shebang/exec bit at all, so this can't recur even
  if the bit gets reset later (e.g. by a `git clone` on a filesystem that
  drops it).

## 12. Common commands cheat sheet

```bash
# Start everything (dev mode: bind-mounted source, hot reload — see section 4)
docker compose up -d

# Only needed after touching package.json or a Dockerfile:
docker compose up -d --build backend
docker compose up -d --build frontend

# Tail logs
docker compose logs -f backend

# Stop everything (keeps data)
docker compose down

# Stop everything and WIPE the database volume
docker compose down -v

# Run migrations against the Dockerized DB from your host
cd backend && npm run migration:run

# Seed the super admin (safe to re-run)
cd backend && npm run seed:super-admin
```
