import { AppError } from "../utils/AppError.js";

export const notFoundHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found.`, "ROUTE_NOT_FOUND"));
};

export const errorHandler = (err, _req, res, _next) => {
  let error = err;

  if (err?.type === "entity.parse.failed") {
    error = new AppError(400, "Request body contains invalid JSON.", "INVALID_JSON");
  } else if (err?.name === "ValidationError" || err?.name === "CastError") {
    error = new AppError(400, err.message, "VALIDATION_ERROR");
  } else if (err?.name?.startsWith("Mongo")) {
    error = new AppError(503, "Database operation failed. Please try again later.", "DB_ERROR");
  }

  if (!(error instanceof AppError)) {
    console.error(err);
    error = new AppError(500, "Something went wrong on the server.", "INTERNAL_ERROR");
  }

  if (error.extra?.retryAfter) res.set("Retry-After", String(error.extra.retryAfter));

  const { githubStatus, ...publicExtra } = error.extra ?? {};
  res.status(error.status).json({
    error: { message: error.message, code: error.code, ...publicExtra },
  });
};
