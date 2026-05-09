import TranslatedContent from "./TranslatedContent";
import { assetUrl } from "../../lib/api";

/** Строка, целиком совпадающая с санитизированным URL иллюстрации из /uploads/thread/… */
export const FORUM_EMBEDDED_IMAGE_LINE =
  /^\/uploads\/thread\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif)$/i;

type Block = { type: "text" | "img"; content: string };

function parseForumBodyBlocks(text: string): Block[] {
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];

  const flushText = () => {
    if (buf.length === 0) return;
    const content = buf.join("\n");
    if (content.trim().length > 0) blocks.push({ type: "text", content });
    buf = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (FORUM_EMBEDDED_IMAGE_LINE.test(t)) {
      flushText();
      blocks.push({ type: "img", content: t });
    } else {
      buf.push(line);
    }
  }
  flushText();
  return blocks;
}

/** Текст поста + отдельными строками вложенные изображения (URLs с сервера). */
export default function ForumRenderedBody({
  text,
  originalLang,
  className = "",
}: {
  text: string;
  originalLang: string;
  className?: string;
}) {
  const blocks = parseForumBodyBlocks(text);
  if (blocks.length === 0) {
    return <p className={`text-gray-500 text-sm italic ${className}`}>Пустое сообщение</p>;
  }
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((b, i) =>
        b.type === "img" ? (
          <a
            key={`img-${i}-${b.content}`}
            href={assetUrl(b.content)}
            target="_blank"
            rel="noreferrer noopener"
            className="block"
          >
            <img
              src={assetUrl(b.content)}
              alt=""
              className="max-w-full max-h-96 rounded-lg border border-gray-200 shadow-sm object-contain bg-gray-50"
              loading="lazy"
            />
          </a>
        ) : (
          <TranslatedContent
            key={`t-${i}`}
            text={b.content}
            originalLang={originalLang}
            showBadge={false}
            className="text-inherit whitespace-pre-wrap"
          />
        ),
      )}
    </div>
  );
}
