const { getPool } = require("../../config/db");

const listActivePoojas = async () => {
    const [rows] = await getPool().query(`
        SELECT id, slug, name_en, name_hi, description_en, description_hi,
               duration_minutes, mode, card_image_url, hero_image_url, is_featured
        FROM poojas
        WHERE is_active = TRUE
        ORDER BY sort_order, id
    `);
    return rows;
};

const findActivePoojaBySlug = async (slug) => {
    const [rows] = await getPool().execute(`
        SELECT id, slug, name_en, name_hi, description_en, description_hi,
               duration_minutes, mode, card_image_url, hero_image_url, is_featured
        FROM poojas
        WHERE slug = ? AND is_active = TRUE
        LIMIT 1
    `, [slug]);
    return rows[0] || null;
};

const listActiveSankalpOptions = async (poojaId) => {
    const [rows] = await getPool().execute(`
        SELECT id, pooja_id, slug, name_en, name_hi, participant_count, price, currency
        FROM pooja_sankalp_options
        WHERE pooja_id = ? AND is_active = TRUE
        ORDER BY sort_order, id
    `, [poojaId]);
    return rows;
};

const listAvailableSlots = async ({ date, mode, poojaId }) => {
    const conditions = [
        "pooja_id = ?",
        "mode = ?",
        "is_active = TRUE",
        "starts_at > UTC_TIMESTAMP()",
        "reserved_count < capacity"
    ];
    const params = [poojaId, mode];

    if (date) {
        conditions.push("DATE(starts_at) = ?");
        params.push(date);
    }

    const [rows] = await getPool().execute(`
        SELECT id, pooja_id, mode, starts_at, capacity, reserved_count,
               capacity - reserved_count AS available
        FROM pooja_slots
        WHERE ${conditions.join(" AND ")}
        ORDER BY starts_at
    `, params);
    return rows;
};

const findBookingStatus = async (reference) => {
    const [rows] = await getPool().execute(`
        SELECT b.reference, b.status, b.amount, b.currency,
               b.reservation_expires_at, b.created_at,
               p.slug AS pooja_slug, p.name_en AS pooja_name_en,
               p.name_hi AS pooja_name_hi,
               s.name_en AS sankalp_name_en, s.name_hi AS sankalp_name_hi,
               b.mode, slot.starts_at
        FROM pooja_bookings b
        JOIN poojas p ON p.id = b.pooja_id
        JOIN pooja_sankalp_options s ON s.id = b.sankalp_option_id
        JOIN pooja_slots slot ON slot.id = b.slot_id
        WHERE b.reference = ?
        LIMIT 1
    `, [reference]);
    return rows[0] || null;
};

module.exports = {
    findActivePoojaBySlug,
    findBookingStatus,
    listActivePoojas,
    listActiveSankalpOptions,
    listAvailableSlots
};
