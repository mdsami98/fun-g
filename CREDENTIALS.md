# Credentials

All login credentials in one place. Not committed with real secrets in mind —
this is a local dev project, but treat this file the same way you'd treat any
`.env`: don't push it somewhere public with real values.

## Super Admin

**Seeded** — survives as long as `npm run seed:super-admin` has been run
against the current database (see `SETUP.md` § Seeding). Safe to assume this
one always exists unless the DB was reset and re-seeding hasn't happened yet.

| Field | Value |
|---|---|
| URL | http://localhost:1002/admin/login |
| Phone | `+8801700000000` |
| Password | `ChangeMe123!` |

Source: `SEED_SUPER_ADMIN_PHONE` / `SEED_SUPER_ADMIN_PASSWORD` in `.env`.

## Agency Admin (Dhaka Agency)

**Test data** — created manually via the Super Admin's "Create Agency" panel
during development, not seeded. Will NOT exist after a fresh `docker compose
down -v` / DB reset unless recreated.

| Field | Value |
|---|---|
| URL | http://localhost:1002/agency/login |
| Phone | `+8801711111111` |
| Password | `AgencyPass123` |
| Agency name | Dhaka Agency |
| Agency code | `DHAKA01` |
| bKash number | `01711111111` |

To recreate: log in as Super Admin → `/admin` → Create Agency, using these
same values (or any others).

## Global User (test account)

**Test data** — self-registered against the `DHAKA01` agency code during
development. Also not seeded; won't survive a DB reset.

| Field | Value |
|---|---|
| URL | http://localhost:1002/login |
| Phone | `+8801699999998` |
| Password | `TestPass123` |
| Agency | Dhaka Agency (`DHAKA01`) |

Balance fluctuates from Aviator testing — check current value via `/account`
or `GET /auth/me` rather than trusting a specific number here.

To recreate: `/register`, using agency code `DHAKA01` (or whatever agency
exists in your current DB).

## Adminer (Postgres admin UI)

| Field | Value |
|---|---|
| URL | http://localhost:1111 |
| System | PostgreSQL |
| Server | `postgres` (docker-compose service name — **not** `localhost`) |
| Username | `postgres` |
| Password | `postgres` |
| Database | `gaming_platform` |

Source: `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` in `.env`.

## Notes

- Only the **Super Admin** is a real seeded credential tied to `.env` config.
  Everything else here is test data created ad hoc during this project's
  development and is only as durable as the Postgres volume — if you ever run
  `docker compose down -v`, all of it except the Super Admin (which reseeds)
  is gone until recreated.
- For the full setup/migration/seeding workflow behind these, see `SETUP.md`.
