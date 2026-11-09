import Link from "next/link";

export type CodexEntry = {
  href: string;
  primary: string;
  description?: string;
  external?: boolean;
  primaryLines?: 1 | 2;
};

export type ContentCodexProps = {
  command?: string;
  entries: CodexEntry[];
  glyphIdle?: string;
  glyphHover?: string;
};

export default function ContentCodex({
  command,
  entries,
  glyphIdle = "▪",
  glyphHover = "+",
}: ContentCodexProps) {
  return (
    <div className="font-mono">
      {command ? <p className="section-label mb-5">{command}</p> : null}
      <ul className="m-0 list-none p-0">
        {entries.map((entry) => {
          const extra = entry.external
            ? { target: "_blank" as const, rel: "noopener noreferrer" }
            : {};
          return (
            <li key={entry.href} className="m-0 p-0">
              <Link
                href={entry.href}
                {...extra}
                className="group focus-outline block py-1 text-sm leading-snug text-slate-200/70 transition-colors hover:text-white"
              >
                <span className="flex items-baseline gap-2">
                  <span
                    className="inline-block w-4 shrink-0 text-center text-slate-200/25 transition-colors group-hover:text-white group-focus-visible:text-white"
                    aria-hidden="true"
                  >
                    <span className="group-hover:hidden group-focus-visible:hidden">{glyphIdle}</span>
                    <span className="hidden group-hover:inline group-focus-visible:inline">{glyphHover}</span>
                  </span>
                  <span className={`min-w-0 break-words ${entry.primaryLines === 2 ? "line-clamp-2" : "line-clamp-1"}`}>
                    {entry.primary}
                  </span>
                </span>
                {entry.description ? (
                  <span className="mt-0.5 block max-h-0 overflow-hidden pl-6 text-xs leading-snug text-slate-400/70 opacity-0 transition-[max-height,opacity] duration-150 group-hover:max-h-10 group-hover:opacity-100 group-focus-visible:max-h-10 group-focus-visible:opacity-100">
                    <span className="line-clamp-2">{entry.description}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
