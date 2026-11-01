const up = async (connection) => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS yatra_packages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(150) NOT NULL UNIQUE,
            name_en VARCHAR(255) NOT NULL,
            name_hi VARCHAR(255),
            description_en TEXT,
            description_hi TEXT,
            itinerary_en TEXT,
            itinerary_hi TEXT,
            card_image_url VARCHAR(500),
            hero_image_url VARCHAR(500),
            base_price DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_featured BOOLEAN NOT NULL DEFAULT FALSE,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT chk_yatra_package_price CHECK (base_price >= 0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS yatra_departures (
            id INT AUTO_INCREMENT PRIMARY KEY,
            package_id INT NOT NULL,
            starts_at DATETIME NOT NULL,
            ends_at DATETIME,
            capacity INT UNSIGNED NOT NULL,
            reserved_seats INT UNSIGNED NOT NULL DEFAULT 0,
            price DECIMAL(10,2),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_yatra_departures_availability (package_id, is_active, starts_at),
            CONSTRAINT fk_yatra_departure_package
                FOREIGN KEY (package_id)
                REFERENCES yatra_packages(id),
            CONSTRAINT chk_yatra_departure_capacity
                CHECK (capacity > 0 AND reserved_seats <= capacity),
            CONSTRAINT chk_yatra_departure_price CHECK (price IS NULL OR price >= 0),
            CONSTRAINT chk_yatra_departure_dates
                CHECK (ends_at IS NULL OR ends_at >= starts_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS yatra_bookings (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            reference CHAR(48) NOT NULL UNIQUE,
            cancellation_token_hash BINARY(32) NOT NULL,
            package_id INT NOT NULL,
            departure_id INT NOT NULL,
            contact_name VARCHAR(150) NOT NULL,
            contact_email VARCHAR(254),
            contact_phone VARCHAR(30) NOT NULL,
            traveler_count SMALLINT UNSIGNED NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            status ENUM('pending_payment', 'confirmed', 'cancelled', 'expired')
                NOT NULL DEFAULT 'pending_payment',
            reservation_expires_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_yatra_bookings_expiry (status, reservation_expires_at, departure_id),
            CONSTRAINT fk_yatra_booking_package
                FOREIGN KEY (package_id)
                REFERENCES yatra_packages(id),
            CONSTRAINT fk_yatra_booking_departure
                FOREIGN KEY (departure_id)
                REFERENCES yatra_departures(id),
            CONSTRAINT chk_yatra_booking_travelers CHECK (traveler_count > 0),
            CONSTRAINT chk_yatra_booking_amount CHECK (amount >= 0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS yatra_booking_travelers (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_id BIGINT UNSIGNED NOT NULL,
            traveler_name VARCHAR(150) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_yatra_travelers_booking (booking_id),
            CONSTRAINT fk_yatra_traveler_booking
                FOREIGN KEY (booking_id)
                REFERENCES yatra_bookings(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

module.exports = { id: "003-create-yatra-tables", up };
