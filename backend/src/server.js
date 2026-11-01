const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const initializeSchema = require("./config/initDB");
const { closePool, initializeDatabase } = require("./config/db");

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

    const shutdown = (signal) => {
        console.log(`${signal} received; shutting down`);
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
