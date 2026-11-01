# Database

The backend uses MySQL with InnoDB and `utf8mb4`. Database credentials are
loaded from `backend/.env`; the configured MySQL account must be able to create
the database when it does not already exist.

## Initialization and migrations

The server creates the configured database using `CREATE DATABASE IF NOT
EXISTS`, then applies migrations from `backend/src/database/migrations/`.
Applied migration IDs are stored in `schema_migrations`. Migrations are
serialized using a MySQL advisory lock. No startup code drops or resets data.
`CREATE TABLE IF NOT EXISTS` does not alter an existing table; schema changes
must be implemented as new migrations.

## Current schema

Migration `001-create-pooja-tables` creates:

- `poojas`: bilingual names/descriptions, slug, mode, display metadata, and
  active/featured state.
- `pooja_sankalp_options`: bilingual option names, fixed participant count,
  price/currency, ordering, and a cascading foreign key to `poojas`.

No sample rows are inserted. Booking, scheduling, payment, and other feature
tables have not yet been implemented.
