const HttpError = require("../../utils/HttpError");

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const parsePositiveId = (value, fieldName) => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new HttpError(400, "INVALID_ID", `${fieldName} must be a positive integer`);
    }
    return parsed;
};

const validateCreateBooking = (body) => {
    if (!isRecord(body)) {
        throw new HttpError(400, "INVALID_BODY", "Request body must be an object");
    }
    const packageId = parsePositiveId(body.packageId, "packageId");
    const departureId = parsePositiveId(body.departureId, "departureId");

    if (!isRecord(body.contact)) {
        throw new HttpError(400, "INVALID_CONTACT", "contact must be an object");
    }
    const { name, email, phone } = body.contact;
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150) {
        throw new HttpError(400, "INVALID_CONTACT_NAME", "contact.name must be 2 to 150 characters");
    }
    if (typeof phone !== "string" || !/^[+0-9()\-\s]{7,30}$/.test(phone.trim()) ||
        (phone.match(/\d/g) || []).length < 7) {
        throw new HttpError(400, "INVALID_CONTACT_PHONE", "contact.phone must be a valid phone number");
    }
    if (email !== undefined && email !== null &&
        (typeof email !== "string" || email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw new HttpError(400, "INVALID_CONTACT_EMAIL", "contact.email must be a valid email address");
    }
    if (!Array.isArray(body.travelers) || body.travelers.length < 1 || body.travelers.length > 50) {
        throw new HttpError(400, "INVALID_TRAVELERS", "travelers must contain 1 to 50 names");
    }

    const travelers = body.travelers.map((traveler, index) => {
        if (typeof traveler !== "string" || traveler.trim().length < 2 ||
            traveler.trim().length > 150) {
            throw new HttpError(
                400,
                "INVALID_TRAVELER_NAME",
                `travelers[${index}] must be a name of 2 to 150 characters`
            );
        }
        return traveler.trim();
    });

    return {
        contact: {
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone.trim()
        },
        departureId,
        packageId,
        travelers
    };
};

const validateCancellation = (body) => {
    if (!isRecord(body) || typeof body.cancellationToken !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.cancellationToken)) {
        throw new HttpError(400, "INVALID_CANCELLATION_TOKEN", "A valid cancellationToken is required");
    }
    return body.cancellationToken;
};

module.exports = { parsePositiveId, validateCancellation, validateCreateBooking };
