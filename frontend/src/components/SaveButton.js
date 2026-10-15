"use client";

import { useSavedRepos } from "@/context/SavedReposContext";
import { BookmarkIcon } from "./Icons";

export default function SaveButton({ repo, size = "sm" }) {
  const { getSaved, isPending, save, remove, status } = useSavedRepos();
  const savedItem = getSaved(repo.id);
  const pending = isPending(repo.id);
  const disabled = pending || status === "loading";

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    if (savedItem) remove(savedItem);
    else save(repo);
  };

  const sizing = size === "lg" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={Boolean(savedItem)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${
        savedItem
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <BookmarkIcon filled={Boolean(savedItem)} className="h-3.5 w-3.5" />
      {pending ? "Working…" : savedItem ? "Saved" : "Save"}
    </button>
  );
}
