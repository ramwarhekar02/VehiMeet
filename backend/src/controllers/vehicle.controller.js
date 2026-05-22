const { listVehicles, listVehicleCategories, getVehicleById } = require("../services/vehicle.service");
const { ApiError } = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");

const getVehicles = async (_req, res) =>
  sendSuccess(res, { message: "Vehicles fetched", data: await listVehicles() });

const getVehicleCategories = async (_req, res) =>
  sendSuccess(res, { message: "Vehicle categories fetched", data: await listVehicleCategories() });

const getVehicle = async (req, res) => {
  const vehicle = await getVehicleById(req.params.id);
  if (!vehicle) {
    throw new ApiError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");
  }
  return sendSuccess(res, { message: "Vehicle fetched", data: vehicle });
};

module.exports = { getVehicles, getVehicleCategories, getVehicle };
