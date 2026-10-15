import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const GITHUB_API_URL = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 10000;

const rateLimits = {
  core: null,
  search: null,
};

const resourceFor = (path) => (path.startsWith("/search/") ? "search" : "core");

const rateLimitError = (resetAtMs, resource) => {
  const retryAfter = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
  return new AppError(
    429,
    `GitHub API rate limit exceeded. Please try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`,
    "RATE_LIMITED",
    { retryAfter, resetAt: new Date(resetAtMs).toISOString(), resource }
  );
};

const guardRateLimit = (resource) => {
  const state = rateLimits[resource];
  if (state && state.remaining <= 0 && state.resetAtMs > Date.now()) {
    throw rateLimitError(state.resetAtMs, resource);
  }
};

const recordRateLimit = (response, fallbackResource) => {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  if (remaining === null || reset === null) return;
  const resource = response.headers.get("x-ratelimit-resource") || fallbackResource;
  if (!(resource in rateLimits)) return;
  rateLimits[resource] = {
    limit: Number(response.headers.get("x-ratelimit-limit")),
    remaining: Number(remaining),
    resetAtMs: Number(reset) * 1000,
  };
};

const toAppError = (response, body, resource) => {
  const { status, headers } = response;
  const githubMessage = typeof body?.message === "string" ? body.message : "";
  const extra = { githubStatus: status };

  if (status === 403 || status === 429) {
    const retryAfterHeader = Number(headers.get("retry-after"));
    if (headers.get("x-ratelimit-remaining") === "0") {
      const resetAtMs = Number(headers.get("x-ratelimit-reset")) * 1000 || Date.now() + 60000;
      return rateLimitError(resetAtMs, resource);
    }
    if (retryAfterHeader > 0 || /rate limit/i.test(githubMessage)) {
      return rateLimitError(Date.now() + (retryAfterHeader || 60) * 1000, resource);
    }
    return new AppError(403, githubMessage || "Access to this GitHub resource is forbidden.", "GITHUB_FORBIDDEN", extra);
  }

  if (status === 404) {
    return new AppError(404, "The requested resource was not found on GitHub.", "NOT_FOUND", extra);
  }
  if (status === 451) {
    return new AppError(451, "This repository is unavailable for legal reasons.", "REPO_UNAVAILABLE", extra);
  }
  if (status === 422) {
    return new AppError(400, githubMessage || "GitHub rejected the request as invalid.", "INVALID_REQUEST", extra);
  }
  if (status === 401) {
    return new AppError(502, "GitHub authentication failed. Check the GITHUB_TOKEN configured on the server.", "GITHUB_AUTH_FAILED", extra);
  }
  if (status >= 500) {
    return new AppError(502, "GitHub API is currently unavailable. Please try again later.", "GITHUB_UNAVAILABLE", extra);
  }
  return new AppError(502, githubMessage || "Unexpected response from GitHub API.", "GITHUB_ERROR", extra);
};

const buildHeaders = () => {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-analytics-dashboard",
  };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return headers;
};

export const githubRequest = async (path, params = {}) => {
  const resource = resourceFor(path);
  guardRateLimit(resource);

  const url = new URL(path, GITHUB_API_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  let response;
  try {
    response = await fetch(url, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new AppError(504, "GitHub API did not respond in time. Please try again.", "GITHUB_TIMEOUT");
    }
    throw new AppError(503, "Unable to reach GitHub API. Please check your connection and try again.", "GITHUB_UNREACHABLE");
  }

  recordRateLimit(response, resource);

  const text = await response.text().catch(() => "");
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) throw toAppError(response, body, resource);

  if (response.status !== 204 && text && body === null) {
    throw new AppError(502, "GitHub API returned an invalid response.", "GITHUB_INVALID_RESPONSE");
  }
  return { status: response.status, data: body };
};

export const getRateLimitStatus = () =>
  Object.fromEntries(
    Object.entries(rateLimits).map(([resource, state]) => [
      resource,
      state
        ? { limit: state.limit, remaining: state.remaining, resetAt: new Date(state.resetAtMs).toISOString() }
        : null,
    ])
  );

export const hasGithubToken = () => Boolean(env.githubToken);
