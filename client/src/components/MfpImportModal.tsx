import { useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { api, type MfpImportResult } from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export function MfpImportModal({ open, onClose, onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MfpImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const csv = await file.text();
      const r = await api.importMfpCsv(csv);
      setResult(r);
      if (r.imported > 0) onImported?.();
    } catch {
      setError('Import failed. Check the file format and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import from MyFitnessPal" maxWidth="max-w-lg">
      <p className="text-sm text-ink-600">
        Export your diary as CSV from MyFitnessPal (Diary → Export), then upload here. Entries are
        mapped to your food log with retroactive FuelScores (spec 7.4).
      </p>

      <label className="btn-ghost mt-4 flex cursor-pointer justify-center">
        {busy ? <Spinner label="Importing…" /> : 'Choose CSV file'}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
      </label>

      {error && <p className="mt-3 text-sm text-coral-400">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl bg-surface2 p-4 text-sm ring-1 ring-ink-200">
          <p className="font-semibold text-ink-900">Import summary</p>
          <ul className="mt-2 space-y-1 text-ink-600">
            <li>
              <span className="font-bold text-accent-500">{result.imported}</span> entries imported
            </li>
            <li>{result.skipped} rows skipped</li>
            {result.dateRange.from && (
              <li>
                Date range: {result.dateRange.from} → {result.dateRange.to}
              </li>
            )}
            {result.avgFuelScore != null && (
              <li>Average FuelScore: {result.avgFuelScore}/10</li>
            )}
          </ul>
          {result.errors.map((e, i) => (
            <p key={i} className="mt-2 text-xs text-amber-300">
              {e}
            </p>
          ))}
        </div>
      )}
    </Modal>
  );
}
