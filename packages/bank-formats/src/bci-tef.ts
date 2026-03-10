/**
 * BCI TEF (Transferencia Electrónica de Fondos) File Generator
 *
 * BCI uses a semicolon-delimited CSV format for bulk payments.
 * Format: Each line represents one payment.
 *
 * Fields (semicolon separated):
 * 1. RUT beneficiario (sin puntos, con guión)
 * 2. Nombre beneficiario
 * 3. Código banco destino (3 digits)
 * 4. Tipo cuenta destino (01=corriente, 02=vista, 03=ahorro)
 * 5. Número cuenta destino
 * 6. Monto (entero, sin separadores)
 * 7. Email notificación
 * 8. Glosa/Descripción
 *
 * The file must be UTF-8 encoded with Windows line endings (CRLF).
 */

import type { PaymentRecord, BankFileConfig } from './types.js';
import { ACCOUNT_TYPE_CODES } from './types.js';

export function generateBciTef(
  records: PaymentRecord[],
  config?: BankFileConfig
): string {
  validateRecords(records);

  const lines: string[] = [];

  for (const record of records) {
    const rutClean = cleanRut(record.rutBeneficiario);
    const tipoCuenta = ACCOUNT_TYPE_CODES[record.tipoCuenta] || record.tipoCuenta;
    const bancoCode = record.bancoDestino.padStart(3, '0');
    const monto = Math.round(record.montoTotal);

    // Build glosa with invoice detail
    let glosa = record.glosa;
    if (record.detalle.length > 0) {
      const folios = record.detalle.map(d => `F${d.folio}`).join(',');
      glosa = `${record.glosa} (${folios})`.substring(0, 80);
    }

    const line = [
      rutClean,                              // RUT
      record.nombreBeneficiario.substring(0, 60), // Nombre (max 60 chars)
      bancoCode,                             // Banco destino
      tipoCuenta,                            // Tipo cuenta
      record.numeroCuenta,                   // Número cuenta
      monto.toString(),                      // Monto
      record.emailNotificacion || '',        // Email
      glosa.substring(0, 80),               // Glosa (max 80 chars)
    ].join(';');

    lines.push(line);
  }

  // BCI TEF uses CRLF line endings
  return lines.join('\r\n') + '\r\n';
}

/**
 * Generate summary for BCI TEF file
 */
export function getBciTefSummary(records: PaymentRecord[]) {
  const totalAmount = records.reduce((sum, r) => sum + Math.round(r.montoTotal), 0);
  return {
    totalRecords: records.length,
    totalAmount,
    format: 'BCI TEF',
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    separator: ';',
  };
}

function cleanRut(rut: string): string {
  // Remove dots, keep dash: "76.123.456-K" -> "76123456-K"
  return rut.replace(/\./g, '');
}

function validateRecords(records: PaymentRecord[]) {
  if (records.length === 0) {
    throw new BankFormatError('No payment records provided');
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.rutBeneficiario) {
      throw new BankFormatError(`Record ${i + 1}: Missing RUT beneficiario`);
    }
    if (!r.numeroCuenta) {
      throw new BankFormatError(`Record ${i + 1}: Missing número cuenta for ${r.rutBeneficiario}`);
    }
    if (!r.bancoDestino) {
      throw new BankFormatError(`Record ${i + 1}: Missing banco destino for ${r.rutBeneficiario}`);
    }
    if (r.montoTotal <= 0) {
      throw new BankFormatError(`Record ${i + 1}: Invalid amount ${r.montoTotal} for ${r.rutBeneficiario}`);
    }
  }
}

export class BankFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BankFormatError';
  }
}
