const assert = require("node:assert/strict");
const { once } = require("node:events");
const test = require("node:test");
const app = require("./app");

const startTestServer = async (t) => {
    const server = app.listen(0);
    await once(server, "listening");
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    }));

    return `http://127.0.0.1:${server.address().port}`;
};

test("health endpoint reports that the API process is running", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
});

test("unknown API routes return a consistent not-found response", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/not-a-route`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
        error: {
            code: "NOT_FOUND",
            message: "Route not found: GET /api/not-a-route"
        }
    });
});

test("malformed JSON returns a client error response", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/not-a-route`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid"
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "BAD_REQUEST");
});

test("CORS rejects origins outside the configured allowlist", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/health`, {
        headers: { origin: "https://not-allowed.example" }
    });

    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "CORS_ORIGIN_DENIED");
});

test("Pooja slot route validates mode and calendar dates", async (t) => {
    const baseUrl = await startTestServer(t);
    const invalidMode = await fetch(`${baseUrl}/api/poojas/1/slots?mode=both`);
    const invalidDate = await fetch(
        `${baseUrl}/api/poojas/1/slots?mode=online&date=2026-02-31`
    );

    assert.equal(invalidMode.status, 400);
    assert.equal((await invalidMode.json()).error.code, "INVALID_MODE");
    assert.equal(invalidDate.status, 400);
    assert.equal((await invalidDate.json()).error.code, "INVALID_DATE");
});

test("Pooja booking endpoint rejects invalid input before database access", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/pooja-bookings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_ID");
});

test("Yatra booking endpoint rejects invalid input before database access", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/yatra/bookings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_ID");
});

test("Yatra departure endpoint validates package IDs before database access", async (t) => {
    const baseUrl = await startTestServer(t);
    const response = await fetch(`${baseUrl}/api/yatra/packages/not-an-id/departures`);

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_ID");
});
