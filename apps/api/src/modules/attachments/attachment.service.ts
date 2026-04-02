import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { invoiceAttachments } from '../../db/schema.js';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

class AttachmentService {
  async list(invoiceId: string) {
    return db.select().from(invoiceAttachments).where(eq(invoiceAttachments.invoiceId, invoiceId));
  }

  async upload(invoiceId: string, file: Express.Multer.File, userId: string) {
    const dir = path.join(UPLOAD_DIR, invoiceId);
    await fs.mkdir(dir, { recursive: true });
    const storagePath = path.join(dir, file.originalname);
    await fs.rename(file.path, storagePath);

    const [attachment] = await db.insert(invoiceAttachments).values({
      invoiceId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath,
      uploadedBy: userId,
    }).returning();

    return attachment;
  }

  async getById(attachmentId: string) {
    const [attachment] = await db.select().from(invoiceAttachments).where(eq(invoiceAttachments.id, attachmentId));
    return attachment;
  }

  async delete(attachmentId: string) {
    const [attachment] = await db.select().from(invoiceAttachments).where(eq(invoiceAttachments.id, attachmentId));
    if (attachment) {
      try { await fs.unlink(attachment.storagePath); } catch {}
      await db.delete(invoiceAttachments).where(eq(invoiceAttachments.id, attachmentId));
    }
    return attachment;
  }
}

export const attachmentService = new AttachmentService();
