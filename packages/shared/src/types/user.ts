export type UserRole = 'admin' | 'contabilidad' | 'aprobador' | 'visualizador';

export interface User {
  id: string;
  companyId: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  rut: string;
  razonSocial: string;
  giro: string;
  direccion: string;
  createdAt: string;
  updatedAt: string;
}
