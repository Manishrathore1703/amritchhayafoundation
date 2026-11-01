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
