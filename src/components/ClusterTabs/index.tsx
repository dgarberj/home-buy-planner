import { useTranslation } from "react-i18next";
import { CLUSTERS, type ClusterId } from "../../clusters";
import SegmentedTabs from "../ui/SegmentedTabs";

export default function ClusterTabs({
  cluster,
  onSelect,
}: {
  cluster: ClusterId;
  onSelect: (id: ClusterId) => void;
}) {
  const { t } = useTranslation();
  return (
    <SegmentedTabs
      items={CLUSTERS.map((c) => ({
        id: c.id,
        label: t(`app.clusters.${c.id}`, c.label),
      }))}
      active={cluster}
      onSelect={onSelect}
    />
  );
}
