const migrations = [
    require("../database/migrations/001-create-pooja-tables"),
    require("../database/migrations/002-create-pooja-booking-tables"),
    require("../database/migrations/003-create-yatra-tables")
];

const initializeSchema = async (pool) => {
    const connection = await pool.getConnection();
    const lockName = "amritchhayafoundation:schema-migrations";

    try {
        const [lockRows] = await connection.query(
            "SELECT GET_LOCK(?, 30) AS acquired",
            [lockName]
        );

        if (lockRows[0].acquired !== 1) {
            throw new Error("Could not acquire the database migration lock");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id VARCHAR(150) NOT NULL PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        for (const migration of migrations) {
            const [rows] = await connection.query(
                "SELECT id FROM schema_migrations WHERE id = ?",
                [migration.id]
            );

            if (rows.length === 0) {
                await migration.up(connection);
                await connection.query(
                    "INSERT INTO schema_migrations (id) VALUES (?)",
                    [migration.id]
                );
            }
        }
    } finally {
        try {
            await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
        } finally {
            connection.release();
        }
    }
};

module.exports = initializeSchema;
