import { Router } from 'express';
import { handleSiiSync } from '../../jobs/handlers/sii-sync.handler.js';
import { handleRejectionAlerts } from '../../jobs/handlers/rejection-alert.handler.js';
import { handleInvoiceNotification } from '../../jobs/handlers/invoice-notification.handler.js';

const router = Router();

// QStash webhook endpoints — these are called by Upstash QStash
router.post('/sii-sync', handleSiiSync);
router.post('/rejection-alerts', handleRejectionAlerts);
router.post('/invoice-notification', handleInvoiceNotification);

export default router;
