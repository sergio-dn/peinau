export interface ApprovalWorkflow {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApprovalWorkflowLevel {
  id: string;
  workflowId: string;
  levelOrder: number;
  name: string;
  minAmount: number | null;
  maxAmount: number | null;
  requiresAllApprovers: boolean;
}

export interface ApprovalWorkflowLevelApprover {
  id: string;
  levelId: string;
  userId: string;
}

export type ApprovalAction = 'approved' | 'rejected' | 'returned';

export interface ApprovalStep {
  id: string;
  invoiceId: string;
  levelId: string;
  approverId: string;
  action: ApprovalAction | null;
  comment: string | null;
  actedAt: string | null;
  createdAt: string;
}
