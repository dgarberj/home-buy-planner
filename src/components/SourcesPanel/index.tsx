import { useTranslation } from "react-i18next";
import { formatMaxAge } from "../../data/freshness";
import {
  RELIABILITY_LABEL,
  RELIABILITY_NOTE,
  SOURCES,
  SOURCE_TOPICS,
  isSourceStale,
  sourcesFor,
  staleSources,
  type Reliability,
} from "../../data/sources";
import { Callout, Card, InfoTip } from "../ui";

/**
 * Every external number in this app, and where it came from.
 *
 * The model makes real decisions, so anything not derived from your own figures
 * should be openable and checkable. Reliability is stated plainly: an official
 * millage table and a commercial house-price estimate are not the same kind of
 * fact, and presenting them identically would be misleading.
 */

const BADGE: Record<Reliability, string> = {
  official: "bg-emerald-100 text-emerald-800",
  commercial: "bg-amber-100 text-amber-800",
  secondary: "bg-slate-200 text-slate-700",
};

const RELIABILITY_LABEL_KEY: Record<Reliability, string> = {
  official: "sourcesPanel.reliability.official.label",
  commercial: "sourcesPanel.reliability.commercial.label",
  secondary: "sourcesPanel.reliability.secondary.label",
};

const RELIABILITY_NOTE_KEY: Record<Reliability, string> = {
  official: "sourcesPanel.reliability.official.note",
  commercial: "sourcesPanel.reliability.commercial.note",
  secondary: "sourcesPanel.reliability.secondary.note",
};

function SourceCard({ id }: { id: string }) {
  const { t } = useTranslation();
  const source = SOURCES.find((s) => s.id === id);
  if (!source) return null;
  const stale = isSourceStale(source);

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500"
          >
            {source.title}
          </a>
          <p className="mt-0.5 text-sm text-slate-500">{source.publisher}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {stale && (
            <span className="whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
              {t("sourcesPanel.staleBadge", "STALE")}
              <InfoTip
                placement="bottom"
                text={t(
                  "sourcesPanel.staleTooltip",
                  "Retrieved more than {{maxAge}} ago, this source's own threshold per docs/adr/0001-stale-data-threshold.md. Re-fetch before relying on it.",
                  { maxAge: formatMaxAge(source.staleAfterDays!) },
                )}
              />
            </span>
          )}
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${BADGE[source.reliability]}`}
          >
            {t(
              RELIABILITY_LABEL_KEY[source.reliability],
              RELIABILITY_LABEL[source.reliability],
            )}
            <InfoTip
              placement="bottom"
              text={t(
                RELIABILITY_NOTE_KEY[source.reliability],
                RELIABILITY_NOTE[source.reliability],
              )}
            />
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        {source.covers}
      </p>

      {source.note && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {source.note}
        </p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex gap-1.5">
          <dt>{t("sourcesPanel.retrieved", "Retrieved")}</dt>
          <dd className="font-medium tabular-nums text-slate-700">
            {source.fetchedAt}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>{t("sourcesPanel.goesStale", "Goes stale")}</dt>
          <dd className="text-slate-700">{source.refresh}</dd>
        </div>
        {source.staleAfterDays !== undefined && (
          <div className="flex gap-1.5">
            <dt>
              {t("sourcesPanel.stalenessThreshold", "Staleness threshold")}
            </dt>
            <dd className="text-slate-700">
              {formatMaxAge(source.staleAfterDays)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function SourcesPanel() {
  const { t } = useTranslation();
  const officialCount = SOURCES.filter(
    (s) => s.reliability === "official",
  ).length;
  const stale = staleSources();

  return (
    <div className="space-y-5">
      {stale.length > 0 && (
        <Callout tone="warn">
          <strong>
            {t(
              "sourcesPanel.staleSummary",
              `{{count}} source${stale.length === 1 ? "" : "s"} past its staleness threshold.`,
              { count: stale.length },
            )}
          </strong>{" "}
          {stale
            .map((s) =>
              t(
                "sourcesPanel.staleListItem",
                "{{title}} (older than {{threshold}})",
                { title: s.source.title, threshold: s.thresholdLabel },
              ),
            )
            .join(", ")}
          .{" "}
          {t(
            "sourcesPanel.staleFooter",
            "See docs/adr/0001-stale-data-threshold.md and re-fetch before relying on these.",
          )}
        </Callout>
      )}

      <Callout tone="neutral">
        <strong>
          {t(
            "sourcesPanel.countSummary",
            "{{total}} sources, {{official}} of them official.",
            { total: SOURCES.length, official: officialCount },
          )}
        </strong>{" "}
        {t(
          "sourcesPanel.countSummaryBody",
          "Everything the model did not get from your own numbers is listed here with a link, what it covers, when I fetched it and how often it goes stale. Where only a commercial estimate exists, it says so — an official millage table and a Zillow figure are not the same kind of fact.",
        )}
      </Callout>

      {SOURCE_TOPICS.map((topic) => (
        <Card key={topic.key} title={topic.label} subtitle={topic.description}>
          <p className="mb-4 text-xs text-slate-500">
            <span className="font-medium text-slate-600">
              {t("sourcesPanel.usedBy", "Used by:")}
            </span>{" "}
            {topic.usedBy}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {sourcesFor(topic.key).map((s) => (
              <SourceCard key={s.id} id={s.id} />
            ))}
          </div>
        </Card>
      ))}

      <Callout tone="warn">
        <strong>
          {t("sourcesPanel.notSourced.headline", "What is not sourced.")}
        </strong>{" "}
        {t(
          "sourcesPanel.notSourced.body",
          "Your own figures — pay, spending, balances, fixed obligations — come from you, and the ones still marked ESTIMATE in the data file are guesses I made. House prices exist for only 18 of 112 municipalities, and school performance for roughly half the districts. Those gaps are shown as blanks throughout rather than filled in with plausible-looking numbers.",
        )}
      </Callout>
    </div>
  );
}
