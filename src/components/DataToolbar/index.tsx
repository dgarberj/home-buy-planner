import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  // Close the drawer before showing the share-link Modal on top of it --
  // purely so the two don't visually stack; the shared scroll lock is
  // reference-counted, so nesting them wouldn't leave scrolling broken.
  const openShareLink = () => {
    setIsDataDrawerOpen(false);
    void handleShare();
  };

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      flash(t("dataToolbar.linkCopied", "Link copied."));
    } catch {
      flash(
        t(
          "dataToolbar.copyFailed",
          "Couldn't copy automatically -- select and copy the link below.",
        ),
        true,
      );
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
        {t("dataToolbar.data", "Data")}
      </Button>
      <a
        href="https://github.com/dgarberj/home-buy-planner"
        target="_blank"
        rel="noreferrer"
        title={t("dataToolbar.viewSource", "View source on GitHub")}
        aria-label={t("dataToolbar.viewSource", "View source on GitHub")}
        className="text-slate-500 transition hover:text-slate-900"
      >
        <svg
          viewBox="0 0 16 16"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
      </a>
      <Drawer
        open={isDataDrawerOpen}
        onClose={() => setIsDataDrawerOpen(false)}
        title={t("dataToolbar.data", "Data")}
        subtitle={t(
          "dataToolbar.drawerSubtitle",
          "Save, load and reset your numbers.",
        )}
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
            title={t(
              "dataToolbar.exportTitle",
              "Save a JSON backup of your numbers",
            )}
            onClick={() => {
              downloadText("household.json", exportData(), "application/json");
              flash(
                t("dataToolbar.saved", "Saved. Keep it in the data/ folder."),
              );
            }}
          >
            {t("dataToolbar.export", "Export")}
          </Button>
          <Button
            size="sm"
            title={t("dataToolbar.importTitle", "Load a JSON backup")}
            onClick={() => fileReference.current?.click()}
          >
            {t("dataToolbar.import", "Import")}
          </Button>
          <Button
            size="sm"
            title={
              isShareSupported()
                ? t(
                    "dataToolbar.shareTitle.supported",
                    "Generate a link that loads your current numbers in another browser",
                  )
                : t(
                    "dataToolbar.shareTitle.unsupported",
                    "Share links aren't supported in this browser",
                  )
            }
            disabled={!isShareSupported()}
            onClick={openShareLink}
          >
            {t("dataToolbar.shareLink", "Share link")}
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
              flash(error ?? t("dataToolbar.loaded", "Loaded."), !!error);
              event_.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="danger"
            title={t(
              "dataToolbar.clearTitle",
              "Discard edits saved in this browser and fall back to the local data file (or the example data, if there is none)",
            )}
            onClick={() => {
              if (
                !confirm(
                  t(
                    "dataToolbar.clearConfirm",
                    "Clear this browser's saved overrides? In-app edits not written back to data/household.json will be lost.",
                  ),
                )
              ) {
                return;
              }

              clearLocalOverrides();
              flash(t("dataToolbar.cleared", "Local overrides cleared."));
            }}
          >
            {t("dataToolbar.clear", "Clear local storage")}
          </Button>
        </div>
      </Drawer>
      <Modal
        open={shareLink !== null}
        onClose={() => setShareLink(null)}
        title={t("dataToolbar.shareLink", "Share link")}
        subtitle={t(
          "dataToolbar.shareModalSubtitle",
          "Anyone with this link can see everything below, in plain text -- income, balances, budget labels. Only send it somewhere you trust.",
        )}
        footer={
          <>
            <Button onClick={() => setShareLink(null)}>
              {t("dataToolbar.close", "Close")}
            </Button>
            <Button variant="primary" onClick={copyShareLink}>
              {t("dataToolbar.copyLink", "Copy link")}
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
              {t(
                "dataToolbar.longLinkWarning",
                "This link is unusually long and may get truncated by some messaging apps. If it doesn't work, try trimming old balance snapshots first.",
              )}
            </Callout>
          </div>
        )}
      </Modal>
    </div>
  );
}
