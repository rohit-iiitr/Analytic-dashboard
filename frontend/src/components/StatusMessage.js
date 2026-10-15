"use client";

import { useEffect, useState } from "react";

const TONES = {
  error: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  neutral: "border-slate-200 bg-white text-slate-700",
};

function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(seconds ?? 0);

  useEffect(() => {
    setRemaining(seconds ?? 0);
    if (!seconds) return undefined;
    const timer = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  return remaining;
}

export function StatusMessage({ title, message, tone = "neutral", action }) {
  return (
    <div className={`rounded-xl border px-6 py-10 text-center ${TONES[tone]}`}>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="mx-auto mt-2 max-w-md text-sm opacity-80">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

const ERROR_TITLES = {
  RATE_LIMITED: "GitHub rate limit reached",
  NETWORK_ERROR: "Server unreachable",
  GITHUB_UNAVAILABLE: "GitHub is unavailable",
  GITHUB_UNREACHABLE: "GitHub is unreachable",
  GITHUB_TIMEOUT: "GitHub timed out",
  REPO_NOT_FOUND: "Repository not found",
  DB_UNAVAILABLE: "Database unavailable",
  VALIDATION_ERROR: "Invalid request",
  INVALID_REPOSITORY: "Invalid repository",
  PAGE_OUT_OF_RANGE: "Page out of range",
};

export function ErrorState({ error, onRetry, extraAction }) {
  const isRateLimited = error?.code === "RATE_LIMITED";
  const remaining = useCountdown(isRateLimited ? error.retryAfter : null);
  const canRetry = onRetry && !["REPO_NOT_FOUND", "INVALID_REPOSITORY", "VALIDATION_ERROR"].includes(error?.code);

  return (
    <StatusMessage
      tone={isRateLimited ? "warning" : "error"}
      title={ERROR_TITLES[error?.code] || "Something went wrong"}
      message={error?.message}
      action={
        (canRetry || extraAction) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRateLimited && remaining > 0}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isRateLimited && remaining > 0 ? `Retry in ${remaining}s` : "Try again"}
              </button>
            )}
            {extraAction}
          </div>
        )
      }
    />
  );
}
