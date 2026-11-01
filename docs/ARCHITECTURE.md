# Architecture

## Current backend

The backend uses CommonJS modules and Express. Runtime code lives under
`backend/src/`:

- `app.js` configures CORS, JSON parsing, health endpoints, and error handling.
- `server.js` initializes MySQL and the schema before listening.
- `config/db.js` validates environment settings and owns the MySQL connection
  pool.
- `config/initDB.js` serializes and applies database migrations.
- `database/migrations/` contains ordered, additive schema migrations.
- `middleware/` contains shared HTTP middleware.

Feature routes, controllers, services, repositories, and validations will be
added within `src/modules/` as each module is implemented. No frontend or
frontend-to-backend API layer currently exists in this repository.
The backend has one canonical source tree under `src/`; modules should not add
parallel root-level controllers, routes, or configuration files.

## Database initialization

Startup first connects to the MySQL server without selecting a database, then
creates the configured database if it does not exist. A connection pool is
created for that database. Migrations run under a MySQL advisory lock and are
recorded in `schema_migrations`. Existing tables are not dropped or reset.

MySQL DDL is not transactionally rolled back. Each migration must therefore be
safe to retry if a process stops before its migration record is written.

## Runtime configuration

Copy `backend/.env.example` to `backend/.env`. Configure `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD`, `DB_NAME`, and optionally `DB_POOL_SIZE`, `PORT`, and
`CORS_ORIGINS`. Never commit `.env` or put server credentials in a frontend.
