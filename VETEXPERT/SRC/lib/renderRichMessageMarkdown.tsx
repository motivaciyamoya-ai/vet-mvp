import { Fragment } from "react";
import type { ReactNode } from "react";

function safeHttpUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (t.startsWith("https://") || t.startsWith("http://")) return t;
  return undefined;
}

const linkMine = "font-medium text-white underline decoration-white/70 hover:decoration-white";
const linkTheirs = "font-medium text-emerald-700 underline decoration-emerald-600/50 hover:text-emerald-800";

function nextInterestingIndex(s: string): number {
  const idxs = ["![", "[", "**", "~~", "*", "`"].map((x) => s.indexOf(x)).filter((i) => i >= 0);
  return idxs.length ? Math.min(...idxs) : Infinity;
}

function wrapFlat(nodes: ReactNode[]): ReactNode {
  const flat = nodes.filter((n) => n != null && n !== "");
  if (flat.length === 0) return null;
  if (flat.length === 1) return flat[0];
  return (
    <>
      {flat.map((n, ix) => (
        <Fragment key={ix}>{n}</Fragment>
      ))}
    </>
  );
}

let inlineKeySeed = 0;

function inlineToNodes(text: string, variant: "mine" | "theirs"): ReactNode[] {
  if (!text) return [];

  type Pat = { test: RegExp; consume: (m: RegExpExecArray) => ReactNode[] };

  const patterns: Pat[] = [
    {
      test: /^!\[([^\]]*)\]\(([^)]+)\)/,
      consume: (m) => {
        const u = safeHttpUrl(m[2]);
        if (!u) return [<span className="opacity-70">{m[0]}</span>];
        const ik = inlineKeySeed++;
        return [
          <img
            key={`img-${ik}`}
            src={u}
            alt={m[1]}
            loading="lazy"
            className={
              variant === "mine"
                ? "my-1 max-h-52 max-w-full rounded-lg border border-white/25 object-contain shadow-sm"
                : "my-1 max-h-52 max-w-full rounded-lg border border-slate-200 object-contain shadow-sm"
            }
          />,
        ];
      },
    },
    {
      test: /^\[([^\]]+)\]\(([^)]+)\)/,
      consume: (m) => {
        const u = safeHttpUrl(m[2]);
        if (!u) return [<span className="opacity-90">{m[1]}</span>];
        const ik = inlineKeySeed++;
        return [
          <a key={`a-${ik}`} href={u} target="_blank" rel="noopener noreferrer nofollow" className={variant === "mine" ? linkMine : linkTheirs}>
            {m[1]}
          </a>,
        ];
      },
    },
    {
      test: /^`([^`]+)`/,
      consume: (m) => {
        const ik = inlineKeySeed++;
        return [
          <code
            key={`c-${ik}`}
            className={
              variant === "mine"
                ? "rounded bg-black/25 px-1 py-px font-mono text-[0.9em]"
                : "rounded bg-slate-100 px-1 py-px font-mono text-[0.9em] text-slate-800"
            }
          >
            {m[1]}
          </code>,
        ];
      },
    },
    {
      test: /^\*\*([^*]+)\*\*/,
      consume: (m) => [
        <strong key={`sb-${inlineKeySeed++}`} className="font-semibold">
          {wrapFlat(inlineToNodes(m[1], variant))}
        </strong>,
      ],
    },
    {
      test: /^~~([^~]+)~~/,
      consume: (m) => [<del key={`sd-${inlineKeySeed++}`} className="opacity-90">{wrapFlat(inlineToNodes(m[1], variant))}</del>],
    },
    {
      test: /^\*((?!\*)[^*\n]+)\*/,
      consume: (m) => [<em key={`em-${inlineKeySeed++}`}>{wrapFlat(inlineToNodes(m[1], variant))}</em>],
    },
  ];

  for (const p of patterns) {
    const m = p.test.exec(text);
    if (m && m.index === 0) {
      const head = p.consume(m);
      const tail = inlineToNodes(text.slice(m[0].length), variant);
      return [...head, ...tail];
    }
  }

  const nx = nextInterestingIndex(text);
  if (nx === Infinity) return [text];
  if (nx > 0) return [text.slice(0, nx), ...inlineToNodes(text.slice(nx), variant)];
  return [text.slice(0, 1), ...inlineToNodes(text.slice(1), variant)];
}

function renderInlineFragments(s: string, variant: "mine" | "theirs"): ReactNode {
  return wrapFlat(inlineToNodes(s, variant));
}

/** Блоковый Markdown без внешних зависимостей */
export function richMessageMarkdownToReact(body: string, variant: "mine" | "theirs"): ReactNode {
  inlineKeySeed = 0;
  const normalized = body.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let bk = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }

    const line = lines[i];

    if (/^>\s*/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s*/.test(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={`bq-${bk}`}
          className={
            variant === "mine"
              ? "my-1 border-l-2 border-white/45 pl-2 text-emerald-50 italic"
              : "my-1 border-l-2 border-slate-300 pl-2 text-slate-600 italic"
          }
        >
          {parts.map((p, j) => (
            <Fragment key={`bql-${bk}-${j}`}>
              {j > 0 ? <br /> : null}
              {renderInlineFragments(p, variant)}
            </Fragment>
          ))}
        </blockquote>,
      );
      bk++;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${bk}`}
          className={`my-1 list-disc pl-4 ${variant === "mine" ? "[&::marker]:text-emerald-100" : "[&::marker]:text-slate-500"}`}
        >
          {items.map((item, ix) => (
            <li key={ix} className="my-0.5">
              {renderInlineFragments(item, variant)}
            </li>
          ))}
        </ul>,
      );
      bk++;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={`ol-${bk}`}
          className={`my-1 list-decimal pl-4 ${variant === "mine" ? "[&::marker]:text-emerald-100" : "[&::marker]:text-slate-500"}`}
        >
          {items.map((item, ix) => (
            <li key={ix} className="my-0.5">
              {renderInlineFragments(item, variant)}
            </li>
          ))}
        </ol>,
      );
      bk++;
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      const L = lines[i];
      if (/^>\s*/.test(L) || /^-\s+/.test(L) || /^\d+\.\s+/.test(L)) break;
      paragraphLines.push(L);
      i++;
    }
    const merged = paragraphLines.join("\n");

    blocks.push(
      <p key={`p-${bk}`} className="my-1 first:mt-0 last:mb-0 leading-relaxed">
        {merged.split(/\n/).map((ln, j) => (
          <Fragment key={`pl-${bk}-${j}`}>
            {j > 0 ? <br /> : null}
            {renderInlineFragments(ln, variant)}
          </Fragment>
        ))}
      </p>,
    );
    bk++;
  }

  return <>{blocks}</>;
}
