const up = async (connection) => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS poojas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(150) NOT NULL UNIQUE,
            name_en VARCHAR(255) NOT NULL,
            name_hi VARCHAR(255),
            description_en TEXT,
            description_hi TEXT,
            duration_minutes INT,
            mode ENUM('online', 'offline', 'both') NOT NULL DEFAULT 'both',
            card_image_url VARCHAR(500),
            hero_image_url VARCHAR(500),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS pooja_sankalp_options (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pooja_id INT NOT NULL,
            slug VARCHAR(150) NOT NULL,
            name_en VARCHAR(255) NOT NULL,
            name_hi VARCHAR(255),
            participant_count INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_pooja_slug (pooja_id, slug),
            CONSTRAINT fk_sankalp_pooja
                FOREIGN KEY (pooja_id)
                REFERENCES poojas(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

module.exports = { id: "001-create-pooja-tables", up };
