const { parsePositiveId, validateCancellation, validateCreateBooking } = require("./yatra.validation");
const service = require("./yatra.service");

const listPackages = async (req, res) => {
    res.json({ data: await service.listPackages() });
};

const getPackage = async (req, res) => {
    res.json({ data: await service.getPackage(req.params.slug) });
};

const getDepartures = async (req, res) => {
    const packageId = parsePositiveId(req.params.packageId, "packageId");
    res.json({ data: await service.getDepartures(packageId) });
};

const createBooking = async (req, res) => {
    res.status(201).json({ data: await service.createBooking(validateCreateBooking(req.body)) });
};

const getBooking = async (req, res) => {
    res.json({ data: await service.getBooking(req.params.reference) });
};

const cancelBooking = async (req, res) => {
    const cancellationToken = validateCancellation(req.body);
    res.json({ data: await service.cancelBooking(req.params.reference, cancellationToken) });
};

module.exports = { cancelBooking, createBooking, getBooking, getDepartures, getPackage, listPackages };
