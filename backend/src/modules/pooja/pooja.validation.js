const HttpError = require("../../utils/HttpError");

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const parsePositiveId = (value, fieldName) => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new HttpError(400, "INVALID_ID", `${fieldName} must be a positive integer`);
    }
    return parsed;
};

const parseMode = (value) => {
    if (value !== "online" && value !== "offline") {
        throw new HttpError(400, "INVALID_MODE", "mode must be online or offline");
    }
    return value;
};

const parseSlotQuery = (query) => {
    const mode = parseMode(query.mode);
    const date = query.date;
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
        throw new HttpError(400, "INVALID_DATE", "date must use YYYY-MM-DD format");
    }
    if (date !== undefined) {
        const parsedDate = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
            throw new HttpError(400, "INVALID_DATE", "date must be a valid calendar date");
        }
    }
    return { date, mode };
};

const validateCreateBooking = (body) => {
    if (!isRecord(body)) {
        throw new HttpError(400, "INVALID_BODY", "Request body must be an object");
    }

    const poojaId = parsePositiveId(body.poojaId, "poojaId");
    const sankalpOptionId = parsePositiveId(body.sankalpOptionId, "sankalpOptionId");
    const slotId = parsePositiveId(body.slotId, "slotId");
    const mode = parseMode(body.mode);

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

    if (!Array.isArray(body.participants) || body.participants.length < 1 ||
        body.participants.length > 100) {
        throw new HttpError(400, "INVALID_PARTICIPANTS", "participants must contain 1 to 100 names");
    }

    const participants = body.participants.map((participant, index) => {
        if (typeof participant !== "string" || participant.trim().length < 2 ||
            participant.trim().length > 150) {
            throw new HttpError(
                400,
                "INVALID_PARTICIPANT_NAME",
                `participants[${index}] must be a name of 2 to 150 characters`
            );
        }
        return participant.trim();
    });

    return {
        contact: {
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone.trim()
        },
        mode,
        participants,
        poojaId,
        sankalpOptionId,
        slotId
    };
};

const validateCancelBooking = (body) => {
    if (!isRecord(body) || typeof body.cancellationToken !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.cancellationToken)) {
        throw new HttpError(400, "INVALID_CANCELLATION_TOKEN", "A valid cancellationToken is required");
    }
    return body.cancellationToken;
};

module.exports = {
    parsePositiveId,
    parseSlotQuery,
    validateCancelBooking,
    validateCreateBooking
};
