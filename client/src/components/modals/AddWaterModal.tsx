import { useState } from 'react';
import { Modal } from '../Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (oz: number) => Promise<void>;
}

const QUICK = [8, 16, 24, 32];

export function AddWaterModal({ open, onClose, onAdd }: Props) {
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (oz: number) => {
    if (oz <= 0 || busy) return;
    setBusy(true);
    try {
      await onAdd(oz);
      setCustom('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add water" maxWidth="max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        {QUICK.map((oz) => (
          <button
            key={oz}
            onClick={() => add(oz)}
            disabled={busy}
            className="rounded-xl bg-sky-500/15 py-4 text-lg font-bold text-ink-800 transition hover:bg-sky-500/25 disabled:opacity-50"
          >
            +{oz} oz
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="field-label">Custom amount (oz)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            inputMode="decimal"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
        <button onClick={() => add(Number(custom))} disabled={busy || !custom} className="btn-primary">
          Add
        </button>
      </div>
    </Modal>
  );
}
