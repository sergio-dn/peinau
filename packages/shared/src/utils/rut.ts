/**
 * Computes the verification digit for a Chilean RUT using modulo 11.
 */
export function getVerificationDigit(rutBody: number): string {
  let sum = 0;
  let multiplier = 2;
  let current = rutBody;

  while (current > 0) {
    sum += (current % 10) * multiplier;
    current = Math.floor(current / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return remainder.toString();
}

/**
 * Removes dots, dashes, and whitespace from a RUT string.
 * Returns the raw RUT (e.g., "123456789").
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[\.\-\s]/g, '').toUpperCase();
}

/**
 * Validates a Chilean RUT using the modulo 11 algorithm.
 */
export function validateRut(rut: string): boolean {
  const cleaned = cleanRut(rut);

  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const digit = cleaned.slice(-1);

  const bodyNumber = parseInt(body, 10);
  if (isNaN(bodyNumber) || bodyNumber <= 0) return false;

  const expectedDigit = getVerificationDigit(bodyNumber);
  return digit === expectedDigit;
}

/**
 * Formats a RUT string to the standard Chilean format: XX.XXX.XXX-X
 */
export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);

  if (cleaned.length < 2) return rut;

  const body = cleaned.slice(0, -1);
  const digit = cleaned.slice(-1);

  // Add dots for thousands separators
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}-${digit}`;
}
