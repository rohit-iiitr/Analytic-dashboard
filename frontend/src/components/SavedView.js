"use client";

import Image from "next/image";
import Link from "next/link";
import { useSavedRepos } from "@/context/SavedReposContext";
import { formatCompact, formatDate } from "@/lib/format";
import { ForkIcon, StarIcon } from "./Icons";
import { LanguageBadge } from "./RepoCard";
import { RepoListSkeleton } from "./Skeletons";
import { ErrorState, StatusMessage } from "./StatusMessage";

export default function SavedView() {
  const { items, status, error, reload, remove, isPending } = useSavedRepos();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved repositories</h1>
        <p className="mt-1 text-sm text-slate-600">Your favourite repositories, stored in MongoDB.</p>
      </div>

      {status === "loading" && <RepoListSkeleton count={3} />}

      {status === "error" && <ErrorState error={error} onRetry={() => reload()} />}

      {status === "ready" && items.length === 0 && (
        <StatusMessage
          title="No saved repositories yet"
          message="Search for repositories and use the Save button to keep them here."
          action={
            <Link href="/" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Search repositories
            </Link>
          }
        />
      )}

      {status === "ready" && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => {
            const pending = isPending(item.githubId);
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {item.owner.avatarUrl && (
                    <Image
                      src={item.owner.avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full border border-slate-200"
                    />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/repo/${item.owner.login}/${item.name}`}
                      className="block truncate text-base font-semibold text-slate-900 hover:text-indigo-700"
                    >
                      <span className="font-normal text-slate-500">{item.owner.login}/</span>
                      {item.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {item.description || <span className="italic text-slate-400">No description provided.</span>}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                      <LanguageBadge language={item.language} />
                      <span className="inline-flex items-center gap-1">
                        <StarIcon className="h-3.5 w-3.5 text-amber-500" />
                        {formatCompact(item.stars)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ForkIcon className="h-3.5 w-3.5" />
                        {formatCompact(item.forks)}
                      </span>
                      <span>Saved {formatDate(item.savedAt)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={pending}
                  className="shrink-0 self-start rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
                >
                  {pending ? "Removing…" : "Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
