import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../Modal';
import { api } from '../../lib/api';

interface ExerciseOption {
  name: string;
  muscleGroups: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseOption) => void;
}

export function ExercisePickerModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { id: number; name: string; primaryMuscles: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setCustomName('');
      setShowCustom(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setLoading(true);
      api
        .searchExercises(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const pickCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onSelect({ name, muscleGroups: [] });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add exercise" maxWidth="max-w-md">
      {!showCustom ? (
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              className="field-input pl-9"
              placeholder="Search exercises…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {loading && <p className="py-4 text-center text-sm text-ink-500">Searching…</p>}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <p className="py-4 text-center text-sm text-ink-500">No matches found.</p>
            )}
            {results.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onSelect({
                    name: ex.name,
                    muscleGroups: ex.primaryMuscles ?? [],
                  });
                  onClose();
                }}
                className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition hover:bg-ink-50"
              >
                <span className="font-semibold text-ink-900">{ex.name}</span>
                {ex.primaryMuscles?.length > 0 && (
                  <span className="text-xs text-ink-500">{ex.primaryMuscles.join(', ')}</span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="btn-ghost w-full border-dashed"
          >
            Custom exercise
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="field-label">Exercise name</label>
            <input
              className="field-input"
              placeholder='e.g. "100 pushups", Farmers carry'
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setShowCustom(false)}>
              Back
            </button>
            <button type="button" className="btn-primary flex-1" onClick={pickCustom}>
              Add
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
