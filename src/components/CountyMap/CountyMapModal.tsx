import { useTranslation } from "react-i18next";
import { clrFactorFor, type Municipality } from "../../data/localMarket";
import { climateRiskFor } from "../../data/climateRisk";
import { districtFor } from "../../data/schools";
import { useStore } from "../../store/useStore";
import { Button, Modal } from "../ui";
import CountyMapModalCost from "./CountyMapModalCost";
import CountyMapModalMillage from "./CountyMapModalMillage";
import CountyMapModalSchools from "./CountyMapModalSchools";
import CountyMapModalHazard from "./CountyMapModalHazard";

const COUNTY_KEY_LABEL: Record<string, string> = {
  delaware: "marketPanel.townCard.county.delaware",
  montgomery: "marketPanel.townCard.county.montgomery",
};

/**
Full detail on one municipality: cost breakdown, millage, and schools.
*/
export default function CountyMapModal({
  open,
  onClose,
  price,
}: {
  open: Municipality | null;
  onClose: () => void;
  price: number;
}) {
  const { t } = useTranslation();
  const assumptions = useStore((s) => s.assumptions);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const detail = open ? districtFor(open.schoolDistrict) : null;
  const risk = open ? climateRiskFor(open.countyKey) : null;
  const onShortlist = open ? settings.shortlist.includes(open.name) : false;

  return (
    <Modal
      open={open !== null}
      onClose={onClose}
      title={open?.name ?? ""}
      subtitle={
        open
          ? t(
              "countyMap.modal.schoolDistrictSubtitle",
              "{{district}} school district",
              {
                district: open.schoolDistrict,
              },
            )
          : undefined
      }
      footer={
        open && (
          <>
            <Button
              onClick={() =>
                setSettings({
                  shortlist: onShortlist
                    ? settings.shortlist.filter((n) => n !== open.name)
                    : [...settings.shortlist, open.name],
                })
              }
            >
              {onShortlist
                ? t(
                    "countyMap.modal.removeFromShortlist",
                    "Remove from shortlist",
                  )
                : t("countyMap.modal.addToShortlist", "Add to shortlist")}
            </Button>
            <Button variant="primary" onClick={onClose}>
              {t("countyMap.modal.done", "Done")}
            </Button>
          </>
        )
      }
    >
      {open && (
        <div className="space-y-6">
          <CountyMapModalCost
            open={open}
            price={price}
            home={assumptions.home}
          />
          <CountyMapModalMillage open={open} />
          <CountyMapModalSchools open={open} detail={detail} />
          {risk && <CountyMapModalHazard open={open} risk={risk} />}

          <p className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            {t(
              "countyMap.modal.assessmentFooter",
              "Pennsylvania taxes assessed value, and buying does not trigger a reassessment. This converts a sale price using {{county}}'s county-wide drift factor of {{clrFactor}}, so it is reliable for ranking places and not for budgeting a specific house. Raw millage is NOT comparable across county lines — only the effective rate is. Check the actual assessment before making an offer.",
              {
                county: t(
                  COUNTY_KEY_LABEL[open.countyKey] ?? "",
                  open.countyKey,
                ),
                clrFactor: clrFactorFor(open),
              },
            )}
          </p>
        </div>
      )}
    </Modal>
  );
}
