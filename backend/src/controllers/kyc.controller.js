const { createKycSchema, completeKycSchema, reviewKycSchema } = require("../validations/kyc.validation");
const { createSession, findSession, startSession, completeSession, reviewSession } = require("../services/kyc.service");
const { sendSuccess } = require("../utils/response");

const createKycSession = async (req, res) => {
  const payload = createKycSchema.parse(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "KYC session created",
    data: await createSession(payload),
  });
};

const getKycSession = async (req, res) =>
  sendSuccess(res, { message: "KYC session fetched", data: await findSession(req.params.id) });

const startKycSession = async (req, res) =>
  sendSuccess(res, { message: "KYC session started", data: await startSession(req.params.id) });

const completeKycSession = async (req, res) => {
  const payload = completeKycSchema.parse(req.body);
  return sendSuccess(res, {
    message: "KYC session completion recorded",
    data: await completeSession(req.params.id, payload.evidenceFiles),
  });
};

const reviewKycByAdmin = async (req, res) => {
  const payload = reviewKycSchema.parse(req.body);
  return sendSuccess(res, {
    message: "KYC review saved",
    data: await reviewSession({
      sessionId: req.params.id,
      reviewerId: req.user.id,
      ...payload,
    }),
  });
};

module.exports = {
  createKycSession,
  getKycSession,
  startKycSession,
  completeKycSession,
  reviewKycByAdmin,
};
