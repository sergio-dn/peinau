import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  integer,
  bigint,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  date,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'contabilidad',
  'aprobador',
  'visualizador',
]);

export const invoiceStateEnum = pgEnum('invoice_state', [
  'recibida',
  'pendiente',
  'aprobada',
  'contabilizada',
  'en_nomina',
  'pagada',
  'rechazada',
]);

export const approvalActionEnum = pgEnum('approval_action', [
  'approved',
  'rejected',
  'returned',
]);

export const batchStateEnum = pgEnum('batch_state', [
  'borrador',
  'aprobada',
  'enviada',
  'procesada',
]);

// ─── Companies ─────────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  rut: varchar('rut', { length: 20 }).notNull().unique(),
  razonSocial: varchar('razon_social', { length: 255 }).notNull(),
  giro: varchar('giro', { length: 255 }),
  direccion: varchar('direccion', { length: 500 }),
  siiUsername: varchar('sii_username', { length: 100 }),
  siiPasswordEncrypted: text('sii_password_encrypted'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── User Roles ────────────────────────────────────────────────────────────────

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: userRoleEnum('role').notNull(),
}, (table) => ({
  uniqueUserRole: uniqueIndex('uq_user_roles_user_role').on(table.userId, table.role),
}));

// ─── Suppliers ─────────────────────────────────────────────────────────────────

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  rut: varchar('rut', { length: 20 }).notNull(),
  razonSocial: varchar('razon_social', { length: 255 }).notNull(),
  giro: varchar('giro', { length: 255 }),
  direccion: varchar('direccion', { length: 500 }),
  email: varchar('email', { length: 255 }),
  telefono: varchar('telefono', { length: 50 }),
  banco: varchar('banco', { length: 100 }),
  tipoCuenta: varchar('tipo_cuenta', { length: 50 }),
  numeroCuenta: varchar('numero_cuenta', { length: 50 }),
  autoCreated: boolean('auto_created').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCompanyRut: uniqueIndex('uq_suppliers_company_rut').on(table.companyId, table.rut),
}));

// ─── Chart of Accounts ─────────────────────────────────────────────────────────

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  parentCode: varchar('parent_code', { length: 20 }),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  uniqueCompanyCode: uniqueIndex('uq_chart_of_accounts_company_code').on(table.companyId, table.code),
}));

// ─── Cost Centers ──────────────────────────────────────────────────────────────

export const costCenters = pgTable('cost_centers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  parentCode: varchar('parent_code', { length: 20 }),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => ({
  uniqueCompanyCode: uniqueIndex('uq_cost_centers_company_code').on(table.companyId, table.code),
}));

// ─── Invoices ──────────────────────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  tipoDte: smallint('tipo_dte').notNull(),
  folio: integer('folio').notNull(),
  fechaEmision: date('fecha_emision').notNull(),
  fechaRecepcionSii: timestamp('fecha_recepcion_sii'),
  rutEmisor: varchar('rut_emisor', { length: 20 }).notNull(),
  razonSocialEmisor: varchar('razon_social_emisor', { length: 255 }).notNull(),
  montoExento: bigint('monto_exento', { mode: 'number' }).default(0).notNull(),
  montoNeto: bigint('monto_neto', { mode: 'number' }).default(0).notNull(),
  montoIva: bigint('monto_iva', { mode: 'number' }).default(0).notNull(),
  tasaIva: numeric('tasa_iva', { precision: 5, scale: 2 }).default('19').notNull(),
  montoTotal: bigint('monto_total', { mode: 'number' }).notNull(),
  state: invoiceStateEnum('state').default('recibida').notNull(),
  dteXml: text('dte_xml'),
  siiTrackId: varchar('sii_track_id', { length: 100 }),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  // Traceability fields
  sourceSystem: varchar('source_system', { length: 50 }).default('sii_portal'),  // 'sii_portal' | 'sii_official'
  sourceMode: varchar('source_mode', { length: 50 }).default('rcv_detalle'),     // 'rcv_detalle' | 'portal_xml' | 'soap_status'
  rawSha256: varchar('raw_sha256', { length: 64 }),
  importBatchId: uuid('import_batch_id'),
  syncedAt: timestamp('synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCompanyDte: uniqueIndex('uq_invoices_company_dte').on(
    table.companyId,
    table.tipoDte,
    table.folio,
    table.rutEmisor,
  ),
  idxStateCompany: index('idx_invoices_state_company').on(table.state, table.companyId),
  idxSupplierId: index('idx_invoices_supplier').on(table.supplierId),
  idxFechaEmisionCompany: index('idx_invoices_fecha_company').on(table.fechaEmision, table.companyId),
}));

