import Image from "next/image";
import Link from "next/link";
import { formatCompact, formatNumber, formatRelative, languageColor } from "@/lib/format";
import { ForkIcon, StarIcon } from "./Icons";
import SaveButton from "./SaveButton";

export function LanguageBadge({ language }) {
  if (!language) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(language) }} />
      {language}
    </span>
  );
}

export default function RepoCard({ repo }) {
  return (
    <article className="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {repo.owner.avatarUrl && (
            <Image
              src={repo.owner.avatarUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-full border border-slate-200"
            />
          )}
          <h3 className="min-w-0 truncate text-base font-semibold text-slate-900">
            <Link
              href={`/repo/${repo.owner.login}/${repo.name}`}
              className="after:absolute after:inset-0 group-hover:text-indigo-700"
            >
              <span className="font-normal text-slate-500">{repo.owner.login}/</span>
              {repo.name}
            </Link>
          </h3>
        </div>
        <div className="relative z-10">
          <SaveButton repo={repo} />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
        {repo.description || <span className="italic text-slate-400">No description provided.</span>}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <LanguageBadge language={repo.language} />
        <span className="inline-flex items-center gap-1" title={`${formatNumber(repo.stars)} stars`}>
          <StarIcon className="h-3.5 w-3.5 text-amber-500" />
          {formatCompact(repo.stars)}
        </span>
        <span className="inline-flex items-center gap-1" title={`${formatNumber(repo.forks)} forks`}>
          <ForkIcon className="h-3.5 w-3.5" />
          {formatCompact(repo.forks)}
        </span>
        {repo.updatedAt && <span>Updated {formatRelative(repo.updatedAt)}</span>}
        {repo.archived && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700">Archived</span>
        )}
      </div>
    </article>
  );
}
