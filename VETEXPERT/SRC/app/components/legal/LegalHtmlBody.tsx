type Props = {
  html: string;
  className?: string;
};

/**
 * Вывод HTML из админки. Доверенный контент только от администраторов.
 */
export default function LegalHtmlBody({ html, className = "" }: Props) {
  return (
    <div
      className={`legal-html space-y-4 text-sm leading-relaxed text-slate-800 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:text-sm [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-emerald-700 [&_a]:font-semibold [&_a]:hover:underline [&_p]:mb-2 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:text-xs [&_section]:space-y-2 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
