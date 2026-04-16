import { env } from '../config/env.js';

// Mock-first: si no hay SMTP configurado, solo loguea
const hasSmtp = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);

let transporter: any = null;

async function getTransporter() {
  if (transporter) return transporter;
  if (!hasSmtp) return null;
  const nodemailer = await import('nodemailer');
  transporter = nodemailer.default.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: false,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = await getTransporter();
  if (!t) {
    console.log(`[Email:mock] → ${to} | ${subject}`);
    return;
  }
  try {
    await t.sendMail({ from: `"Peinau" <${env.SMTP_USER}>`, to, subject, html });
  } catch (e) {
    console.error('[Email:error]', e);
  }
}

export const emailTemplates = {
  aprobacionPendiente: (data: { folio: number; proveedor: string; monto: number }) => ({
    subject: `[Peinau] Factura ${data.folio} pendiente de aprobación`,
    html: `<h2>Factura pendiente</h2><p><strong>${data.proveedor}</strong> · F.${data.folio} · $${data.monto.toLocaleString('es-CL')}</p><p><a href="https://peinau-web.vercel.app/approvals">Ver en Peinau →</a></p>`,
  }),
  facturaAprobada: (data: { folio: number; proveedor: string }) => ({
    subject: `[Peinau] Factura ${data.folio} aprobada`,
    html: `<h2>Factura aprobada ✓</h2><p>La factura ${data.folio} de ${data.proveedor} fue aprobada.</p>`,
  }),
  facturaRechazada: (data: { folio: number; proveedor: string; reason: string }) => ({
    subject: `[Peinau] Factura ${data.folio} rechazada`,
    html: `<h2>Factura rechazada</h2><p>Factura ${data.folio} de ${data.proveedor} rechazada. Motivo: ${data.reason}</p>`,
  }),
};
