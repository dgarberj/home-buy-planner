import { useTranslation } from "react-i18next";
import { NAV } from "../../nav";

/**
 * The section-nav links, shared by the desktop `AppSidebar` and the mobile
 * fallback -- both need the same click behaviour (hand cluster-switching and
 * scrolling to `App.tsx`, the sole owner of the active cluster, instead of
 * the anchor's own jump landing on a Section that may not be mounted yet).
 * The caller supplies its own wrapping element and per-context link styling.
 */
export default function NavLinks({
  onNavigate,
  linkClassName,
}: {
  onNavigate: (id: string) => void;
  linkClassName: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      {NAV.map((n) => (
        <a
          key={n.id}
          href={`#${n.id}`}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(n.id);
          }}
          className={linkClassName}
        >
          {t(`nav.${n.id}`, n.label)}
        </a>
      ))}
    </>
  );
}
