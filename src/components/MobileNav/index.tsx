import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../LanguageSwitcher";
import LeversBar from "../LeversBar";
import NavLinks from "../NavLinks";

/**
A compact, always-in-flow nav + levers strip for below `md:`, where
`AppSidebar` renders nothing. Mirrors the pre-redesign horizontal layout so
narrow screens keep the same reachable controls without a second component
tree or any fixed/absolute overlay.
*/
export default function MobileNav({
  onNavigate,
}: {
  onNavigate: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [leversOpen, setLeversOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 bg-slate-50 md:hidden">
      <nav className="flex flex-wrap items-center justify-between gap-1 px-6 py-2">
        <div className="flex flex-wrap gap-1">
          <NavLinks
            onNavigate={onNavigate}
            linkClassName="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          />
        </div>
        <LanguageSwitcher />
      </nav>
      <button
        type="button"
        onClick={() => setLeversOpen((v) => !v)}
        className="w-full border-t border-slate-200 px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        {leversOpen
          ? t("app.mobileNav.hideLevers", "Hide levers")
          : t("app.mobileNav.showLevers", "Show levers")}
      </button>
      {leversOpen && (
        <div className="border-t border-slate-200 px-6 py-3">
          <LeversBar />
        </div>
      )}
    </div>
  );
}
