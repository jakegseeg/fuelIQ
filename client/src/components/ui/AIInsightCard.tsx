import { Lightbulb } from 'lucide-react';

interface Props {
  content: string;
  source?: string;
  title?: string;
}

/** AI-generated insight display (spec 6.2). */
export function AIInsightCard({ content, source, title = "Today's insight" }: Props) {
  return (
    <div className="card card-hover relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: '#D1FFE1' }}
      />
      <div className="flex items-center gap-2">
        <Lightbulb size={20} aria-hidden />
        <h3 className="font-semibold">{title}</h3>
        {source === 'claude' && (
          <span className="rounded-full chip-mint px-2 py-0.5 text-[10px] font-semibold">
            AI
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{content}</p>
    </div>
  );
}
