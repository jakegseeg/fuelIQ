import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ChatMarkdown } from '../components/coach/ChatMarkdown';
import { Spinner } from '../components/Spinner';
import { api, type ChatMessage } from '../lib/api';
import { clearChatMessages, loadChatMessages, saveChatMessages } from '../lib/chatStorage';

const QUICK_PROMPTS = [
  'How am I doing, Coach?',
  'Did I hit my goals today?',
  'I missed my workout...',
  'What should I eat?',
  'Motivate me',
];

export function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatMessages());
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamIdxRef = useRef<number | null>(null);

  useEffect(() => {
    saveChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    api
      .coachInsights()
      .then((r) => setInsights(r.insights))
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const history: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(history);
    setInput('');
    setStreaming(true);

    const assistantIdx = history.length;
    streamIdxRef.current = assistantIdx;
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    let accumulated = '';
    try {
      await api.chatStream(
        history,
        (delta) => {
          accumulated += delta;
          const snap = accumulated;
          setMessages((m) => {
            const next = [...m];
            if (next[assistantIdx]) next[assistantIdx] = { role: 'assistant', content: snap };
            return next;
          });
        },
        ac.signal,
      );
      if (!accumulated) {
        setMessages((m) => {
          const next = [...m];
          if (next[assistantIdx]) {
            next[assistantIdx] = {
              role: 'assistant',
              content: 'Coach hit a wall — and Coach does NOT hit walls. Try again.',
            };
          }
          return next;
        });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((m) => {
        const next = [...m];
        if (next[assistantIdx]) {
          next[assistantIdx] = {
            role: 'assistant',
            content: 'Coach lost the connection. Coach is **furious** about it. Check your network and ask again.',
          };
        }
        return next;
      });
    } finally {
      setStreaming(false);
      streamIdxRef.current = null;
    }
  }, [messages, streaming]);

  const clearChat = () => {
    abortRef.current?.abort();
    clearChatMessages();
    setMessages([]);
  };

  return (
    <AppShell
      title="Coach"
      subtitle="Elite trainer. Zero chill. Maximum care."
      maxWidth="max-w-3xl"
      actions={
        messages.length > 0 ? (
          <button
            type="button"
            onClick={clearChat}
            className="text-sm font-semibold text-ink-600 hover:text-ink-800"
          >
            Clear chat
          </button>
        ) : undefined
      }
    >
      <div className="flex h-[calc(100vh-9rem)] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <EmptyState insights={insights} loading={insightsLoading} onPrompt={send} />
          ) : (
            messages.map((m, i) => (
              <Bubble
                key={i}
                message={m}
                isStreaming={streaming && streamIdxRef.current === i && !m.content}
              />
            ))
          )}
        </div>

        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={streaming}
              onClick={() => send(p)}
              className="flex-none rounded-full border border-ink-200 bg-surface2 px-3 py-1 text-xs font-semibold text-ink-600 transition hover:border-accent-400/40 hover:text-accent-300 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t border-ink-200 pt-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            disabled={streaming}
            placeholder="Talk to Coach…"
            className="field-input max-h-32 flex-1 resize-none"
          />
          <button type="submit" disabled={streaming || !input.trim()} className="btn-primary">
            {streaming ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function CoachAvatar({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-8 w-8';
  return (
    <div
      className={`flex ${dim} flex-none items-center justify-center rounded-[10px] bg-accent-400/15 ring-2 ring-accent-400/30`}
      aria-hidden
    />
  );
}

function EmptyState({
  insights,
  loading,
  onPrompt,
}: {
  insights: string[];
  loading: boolean;
  onPrompt: (t: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col items-center text-center">
        <CoachAvatar />
        <h2 className="mt-4 font-display text-xl font-extrabold">Coach</h2>
        <p className="mt-1 max-w-sm text-sm text-ink-600">
          Former high-level athlete. Drill sergeant exterior. Coach yells because Coach cares — and
          Coach reads your real logs.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-surface2 p-4 ring-1 ring-ink-200">
        <h3 className="text-sm font-bold text-ink-800">Coach&apos;s take this week</h3>
        {loading ? (
          <div className="py-4">
            <Spinner label="Coach is reviewing your logs…" />
          </div>
        ) : insights.length > 0 ? (
          <div className="mt-3 space-y-3">
            {insights.map((line, i) => (
              <div key={i} className="text-sm leading-relaxed text-ink-700">
                <ChatMarkdown content={line} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-600">
            Coach has nothing to yell about yet. Log food and workouts — Coach will get personal.
          </p>
        )}
      </div>

      <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPrompt(s)}
            className="rounded-xl border border-ink-200 bg-surface p-3 text-left text-sm text-ink-700 transition hover:border-accent-400/40 hover:text-ink-900"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <CoachAvatar size="sm" />}
      <div className={`max-w-[85%] ${isUser ? '' : 'min-w-0'}`}>
        {!isUser && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-accent-300">
            Coach
          </p>
        )}
        <div
          className={`rounded-[10px] px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-accent-500 font-medium text-white'
              : 'bg-surface text-ink-800 ring-1 ring-ink-200'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : isStreaming ? (
            <span className="flex items-center gap-2 text-ink-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" />
              Coach is fired up…
            </span>
          ) : (
            <ChatMarkdown content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
