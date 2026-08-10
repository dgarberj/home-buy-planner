import { useRef, useState } from "react";
import { downloadText } from "../../lib/csv";
import { encodeShareHash, isShareSupported } from "../../lib/share";
import { useStore } from "../../store/useStore";
import { Button, Callout, Drawer, Modal } from "../ui";

// A share link is a plaintext-decodable (gzip+base64, not encrypted) copy of
// everything in exportData() -- income, balances, budget labels. Past this
// length it risks being truncated by some messaging apps/clients.
const LONG_LINK_WARNING_LENGTH = 6000;

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
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isDataDrawerOpen, setIsDataDrawerOpen] = useState(false);

  const flash = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleShare = async () => {
    const hash = await encodeShareHash(exportData());
    setShareLink(`${location.origin}${location.pathname}#${hash}`);
  };

  // Only one of {Modal, Drawer} may be open at once, since both lock body
  // scroll on mount and restore it on unmount -- if the Modal opened while
  // the Drawer was still open, the two could unlock out of order. Close the
  // Data drawer in the same click handler that opens the share-link Modal.
  const openShareLink = () => {
    setIsDataDrawerOpen(false);
    void handleShare();
  };

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      flash("Link copied.");
    } catch {
      flash("Couldn't copy automatically -- select and copy the link below.", true);
    }
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
      <Button size="sm" onClick={() => setIsDataDrawerOpen(true)}>
        Data
      </Button>
      <Drawer
        open={isDataDrawerOpen}
        onClose={() => setIsDataDrawerOpen(false)}
        title="Data"
        subtitle="Save, load and reset your numbers."
      >
        <div className="flex flex-col items-start gap-2">
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
          <Button
            size="sm"
            title={
              isShareSupported()
                ? "Generate a link that loads your current numbers in another browser"
                : "Share links aren't supported in this browser"
            }
            disabled={!isShareSupported()}
            onClick={openShareLink}
          >
            Share link
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
      </Drawer>
      <Modal
        open={shareLink !== null}
        onClose={() => setShareLink(null)}
        title="Share link"
        subtitle="Anyone with this link can see everything below, in plain text -- income, balances, budget labels. Only send it somewhere you trust."
        footer={
          <>
            <Button onClick={() => setShareLink(null)}>Close</Button>
            <Button variant="primary" onClick={copyShareLink}>
              Copy link
            </Button>
          </>
        }
      >
        <input
          readOnly
          value={shareLink ?? ""}
          onFocus={(event_) => event_.target.select()}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700"
        />
        {shareLink && shareLink.length > LONG_LINK_WARNING_LENGTH && (
          <div className="mt-2">
            <Callout tone="warn">
              This link is unusually long and may get truncated by some
              messaging apps. If it doesn't work, try trimming old balance
              snapshots first.
            </Callout>
          </div>
        )}
      </Modal>
    </div>
  );
}
