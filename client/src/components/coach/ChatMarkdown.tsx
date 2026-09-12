/** Lightweight markdown: bold, inline code, and fenced code blocks (spec 7.1). */

export function ChatMarkdown({ content }: { content: string }) {
  const parts = splitBlocks(content);
  return (
    <div className="space-y-2">
      {parts.map((p, i) =>
        p.type === 'code' ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-xl bg-bg px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-700 ring-1 ring-ink-200"
          >
            <code>{p.text}</code>
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={p.text} />
          </p>
        ),
      )}
    </div>
  );
}

function splitBlocks(text: string): { type: 'text' | 'code'; text: string }[] {
  const out: { type: 'text' | 'code'; text: string }[] = [];
  const re = /```[\w]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    out.push({ type: 'code', text: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out.length ? out : [{ type: 'text', text }];
}

function Inline({ text }: { text: string }) {
  const bits = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {bits.map((b, i) => {
        if (b.startsWith('**') && b.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-ink-900">
              {b.slice(2, -2)}
            </strong>
          );
        }
        if (b.startsWith('`') && b.endsWith('`')) {
          return (
            <code key={i} className="rounded bg-surface2 px-1 py-0.5 font-mono text-[0.9em] text-accent-300">
              {b.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{b}</span>;
      })}
    </>
  );
}
