export interface ChartOfAccount {
  id: string;
  companyId: string;
  code: string;
  name: string;
  parentCode: string | null;
  isActive: boolean;
}

export interface CostCenter {
  id: string;
  companyId: string;
  code: string;
  name: string;
  parentCode: string | null;
  isActive: boolean;
}
