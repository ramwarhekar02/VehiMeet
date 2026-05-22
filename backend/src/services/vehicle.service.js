const { ApiError } = require("../utils/ApiError");
const { createAppId } = require("../utils/id");
const { Vehicle, VehicleCategory, PartnerProfile } = require("../models");

const hydrateVehicle = async (vehicle) => {
  const category = await VehicleCategory.findById(vehicle.categoryId);
  return {
    ...vehicle.toObject(),
    category: category?.toObject() || null,
  };
};

const isVehicleCustomerVisible = async (vehicle) => {
  if (!vehicle || !vehicle.isActive || vehicle.approvalStatus !== "APPROVED" || !vehicle.partnerId) {
    return false;
  }

  const profile = await PartnerProfile.findOne({ userId: vehicle.partnerId });
  return Boolean(profile?.approvedByAdmin);
};

const listVehicles = async () => {
  const vehicles = await Vehicle.find({
    isActive: true,
    approvalStatus: "APPROVED",
  }).sort({ createdAt: -1 });

  const visibleVehicles = [];
  for (const vehicle of vehicles) {
    if (await isVehicleCustomerVisible(vehicle)) {
      visibleVehicles.push(vehicle);
    }
  }

  return Promise.all(visibleVehicles.map(hydrateVehicle));
};

const listVehicleCategories = async () => VehicleCategory.find({ isActive: true }).sort({ name: 1 });

const getVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || !(await isVehicleCustomerVisible(vehicle))) return null;
  return hydrateVehicle(vehicle);
};

const upsertPartnerVehicle = async ({ partnerId, payload }) => {
  const [profile, category] = await Promise.all([
    PartnerProfile.findOne({ userId: partnerId }),
    VehicleCategory.findOne({ _id: payload.categoryId, isActive: true }),
  ]);

  if (!profile) {
    throw new ApiError(404, "Partner profile not found", "PARTNER_PROFILE_NOT_FOUND");
  }

  if (!category) {
    throw new ApiError(404, "Vehicle category not available", "CATEGORY_NOT_FOUND");
  }

  const existingPlate = await Vehicle.findOne({
    plateNumber: payload.plateNumber,
    partnerId: { $ne: partnerId },
  });
  if (existingPlate) {
    throw new ApiError(409, "Vehicle plate number already exists", "VEHICLE_PLATE_EXISTS");
  }

  const vehicle = profile.vehicleId
    ? await Vehicle.findById(profile.vehicleId)
    : new Vehicle({ _id: createAppId("veh"), partnerId });

  if (!vehicle) {
    throw new ApiError(404, "Linked vehicle not found", "VEHICLE_NOT_FOUND");
  }

  Object.assign(vehicle, {
    partnerId,
    categoryId: payload.categoryId,
    brand: payload.brand,
    model: payload.model,
    plateNumber: payload.plateNumber,
    seats: payload.seats,
    fuelType: payload.fuelType,
    color: payload.color,
    images: payload.images,
    documents: payload.documents,
    documentDetails: payload.documentDetails,
    isActive: true,
    approvalStatus: "PENDING_APPROVAL",
    pricingSnapshot: {
      categoryName: category.name,
      baseFare: category.baseFare,
      perKmRate: category.perKmRate,
      perMinuteRate: category.perMinuteRate,
    },
  });

  await vehicle.save();
  profile.vehicleId = vehicle._id;
  profile.approvedByAdmin = false;
  if (profile.status !== "SUSPENDED") {
    profile.status = "PENDING_APPROVAL";
  }
  await profile.save();

  return hydrateVehicle(vehicle);
};

module.exports = {
  listVehicles,
  listVehicleCategories,
  getVehicleById,
  upsertPartnerVehicle,
  isVehicleCustomerVisible,
};
