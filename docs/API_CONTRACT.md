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
| GET | `/api/yatra/packages` | List active Yatra packages | `200 {"data":[...]}` |
| GET | `/api/yatra/packages/:slug` | Get active package details and itinerary | `200 {"data":{...}}` |
| GET | `/api/yatra/packages/:packageId/departures` | List future departures with available seats | `200 {"data":[...]}` |
| POST | `/api/yatra/bookings` | Reserve seats and create a guest booking | `201 {"data":{...}}` |
| GET | `/api/yatra/bookings/:reference` | Get booking status and summary | `200 {"data":{...}}` |
| POST | `/api/yatra/bookings/:reference/cancel` | Cancel a pending reservation with its token | `200 {"data":{...}}` |

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

Yatra booking input contains `packageId`, `departureId`, a `contact` object
(`name`, `phone`, optional `email`), and a `travelers` array of names. The
backend loads the active package/departure and calculates the amount from the
departure price, falling back to the package base price; a client price is
ignored. It reserves one seat per traveler transactionally, stores a hashed
cancellation token, and releases reserved seats on cancellation or reservation
expiry. A new reservation lasts 15 minutes. Its response is
`{reference,cancellationToken,amount,currency,status,travelerCount,reservationMinutes}`.
Payment verification, admin package management, and confirmed bookings are
not yet implemented.

Unknown routes return `404` with
`{"error":{"code":"NOT_FOUND","message":"..."}}`. Unhandled server errors
return a generic `500` response; details are logged on the server.

## Not yet implemented

Pooja payment and administration, Yatra payment and administration, and all
other feature APIs are not yet available. Their contracts will be documented
when the corresponding backend and tests are implemented.
