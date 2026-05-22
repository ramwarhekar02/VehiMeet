const EventEmitter = require("events");
const { getSocketServer } = require("./socket");

const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(200);

const emitRealtime = (event, payload) => {
  const message = {
    event,
    payload,
    emittedAt: new Date().toISOString(),
  };
  realtimeBus.emit("message", message);

  const io = getSocketServer();
  if (!io) return;

  io.to("admin:dashboard").emit(event, message);

  if (payload?.bookingId) {
    io.to(`booking:${payload.bookingId}`).emit(event, message);
  }

  if (payload?.customerId) {
    io.to(`user:${payload.customerId}`).emit(event, message);
  }

  if (payload?.partnerId) {
    io.to(`user:${payload.partnerId}`).emit(event, message);
    io.to(`partner:${payload.partnerId}`).emit(event, message);
  }

  if (payload?.kycSessionId) {
    io.to(`kyc:${payload.kycSessionId}`).emit(event, message);
  }
};

module.exports = { realtimeBus, emitRealtime };
