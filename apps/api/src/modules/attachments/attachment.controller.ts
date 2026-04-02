import { Request, Response } from 'express';
import { attachmentService } from './attachment.service.js';

class AttachmentController {
  async list(req: Request, res: Response) {
    const attachments = await attachmentService.list(req.params.id);
    res.json(attachments);
  }

  async upload(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const attachment = await attachmentService.upload(req.params.id, req.file, req.user!.userId);
    res.status(201).json(attachment);
  }

  async download(req: Request, res: Response) {
    const attachment = await attachmentService.getById(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    res.download(attachment.storagePath, attachment.fileName);
  }

  async delete(req: Request, res: Response) {
    const attachment = await attachmentService.delete(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    res.json({ message: 'Attachment deleted' });
  }
}

export const attachmentController = new AttachmentController();
