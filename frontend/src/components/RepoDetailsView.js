"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatCompact, formatDate, formatNumber, formatRelative, formatSize } from "@/lib/format";
import { CommitIcon, ExternalIcon, EyeIcon, ForkIcon, IssueIcon, StarIcon } from "./Icons";
import { LanguageBadge } from "./RepoCard";
import SaveButton from "./SaveButton";
import { DetailsSkeleton } from "./Skeletons";
import { ErrorState } from "./StatusMessage";

function StatCard({ icon, label, value, title, note }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" title={title}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {note && <div className="mt-1 text-xs text-slate-500">{note}</div>}
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">
        {icon}
        {title}
      </h2>
      <div className="p-2">{children}</div>
    </section>
  );
}

function PanelNotice({ children, tone = "neutral" }) {
  return (
    <p className={`px-3 py-8 text-center text-sm ${tone === "error" ? "text-rose-700" : "text-slate-500"}`}>{children}</p>
  );
}

function Avatar({ src, alt, size = 28 }) {
  if (!src) {
    return <span className="shrink-0 rounded-full bg-slate-200" style={{ width: size, height: size }} />;
  }
  return <Image src={src} alt={alt} width={size} height={size} className="shrink-0 rounded-full border border-slate-200" />;
}

function CommitList({ section }) {
  if (section.error) return <PanelNotice tone="error">Couldn&apos;t load commits: {section.error.message}</PanelNotice>;
  if (section.data.length === 0) return <PanelNotice>This repository has no commits yet.</PanelNotice>;

  return (
    <ul className="divide-y divide-slate-100">
      {section.data.map((commit) => (
        <li key={commit.sha} className="flex items-start gap-3 px-3 py-3">
          <Avatar src={commit.authorAvatarUrl} alt={commit.authorLogin || commit.authorName} />
          <div className="min-w-0 flex-1">
            <a
              href={commit.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-indigo-700"
              title={commit.message}
            >
              {commit.message || "(no commit message)"}
            </a>
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{commit.authorLogin || commit.authorName}</span> committed{" "}
              <time dateTime={commit.date} title={formatDate(commit.date)}>
                {formatRelative(commit.date)}
              </time>
            </p>
          </div>
          <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{commit.shortSha}</code>
        </li>
      ))}
    </ul>
  );
}

function ContributorList({ section }) {
  if (section.error) {
    return <PanelNotice tone="error">Couldn&apos;t load contributors: {section.error.message}</PanelNotice>;
  }
  if (section.data.length === 0) return <PanelNotice>No contributors found for this repository.</PanelNotice>;

  const max = Math.max(...section.data.map((contributor) => contributor.contributions), 1);

  return (
    <ol className="divide-y divide-slate-100">
      {section.data.map((contributor, index) => (
        <li key={contributor.login} className="flex items-center gap-3 px-3 py-3">
          <span className="w-4 text-xs font-semibold text-slate-400">{index + 1}</span>
          <Avatar src={contributor.avatarUrl} alt={contributor.login} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <a
                href={contributor.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium text-slate-900 hover:text-indigo-700"
              >
                {contributor.login}
              </a>
              <span className="shrink-0 text-xs text-slate-500">{formatNumber(contributor.contributions)} commits</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.max(4, (contributor.contributions / max) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function RepoDetailsView({ owner, name }) {
  const router = useRouter();
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });
    api
      .getRepoDetails(owner, name, controller.signal)
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ status: "error", data: null, error });
      });
    return () => controller.abort();
  }, [owner, name, reloadKey]);

  const backLink = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      ← Back
    </button>
  );

  if (state.status === "loading") {
    return (
      <div>
        {backLink}
        <DetailsSkeleton />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        {backLink}
        <ErrorState
          error={state.error}
          onRetry={() => setReloadKey((key) => key + 1)}
          extraAction={
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to search
            </Link>
          }
        />
      </div>
    );
  }

  const { repository: repo, commits, contributors, openIssues } = state.data;

  return (
    <div className="space-y-6">
      {backLink}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar src={repo.owner.avatarUrl} alt={repo.owner.login} size={56} />
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold text-slate-900">
              <span className="font-normal text-slate-500">{repo.owner.login}/</span>
              {repo.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{repo.description || "No description provided."}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {repo.archived && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700">Archived</span>
              )}
              {repo.fork && (
                <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-600">Fork</span>
              )}
              {repo.topics.slice(0, 8).map((topic) => (
                <span key={topic} className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveButton repo={repo} size="lg" />
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            View on GitHub
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<StarIcon className="h-3.5 w-3.5 text-amber-500" />}
          label="Stars"
          value={formatCompact(repo.stars)}
          title={formatNumber(repo.stars)}
        />
        <StatCard
          icon={<ForkIcon className="h-3.5 w-3.5" />}
          label="Forks"
          value={formatCompact(repo.forks)}
          title={formatNumber(repo.forks)}
        />
        <StatCard
          icon={<IssueIcon className="h-3.5 w-3.5 text-emerald-600" />}
          label="Open issues"
          value={formatCompact(openIssues.count)}
          title={formatNumber(openIssues.count)}
          note={openIssues.includesPullRequests ? "Includes open pull requests" : null}
        />
        <StatCard
          icon={<EyeIcon className="h-3.5 w-3.5" />}
          label="Watchers"
          value={formatCompact(repo.watchers)}
          title={formatNumber(repo.watchers)}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Repository information</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Language", repo.language ? <LanguageBadge language={repo.language} /> : "—"],
            ["License", repo.license || "None"],
            ["Default branch", repo.defaultBranch || "—"],
            ["Created", formatDate(repo.createdAt)],
            ["Last updated", formatRelative(repo.updatedAt)],
            ["Last push", formatRelative(repo.pushedAt)],
            ["Size", formatSize(repo.size)],
            [
              "Homepage",
              repo.homepage ? (
                <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="truncate text-indigo-700 hover:underline">
                  {repo.homepage.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "—"
              ),
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 justify-between gap-3 border-b border-slate-100 pb-2 sm:block sm:border-0 sm:pb-0">
              <dt className="text-slate-500">{label}</dt>
              <dd className="truncate font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Latest commits" icon={<CommitIcon className="h-4 w-4 text-slate-500" />}>
          <CommitList section={commits} />
        </Panel>
        <Panel title="Top contributors" icon={<StarIcon className="h-4 w-4 text-slate-500" />}>
          <ContributorList section={contributors} />
        </Panel>
      </div>
    </div>
  );
}
