ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'CLP';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "currency_rate" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payment_week" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "business_unit" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sii_rejection_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sii_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sii_rejected_at" timestamp with time zone;
