const up = async (connection) => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS pooja_slots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pooja_id INT NOT NULL,
            mode ENUM('online', 'offline') NOT NULL,
            starts_at DATETIME NOT NULL,
            capacity INT UNSIGNED NOT NULL,
            reserved_count INT UNSIGNED NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_pooja_slots_availability (pooja_id, mode, is_active, starts_at),
            CONSTRAINT fk_pooja_slot_pooja
                FOREIGN KEY (pooja_id)
                REFERENCES poojas(id)
                ON DELETE CASCADE,
            CONSTRAINT chk_pooja_slot_capacity
                CHECK (capacity > 0 AND reserved_count <= capacity)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS pooja_bookings (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            reference CHAR(48) NOT NULL UNIQUE,
            cancellation_token_hash BINARY(32) NOT NULL,
            pooja_id INT NOT NULL,
            sankalp_option_id INT NOT NULL,
            slot_id INT NOT NULL,
            mode ENUM('online', 'offline') NOT NULL,
            contact_name VARCHAR(150) NOT NULL,
            contact_email VARCHAR(254),
            contact_phone VARCHAR(30) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) NOT NULL,
            status ENUM('pending_payment', 'confirmed', 'cancelled', 'expired')
                NOT NULL DEFAULT 'pending_payment',
            reservation_expires_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_pooja_bookings_expiry (status, reservation_expires_at, slot_id),
            CONSTRAINT fk_pooja_booking_pooja
                FOREIGN KEY (pooja_id)
                REFERENCES poojas(id),
            CONSTRAINT fk_pooja_booking_sankalp
                FOREIGN KEY (sankalp_option_id)
                REFERENCES pooja_sankalp_options(id),
            CONSTRAINT fk_pooja_booking_slot
                FOREIGN KEY (slot_id)
                REFERENCES pooja_slots(id),
            CONSTRAINT chk_pooja_booking_amount CHECK (amount >= 0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS pooja_booking_participants (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_id BIGINT UNSIGNED NOT NULL,
            participant_name VARCHAR(150) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_pooja_participants_booking (booking_id),
            CONSTRAINT fk_pooja_participant_booking
                FOREIGN KEY (booking_id)
                REFERENCES pooja_bookings(id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

module.exports = { id: "002-create-pooja-booking-tables", up };
