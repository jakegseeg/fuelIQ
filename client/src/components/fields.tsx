import type { ReactNode } from 'react';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  min,
  max,
  step,
}: TextFieldProps) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError message={error} />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div className="inline-flex min-h-11 rounded-[10px] bg-ink-100/45 p-1 ring-1 ring-inset ring-ink-200" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`min-h-9 rounded-[10px] font-medium transition ${
            size === 'sm' ? 'px-3 py-1 text-[13px]' : 'px-4 py-1 text-[15px]'
          } ${
            value === opt.value
              ? 'bg-surface text-ink-900 shadow-sm ring-1 ring-inset ring-ink-200'
              : 'text-ink-600 hover:text-ink-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  leading?: ReactNode;
  multi?: boolean;
}

export function SelectCard({
  selected,
  onClick,
  title,
  description,
  leading,
  multi,
}: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-16 w-full items-center gap-4 rounded-[10px] border p-4 text-left transition ${
        selected
          ? 'state-accent'
          : 'border-ink-200 bg-surface hover:border-ink-300 hover:bg-ink-100'
      }`}
    >
      {leading && <span className="text-2xl">{leading}</span>}
      <span className="flex-1">
        <span
          className={`block font-semibold ${selected ? 'state-accent-text' : 'text-ink-900'}`}
        >
          {title}
        </span>
        {description && (
          <span
            className={`block text-sm ${selected ? 'state-accent-text-muted' : 'text-ink-600'}`}
          >
            {description}
          </span>
        )}
      </span>
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center border-2 ${
          multi ? 'rounded-[10px]' : 'rounded-full'
        } ${selected ? 'state-accent-check' : 'border-ink-300'}`}
      >
        {selected && (
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4l2.3 2.3 6.3-6.3a1 1 0 0 1 1.4 0z" />
          </svg>
        )}
      </span>
    </button>
  );
}
