// Mutation claims are irreversible. Readback may advance them, never reopen them.
export function orderReadbackState(
  current: string,
  provider: string | undefined,
  captureRequested: boolean,
) {
  if (
    captureRequested ||
    [
      'COMPLETED',
      'PENDING',
      'REFUND_PENDING',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
      'REVERSED',
    ].includes(current)
  )
    return current;
  if (current === 'UNKNOWN' || current === 'CAPTURING') return current;
  return provider === 'APPROVED'
    ? 'APPROVED'
    : provider === 'VOIDED'
      ? 'FAILED'
      : provider === 'COMPLETED'
        ? 'UNKNOWN'
        : 'AWAITING_APPROVAL';
}
export function captureReadbackState(current: string, next: string) {
  if (current === 'REVERSED' || current === 'REFUNDED') return current;
  if (current === 'PARTIALLY_REFUNDED' && !['REFUNDED', 'REVERSED'].includes(next)) return current;
  if (current === 'COMPLETED' && ['PENDING', 'FAILED', 'UNKNOWN'].includes(next)) return current;
  return next;
}
