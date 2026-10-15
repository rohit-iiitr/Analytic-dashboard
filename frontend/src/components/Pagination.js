const buildPages = (current, total) => {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(`gap-${page}`);
    result.push(page);
  });
  return result;
};

export default function Pagination({ page, totalPages, onChange, disabled }) {
  if (totalPages <= 1) return null;

  const buttonClass =
    "min-w-9 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
      >
        Previous
      </button>
      {buildPages(page, totalPages).map((item) =>
        typeof item === "string" ? (
          <span key={item} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            disabled={disabled || item === page}
            aria-current={item === page ? "page" : undefined}
            className={`${buttonClass} ${
              item === page
                ? "border-slate-900 bg-slate-900 text-white disabled:opacity-100"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
      >
        Next
      </button>
    </nav>
  );
}
