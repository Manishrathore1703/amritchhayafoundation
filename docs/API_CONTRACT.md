# API contract

The API is served by the backend. Responses currently use JSON.

## Implemented

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/api/health` | Liveness check; does not require MySQL | `200 {"status":"ok"}` |
| GET | `/api/health/ready` | Checks the initialized MySQL pool | `200 {"status":"ready","database":"connected"}` |
| GET | `/api/poojas` | List active poojas | `200 {"data":[...]}` |
| GET | `/api/poojas/:slug` | Get active pooja details | `200 {"data":{...}}` |
| GET | `/api/poojas/:poojaId/sankalp-options` | List active options | `200 {"data":[...]}` |
| GET | `/api/poojas/:poojaId/slots?mode=online&date=YYYY-MM-DD` | List available future slots | `200 {"data":[...]}` |
| POST | `/api/pooja-bookings` | Reserve a slot and create a guest booking | `201 {"data":{...}}` |
| GET | `/api/pooja-bookings/:reference` | Get booking status and summary | `200 {"data":{...}}` |
| POST | `/api/pooja-bookings/:reference/cancel` | Cancel a pending reservation with its one-time token | `200 {"data":{...}}` |

Booking input contains `poojaId`, `sankalpOptionId`, `slotId`, `mode`, a
`contact` object (`name`, `phone`, optional `email`), and a `participants`
array of names. The backend checks that the Sankalp option and slot belong to
the selected Pooja, enforces the stored participant count, calculates price
from MySQL, and reserves slot capacity transactionally. A successful response
includes an opaque booking `reference`, a one-time `cancellationToken`, amount,
currency, status, and 15-minute reservation window. Store the cancellation
token securely; it is not recoverable from the database.

Payment orders, verified payment callbacks, and booking confirmation are not
implemented yet. A newly created booking remains `pending_payment` and must not
be treated as confirmed.

Unknown routes return `404` with
`{"error":{"code":"NOT_FOUND","message":"..."}}`. Unhandled server errors
return a generic `500` response; details are logged on the server.

## Not yet implemented

Pooja payment, administration, and all other feature APIs are not yet
available. Their contracts will be documented when the corresponding backend
and tests are implemented.