// ─── Invoice Lines ─────────────────────────────────────────────────────────────

export const invoiceLines = pgTable('invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  lineNumber: smallint('line_number').notNull(),
  nombreItem: varchar('nombre_item', { length: 500 }).notNull(),
  descripcion: text('descripcion'),
  cantidad: numeric('cantidad', { precision: 18, scale: 6 }),
  unidadMedida: varchar('unidad_medida', { length: 50 }),
  precioUnitario: bigint('precio_unitario', { mode: 'number' }),
  descuentoPct: numeric('descuento_pct', { precision: 5, scale: 2 }).default('0').notNull(),
  montoItem: bigint('monto_item', { mode: 'number' }).notNull(),
  indicadorExencion: smallint('indicador_exencion'),
  accountId: uuid('account_id').references(() => chartOfAccounts.id),
  costCenterId: uuid('cost_center_id').references(() => costCenters.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Invoice State History ─────────────────────────────────────────────────────

export const invoiceStateHistory = pgTable('invoice_state_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  fromState: invoiceStateEnum('from_state'),
  toState: invoiceStateEnum('to_state').notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
  reason: text('reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxInvoiceId: index('idx_invoice_state_history_invoice').on(table.invoiceId),
}));

// ─── Approval Workflows ────────────────────────────────────────────────────────

export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Approval Workflow Levels ──────────────────────────────────────────────────

export const approvalWorkflowLevels = pgTable('approval_workflow_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => approvalWorkflows.id, { onDelete: 'cascade' }),
  levelOrder: smallint('level_order').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  minAmount: bigint('min_amount', { mode: 'number' }).default(0).notNull(),
  maxAmount: bigint('max_amount', { mode: 'number' }),
  requiresAllApprovers: boolean('requires_all_approvers').default(false).notNull(),
}, (table) => ({
  uniqueWorkflowLevel: uniqueIndex('uq_workflow_levels_order').on(table.workflowId, table.levelOrder),
}));

// ─── Approval Workflow Level Approvers ─────────────────────────────────────────

export const approvalWorkflowLevelApprovers = pgTable('approval_workflow_level_approvers', {
  id: uuid('id').primaryKey().defaultRandom(),
  levelId: uuid('level_id').notNull().references(() => approvalWorkflowLevels.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
}, (table) => ({
  uniqueLevelUser: uniqueIndex('uq_level_approvers_level_user').on(table.levelId, table.userId),
}));

// ─── Approval Steps ────────────────────────────────────────────────────────────

export const approvalSteps = pgTable('approval_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  levelId: uuid('level_id').notNull().references(() => approvalWorkflowLevels.id),
  approverId: uuid('approver_id').references(() => users.id),
  action: approvalActionEnum('action'),
  comment: text('comment'),
  actedAt: timestamp('acted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxInvoiceId: index('idx_approval_steps_invoice').on(table.invoiceId),
  idxApproverAction: index('idx_approval_steps_approver_action').on(table.approverId, table.action),
}));

// ─── Payment Batches ───────────────────────────────────────────────────────────

export const paymentBatches = pgTable('payment_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  batchNumber: serial('batch_number'),
  name: varchar('name', { length: 255 }).notNull(),
  state: batchStateEnum('state').default('borrador').notNull(),
  bankFormat: varchar('bank_format', { length: 50 }).notNull(),
  totalAmount: bigint('total_amount', { mode: 'number' }).default(0).notNull(),
  totalItems: integer('total_items').default(0).notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  fileContent: text('file_content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Payment Batch Items ───────────────────────────────────────────────────────

export const paymentBatchItems = pgTable('payment_batch_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').notNull().references(() => paymentBatches.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  retencionHonorarios: bigint('retencion_honorarios', { mode: 'number' }).default(0).notNull(),
  amountNet: bigint('amount_net', { mode: 'number' }).notNull(),
}, (table) => ({
  uniqueBatchInvoice: uniqueIndex('uq_batch_items_batch_invoice').on(table.batchId, table.invoiceId),
}));

// ─── Audit Log ─────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id'),
  userId: uuid('user_id'),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxEntityTypeId: index('idx_audit_log_entity').on(table.entityType, table.entityId),
}));

// ─── Notification Preferences ──────────────────────────────────────────────────

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
}, (table) => ({
  uniqueUserEventChannel: uniqueIndex('uq_notification_prefs').on(table.userId, table.eventType, table.channel),
}));

