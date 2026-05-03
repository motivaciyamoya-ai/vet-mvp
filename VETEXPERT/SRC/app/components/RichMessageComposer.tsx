import {
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Smile,
  Strikethrough,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { insertAtCursor, isAllowedHttpUrl, prefixCurrentLine, wrapSelection } from "../../lib/richMessageTextarea";
import { MESSAGE_EMOJI_GROUPS } from "./messageEmojiPalette";

type Props = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
};

function ToolbarBtn({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/80 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function RichMessageComposer({
  value,
  onChange,
  maxLength = 8000,
  placeholder = "Сообщение…",
  rows = 3,
  disabled = false,
  className = "",
}: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiWrapRef = useRef<HTMLDivElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const withTa = useCallback(
    (fn: (el: HTMLTextAreaElement) => void) => {
      const el = taRef.current;
      if (!el || disabled) return;
      fn(el);
    },
    [disabled],
  );

  useEffect(() => {
    if (!emojiOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(t)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [emojiOpen]);

  const doBold = () =>
    withTa((el) => wrapSelection(el, value, onChange, "**", "**"));
  const doItalic = () => withTa((el) => wrapSelection(el, value, onChange, "*", "*"));
  const doStrike = () => withTa((el) => wrapSelection(el, value, onChange, "~~", "~~"));
  const doCode = () => withTa((el) => wrapSelection(el, value, onChange, "`", "`"));

  const doLink = () => {
    withTa((el) => {
      const rawUrl = window.prompt("Введите адрес ссылки (https://…)");
      if (rawUrl == null) return;
      const u = rawUrl.trim();
      if (!isAllowedHttpUrl(u)) {
        alert("Разрешены только адреса, начинающиеся с http:// или https://");
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const sel = value.slice(start, end).trim();
      const label = sel || "ссылка";
      const md = `[${label}](${u})`;
      insertAtCursor(el, value, onChange, md);
    });
  };

  const doImage = () => {
    withTa((el) => {
      const rawUrl = window.prompt("URL картинки (https://…)");
      if (rawUrl == null) return;
      const u = rawUrl.trim();
      if (!isAllowedHttpUrl(u)) {
        alert("Разрешены только адреса http:// или https://");
        return;
      }
      const altRaw = window.prompt("Подпись к изображению (необязательно)", "изображение");
      const alt = (altRaw ?? "изображение").trim() || "изображение";
      insertAtCursor(el, value, onChange, `![${alt}](${u})`);
    });
  };

  const doBullet = () => withTa((el) => prefixCurrentLine(el, value, onChange, "- "));
  const doNumbered = () => withTa((el) => prefixCurrentLine(el, value, onChange, "1. "));
  const doQuote = () => withTa((el) => prefixCurrentLine(el, value, onChange, "> "));

  const insertEmoji = (ch: string) => {
    withTa((el) => insertAtCursor(el, value, onChange, ch));
    setEmojiOpen(false);
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner ${className}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-1.5 py-1">
        <ToolbarBtn title="Жирный (**текст**)" onClick={doBold} disabled={disabled}>
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Курсив (*текст*)" onClick={doItalic} disabled={disabled}>
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Зачёркнутый (~~текст~~)" onClick={doStrike} disabled={disabled}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Код (`текст`)" onClick={doCode} disabled={disabled}>
          <Code className="h-4 w-4" />
        </ToolbarBtn>
        <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:inline" aria-hidden />
        <ToolbarBtn title="Ссылка" onClick={doLink} disabled={disabled}>
          <Link2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Изображение по ссылке" onClick={doImage} disabled={disabled}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>
        <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:inline" aria-hidden />
        <ToolbarBtn title="Маркированный список" onClick={doBullet} disabled={disabled}>
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Нумерованный список" onClick={doNumbered} disabled={disabled}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Цитата" onClick={doQuote} disabled={disabled}>
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <span className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:inline" aria-hidden />
        <div ref={emojiWrapRef} className="relative">
          <ToolbarBtn title="Эмодзи" onClick={() => !disabled && setEmojiOpen((o) => !o)} disabled={disabled}>
            <Smile className="h-4 w-4" />
          </ToolbarBtn>
          {emojiOpen ? (
            <div className="absolute bottom-full left-0 z-[100] mb-2 w-[min(100vw-2rem,20rem)] max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              {MESSAGE_EMOJI_GROUPS.map((g) => (
                <div key={g.title} className="mb-2 last:mb-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{g.title}</p>
                  <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-10">
                    {g.emojis.map((ch, i) => (
                      <button
                        key={`${g.title}-${i}-${ch}`}
                        type="button"
                        className="rounded-md p-1 text-lg hover:bg-emerald-50"
                        title={ch}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertEmoji(ch)}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[72px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-0 disabled:bg-slate-50"
      />
      <div className="flex justify-end border-t border-slate-100 px-2 py-0.5 text-[10px] text-slate-400">
        {value.length}/{maxLength} · Markdown: **жирный**, *курсив*, ссылки, изображения
      </div>
    </div>
  );
}
