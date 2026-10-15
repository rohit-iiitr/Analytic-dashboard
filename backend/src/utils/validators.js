import mongoose from "mongoose";
import { AppError } from "./AppError.js";

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const MAX_QUERY_LENGTH = 256;
export const MAX_PER_PAGE = 50;
export const DEFAULT_PER_PAGE = 10;

const parsePositiveInt = (value, fallback, field) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(400, `"${field}" must be a positive whole number.`, "VALIDATION_ERROR");
  }
  return parsed;
};

export const validateSearchQuery = (query, sortKeys) => {
  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (!q) {
    throw new AppError(400, "Please enter a keyword to search repositories.", "VALIDATION_ERROR");
  }
  if (q.length > MAX_QUERY_LENGTH) {
    throw new AppError(400, `Search keyword must be at most ${MAX_QUERY_LENGTH} characters.`, "VALIDATION_ERROR");
  }

  const sort = query.sort === undefined || query.sort === "" ? "best-match" : query.sort;
  if (!sortKeys.includes(sort)) {
    throw new AppError(400, `"sort" must be one of: ${sortKeys.join(", ")}.`, "VALIDATION_ERROR");
  }

  const page = parsePositiveInt(query.page, 1, "page");
  const perPage = parsePositiveInt(query.perPage, DEFAULT_PER_PAGE, "perPage");
  if (perPage > MAX_PER_PAGE) {
    throw new AppError(400, `"perPage" must be at most ${MAX_PER_PAGE}.`, "VALIDATION_ERROR");
  }

  return { query: q, sort, page, perPage };
};

export const validateRepoIdentifier = (owner, name) => {
  const cleanOwner = typeof owner === "string" ? owner.trim() : "";
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!OWNER_PATTERN.test(cleanOwner) || !REPO_PATTERN.test(cleanName) || cleanName === "." || cleanName === "..") {
    throw new AppError(400, "Invalid repository owner or name.", "INVALID_REPOSITORY");
  }
  return { owner: cleanOwner, name: cleanName };
};

export const validateObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, "Invalid saved repository id.", "VALIDATION_ERROR");
  }
  return id;
};
