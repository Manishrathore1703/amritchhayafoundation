const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");
const { getPool } = require("../../config/db");
const HttpError = require("../../utils/HttpError");
const repository = require("./pooja.repository");

const RESERVATION_MINUTES = 15;

const getPoojaBySlug = async (slug) => {
    const pooja = await repository.findActivePoojaBySlug(slug);
    if (!pooja) {
        throw new HttpError(404, "POOJA_NOT_FOUND", "Pooja was not found");
    }
    return pooja;
};

const getSankalpOptions = async (poojaId) => {
    const options = await repository.listActiveSankalpOptions(poojaId);
    return options;
};

const getSlots = async (poojaId, filters) => {
    const pooja = await getPoojaById(poojaId);
    if (pooja.mode !== "both" && pooja.mode !== filters.mode) {
        return [];
    }
    return repository.listAvailableSlots({ ...filters, poojaId });
};

const getPoojaById = async (poojaId) => {
    const [rows] = await getPool().execute(
        "SELECT id, mode FROM poojas WHERE id = ? AND is_active = TRUE LIMIT 1",
        [poojaId]
    );
    if (!rows[0]) {
        throw new HttpError(404, "POOJA_NOT_FOUND", "Pooja was not found");
    }
    return rows[0];
};

const createBooking = async (input) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    const reference = randomBytes(24).toString("hex");
    const cancellationToken = randomBytes(32).toString("hex");
    const cancellationTokenHash = createHash("sha256").update(cancellationToken).digest();

    try {
        await connection.beginTransaction();

        const [poojaRows] = await connection.execute(`
            SELECT id, mode FROM poojas
            WHERE id = ? AND is_active = TRUE
            FOR UPDATE
        `, [input.poojaId]);
        const pooja = poojaRows[0];
        if (!pooja) {
            throw new HttpError(404, "POOJA_NOT_FOUND", "Pooja was not found or is inactive");
        }
        if (pooja.mode !== "both" && pooja.mode !== input.mode) {
            throw new HttpError(400, "POOJA_MODE_UNAVAILABLE", "This pooja is not available in the selected mode");
        }

        const [sankalpRows] = await connection.execute(`
            SELECT id, pooja_id, participant_count, price, currency
            FROM pooja_sankalp_options
            WHERE id = ? AND pooja_id = ? AND is_active = TRUE
            FOR UPDATE
        `, [input.sankalpOptionId, input.poojaId]);
        const sankalp = sankalpRows[0];
        if (!sankalp) {
            throw new HttpError(400, "INVALID_SANKALP_OPTION", "Sankalp option does not belong to this pooja or is inactive");
        }
        if (input.participants.length !== sankalp.participant_count) {
            throw new HttpError(
                400,
                "PARTICIPANT_COUNT_MISMATCH",
                `This sankalp option requires exactly ${sankalp.participant_count} participant(s)`
            );
        }

        const [slotRows] = await connection.execute(`
            SELECT id, pooja_id, mode, capacity, reserved_count, starts_at,
                   starts_at > UTC_TIMESTAMP() AS is_future
            FROM pooja_slots
            WHERE id = ? AND pooja_id = ? AND is_active = TRUE
            FOR UPDATE
        `, [input.slotId, input.poojaId]);
        const slot = slotRows[0];
        if (!slot || slot.mode !== input.mode || !slot.is_future) {
            throw new HttpError(400, "INVALID_SLOT", "Selected slot is unavailable for this pooja and mode");
        }

        const [expiredBookings] = await connection.execute(`
            SELECT id FROM pooja_bookings
            WHERE slot_id = ? AND status = 'pending_payment'
              AND reservation_expires_at <= UTC_TIMESTAMP()
            FOR UPDATE
        `, [slot.id]);
        if (expiredBookings.length > 0) {
            const expiredIds = expiredBookings.map(({ id }) => id);
            const placeholders = expiredIds.map(() => "?").join(",");
            await connection.execute(`
                UPDATE pooja_bookings
                SET status = 'expired'
                WHERE id IN (${placeholders}) AND status = 'pending_payment'
            `, expiredIds);
            await connection.execute(`
                UPDATE pooja_slots
                SET reserved_count = GREATEST(reserved_count - ?, 0)
                WHERE id = ?
            `, [expiredIds.length, slot.id]);
            slot.reserved_count = Math.max(0, slot.reserved_count - expiredIds.length);
        }

        if (slot.reserved_count >= slot.capacity) {
            throw new HttpError(409, "SLOT_FULL", "Selected slot has no remaining capacity");
        }

        await connection.execute(
            "UPDATE pooja_slots SET reserved_count = reserved_count + 1 WHERE id = ?",
            [slot.id]
        );
        const [bookingResult] = await connection.execute(`
            INSERT INTO pooja_bookings (
                reference, cancellation_token_hash, pooja_id, sankalp_option_id,
                slot_id, mode, contact_name, contact_email, contact_phone,
                amount, currency, reservation_expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))
        `, [
            reference,
            cancellationTokenHash,
            input.poojaId,
            sankalp.id,
            slot.id,
            input.mode,
            input.contact.name,
            input.contact.email,
            input.contact.phone,
            sankalp.price,
            sankalp.currency,
            RESERVATION_MINUTES
        ]);
        const participantValues = input.participants
            .map((name) => [bookingResult.insertId, name]);
        await connection.query(
            "INSERT INTO pooja_booking_participants (booking_id, participant_name) VALUES ?",
            [participantValues]
        );

        await connection.commit();
        return {
            amount: sankalp.price,
            cancellationToken,
            currency: sankalp.currency,
            reference,
            reservationMinutes: RESERVATION_MINUTES,
            status: "pending_payment"
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getBookingStatus = async (reference) => {
    const booking = await repository.findBookingStatus(reference);
    if (!booking) {
        throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking was not found");
    }
    return booking;
};

const cancelBooking = async (reference, token) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    let status;
    try {
        await connection.beginTransaction();
        const [initialRows] = await connection.execute(
            "SELECT slot_id FROM pooja_bookings WHERE reference = ? LIMIT 1",
            [reference]
        );
        if (!initialRows[0]) {
            throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking was not found");
        }

        await connection.execute(
            "SELECT id FROM pooja_slots WHERE id = ? FOR UPDATE",
            [initialRows[0].slot_id]
        );
        const [bookingRows] = await connection.execute(`
            SELECT id, slot_id, cancellation_token_hash, status,
                   reservation_expires_at <= UTC_TIMESTAMP() AS is_expired
            FROM pooja_bookings
            WHERE reference = ?
            FOR UPDATE
        `, [reference]);
        const booking = bookingRows[0];
        const suppliedHash = createHash("sha256").update(token).digest();
        if (!timingSafeEqual(booking.cancellation_token_hash, suppliedHash)) {
            throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking was not found");
        }
        if (booking.status !== "pending_payment") {
            throw new HttpError(409, "BOOKING_NOT_CANCELLABLE", "Only pending bookings can be cancelled");
        }

        status = booking.is_expired ? "expired" : "cancelled";
        await connection.execute(
            "UPDATE pooja_bookings SET status = ? WHERE id = ? AND status = 'pending_payment'",
            [status, booking.id]
        );
        await connection.execute(`
            UPDATE pooja_slots
            SET reserved_count = GREATEST(reserved_count - 1, 0)
            WHERE id = ?
        `, [booking.slot_id]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    if (status === "expired") {
        throw new HttpError(409, "BOOKING_EXPIRED", "Booking reservation has expired");
    }
    return { reference, status };
};

const expireReservations = async () => {
    const pool = getPool();
    const [slots] = await pool.query(`
        SELECT DISTINCT slot_id
        FROM pooja_bookings
        WHERE status = 'pending_payment'
          AND reservation_expires_at <= UTC_TIMESTAMP()
        LIMIT 100
    `);

    for (const { slot_id: slotId } of slots) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute("SELECT id FROM pooja_slots WHERE id = ? FOR UPDATE", [slotId]);
            const [expired] = await connection.execute(`
                SELECT id FROM pooja_bookings
                WHERE slot_id = ? AND status = 'pending_payment'
                  AND reservation_expires_at <= UTC_TIMESTAMP()
                FOR UPDATE
            `, [slotId]);
            if (expired.length) {
                const ids = expired.map(({ id }) => id);
                const placeholders = ids.map(() => "?").join(",");
                await connection.execute(
                    `UPDATE pooja_bookings SET status = 'expired' WHERE id IN (${placeholders}) AND status = 'pending_payment'`,
                    ids
                );
                await connection.execute(
                    "UPDATE pooja_slots SET reserved_count = GREATEST(reserved_count - ?, 0) WHERE id = ?",
                    [ids.length, slotId]
                );
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = {
    cancelBooking,
    createBooking,
    expireReservations,
    getBookingStatus,
    getPoojaById,
    getPoojaBySlug,
    getSlots,
    getSankalpOptions,
    listPoojas: repository.listActivePoojas
};
