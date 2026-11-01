const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");
const { getPool } = require("../../config/db");
const HttpError = require("../../utils/HttpError");
const repository = require("./yatra.repository");

const RESERVATION_MINUTES = 15;
const MAX_AMOUNT_CENTS = 9_999_999_999n;

const priceToCents = (price) => {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(price));
    if (!match) {
        throw new Error("Configured Yatra price is invalid");
    }
    return BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0") || "0");
};

const formatCents = (cents) => {
    const whole = cents / 100n;
    const fraction = String(cents % 100n).padStart(2, "0");
    return `${whole}.${fraction}`;
};

const listPackages = repository.listActivePackages;

const getPackage = async (slug) => {
    const tourPackage = await repository.findPackageBySlug(slug);
    if (!tourPackage) {
        throw new HttpError(404, "YATRA_PACKAGE_NOT_FOUND", "Yatra package was not found");
    }
    return tourPackage;
};

const getDepartures = async (packageId) => {
    const [packages] = await getPool().execute(
        "SELECT id FROM yatra_packages WHERE id = ? AND is_active = TRUE LIMIT 1",
        [packageId]
    );
    if (!packages[0]) {
        throw new HttpError(404, "YATRA_PACKAGE_NOT_FOUND", "Yatra package was not found");
    }
    return repository.listDepartures(packageId);
};

