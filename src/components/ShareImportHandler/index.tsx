import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SEED_VERSION } from "../../data/seed";
import { decodeShareHash, isShareHash } from "../../lib/share";
import { useStore } from "../../store/useStore";
import { Button, Modal } from "../ui";

function parseSeedVersion(json: string): unknown {
  try {
    return (JSON.parse(json) as { seedVersion?: unknown }).seedVersion;
  } catch {
    return undefined;
  }
}

type ShareImportState =
  { kind: "confirm"; json: string } | { kind: "error"; message: string };

/**
Loads a #share=... link on landing. Strips the hash immediately after
decoding either way, so the payload never lingers in the address bar and a
reload can't re-trigger the import.
*/
export default function ShareImportHandler() {
  const { t } = useTranslation();
  const importData = useStore((s) => s.importData);
  const [state, setState] = useState<ShareImportState | null>(null);

  useEffect(() => {
    const hash = location.hash;
    if (!isShareHash(hash)) return;
    void (async () => {
      const json = await decodeShareHash(hash);
      const seedVersion = json ? parseSeedVersion(json) : undefined;
      if (!json) {
        setState({
          kind: "error",
          message: t(
            "app.share.brokenLink",
            "That share link is broken or incomplete.",
          ),
        });
      } else if (seedVersion === SEED_VERSION) {
        setState({ kind: "confirm", json });
      } else {
        // Not a decode failure -- a real payload built against a different
        // app version. Loading it anyway would hit migrateSaved's own
        // version check and silently discard everything, so catch it here
        // with a message instead of a false "Load shared data" success.
        setState({
          kind: "error",
          message: t(
            "app.share.versionMismatch",
            "This link was made with a different version of the app and can't be loaded here.",
          ),
        });
      }
      history.replaceState(null, "", location.pathname + location.search);
    })();
    // Runs once on landing only; the hash is stripped immediately, so a
    // later `t` reference change (e.g. switching language) must not
    // re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === null) return null;

  if (state.kind === "error") {
    return (
      <Modal
        open
        onClose={() => setState(null)}
        title={t("app.share.errorTitle", "Couldn't load share link")}
        footer={
          <Button variant="primary" onClick={() => setState(null)}>
            {t("app.share.close", "Close")}
          </Button>
        }
      >
        <p className="text-sm text-slate-600">{state.message}</p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={() => setState(null)}
      title={t("app.share.confirmTitle", "Load shared scenario?")}
      subtitle={t(
        "app.share.confirmSubtitle",
        "This replaces all budget, balance, and scenario data currently saved in this browser.",
      )}
      footer={
        <>
          <Button onClick={() => setState(null)}>
            {t("app.share.cancel", "Cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const importError = importData(state.json);
              setState(
                importError ? { kind: "error", message: importError } : null,
              );
            }}
          >
            {t("app.share.loadButton", "Load shared data")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {t(
          "app.share.confirmBody",
          "Someone shared a link with their full numbers baked in. Loading it overwrites what's currently saved in this browser — export a backup first if you want to keep it.",
        )}
      </p>
    </Modal>
  );
}
