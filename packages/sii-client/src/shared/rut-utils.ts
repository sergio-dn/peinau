/**
 * RUT utility functions for SII integration
 */

/**
 * Parse a RUT string into body and DV components.
 * Accepts formats: "76.195.762-7", "76195762-7", "761957627"
 */
export function parseRut(rut: string): { body: string; dv: string; formatted: string } {
  const clean = rut.replace(/[\.\s]/g, '');
  const raw = clean.replace(/[^0-9kK]/g, '');
  const body = raw.slice(0, -1);
  const dv = raw.slice(-1).toUpperCase();
  return { body, dv, formatted: `${body}-${dv}` };
}

/**
 * Format a RUT from body + DV to "12345678-K" format
 */
export function formatRut(body?: string, dv?: string): string {
  if (!body || !dv) return '';
  return `${body}-${dv}`;
}
