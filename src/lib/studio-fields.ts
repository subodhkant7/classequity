import type { AgFieldDefinition } from 'ag-studio';

// Never let a zero-valued first row infer integer formatting for USD amounts.
// These are display definitions only; source values still derive from integer cents.
export const tripStudioFields: AgFieldDefinition[] = [
  ...['trip', 'pricing', 'source'].map((id) => ({ id, format: 'textFormat' as const })),
  ...[
    'registered',
    'confirmedSeats',
    'outstandingObligationCents',
    'parentPaidSeats',
    'fullyAssistedSeats',
    'unresolvedSeats',
    'feePending',
    'unresolved',
  ].map((id) => ({ id, format: 'integerFormat' as const })),
  ...[
    'feeReserveUsd',
    'refundReserveUsd',
    'schoolContributionUsd',
    'requiredUsd',
    'grossUsd',
    'feesUsd',
    'refundsUsd',
    'netUsd',
    'gapUsd',
    'sponsorCommittedUsd',
  ].map((id) => ({
    id,
    format: 'currencyFormat' as const,
    formatOptions: { format: '$#,##0.00;-$#,##0.00' },
  })),
];

export const tierStudioFields: AgFieldDefinition[] = [
  { id: 'trip', format: 'textFormat' },
  { id: 'threshold', format: 'textFormat' },
  { id: 'seatUsd', format: 'currencyFormat', formatOptions: { format: '$#,##0.00;-$#,##0.00' } },
];
