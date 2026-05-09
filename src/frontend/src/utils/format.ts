export const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
});

export function formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return '';
    return currencyFormatter.format(value);
}
