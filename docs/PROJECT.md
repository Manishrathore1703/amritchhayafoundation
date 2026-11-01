# Project overview

Amrit Chhaya Foundation is intended to provide information and online services
for the foundation in Ujjain, including pooja and yatra bookings, donations,
Goshala seva, media, blogs, and contact enquiries.

## Repository status

The inspected repository currently contains a Node.js backend only. No React,
Vite, HTML template, frontend source, or frontend package manifest is present.
The backend foundation is being established with Express, MySQL, and
`mysql2/promise`. The Pooja schema migration is the first module migration.

## Local setup

1. Install Node.js 20 or newer and MySQL 8 or newer.
2. From `backend/`, run `npm install`.
3. Copy `.env.example` to `.env` and configure a MySQL account that can create
   the configured database and tables.
4. Run `npm run dev` for development or `npm start` to start the API.
5. Run `npm test` for the backend tests.

The backend creates the configured database and applies pending migrations at
startup. It does not seed production data.
