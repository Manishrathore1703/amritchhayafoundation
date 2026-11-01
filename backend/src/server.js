const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const initializeSchema = require("./config/initDB");
const { closePool, initializeDatabase } = require("./config/db");
const { expireReservations: expirePoojaReservations } = require("./modules/pooja/pooja.service");
const { expireReservations: expireYatraReservations } = require("./modules/yatra/yatra.service");

const expireReservations = async () => {
    await Promise.all([expirePoojaReservations(), expireYatraReservations()]);
};

const parsePort = () => {
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be a valid TCP port");
    }
    return port;
};

const startServer = async () => {
    const port = parsePort();
    let server;

    try {
        const pool = await initializeDatabase();
        await initializeSchema(pool);
        await expireReservations();
        server = await new Promise((resolve, reject) => {
            const listener = app.listen(port);
            listener.once("error", reject);
            listener.once("listening", () => resolve(listener));
        });
    } catch (error) {
        try {
            await closePool();
        } catch (closeError) {
            console.error("Database pool cleanup failed:", closeError);
        }
        throw error;
    }

    console.log(`Server listening on port ${port}`);

    const expiryTimer = setInterval(() => {
        expireReservations().catch((error) => {
            console.error("Could not expire pooja reservations:", error);
        });
    }, 60_000);
    expiryTimer.unref();

    const shutdown = (signal) => {
        console.log(`${signal} received; shutting down`);
        clearInterval(expiryTimer);
        server.close(async (serverError) => {
            if (serverError) {
                console.error("HTTP server shutdown failed:", serverError);
                process.exitCode = 1;
            }

            try {
                await closePool();
            } catch (error) {
                console.error("Database pool shutdown failed:", error);
                process.exitCode = 1;
            }
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    return server;
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Server startup failed:", error);
        process.exitCode = 1;
    });
}

module.exports = startServer;
