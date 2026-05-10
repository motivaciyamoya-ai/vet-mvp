import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

function renderInline(keyPrefix: string, line: string) {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/articles\/[a-z0-9]+)\)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      out.push(<Fragment key={`${keyPrefix}-t-${m.index}`}>{line.slice(last, m.index)}</Fragment>);
    }
    out.push(
      <Link
        key={`${keyPrefix}-l-${m.index}`}
        to={m[2]!}
        className="font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800"
      >
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    out.push(<Fragment key={`${keyPrefix}-end`}>{line.slice(last)}</Fragment>);
  }
  return out.length ? out : line;
}

/** Безопасный рендер: только ссылки на `/articles/:id` в markdown `[текст](url)`; заголовки ## / ###. */
export function ArticleMarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let bi = 0;

  const flushPara = () => {
    if (!para.length) return;
    const content = para.join("\n").trimEnd();
    if (content) {
      blocks.push(
        <p key={`p-${bi++}`} className="mb-4 text-gray-800 leading-relaxed last:mb-0">
          {content.split("\n").map((ln, j) => (
            <Fragment key={j}>
              {j > 0 ? <br /> : null}
              {renderInline(`p-${bi}-${j}`, ln)}
            </Fragment>
          ))}
        </p>,
      );
    }
    para = [];
  };

  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h2) {
      flushPara();
      blocks.push(
        <h2 key={`h2-${bi++}`} className="mt-8 mb-3 text-xl font-bold text-gray-900 first:mt-0">
          {h2[1]}
        </h2>,
      );
      continue;
    }
    if (h3) {
      flushPara();
      blocks.push(
        <h3 key={`h3-${bi++}`} className="mt-6 mb-2 text-lg font-semibold text-gray-900">
          {h3[1]}
        </h3>,
      );
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      continue;
    }
    para.push(line);
  }
  flushPara();

  return <div className="article-body-rich">{blocks}</div>;
}
