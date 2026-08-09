/**
 * Itemised closing costs for south-east Pennsylvania.
 *
 * A flat "3% of price" hides the one line that genuinely varies by address.
 * Pennsylvania charges 1% state realty transfer tax everywhere, and each
 * municipality adds its own local rate on top -- usually 1%, but not always.
 * The combined figure is customarily split down the middle with the seller, so
 * a buyer normally pays half.
 *
 * Sources (August 2026):
 *  - Delaware County Recorder of Deeds, Transfer Taxes:
 *    https://delcopa.gov/recorder-deeds/transfer-taxes
 *  - Title insurance is state-regulated at roughly $3.50 per $1,000 of cover.
 *
 * Everything except transfer tax is an estimate. Get a Loan Estimate from a
 * lender before treating any of this as the number.
 */

/**
PA state realty transfer tax. Same everywhere.
*/
export const PA_STATE_TRANSFER_TAX = 0.01;

/**
The usual local rate. Municipalities below deviate from it.
*/
export const DEFAULT_LOCAL_TRANSFER_TAX = 0.01;

/**
 * Municipalities charging something other than 1% locally.
 * Delaware County publishes these as the exceptions; everywhere else is 1%.
 */
export const LOCAL_TRANSFER_TAX_OVERRIDES: Record<string, number> = {
  Radnor: 0.015,
  'Darby, Upper': 0.015,
  'Providence, Upper': 0.02,
  'Chester City': 0.015,
};

/**
 * Share of the combined transfer tax the buyer customarily pays.
 * Negotiable, and in a soft market a seller may take more of it.
 */
export const BUYER_TRANSFER_TAX_SHARE = 0.5;

export interface ClosingCostLine {
  key: string;
  label: string;
  /**
  As a share of purchase price, where it scales.
  */
  pctOfPrice?: number;
  /**
  Flat dollar amount, where it does not.
  */
  flat?: number;
  note: string;
  /**
  Can you shop for this, or is it fixed?
  */
  negotiable: boolean;
}

/**
Everything other than transfer tax, which is computed per municipality.
*/
export const STANDARD_CLOSING_LINES: ClosingCostLine[] = [
  {
    key: 'title',
    label: 'Title insurance and settlement',
    pctOfPrice: 0.005,
    note: 'Rates are set by the state at roughly $3.50 per $1,000 of cover, so there is little to shop on the premium itself. Settlement and search fees vary.',
    negotiable: false,
  },
  {
    key: 'lender',
    label: 'Lender origination and underwriting',
    pctOfPrice: 0.008,
    note: 'Origination, underwriting, processing. This is the block worth shopping — quotes vary widely between lenders for the same loan.',
    negotiable: true,
  },
  {
    key: 'appraisal',
    label: 'Appraisal',
    flat: 650,
    note: 'Required by the lender. Roughly $550-800 in this market.',
    negotiable: false,
  },
  {
    key: 'inspection',
    label: 'Home inspection',
    flat: 600,
    note: 'Not required, and skipping it on a Delaware County house would be a mistake given the age of the stock. Budget more if you add radon or sewer scope.',
    negotiable: true,
  },
  {
    key: 'radon-sewer',
    label: 'Radon test and sewer scope',
    flat: 450,
    note: 'Radon is common across Delaware County and sewer laterals fail expensively in older boroughs. Cheap insurance against a five-figure surprise.',
    negotiable: true,
  },
  {
    key: 'prepaid-escrow',
    label: 'Prepaid taxes and insurance',
    pctOfPrice: 0.008,
    note: 'The lender collects several months of tax and insurance up front to seed the escrow account. Not a fee — you would owe it anyway — but it is cash you need on the day.',
    negotiable: false,
  },
  {
    key: 'recording',
    label: 'Recording and misc',
    flat: 350,
    note: 'Deed and mortgage recording, courier, notary.',
    negotiable: false,
  },
];

export interface ClosingCostBreakdown {
  transferTaxTotal: number;
  transferTaxBuyerShare: number;
  localRate: number;
  lines: { label: string; amount: number; note: string; negotiable: boolean }[];
  /**
  Everything the buyer pays at closing, excluding the deposit itself.
  */
  total: number;
  /**
  As a share of purchase price, for comparison against the flat assumption.
  */
  pctOfPrice: number;
}

export function localTransferTaxRate(municipality: string): number {
  return LOCAL_TRANSFER_TAX_OVERRIDES[municipality] ?? DEFAULT_LOCAL_TRANSFER_TAX;
}

/**
 * Itemise what a buyer actually pays at settlement in a given municipality.
 *
 * @param buyerTransferShare override the customary 50/50 split if you have
 *   negotiated otherwise.
 */
export function closingCosts(
  price: number,
  municipality: string,
  buyerTransferShare = BUYER_TRANSFER_TAX_SHARE,
): ClosingCostBreakdown {
  const localRate = localTransferTaxRate(municipality);
  const combinedRate = PA_STATE_TRANSFER_TAX + localRate;
  const transferTaxTotal = price * combinedRate;
  const transferTaxBuyerShare = transferTaxTotal * buyerTransferShare;

  const lines = [
    {
      label: `Realty transfer tax (${(combinedRate * 100).toFixed(1)}% combined, your ${(buyerTransferShare * 100).toFixed(0)}%)`,
      amount: transferTaxBuyerShare,
      note: `1% to Pennsylvania and ${(localRate * 100).toFixed(1)}% to ${municipality}. Customarily split with the seller, but that split is negotiable.`,
      negotiable: true,
    },
    ...STANDARD_CLOSING_LINES.map((l) => ({
      label: l.label,
      amount: (l.pctOfPrice ?? 0) * price + (l.flat ?? 0),
      note: l.note,
      negotiable: l.negotiable,
    })),
  ];

  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    transferTaxTotal,
    transferTaxBuyerShare,
    localRate,
    lines,
    total,
    pctOfPrice: price > 0 ? total / price : 0,
  };
}
