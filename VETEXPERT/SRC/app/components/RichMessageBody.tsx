import { richMessageMarkdownToReact } from "../../lib/renderRichMessageMarkdown";

/** Безопасный рендер тела сообщения (Markdown) без дополнительных npm-пакетов */
export default function RichMessageBody({
  body,
  variant,
}: {
  body: string;
  variant: "mine" | "theirs";
}) {
  if (!body.trim()) return null;

  return (
    <div
      className={
        variant === "mine"
          ? "break-words text-white [&_strong]:font-semibold"
          : "break-words text-slate-800 [&_strong]:font-semibold [&_blockquote]:[&_*]:text-slate-600"
      }
    >
      {richMessageMarkdownToReact(body, variant)}
    </div>
  );
}
