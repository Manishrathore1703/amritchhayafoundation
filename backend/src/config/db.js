const mysql = require("mysql2/promise");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

let pool;

const getDatabaseConfig = () => {
    const { DB_HOST, DB_USER, DB_PASSWORD = "", DB_NAME } = process.env;
    const port = Number(process.env.DB_PORT || 3306);
    const connectionLimit = Number(process.env.DB_POOL_SIZE || 10);

    if (!DB_HOST || !DB_USER || !DB_NAME) {
        throw new Error("DB_HOST, DB_USER, and DB_NAME must be configured");
    }

    if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
        throw new Error("DB_NAME may contain only letters, numbers, and underscores");
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("DB_PORT must be a valid TCP port");
    }

    if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
        throw new Error("DB_POOL_SIZE must be a positive integer");
    }

    return {
        host: DB_HOST,
        port,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        connectionLimit
    };
};

const initializeDatabase = async () => {
    const config = getDatabaseConfig();
    const bootstrapConnection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        charset: "utf8mb4"
    });

    try {
        await bootstrapConnection.query(
            `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
    } finally {
        await bootstrapConnection.end();
    }

    const initializedPool = mysql.createPool({
        ...config,
        waitForConnections: true,
        queueLimit: 0,
        charset: "utf8mb4"
    });

    try {
        await initializedPool.query("SELECT 1");
    } catch (error) {
        await initializedPool.end();
        throw error;
    }

    pool = initializedPool;
    return pool;
};

const getPool = () => {
    if (!pool) {
        throw new Error("Database pool has not been initialized");
    }

    return pool;
};

const closePool = async () => {
    if (pool) {
        const activePool = pool;
        pool = undefined;
        await activePool.end();
    }
};

module.exports = { closePool, getPool, initializeDatabase };
