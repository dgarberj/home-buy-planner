import { Card } from "../ui";

/**
 * Income, expenses, rent and starting balances are no longer a choice
 * between typing them here or deriving them -- they always come from the
 * Budget and Balances tabs, which are earlier steps than Assumptions on
 * purpose. This note just explains why the fields below are disabled,
 * rather than leaving that unexplained.
 */
export default function SourceNoteCard() {
  return (
    <Card title="Where these numbers come from">
      <p className="text-sm text-slate-600">
        Income, expenses, rent and starting balances below are added up from
        your <strong>Budget</strong> and <strong>Balances</strong> tabs, and
        can&rsquo;t be edited here — edit them there instead.
      </p>
    </Card>
  );
}
