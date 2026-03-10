export interface PaymentRecord {
  rutBeneficiario: string;
  nombreBeneficiario: string;
  bancoDestino: string;
  tipoCuenta: string;       // 'corriente' | 'vista' | 'ahorro'
  numeroCuenta: string;
  montoTotal: number;        // CLP integer
  emailNotificacion?: string;
  glosa: string;
  detalle: Array<{
    folio: number;
    monto: number;
  }>;
}

export interface BankFileConfig {
  cuentaOrigen: string;
  rutOrdenante: string;
  nombreOrdenante: string;
}

export type BankFormatType = 'bci_tef' | 'santander';

// Chilean bank codes
export const BANK_CODES: Record<string, string> = {
  'banco_de_chile': '001',
  'banco_internacional': '009',
  'scotiabank': '014',
  'bci': '016',
  'corpbanca': '027',
  'bice': '028',
  'hsbc': '031',
  'santander': '037',
  'itau': '039',
  'security': '049',
  'falabella': '051',
  'ripley': '053',
  'consorcio': '055',
  'estado': '012',
};

export const ACCOUNT_TYPE_CODES: Record<string, string> = {
  'corriente': '01',
  'vista': '02',
  'ahorro': '03',
  'chequera_electronica': '05',
};
