const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, code = "ERROR", retryAfter = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const request = async (path, { method = "GET", body, signal } = {}) => {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Unable to reach the server. Please make sure the backend is running.", {
      code: "NETWORK_ERROR",
    });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.error?.message || `Request failed with status ${response.status}.`, {
      status: response.status,
      code: data?.error?.code,
      retryAfter: data?.error?.retryAfter ?? (Number(response.headers.get("Retry-After")) || null),
    });
  }
  return data;
};

const repoPath = (owner, name) => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

export const api = {
  searchRepos: ({ q, sort, page, perPage }, signal) => {
    const params = new URLSearchParams({ q, sort, page: String(page), perPage: String(perPage) });
    return request(`/repos/search?${params}`, { signal });
  },
  getRepoDetails: (owner, name, signal) => request(repoPath(owner, name), { signal }),
  getSaved: (signal) => request("/saved", { signal }),
  saveRepo: (owner, name) => request("/saved", { method: "POST", body: { owner, name } }),
  removeSaved: (id) => request(`/saved/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
