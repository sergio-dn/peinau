export type BatchState = 'borrador' | 'aprobada' | 'enviada' | 'procesada';

export type BankFormat = 'bci_tef' | 'santander';

export interface PaymentBatch {
  id: string;
  companyId: string;
  batchNumber: number;
  name: string;
  state: BatchState;
  bankFormat: BankFormat;
  totalAmount: number;
  totalItems: number;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  fileContent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBatchItem {
  id: string;
  batchId: string;
  invoiceId: string;
  supplierId: string;
  amount: number;
  retencionHonorarios: number;
  amountNet: number;
}