const createBooking = async (input) => {
    const pool = getPool();
    const connection = await pool.getConnection();
    const reference = randomBytes(24).toString("hex");
    const cancellationToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(cancellationToken).digest();

    try {
        await connection.beginTransaction();
        const [packageRows] = await connection.execute(`
            SELECT id, base_price, currency
            FROM yatra_packages
            WHERE id = ? AND is_active = TRUE
            FOR UPDATE
        `, [input.packageId]);
        const tourPackage = packageRows[0];
        if (!tourPackage) {
            throw new HttpError(404, "YATRA_PACKAGE_NOT_FOUND", "Yatra package was not found or is inactive");
        }

        const [departureRows] = await connection.execute(`
            SELECT id, package_id, starts_at, capacity, reserved_seats, price,
                   starts_at > UTC_TIMESTAMP() AS is_future
            FROM yatra_departures
            WHERE id = ? AND package_id = ? AND is_active = TRUE
            FOR UPDATE
        `, [input.departureId, input.packageId]);
        const departure = departureRows[0];
        if (!departure || !departure.is_future) {
            throw new HttpError(400, "INVALID_DEPARTURE", "Selected departure is unavailable for this package");
        }

        const [expiredBookings] = await connection.execute(`
            SELECT id, traveler_count FROM yatra_bookings
            WHERE departure_id = ? AND status = 'pending_payment'
              AND reservation_expires_at <= UTC_TIMESTAMP()
            FOR UPDATE
        `, [departure.id]);
        if (expiredBookings.length) {
            const ids = expiredBookings.map(({ id }) => id);
            const placeholders = ids.map(() => "?").join(",");
            const releasedSeats = expiredBookings.reduce((sum, booking) => sum + booking.traveler_count, 0);
            await connection.execute(`
                UPDATE yatra_bookings SET status = 'expired'
                WHERE id IN (${placeholders}) AND status = 'pending_payment'
            `, ids);
            await connection.execute(`
                UPDATE yatra_departures
                SET reserved_seats = GREATEST(reserved_seats - ?, 0)
                WHERE id = ?
            `, [releasedSeats, departure.id]);
            departure.reserved_seats = Math.max(0, departure.reserved_seats - releasedSeats);
        }

        if (departure.capacity - departure.reserved_seats < input.travelers.length) {
            throw new HttpError(409, "DEPARTURE_FULL", "Departure does not have enough seats available");
        }

        const unitPrice = departure.price === null ? tourPackage.base_price : departure.price;
        const totalCents = priceToCents(unitPrice) * BigInt(input.travelers.length);
        if (totalCents > MAX_AMOUNT_CENTS) {
            throw new HttpError(422, "TOTAL_PRICE_TOO_LARGE", "Total booking price exceeds the supported amount");
        }
        const totalAmount = formatCents(totalCents);

        await connection.execute(
            "UPDATE yatra_departures SET reserved_seats = reserved_seats + ? WHERE id = ?",
            [input.travelers.length, departure.id]
        );
        const [bookingResult] = await connection.execute(`
            INSERT INTO yatra_bookings (
                reference, cancellation_token_hash, package_id, departure_id,
                contact_name, contact_email, contact_phone, traveler_count,
                amount, currency, reservation_expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))
        `, [
            reference,
            tokenHash,
            tourPackage.id,
            departure.id,
            input.contact.name,
            input.contact.email,
            input.contact.phone,
            input.travelers.length,
            totalAmount,
            tourPackage.currency,
            RESERVATION_MINUTES
        ]);
        await connection.query(
            "INSERT INTO yatra_booking_travelers (booking_id, traveler_name) VALUES ?",
            [input.travelers.map((name) => [bookingResult.insertId, name])]
        );
        await connection.commit();

        return {
            amount: totalAmount,
            cancellationToken,
            currency: tourPackage.currency,
            reference,
            reservationMinutes: RESERVATION_MINUTES,
            status: "pending_payment",
            travelerCount: input.travelers.length
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const getBooking = async (reference) => {
    const booking = await repository.findBooking(reference);
    if (!booking) {
        throw new HttpError(404, "YATRA_BOOKING_NOT_FOUND", "Yatra booking was not found");
    }
    return booking;
};

const cancelBooking = async (reference, cancellationToken) => {
    const connection = await getPool().getConnection();
    let status;
    try {
        await connection.beginTransaction();
        const [initialRows] = await connection.execute(
            "SELECT departure_id FROM yatra_bookings WHERE reference = ? LIMIT 1",
            [reference]
        );
        if (!initialRows[0]) {
            throw new HttpError(404, "YATRA_BOOKING_NOT_FOUND", "Yatra booking was not found");
        }
        await connection.execute(
            "SELECT id FROM yatra_departures WHERE id = ? FOR UPDATE",
            [initialRows[0].departure_id]
        );
        const [bookingRows] = await connection.execute(`
            SELECT id, departure_id, traveler_count, cancellation_token_hash, status,
                   reservation_expires_at <= UTC_TIMESTAMP() AS is_expired
            FROM yatra_bookings
            WHERE reference = ?
            FOR UPDATE
        `, [reference]);
        const booking = bookingRows[0];
        const suppliedHash = createHash("sha256").update(cancellationToken).digest();
        if (!timingSafeEqual(booking.cancellation_token_hash, suppliedHash)) {
            throw new HttpError(404, "YATRA_BOOKING_NOT_FOUND", "Yatra booking was not found");
        }
        if (booking.status !== "pending_payment") {
            throw new HttpError(409, "YATRA_BOOKING_NOT_CANCELLABLE", "Only pending bookings can be cancelled");
        }

        status = booking.is_expired ? "expired" : "cancelled";
        await connection.execute(
            "UPDATE yatra_bookings SET status = ? WHERE id = ? AND status = 'pending_payment'",
            [status, booking.id]
        );
        await connection.execute(`
            UPDATE yatra_departures
            SET reserved_seats = GREATEST(reserved_seats - ?, 0)
            WHERE id = ?
        `, [booking.traveler_count, booking.departure_id]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    if (status === "expired") {
        throw new HttpError(409, "YATRA_BOOKING_EXPIRED", "Yatra booking reservation has expired");
    }
    return { reference, status };
};

const expireReservations = async () => {
    const pool = getPool();
    const [departures] = await pool.query(`
        SELECT DISTINCT departure_id
        FROM yatra_bookings
        WHERE status = 'pending_payment'
          AND reservation_expires_at <= UTC_TIMESTAMP()
        LIMIT 100
    `);

    for (const { departure_id: departureId } of departures) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(
                "SELECT id FROM yatra_departures WHERE id = ? FOR UPDATE",
                [departureId]
            );
            const [expired] = await connection.execute(`
                SELECT id, traveler_count FROM yatra_bookings
                WHERE departure_id = ? AND status = 'pending_payment'
                  AND reservation_expires_at <= UTC_TIMESTAMP()
                FOR UPDATE
            `, [departureId]);
            if (expired.length) {
                const ids = expired.map(({ id }) => id);
                const placeholders = ids.map(() => "?").join(",");
                const releasedSeats = expired.reduce((sum, booking) => sum + booking.traveler_count, 0);
                await connection.execute(
                    `UPDATE yatra_bookings SET status = 'expired' WHERE id IN (${placeholders}) AND status = 'pending_payment'`,
                    ids
                );
                await connection.execute(
                    "UPDATE yatra_departures SET reserved_seats = GREATEST(reserved_seats - ?, 0) WHERE id = ?",
                    [releasedSeats, departureId]
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
    getBooking,
    getDepartures,
    getPackage,
    listPackages
};
