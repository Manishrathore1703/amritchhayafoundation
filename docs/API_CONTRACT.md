# API contract

The API is served by the backend. Responses currently use JSON.

## Implemented

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/api/health` | Liveness check; does not require MySQL | `200 {"status":"ok"}` |
| GET | `/api/health/ready` | Checks the initialized MySQL pool | `200 {"status":"ready","database":"connected"}` |

Unknown routes return `404` with
`{"error":{"code":"NOT_FOUND","message":"..."}}`. Unhandled server errors
return a generic `500` response; details are logged on the server.

## Not yet implemented

Pooja catalog, booking, payment, administration, and all other feature APIs are
not yet available. Their contracts will be documented when the corresponding
backend and tests are implemented.
