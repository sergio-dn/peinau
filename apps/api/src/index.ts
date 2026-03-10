import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import siiSyncRoutes from './modules/sii-sync/sii-sync.routes.js';
import supplierRoutes from './modules/suppliers/supplier.routes.js';
import approvalRoutes from './modules/approval/approval.routes.js';
import accountingRoutes from './modules/accounting/accounting.routes.js';
import paymentBatchRoutes from './modules/payment-batches/payment-batch.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import { startSiiSyncWorker, scheduleSiiSync } from './jobs/queue.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL.split(',').map(u => u.trim()),
  credentials: true,
}));
app.use(morgan('short'));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/sii', siiSyncRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/payment-batches', paymentBatchRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`);

  // Start background workers (non-blocking – skip if Redis unavailable)
  try {
    startSiiSyncWorker();
    scheduleSiiSync().catch(err => console.warn('[SII Sync] Schedule failed:', err.message));
  } catch (err: any) {
    console.warn('[Workers] Skipped – Redis not available:', err.message);
  }
});

export default app;
