const { getPool } = require("../../config/db");

const listActivePackages = async () => {
    const [rows] = await getPool().query(`
        SELECT id, slug, name_en, name_hi, description_en, description_hi,
               card_image_url, hero_image_url, base_price, currency, is_featured
        FROM yatra_packages
        WHERE is_active = TRUE
        ORDER BY sort_order, id
    `);
    return rows;
};

const findPackageBySlug = async (slug) => {
    const [rows] = await getPool().execute(`
        SELECT id, slug, name_en, name_hi, description_en, description_hi,
               itinerary_en, itinerary_hi, card_image_url, hero_image_url,
               base_price, currency, is_featured
        FROM yatra_packages
        WHERE slug = ? AND is_active = TRUE
        LIMIT 1
    `, [slug]);
    return rows[0] || null;
};

const listDepartures = async (packageId) => {
    const [rows] = await getPool().execute(`
        SELECT id, package_id, starts_at, ends_at, capacity, reserved_seats,
               capacity - reserved_seats AS available_seats,
               price AS departure_price
        FROM yatra_departures
        WHERE package_id = ? AND is_active = TRUE
          AND starts_at > UTC_TIMESTAMP() AND reserved_seats < capacity
        ORDER BY starts_at
    `, [packageId]);
    return rows;
};

const findBooking = async (reference) => {
    const [rows] = await getPool().execute(`
        SELECT b.reference, b.status, b.traveler_count, b.amount, b.currency,
               b.reservation_expires_at, b.created_at,
               p.slug AS package_slug, p.name_en AS package_name_en,
               p.name_hi AS package_name_hi, d.starts_at, d.ends_at
        FROM yatra_bookings b
        JOIN yatra_packages p ON p.id = b.package_id
        JOIN yatra_departures d ON d.id = b.departure_id
        WHERE b.reference = ?
        LIMIT 1
    `, [reference]);
    return rows[0] || null;
};

module.exports = { findBooking, findPackageBySlug, listActivePackages, listDepartures };
