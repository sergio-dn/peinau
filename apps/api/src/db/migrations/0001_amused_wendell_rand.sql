ALTER TABLE "invoices" ADD COLUMN "source_system" varchar(50) DEFAULT 'sii_portal';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "source_mode" varchar(50) DEFAULT 'rcv_detalle';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "raw_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "sii_sync_logs" ADD COLUMN "invoices_updated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sii_sync_logs" ADD COLUMN "raw_response_sample" jsonb;