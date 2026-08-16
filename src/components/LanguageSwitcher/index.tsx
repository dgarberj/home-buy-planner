import { useTranslation } from "react-i18next";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;
  return (
    <div
      className={`inline-flex gap-0.5 rounded-lg border border-slate-200 p-0.5 text-xs font-medium ${className}`}
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={current === code}
          onClick={() => void i18n.changeLanguage(code)}
          className={`rounded-md px-2 py-1 transition ${
            current === code
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
