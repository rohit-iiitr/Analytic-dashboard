import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { TtlCache } from "../utils/TtlCache.js";
import { githubRequest } from "./githubClient.js";

const GITHUB_SEARCH_RESULT_LIMIT = 1000;

const searchCache = new TtlCache(env.searchCacheTtlMs);

const SORT_OPTIONS = {
  "best-match": {},
  stars: { sort: "stars", order: "desc" },
  updated: { sort: "updated", order: "desc" },
};

export const SORT_KEYS = Object.keys(SORT_OPTIONS);

export const normalizeRepo = (repo) => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name,
  owner: {
    login: repo.owner?.login ?? "",
    avatarUrl: repo.owner?.avatar_url ?? "",
    htmlUrl: repo.owner?.html_url ?? "",
  },
  description: repo.description ?? "",
  htmlUrl: repo.html_url,
  homepage: repo.homepage || "",
  language: repo.language ?? null,
  stars: repo.stargazers_count ?? 0,
  forks: repo.forks_count ?? 0,
  watchers: repo.subscribers_count ?? repo.watchers_count ?? 0,
  openIssuesAndPulls: repo.open_issues_count ?? 0,
  topics: repo.topics ?? [],
  license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : repo.license?.name ?? null,
  defaultBranch: repo.default_branch ?? null,
  archived: Boolean(repo.archived),
  fork: Boolean(repo.fork),
  size: repo.size ?? 0,
  createdAt: repo.created_at ?? null,
  updatedAt: repo.updated_at ?? null,
  pushedAt: repo.pushed_at ?? null,
});

const normalizeCommit = (commit) => ({
  sha: commit.sha,
  shortSha: commit.sha?.slice(0, 7) ?? "",
  message: commit.commit?.message?.split("\n")[0] ?? "",
  authorName: commit.commit?.author?.name ?? commit.author?.login ?? "Unknown",
  authorLogin: commit.author?.login ?? null,
  authorAvatarUrl: commit.author?.avatar_url ?? null,
  date: commit.commit?.author?.date ?? commit.commit?.committer?.date ?? null,
  htmlUrl: commit.html_url,
});

const normalizeContributor = (contributor) => ({
  login: contributor.login,
  avatarUrl: contributor.avatar_url,
  htmlUrl: contributor.html_url,
  contributions: contributor.contributions ?? 0,
});

const repoPath = (owner, name) => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

export const searchRepositories = async ({ query, page, perPage, sort }) => {
  if ((page - 1) * perPage >= GITHUB_SEARCH_RESULT_LIMIT) {
    throw new AppError(
      400,
      `GitHub only provides the first ${GITHUB_SEARCH_RESULT_LIMIT} search results. Please choose an earlier page.`,
      "PAGE_OUT_OF_RANGE"
    );
  }

  const cacheKey = JSON.stringify([query.toLowerCase(), sort, page, perPage]);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return { ...cached.value, cached: true, cachedAt: new Date(cached.cachedAt).toISOString() };
  }

  const { data } = await githubRequest("/search/repositories", {
    q: query,
    page,
    per_page: perPage,
    ...SORT_OPTIONS[sort],
  });

  const totalCount = data?.total_count ?? 0;
  const items = Array.isArray(data?.items) ? data.items.map(normalizeRepo) : [];
  const result = {
    query,
    sort,
    page,
    perPage,
    totalCount,
    totalPages: Math.ceil(Math.min(totalCount, GITHUB_SEARCH_RESULT_LIMIT) / perPage),
    incompleteResults: Boolean(data?.incomplete_results),
    items,
  };

  const entry = searchCache.set(cacheKey, result);
  return { ...result, cached: false, cachedAt: new Date(entry.cachedAt).toISOString() };
};

export const getRepository = async (owner, name) => {
  try {
    const { data } = await githubRequest(repoPath(owner, name));
    return normalizeRepo(data);
  } catch (error) {
    if (error.status === 404) {
      throw new AppError(404, `Repository "${owner}/${name}" was not found. It may be private, renamed, or deleted.`, "REPO_NOT_FOUND");
    }
    throw error;
  }
};

const getLatestCommits = async (owner, name) => {
  try {
    const { data } = await githubRequest(`${repoPath(owner, name)}/commits`, { per_page: 5 });
    return Array.isArray(data) ? data.slice(0, 5).map(normalizeCommit) : [];
  } catch (error) {
    if (error.extra?.githubStatus === 409) return [];
    throw error;
  }
};

const getTopContributors = async (owner, name) => {
  const { data } = await githubRequest(`${repoPath(owner, name)}/contributors`, { per_page: 5 });
  return Array.isArray(data) ? data.slice(0, 5).map(normalizeContributor) : [];
};

const getOpenIssuesCount = async (fullName) => {
  const { data } = await githubRequest("/search/issues", {
    q: `repo:${fullName} is:issue is:open`,
    per_page: 1,
  });
  return data?.total_count ?? 0;
};

const sectionResult = (settled) =>
  settled.status === "fulfilled"
    ? { data: settled.value, error: null }
    : {
        data: null,
        error: {
          message: settled.reason?.message || "Failed to load this section.",
          code: settled.reason?.code || "ERROR",
        },
      };

export const getRepositoryDetails = async (owner, name) => {
  const repository = await getRepository(owner, name);

  const [commits, contributors, openIssues] = await Promise.allSettled([
    getLatestCommits(repository.owner.login, repository.name),
    getTopContributors(repository.owner.login, repository.name),
    getOpenIssuesCount(repository.fullName),
  ]);

  const issues = sectionResult(openIssues);

  return {
    repository,
    commits: sectionResult(commits),
    contributors: sectionResult(contributors),
    openIssues: issues.error
      ? { count: repository.openIssuesAndPulls, includesPullRequests: true, error: issues.error }
      : { count: issues.data, includesPullRequests: false, error: null },
  };
};
