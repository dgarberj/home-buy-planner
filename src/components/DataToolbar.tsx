import { useRef, useState } from 'react';
import { downloadText } from '../lib/csv';
import { useStore } from '../store/useStore';
import { Button } from './ui';

/**
 * Save, load and reset. Everything lives in this browser's local storage; the
 * export is a plain JSON file meant to live in the gitignored /data folder.
 */
export default function DataToolbar() {
  const { exportData, importData, resetToSeed } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);

  const flash = (text: string, bad = false) => {
    setMessage({ text, bad });
    window.setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {message && (
        <span className={`text-xs font-medium ${message.bad ? 'text-red-600' : 'text-emerald-600'}`}>
          {message.text}
        </span>
      )}
      <Button
        size="sm"
        title="Save a JSON backup of your numbers"
        onClick={() => {
          downloadText('household.json', exportData(), 'application/json');
          flash('Saved. Keep it in the data/ folder.');
        }}
      >
        Export
      </Button>
      <Button size="sm" title="Load a JSON backup" onClick={() => fileRef.current?.click()}>
        Import
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const error = importData(await file.text());
          flash(error ?? 'Loaded.', !!error);
          e.target.value = '';
        }}
      />
      <Button
        size="sm"
        variant="danger"
        title="Throw away your numbers and go back to the example data"
        onClick={() => {
          if (window.confirm('Replace everything with the example placeholder data?')) {
            resetToSeed();
            flash('Reset to example data.');
          }
        }}
      >
        Reset
      </Button>
    </div>
  );
}
