export type TipoCuenta = 'corriente' | 'vista' | 'ahorro';

export interface Supplier {
  id: string;
  companyId: string;
  rut: string;
  razonSocial: string;
  giro: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  banco: string | null;
  tipoCuenta: TipoCuenta | null;
  numeroCuenta: string | null;
  autoCreated: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateSupplierInput = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateSupplierInput = Partial<
  Omit<Supplier, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
>;
