/** Sum the `amount` field across an expense list, guarding against missing values. */
export function sumExpenses(items: { amount?: number | null }[]): number {
  return items.reduce((acc, item) => acc + (item.amount ?? 0), 0);
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
}

export function formatCompactCurrency(amount: number, currency = 'INR'): string {
  if (Math.abs(amount) >= 10000) {
    return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return formatCurrency(amount, currency);
}
