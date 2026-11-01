const cors = require("cors");
const express = require("express");
const { getPool } = require("./config/db");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const poojaRoutes = require("./modules/pooja/pooja.routes");

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.disable("x-powered-by");
app.use(cors({
    credentials: true,
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        const error = new Error("Origin is not allowed by CORS");
        error.status = 403;
        error.code = "CORS_ORIGIN_DENIED";
        return callback(error);
    }
}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/health/ready", async (req, res) => {
    await getPool().query("SELECT 1");
    res.status(200).json({ status: "ready", database: "connected" });
});

app.use("/api", poojaRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
