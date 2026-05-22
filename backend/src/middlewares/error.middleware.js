const { ZodError } = require("zod");

const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = "ROUTE_NOT_FOUND";
  next(error);
};

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: error.flatten(),
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Database validation failed",
      code: "DB_VALIDATION_ERROR",
      details: Object.fromEntries(
        Object.entries(error.errors || {}).map(([key, value]) => [key, value.message])
      ),
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate value violates a unique constraint",
      code: "DUPLICATE_KEY",
      details: error.keyValue || {},
    });
  }

  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    code: error.code || "INTERNAL_SERVER_ERROR",
    details: error.details || {},
  });
};

module.exports = { notFoundHandler, errorHandler };
