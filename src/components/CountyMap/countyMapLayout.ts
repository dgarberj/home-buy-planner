/**
[column, row] roughly following county geography. West is left, south is down.
*/
export const LAYOUT: Record<string, [number, number]> = {
  Radnor: [7, 0],
  Haverford: [8, 0],
  Millbourne: [9, 0],
  Newtown: [6, 1],
  Marple: [7, 1],
  "Darby, Upper": [8, 1],
  "East Lansdowne": [9, 1],
  Edgmont: [5, 2],
  "Providence, Upper": [6, 2],
  Springfield: [7, 2],
  "Clifton Heights": [8, 2],
  Lansdowne: [9, 2],
  Yeadon: [10, 2],
  Thornbury: [4, 3],
  Middletown: [5, 3],
  Media: [6, 3],
  Morton: [7, 3],
  Aldan: [8, 3],
  Colwyn: [9, 3],
  "Darby Borough": [10, 3],
  "Chadds Ford": [3, 4],
  Concord: [4, 4],
  "Rose Valley": [5, 4],
  "Providence, Nether": [6, 4],
  Rutledge: [7, 4],
  Collingdale: [8, 4],
  "Darby Township": [9, 4],
  Bethel: [3, 5],
  "Chester Heights": [4, 5],
  Aston: [5, 5],
  Swarthmore: [6, 5],
  "Ridley Township": [7, 5],
  Folcroft: [8, 5],
  "Sharon Hill": [9, 5],
  "Chichester, Upper": [3, 6],
  Brookhaven: [4, 6],
  Parkside: [5, 6],
  "Chester Township": [6, 6],
  Glenolden: [7, 6],
  Norwood: [8, 6],
  "Prospect Park": [9, 6],
  "Chichester, Lower": [2, 7],
  "Marcus Hook": [3, 7],
  Trainer: [4, 7],
  Upland: [5, 7],
  "Chester City": [6, 7],
  Eddystone: [7, 7],
  "Ridley Park": [8, 7],
  Tinicum: [9, 7],
};

export const TILE = 78;
export const GAP = 5;
export const COLS = 11;
export const ROWS = 8;

/**
Green where tax is low, red where it is high.
*/
export function tileStroke(isHighlighted: boolean, isHovered: boolean): string {
  if (isHighlighted) return "#1d4ed8";
  if (isHovered) return "#0f172a";
  return "rgba(15,23,42,0.10)";
}

export function tileStrokeWidth(
  isHighlighted: boolean,
  isHovered: boolean,
): number {
  if (isHighlighted) return 3;
  if (isHovered) return 2;
  return 1;
}

export function tileColour(rate: number, min: number, max: number): string {
  const t = (rate - min) / (max - min || 1);
  // 140deg (green) down to 0deg (red).
  const hue = 140 - t * 140;
  return `hsl(${hue}, 62%, ${78 - t * 14}%)`;
}

/**
Short enough to fit inside a tile.
*/
export function shortName(name: string): string {
  return name
    .replace("Chichester, Lower", "Lwr Chich")
    .replace("Chichester, Upper", "Upr Chich")
    .replace("Providence, Nether", "Nether Prov")
    .replace("Providence, Upper", "Upper Prov")
    .replace("Darby, Upper", "Upper Darby")
    .replace(" Township", " Twp")
    .replace(" Borough", " Boro")
    .replace("East Lansdowne", "E Lansdowne");
}

/**
 * What the big number on each tile means.
 *
 * This used to vary per tile -- a median house price where one was sourced, a
 * monthly tax bill where one wasn't. Both render as "$241,515" and "$488" with
 * no label, so there was no way to tell which quantity you were looking at.
 * Now every tile shows the same metric and the legend says which.
 */
export const METRICS = [
  {
    key: "price" as const,
    label: "Median home price",
    unit: "median",
    hint: "Typical home value in this town. Blank where no price could be sourced — which is an absence of data, not a cheap town.",
  },
  {
    key: "taxMonthly" as const,
    label: "Property tax per month",
    unit: "tax/mo",
    hint: "Monthly property and school tax on this town's own median home, so the figures are comparable as lived costs rather than on a hypothetical house.",
  },
  {
    key: "taxRate" as const,
    label: "Tax rate",
    unit: "of value",
    hint: "Annual property and school tax as a share of market value. The only figure that compares directly across county lines.",
  },
  {
    key: "valueScore" as const,
    label: "Value score",
    unit: "pts/$1k",
    hint: "School quality (mean maths/reading proficiency) per $1,000/month of all-in ownership cost, pricing the SAME reference house everywhere. Blank where the district isn't sourced.",
  },
];

export type MetricKey = (typeof METRICS)[number]["key"];

/**
Colour for the little school dot on each tile.
*/
export const BAND_COLOUR: Record<string, string> = {
  strong: "#15803d",
  above: "#65a30d",
  below: "#b45309",
  unknown: "rgba(15,23,42,0.18)",
};
