/**
 * Formats a number as Chilean Pesos (CLP): $1.234.567
 */
export function formatCLP(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `$${formatted}`;
}

/**
 * Parses a CLP-formatted string back to a number.
 * Accepts formats like "$1.234.567", "1.234.567", or "1234567".
 */
export function parseCLP(formatted: string): number {
  const cleaned = formatted.replace(/[\$\.]/g, '').trim();
  const value = parseInt(cleaned, 10);
  return isNaN(value) ? 0 : value;
}