// ─── SII Sync Logs ─────────────────────────────────────────────────────────────

export const siiSyncLogs = pgTable('sii_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  startedAt: timestamp('started_at').notNull(),
  finishedAt: timestamp('finished_at'),
  status: varchar('status', { length: 50 }).notNull(),
  invoicesFound: integer('invoices_found').default(0).notNull(),
  invoicesNew: integer('invoices_new').default(0).notNull(),
  invoicesUpdated: integer('invoices_updated').default(0).notNull(),
  errorMessage: text('error_message'),
  rawResponseSample: jsonb('raw_response_sample'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Relations ─────────────────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  suppliers: many(suppliers),
  invoices: many(invoices),
  chartOfAccounts: many(chartOfAccounts),
  costCenters: many(costCenters),
  approvalWorkflows: many(approvalWorkflows),
  paymentBatches: many(paymentBatches),
  siiSyncLogs: many(siiSyncLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  roles: many(userRoles),
  notificationPreferences: many(notificationPreferences),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  company: one(companies, {
    fields: [suppliers.companyId],
    references: [companies.id],
  }),
  invoices: many(invoices),
}));

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one }) => ({
  company: one(companies, {
    fields: [chartOfAccounts.companyId],
    references: [companies.id],
  }),
}));

export const costCentersRelations = relations(costCenters, ({ one }) => ({
  company: one(companies, {
    fields: [costCenters.companyId],
    references: [companies.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  supplier: one(suppliers, {
    fields: [invoices.supplierId],
    references: [suppliers.id],
  }),
  lines: many(invoiceLines),
  stateHistory: many(invoiceStateHistory),
  approvalSteps: many(approvalSteps),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
  account: one(chartOfAccounts, {
    fields: [invoiceLines.accountId],
    references: [chartOfAccounts.id],
  }),
  costCenter: one(costCenters, {
    fields: [invoiceLines.costCenterId],
    references: [costCenters.id],
  }),
}));

export const invoiceStateHistoryRelations = relations(invoiceStateHistory, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceStateHistory.invoiceId],
    references: [invoices.id],
  }),
  changedByUser: one(users, {
    fields: [invoiceStateHistory.changedBy],
    references: [users.id],
  }),
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one, many }) => ({
  company: one(companies, {
    fields: [approvalWorkflows.companyId],
    references: [companies.id],
  }),
  levels: many(approvalWorkflowLevels),
}));

export const approvalWorkflowLevelsRelations = relations(approvalWorkflowLevels, ({ one, many }) => ({
  workflow: one(approvalWorkflows, {
    fields: [approvalWorkflowLevels.workflowId],
    references: [approvalWorkflows.id],
  }),
  approvers: many(approvalWorkflowLevelApprovers),
  approvalSteps: many(approvalSteps),
}));

export const approvalWorkflowLevelApproversRelations = relations(approvalWorkflowLevelApprovers, ({ one }) => ({
  level: one(approvalWorkflowLevels, {
    fields: [approvalWorkflowLevelApprovers.levelId],
    references: [approvalWorkflowLevels.id],
  }),
  user: one(users, {
    fields: [approvalWorkflowLevelApprovers.userId],
    references: [users.id],
  }),
}));

export const approvalStepsRelations = relations(approvalSteps, ({ one }) => ({
  invoice: one(invoices, {
    fields: [approvalSteps.invoiceId],
    references: [invoices.id],
  }),
  level: one(approvalWorkflowLevels, {
    fields: [approvalSteps.levelId],
    references: [approvalWorkflowLevels.id],
  }),
  approver: one(users, {
    fields: [approvalSteps.approverId],
    references: [users.id],
  }),
}));

export const paymentBatchesRelations = relations(paymentBatches, ({ one, many }) => ({
  company: one(companies, {
    fields: [paymentBatches.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [paymentBatches.createdBy],
    references: [users.id],
  }),
  items: many(paymentBatchItems),
}));

export const paymentBatchItemsRelations = relations(paymentBatchItems, ({ one }) => ({
  batch: one(paymentBatches, {
    fields: [paymentBatchItems.batchId],
    references: [paymentBatches.id],
  }),
  invoice: one(invoices, {
    fields: [paymentBatchItems.invoiceId],
    references: [invoices.id],
  }),
  supplier: one(suppliers, {
    fields: [paymentBatchItems.supplierId],
    references: [suppliers.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const siiSyncLogsRelations = relations(siiSyncLogs, ({ one }) => ({
  company: one(companies, {
    fields: [siiSyncLogs.companyId],
    references: [companies.id],
  }),
}));
