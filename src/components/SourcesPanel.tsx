import {
  RELIABILITY_LABEL,
  RELIABILITY_NOTE,
  SOURCES,
  SOURCE_TOPICS,
  sourcesFor,
  type Reliability,
} from '../data/sources';
import { Callout, Card, InfoTip } from './ui';

/**
 * Every external number in this app, and where it came from.
 *
 * The model makes real decisions, so anything not derived from your own figures
 * should be openable and checkable. Reliability is stated plainly: an official
 * millage table and a commercial house-price estimate are not the same kind of
 * fact, and presenting them identically would be misleading.
 */

const BADGE: Record<Reliability, string> = {
  official: 'bg-emerald-100 text-emerald-800',
  commercial: 'bg-amber-100 text-amber-800',
  secondary: 'bg-slate-200 text-slate-700',
};

function SourceCard({ id }: { id: string }) {
  const source = SOURCES.find((s) => s.id === id);
  if (!source) return null;

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
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${BADGE[source.reliability]}`}
        >
          {RELIABILITY_LABEL[source.reliability]}
          <InfoTip placement="bottom" text={RELIABILITY_NOTE[source.reliability]} />
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700">{source.covers}</p>

      {source.note && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {source.note}
        </p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex gap-1.5">
          <dt>Retrieved</dt>
          <dd className="font-medium tabular-nums text-slate-700">{source.retrieved}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Goes stale</dt>
          <dd className="text-slate-700">{source.refresh}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function SourcesPanel() {
  const officialCount = SOURCES.filter((s) => s.reliability === 'official').length;

  return (
    <div className="space-y-5">
      <Callout tone="neutral">
        <strong>{SOURCES.length} sources, {officialCount} of them official.</strong> Everything the
        model did not get from your own numbers is listed here with a link, what it covers, when I
        fetched it and how often it goes stale. Where only a commercial estimate exists, it says so
        — an official millage table and a Zillow figure are not the same kind of fact.
      </Callout>

      {SOURCE_TOPICS.map((topic) => (
        <Card key={topic.key} title={topic.label} subtitle={topic.description}>
          <p className="mb-4 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Used by:</span> {topic.usedBy}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {sourcesFor(topic.key).map((s) => (
              <SourceCard key={s.id} id={s.id} />
            ))}
          </div>
        </Card>
      ))}

      <Callout tone="warn">
        <strong>What is not sourced.</strong> Your own figures — pay, spending, balances, child
        support — come from you, and the ones still marked ESTIMATE in the data file are guesses I
        made. House prices exist for only 18 of 112 municipalities, and school performance for
        roughly half the districts. Those gaps are shown as blanks throughout rather than filled in
        with plausible-looking numbers.
      </Callout>
    </div>
  );
}
