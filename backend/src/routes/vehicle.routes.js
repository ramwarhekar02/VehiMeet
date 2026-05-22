const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { getVehicles, getVehicleCategories, getVehicle } = require("../controllers/vehicle.controller");

const router = express.Router();

router.get("/", asyncHandler(getVehicles));
router.get("/categories", asyncHandler(getVehicleCategories));
router.get("/:id", asyncHandler(getVehicle));

module.exports = router;
