const sendSuccess = (res, payload = {}) => {
  const { statusCode = 200, message = "Request completed", data = null } = payload;
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

module.exports = { sendSuccess };
