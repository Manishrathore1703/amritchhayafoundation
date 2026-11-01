const express = require("express");
const controller = require("./pooja.controller");

const router = express.Router();

router.get("/poojas", controller.listPoojas);
router.get("/poojas/:poojaId/sankalp-options", controller.getSankalpOptions);
router.get("/poojas/:poojaId/slots", controller.getSlots);
router.get("/poojas/:slug", controller.getPooja);
router.post("/pooja-bookings", controller.createBooking);
router.get("/pooja-bookings/:reference", controller.getBookingStatus);
router.post("/pooja-bookings/:reference/cancel", controller.cancelBooking);

module.exports = router;
