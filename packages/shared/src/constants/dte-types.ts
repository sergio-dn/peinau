import type { DteType } from '../types/invoice.js';

export interface DteTypeInfo {
  code: DteType;
  name: string;
  abbreviation: string;
}

export const DTE_TYPES: Record<DteType, DteTypeInfo> = {
  33: { code: 33, name: 'Factura Electrónica', abbreviation: 'FE' },
  34: { code: 34, name: 'Factura No Afecta o Exenta Electrónica', abbreviation: 'FEE' },
  46: { code: 46, name: 'Factura de Compra Electrónica', abbreviation: 'FCE' },
  52: { code: 52, name: 'Guía de Despacho Electrónica', abbreviation: 'GDE' },
  56: { code: 56, name: 'Nota de Débito Electrónica', abbreviation: 'NDE' },
  61: { code: 61, name: 'Nota de Crédito Electrónica', abbreviation: 'NCE' },
  71: { code: 71, name: 'Boleta de Honorarios Electrónica', abbreviation: 'BHE' },
};

export function getDteTypeName(code: number): string {
  const info = DTE_TYPES[code as DteType];
  return info ? info.name : `Tipo DTE ${code}`;
}
