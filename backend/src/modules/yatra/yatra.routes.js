const express = require("express");
const controller = require("./yatra.controller");

const router = express.Router();

router.get("/yatra/packages", controller.listPackages);
router.get("/yatra/packages/:packageId/departures", controller.getDepartures);
router.get("/yatra/packages/:slug", controller.getPackage);
router.post("/yatra/bookings", controller.createBooking);
router.get("/yatra/bookings/:reference", controller.getBooking);
router.post("/yatra/bookings/:reference/cancel", controller.cancelBooking);

module.exports = router;
