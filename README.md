# Gaming Platform

> 📖 For full setup instructions and migration workflow, see **[SETUP.md](./SETUP.md)**.
> For every login (Super Admin, Agency Admin, test User, Adminer), see
> **[CREDENTIALS.md](./CREDENTIALS.md)**.

## Structure

- `backend/` — NestJS API (TypeORM + migrations, Postgres)
- `frontend/` — React (Vite) app
- `agency-mobile/` — React Native (Expo) Android/iOS app for Agency Admins (see [SETUP_MOBILE.md](./agency-mobile/SETUP_MOBILE.md))
- `user-mobile/` — React Native (Expo) Android APK app for Players (see [SETUP_MOBILE.md](./user-mobile/SETUP_MOBILE.md))

## Ports

| Service  | Port |
|----------|------|
| Backend  | 1001 |
| Frontend | 1002 |
| Adminer  | 1111 |
| Postgres | 5334 on host → 5432 in container |

## Run everything with Docker

```
docker compose up --build
```

## Run backend locally (without Docker)

```
cd backend
cp .env.example .env
npm install
npm run start:dev
```

## Migrations (run from backend/)

```
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
```

## Run frontend locally (without Docker)

```
cd frontend
cp .env.example .env
npm install
npm run dev
```
