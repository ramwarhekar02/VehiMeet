const bcrypt = require("bcryptjs");
const { ROLES } = require("../constants/roles");
const { BOOKING_STATUS, PARTNER_STATUS, KYC_STATUS } = require("../constants/statuses");

const hashPassword = (plain) => bcrypt.hashSync(plain, 10);
const now = new Date("2026-03-25T10:00:00.000Z");

const users = [
  {
    _id: "usr_admin_1",
    role: ROLES.ADMIN,
    fullName: "Aarav Admin",
    email: "admin@vehimeet.dev",
    phone: "9000000001",
    passwordHash: hashPassword("Admin@123"),
    avatarUrl: "",
    isActive: true,
    isBlocked: false,
    emailVerified: true,
    phoneVerified: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: "usr_customer_1",
    role: ROLES.CUSTOMER,
    fullName: "Riya Customer",
    email: "customer@vehimeet.dev",
    phone: "9000000002",
    passwordHash: hashPassword("Customer@123"),
    avatarUrl: "",
    isActive: true,
    isBlocked: false,
    emailVerified: true,
    phoneVerified: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: "usr_partner_1",
    role: ROLES.PARTNER,
    fullName: "Kabir Partner",
    email: "partner@vehimeet.dev",
    phone: "9000000003",
    passwordHash: hashPassword("Partner@123"),
    avatarUrl: "",
    isActive: true,
    isBlocked: false,
    emailVerified: true,
    phoneVerified: true,
    createdAt: now,
    updatedAt: now,
  },
];

const customerProfiles = [
  {
    _id: "cp_1",
    userId: "usr_customer_1",
    defaultPickupAddresses: ["Koramangala, Bengaluru"],
    emergencyContact: {
      name: "Emergency Contact",
      phone: "9000000099",
    },
    kycStatus: KYC_STATUS.SCHEDULED,
    lastKycId: "kyc_1",
    preferences: {
      preferredCategoryId: "cat_sedan",
      prefersQuietRide: true,
    },
    createdAt: now,
    updatedAt: now,
  },
];

const partnerProfiles = [
  {
    _id: "pp_1",
    userId: "usr_partner_1",
    status: PARTNER_STATUS.ONLINE,
    vehicleId: "veh_1",
    licenseNumber: "DL-99887766",
    identityDocs: ["driving-license.pdf"],
    currentLocation: {
      type: "Point",
      coordinates: [77.6245, 12.9352],
    },
    serviceAreas: ["Bengaluru Central"],
    avgRating: 4.8,
    totalTrips: 132,
    approvedByAdmin: true,
    createdAt: now,
    updatedAt: now,
  },
];

const vehicleCategories = [
  {
    _id: "cat_sedan",
    name: "Sedan",
    description: "Comfortable daily city rides",
    baseFare: 120,
    perKmRate: 14,
    perMinuteRate: 2,
    cancellationFee: 50,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: "cat_suv",
    name: "SUV",
    description: "More space for groups and luggage",
    baseFare: 180,
    perKmRate: 18,
    perMinuteRate: 3,
    cancellationFee: 75,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: "cat_luxury",
    name: "Luxury",
    description: "Premium executive vehicle experience",
    baseFare: 320,
    perKmRate: 28,
    perMinuteRate: 5,
    cancellationFee: 125,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const vehicles = [
  {
    _id: "veh_1",
    partnerId: "usr_partner_1",
    categoryId: "cat_sedan",
    brand: "Hyundai",
    model: "Verna",
    plateNumber: "KA01AB1234",
    seats: 4,
    fuelType: "Petrol",
    color: "White",
    images: [],
    documents: ["rc.pdf", "insurance.pdf"],
    isActive: true,
    approvalStatus: "APPROVED",
    pricingSnapshot: {
      baseFare: 120,
      perKmRate: 14,
      perMinuteRate: 2,
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: "veh_2",
    partnerId: null,
    categoryId: "cat_suv",
    brand: "Mahindra",
    model: "XUV700",
    plateNumber: "KA02CD5678",
    seats: 6,
    fuelType: "Diesel",
    color: "Black",
    images: [],
    documents: [],
    isActive: true,
    approvalStatus: "APPROVED",
    pricingSnapshot: {
      baseFare: 180,
      perKmRate: 18,
      perMinuteRate: 3,
    },
    createdAt: now,
    updatedAt: now,
  },
];

const bookings = [
  {
    _id: "book_1",
    bookingCode: "VM-1001",
    customerId: "usr_customer_1",
    partnerId: "usr_partner_1",
    vehicleId: "veh_1",
    vehicleSnapshot: {
      brand: "Hyundai",
      model: "Verna",
      plateNumber: "KA01AB1234",
      categoryName: "Sedan",
    },
    pickup: {
      address: "Koramangala 5th Block, Bengaluru",
      lat: 12.9352,
      lng: 77.6245,
    },
    drop: {
      address: "Indiranagar Metro Station, Bengaluru",
      lat: 12.9784,
      lng: 77.6408,
    },
    routeInfo: {
      estimatedDistanceKm: 8.5,
      estimatedDurationMin: 26,
      polyline: "",
    },
    pricing: {
      baseFare: 120,
      distanceFare: 119,
      timeFare: 52,
      surgeMultiplier: 1,
      totalEstimatedFare: 291,
      finalFare: null,
    },
    status: BOOKING_STATUS.ASSIGNED,
    kycStatus: KYC_STATUS.SCHEDULED,
    assignedAt: now,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  },
];

const kycSessions = [
  {
    _id: "kyc_1",
    bookingId: "book_1",
    customerId: "usr_customer_1",
    status: KYC_STATUS.SCHEDULED,
    zegoRoomId: "room-book-1",
    zegoSessionId: "zego-session-book-1",
    scheduledAt: now,
    startedAt: null,
    completedAt: null,
    reviewedBy: null,
    reviewNotes: "",
    result: null,
    evidenceFiles: [],
    createdAt: now,
    updatedAt: now,
  },
];

const locationUpdates = [
  {
    _id: "loc_1",
    bookingId: "book_1",
    partnerId: "usr_partner_1",
    location: {
      type: "Point",
      coordinates: [77.6298, 12.9425],
    },
    speed: 32,
    heading: 90,
    accuracy: 4,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
  },
];

const notifications = [
  {
    _id: "not_1",
    userId: "usr_customer_1",
    type: "BOOKING_ASSIGNED",
    title: "Partner assigned",
    body: "Kabir Partner is on the way for booking VM-1001.",
    isRead: false,
    meta: { bookingId: "book_1" },
    createdAt: now,
  },
];

const auditLogs = [];

module.exports = {
  users,
  customerProfiles,
  partnerProfiles,
  vehicleCategories,
  vehicles,
  bookings,
  kycSessions,
  locationUpdates,
  notifications,
  auditLogs,
};
