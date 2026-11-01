const assert = require("node:assert/strict");
const test = require("node:test");
const {
    parsePositiveId,
    parseSlotQuery,
    validateCancelBooking,
    validateCreateBooking
} = require("./pooja.validation");

const validBooking = () => ({
    poojaId: 1,
    sankalpOptionId: 2,
    slotId: 3,
    mode: "online",
    contact: {
        name: "Aarav Sharma",
        email: "aarav@example.com",
        phone: "+91 98765 43210"
    },
    participants: ["Aarav Sharma"]
});

test("booking input is normalized and client-supplied prices are ignored", () => {
    const body = validBooking();
    body.amount = 0.01;
    const booking = validateCreateBooking(body);

    assert.equal(booking.contact.name, "Aarav Sharma");
    assert.deepEqual(booking.participants, ["Aarav Sharma"]);
    assert.equal("amount" in booking, false);
});

test("booking input rejects malformed IDs, contact details, and participants", () => {
    assert.throws(() => parsePositiveId("0", "poojaId"), { code: "INVALID_ID" });
    assert.throws(() => parseSlotQuery({ mode: "both" }), { code: "INVALID_MODE" });
    assert.throws(() => parseSlotQuery({ mode: "online", date: "2026-02-31" }), {
        code: "INVALID_DATE"
    });

    const missingPhone = validBooking();
    missingPhone.contact.phone = "-------";
    assert.throws(() => validateCreateBooking(missingPhone), { code: "INVALID_CONTACT_PHONE" });

    const badParticipant = validBooking();
    badParticipant.participants = [" "];
    assert.throws(() => validateCreateBooking(badParticipant), {
        code: "INVALID_PARTICIPANT_NAME"
    });
});

test("cancellation requires a 256-bit hex token", () => {
    const token = "a".repeat(64);
    assert.equal(validateCancelBooking({ cancellationToken: token }), token);
    assert.throws(() => validateCancelBooking({ cancellationToken: "short" }), {
        code: "INVALID_CANCELLATION_TOKEN"
    });
});
