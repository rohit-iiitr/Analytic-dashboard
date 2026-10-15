"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { SearchIcon } from "./Icons";
import Pagination from "./Pagination";
import RepoCard from "./RepoCard";
import { RepoListSkeleton } from "./Skeletons";
import { ErrorState, StatusMessage } from "./StatusMessage";

const PER_PAGE = 10;

const SORT_OPTIONS = [
  { value: "best-match", label: "Best match" },
  { value: "stars", label: "Most stars" },
  { value: "updated", label: "Recently updated" },
];

const SUGGESTIONS = ["react", "machine learning", "nodejs", "tailwind", "rust cli"];

const readParams = (searchParams) => {
  const sort = searchParams.get("sort");
  const page = Number(searchParams.get("page"));
  return {
    q: (searchParams.get("q") || "").trim(),
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : "best-match",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
};

export default function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { q, sort, page } = readParams(searchParams);

  const [input, setInput] = useState(q);
  const [state, setState] = useState({ status: "idle", data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setInput(q);
  }, [q]);

  const updateUrl = useCallback(
    (next) => {
      const params = new URLSearchParams();
      const merged = { q, sort, page, ...next };
      if (merged.q) params.set("q", merged.q);
      if (merged.sort !== "best-match") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [q, sort, page, pathname, router]
  );

  useEffect(() => {
    if (!q) {
      setState({ status: "idle", data: null, error: null });
      return undefined;
    }

    const controller = new AbortController();
    setState((current) => ({ status: "loading", data: current.data, error: null }));

    api
      .searchRepos({ q, sort, page, perPage: PER_PAGE }, controller.signal)
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ status: "error", data: null, error });
      });

    return () => controller.abort();
  }, [q, sort, page, reloadKey]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const keyword = input.trim();
    if (!keyword) return;
    updateUrl({ q: keyword, page: 1 });
  };

  const handlePageChange = (nextPage) => {
    updateUrl({ page: nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { status, data, error } = state;

  return (
    <div>
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Explore GitHub repositories</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search public repositories, dig into their activity, and save the ones you like.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search keyword</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Search repositories, e.g. react, machine learning…"
              maxLength={256}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="sm:w-48">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(event) => updateUrl({ sort: event.target.value, page: 1 })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            Search
          </button>
        </form>
      </section>

      {status === "idle" && (
        <StatusMessage
          title="Start by searching for a repository"
          message="Type a keyword above. You can also use GitHub qualifiers like language:go or stars:>1000."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => updateUrl({ q: suggestion, page: 1 })}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          }
        />
      )}

      {status === "loading" && !data && <RepoListSkeleton />}

      {status === "error" && <ErrorState error={error} onRetry={() => setReloadKey((key) => key + 1)} />}

      {data && (status === "success" || status === "loading") && (
        <section aria-live="polite">
          {data.totalCount === 0 ? (
            <StatusMessage
              title="No repositories found"
              message={`We couldn't find any repositories matching "${data.query}". Try a different keyword or check the spelling.`}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">{formatNumber(data.totalCount)}</span> repositories
                  found for <span className="font-semibold text-slate-900">&ldquo;{data.query}&rdquo;</span>
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {data.cached && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      Served from cache
                    </span>
                  )}
                  <span>
                    Page {data.page} of {formatNumber(data.totalPages)}
                  </span>
                </div>
              </div>

              {data.incompleteResults && (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  GitHub returned incomplete results for this query because it took too long. Results may be partial.
                </p>
              )}

              <div className={`space-y-3 transition-opacity ${status === "loading" ? "opacity-50" : ""}`}>
                {data.items.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>

              {data.items.length === 0 && (
                <StatusMessage title="No results on this page" message="Try going back to an earlier page." />
              )}

              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onChange={handlePageChange}
                disabled={status === "loading"}
              />
              {data.totalCount > 1000 && data.page === data.totalPages && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  GitHub only exposes the first 1,000 results. Refine your keyword to narrow them down.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
