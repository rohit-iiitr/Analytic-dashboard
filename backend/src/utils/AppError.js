export class AppError extends Error {
  constructor(status, message, code = "ERROR", extra = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
