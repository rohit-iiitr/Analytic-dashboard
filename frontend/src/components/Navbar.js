"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSavedRepos } from "@/context/SavedReposContext";

const links = [
  { href: "/", label: "Search" },
  { href: "/saved", label: "Saved" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { items, status } = useSavedRepos();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-xs font-bold text-white">GA</span>
          <span className="hidden sm:inline">GitHub Analytics</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {link.label}
                {link.href === "/saved" && status === "ready" && items.length > 0 && (
                  <span className="rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">{items.length}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
