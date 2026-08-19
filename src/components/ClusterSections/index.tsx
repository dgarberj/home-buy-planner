import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SECTIONS, type ClusterId } from "../../clusters";
import { Section } from "../ui";

/**
Renders every `SECTIONS` entry belonging to `cluster`, in display order.
`content` supplies the one thing that isn't data -- the actual panel for
each section id -- so this stays reusable across all three clusters.
*/
export default function ClusterSections({
  cluster,
  content,
}: {
  cluster: ClusterId;
  content: Record<string, ReactNode>;
}) {
  const { t } = useTranslation();
  return (
    <>
      {SECTIONS.filter((s) => s.cluster === cluster).map((s) => (
        <Section
          key={s.id}
          id={s.id}
          eyebrow={t(s.eyebrowKey, s.eyebrowDefault)}
          title={t(s.titleKey, s.titleDefault)}
          description={t(s.descriptionKey, s.descriptionDefault)}
          defaultOpen={s.defaultOpen}
        >
          {content[s.id]}
        </Section>
      ))}
    </>
  );
}
