const assert = require("node:assert/strict");
const test = require("node:test");
const {
    parsePositiveId,
    validateCancellation,
    validateCreateBooking
} = require("./yatra.validation");

const validBooking = () => ({
    packageId: 3,
    departureId: 9,
    contact: {
        name: "Meera Sharma",
        email: "meera@example.com",
        phone: "+91 98765 43210"
    },
    travelers: ["Meera Sharma", "Aarav Sharma"]
});

test("Yatra booking validates and normalizes contact and traveler names", () => {
    const body = validBooking();
    body.amount = 0.01;
    const booking = validateCreateBooking(body);

    assert.equal(booking.packageId, 3);
    assert.equal(booking.departureId, 9);
    assert.equal(booking.contact.name, "Meera Sharma");
    assert.deepEqual(booking.travelers, ["Meera Sharma", "Aarav Sharma"]);
    assert.equal("amount" in booking, false);
});

test("Yatra booking rejects malformed IDs, contact, and traveler details", () => {
    assert.throws(() => parsePositiveId("0", "packageId"), { code: "INVALID_ID" });
    assert.throws(() => validateCreateBooking({}), { code: "INVALID_ID" });

    const invalidPhone = validBooking();
    invalidPhone.contact.phone = "not-a-phone";
    assert.throws(() => validateCreateBooking(invalidPhone), {
        code: "INVALID_CONTACT_PHONE"
    });

    const invalidEmail = validBooking();
    invalidEmail.contact.email = "invalid";
    assert.throws(() => validateCreateBooking(invalidEmail), {
        code: "INVALID_CONTACT_EMAIL"
    });

    const invalidTraveler = validBooking();
    invalidTraveler.travelers = [" "];
    assert.throws(() => validateCreateBooking(invalidTraveler), {
        code: "INVALID_TRAVELER_NAME"
    });

    const tooManyTravelers = validBooking();
    tooManyTravelers.travelers = Array.from({ length: 51 }, () => "Traveler Name");
    assert.throws(() => validateCreateBooking(tooManyTravelers), {
        code: "INVALID_TRAVELERS"
    });
});

test("Yatra cancellation requires a 256-bit hex token", () => {
    const token = "b".repeat(64);
    assert.equal(validateCancellation({ cancellationToken: token }), token);
    assert.throws(() => validateCancellation({ cancellationToken: "invalid" }), {
        code: "INVALID_CANCELLATION_TOKEN"
    });
});
