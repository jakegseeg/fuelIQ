import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Changing this key (re)starts the timer at `seconds`. */
  triggerKey: number;
  seconds: number;
  onDone?: () => void;
}

/** Countdown rest timer with pause and +15s controls. */
export function RestTimer({ triggerKey, seconds, onDone }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (triggerKey === 0) return;
    setRemaining(seconds);
    setRunning(true);
  }, [triggerKey, seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          setRunning(false);
          doneRef.current?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const idle = !running && remaining === 0;

  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${
        idle ? 'bg-ink-100' : 'bg-brand-500 text-white'
      }`}
    >
      <div>
        <p className={`text-xs font-semibold uppercase ${idle ? 'text-ink-600' : 'text-white/80'}`}>
          Rest
        </p>
        <p className="text-2xl font-extrabold tabular-nums">
          {mm}:{ss}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRemaining((r) => r + 15)}
          disabled={idle}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            idle ? 'bg-surface text-ink-600' : 'bg-surface/20 text-white hover:bg-surface/30'
          }`}
        >
          +15s
        </button>
        {!idle && (
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-lg bg-surface/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface/30"
          >
            {running ? 'Pause' : 'Resume'}
          </button>
        )}
        {!idle && (
          <button
            onClick={() => {
              setRunning(false);
              setRemaining(0);
            }}
            className="rounded-lg bg-surface/20 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface/30"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
