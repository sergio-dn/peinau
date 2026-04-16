-- Migration: 0006_schema_full_sync
-- Sync Drizzle schema with production DB: add missing columns and new tables

-- ─── invoices ──────────────────────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sii_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sii_estado_codigo TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sii_anulado BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS po_match_status VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_priority INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_week_assigned_by UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_week_assigned_at TIMESTAMP;

-- ─── sii_sync_logs ─────────────────────────────────────────────────────────────
ALTER TABLE sii_sync_logs ADD COLUMN IF NOT EXISTS api_response_raw JSONB;
ALTER TABLE sii_sync_logs ADD COLUMN IF NOT EXISTS records_fetched INTEGER;
ALTER TABLE sii_sync_logs ADD COLUMN IF NOT EXISTS records_created INTEGER;
ALTER TABLE sii_sync_logs ADD COLUMN IF NOT EXISTS records_updated INTEGER;

-- ─── users ─────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- ─── payment_batches ───────────────────────────────────────────────────────────
ALTER TABLE payment_batches ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE payment_batches ADD COLUMN IF NOT EXISTS bank_reference TEXT;
ALTER TABLE payment_batches ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CLP';
ALTER TABLE payment_batches ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20);

-- ─── cost_centers ──────────────────────────────────────────────────────────────
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES cost_centers(id);
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;

-- ─── user_cost_center_assignments (nueva tabla) ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cost_center_assignments (
  user_id UUID NOT NULL REFERENCES users(id),
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, cost_center_id)
);

-- ─── supplier_auto_rules (nueva tabla) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_auto_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  supplier_id UUID REFERENCES suppliers(id),
  supplier_rut TEXT,
  account_code TEXT,
  cost_center_id UUID REFERENCES cost_centers(id),
  business_unit TEXT,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
