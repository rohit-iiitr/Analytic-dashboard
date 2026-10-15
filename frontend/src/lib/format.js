const compactFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const fullFormatter = new Intl.NumberFormat("en");
const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormatter = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" });

const RELATIVE_UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

export const formatCompact = (value) => compactFormatter.format(value ?? 0);

export const formatNumber = (value) => fullFormatter.format(value ?? 0);

export const formatSize = (kilobytes = 0) => {
  if (kilobytes < 1024) return `${formatNumber(kilobytes)} KB`;
  if (kilobytes < 1024 * 1024) return `${(kilobytes / 1024).toFixed(1)} MB`;
  return `${(kilobytes / 1024 / 1024).toFixed(1)} GB`;
};

export const formatDate =(value) => (value ? dateFormatter.format(new Date(value)) : "—");

export const formatRelative = (value) => {
  if (!value) return "—";
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size || unit === "second") {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }
  return "—";
};

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  "Jupyter Notebook": "#DA5B0B",
};

export const languageColor = (language) => LANGUAGE_COLORS[language] || "#94a3b8";
