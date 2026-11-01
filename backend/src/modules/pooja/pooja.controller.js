const {
    parsePositiveId,
    parseSlotQuery,
    validateCancelBooking,
    validateCreateBooking
} = require("./pooja.validation");
const service = require("./pooja.service");

const listPoojas = async (req, res) => {
    res.json({ data: await service.listPoojas() });
};

const getPooja = async (req, res) => {
    res.json({ data: await service.getPoojaBySlug(req.params.slug) });
};

const getSankalpOptions = async (req, res) => {
    const poojaId = parsePositiveId(req.params.poojaId, "poojaId");
    await service.getPoojaById(poojaId);
    res.json({ data: await service.getSankalpOptions(poojaId) });
};

const getSlots = async (req, res) => {
    const poojaId = parsePositiveId(req.params.poojaId, "poojaId");
    res.json({ data: await service.getSlots(poojaId, parseSlotQuery(req.query)) });
};

const createBooking = async (req, res) => {
    const booking = await service.createBooking(validateCreateBooking(req.body));
    res.status(201).json({ data: booking });
};

const getBookingStatus = async (req, res) => {
    res.json({ data: await service.getBookingStatus(req.params.reference) });
};

const cancelBooking = async (req, res) => {
    const cancellationToken = validateCancelBooking(req.body);
    res.json({ data: await service.cancelBooking(req.params.reference, cancellationToken) });
};

module.exports = {
    cancelBooking,
    createBooking,
    getBookingStatus,
    getPooja,
    getSlots,
    getSankalpOptions,
    listPoojas
};
