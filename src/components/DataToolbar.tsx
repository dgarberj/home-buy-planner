import { useRef, useState } from "react";
import { downloadText } from "../lib/csv";
import { useStore } from "../store/useStore";
import { Button } from "./ui";

/**
 * Save, load and reset. The app starts from /data/household.json when that
 * gitignored file exists (else the generic seed); this browser's local
 * storage holds only overrides on top of that. Export writes a full snapshot
 * meant to live in the same /data folder.
 */
export default function DataToolbar() {
  const { exportData, importData, clearLocalOverrides } = useStore();
  const fileReference = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const flash = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {message && (
        <span
          className={`text-xs font-medium ${message.isError ? "text-red-600" : "text-emerald-600"}`}
        >
          {message.text}
        </span>
      )}
      <Button
        size="sm"
        title="Save a JSON backup of your numbers"
        onClick={() => {
          downloadText("household.json", exportData(), "application/json");
          flash("Saved. Keep it in the data/ folder.");
        }}
      >
        Export
      </Button>
      <Button
        size="sm"
        title="Load a JSON backup"
        onClick={() => fileReference.current?.click()}
      >
        Import
      </Button>
      <input
        ref={fileReference}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (event_) => {
          const file = event_.target.files?.[0];
          if (!file) return;
          const error = importData(await file.text());
          flash(error ?? "Loaded.", !!error);
          event_.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="danger"
        title="Discard edits saved in this browser and fall back to the local data file (or the example data, if there is none)"
        onClick={() => {
          if (
            !confirm(
              "Clear this browser's saved overrides? In-app edits not written back to data/household.json will be lost.",
            )
          ) {
            return;
          }

          clearLocalOverrides();
          flash("Local overrides cleared.");
        }}
      >
        Clear local storage
      </Button>
    </div>
  );
}
