/**
 * Santander Chile - Pagos Masivos File Generator
 *
 * Santander uses a semicolon-delimited flat file format for Office Banking.
 *
 * Header line:
 * H;RUT_ORDENANTE;NOMBRE_ORDENANTE;CUENTA_CARGO;FECHA;CANTIDAD_REGISTROS;MONTO_TOTAL
 *
 * Detail lines:
 * D;RUT_BENEFICIARIO;NOMBRE_BENEFICIARIO;BANCO_DESTINO;TIPO_CUENTA;NUMERO_CUENTA;MONTO;EMAIL;GLOSA
 *
 * The file must be UTF-8 encoded.
 */

import type { PaymentRecord, BankFileConfig } from './types.js';
import { ACCOUNT_TYPE_CODES } from './types.js';

export function generateSantander(
  records: PaymentRecord[],
  config?: BankFileConfig
): string {
  validateRecords(records);

  const lines: string[] = [];
  const totalAmount = records.reduce((sum, r) => sum + Math.round(r.montoTotal), 0);
  const fecha = formatDate(new Date());

  // Header line
  if (config) {
    const header = [
      'H',
      cleanRut(config.rutOrdenante),
      config.nombreOrdenante.substring(0, 60),
      config.cuentaOrigen,
      fecha,
      records.length.toString(),
      totalAmount.toString(),
    ].join(';');
    lines.push(header);
  }

  // Detail lines
  for (const record of records) {
    const rutClean = cleanRut(record.rutBeneficiario);
    const tipoCuenta = ACCOUNT_TYPE_CODES[record.tipoCuenta] || record.tipoCuenta;
    const bancoCode = record.bancoDestino.padStart(3, '0');
    const monto = Math.round(record.montoTotal);

    let glosa = record.glosa;
    if (record.detalle.length > 0) {
      const folios = record.detalle.map(d => `F${d.folio}`).join(',');
      glosa = `${record.glosa} (${folios})`.substring(0, 60);
    }

    const line = [
      'D',
      rutClean,
      record.nombreBeneficiario.substring(0, 60),
      bancoCode,
      tipoCuenta,
      record.numeroCuenta,
      monto.toString(),
      record.emailNotificacion || '',
      glosa.substring(0, 60),
    ].join(';');

    lines.push(line);
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generate summary for Santander file
 */
export function getSantanderSummary(records: PaymentRecord[]) {
  const totalAmount = records.reduce((sum, r) => sum + Math.round(r.montoTotal), 0);
  return {
    totalRecords: records.length,
    totalAmount,
    format: 'Santander Pagos Masivos',
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    separator: ';',
  };
}

function cleanRut(rut: string): string {
  return rut.replace(/\./g, '');
}

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

function validateRecords(records: PaymentRecord[]) {
  if (records.length === 0) {
    throw new SantanderFormatError('No payment records provided');
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.rutBeneficiario) {
      throw new SantanderFormatError(`Record ${i + 1}: Missing RUT beneficiario`);
    }
    if (!r.numeroCuenta) {
      throw new SantanderFormatError(`Record ${i + 1}: Missing número cuenta for ${r.rutBeneficiario}`);
    }
    if (!r.bancoDestino) {
      throw new SantanderFormatError(`Record ${i + 1}: Missing banco destino for ${r.rutBeneficiario}`);
    }
    if (r.montoTotal <= 0) {
      throw new SantanderFormatError(`Record ${i + 1}: Invalid amount ${r.montoTotal} for ${r.rutBeneficiario}`);
    }
  }
}

export class SantanderFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SantanderFormatError';
  }
}
