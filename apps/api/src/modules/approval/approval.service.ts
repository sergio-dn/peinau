import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../config/database.js';
import {
  approvalWorkflows,
  approvalWorkflowLevels,
  approvalWorkflowLevelApprovers,
  approvalSteps,
  invoices,
} from '../../db/schema.js';
import { invoiceService } from '../invoices/invoice.service.js';

export class ApprovalService {
  /**
   * Start approval process for an invoice
   */
  async startApproval(invoiceId: string, userId: string) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });
    if (invoice.state !== 'recibida') {
      throw Object.assign(new Error('Invoice must be in "recibida" state'), { status: 400 });
    }

    // Find applicable workflow
    const workflow = await this.findApplicableWorkflow(invoice.companyId, Number(invoice.montoTotal));
    if (!workflow) {
      throw Object.assign(new Error('No approval workflow configured'), { status: 400 });
    }

    // Get first level
    const levels = await db.select()
      .from(approvalWorkflowLevels)
      .where(eq(approvalWorkflowLevels.workflowId, workflow.id))
      .orderBy(approvalWorkflowLevels.levelOrder);

    if (levels.length === 0) {
      throw Object.assign(new Error('Workflow has no levels configured'), { status: 400 });
    }

    const firstLevel = levels[0];

    await db.transaction(async (tx) => {
      // Transition to pendiente
      await invoiceService.transition(invoiceId, 'pendiente', userId);

      // Create approval step for first level
      const approvers = await tx.select()
        .from(approvalWorkflowLevelApprovers)
        .where(eq(approvalWorkflowLevelApprovers.levelId, firstLevel.id));

      for (const approver of approvers) {
        await tx.insert(approvalSteps).values({
          invoiceId,
          levelId: firstLevel.id,
          approverId: approver.userId,
        });
      }
    });
  }

  /**
   * Approve invoice at current level
   */
  async approve(invoiceId: string, userId: string, comment?: string) {
    const pendingStep = await this.getPendingStep(invoiceId, userId);
    if (!pendingStep) {
      throw Object.assign(new Error('No pending approval for this user'), { status: 400 });
    }

    await db.update(approvalSteps)
      .set({ action: 'approved', actedAt: new Date(), comment: comment || null })
      .where(eq(approvalSteps.id, pendingStep.id));

    // Check if all required approvals at this level are done
    const levelComplete = await this.isLevelComplete(invoiceId, pendingStep.levelId);

    if (levelComplete) {
      // Check if there's a next level
      const nextLevel = await this.getNextLevel(pendingStep.levelId);

      if (nextLevel) {
        // Create steps for next level approvers
        const approvers = await db.select()
          .from(approvalWorkflowLevelApprovers)
          .where(eq(approvalWorkflowLevelApprovers.levelId, nextLevel.id));

        for (const approver of approvers) {
          await db.insert(approvalSteps).values({
            invoiceId,
            levelId: nextLevel.id,
            approverId: approver.userId,
          });
        }
      } else {
        // All levels complete, approve invoice
        await invoiceService.transition(invoiceId, 'aprobada', userId);
      }
    }
  }

  /**
   * Reject invoice
   */
  async reject(invoiceId: string, userId: string, reason: string) {
    const pendingStep = await this.getPendingStep(invoiceId, userId);
    if (!pendingStep) {
      throw Object.assign(new Error('No pending approval for this user'), { status: 400 });
    }

    await db.update(approvalSteps)
      .set({ action: 'rejected', actedAt: new Date(), comment: reason })
      .where(eq(approvalSteps.id, pendingStep.id));

    await invoiceService.transition(invoiceId, 'rechazada', userId, reason);
  }

  /**
   * Return to previous level
   */
  async returnToPrevious(invoiceId: string, userId: string, comment: string) {
    const pendingStep = await this.getPendingStep(invoiceId, userId);
    if (!pendingStep) {
      throw Object.assign(new Error('No pending approval for this user'), { status: 400 });
    }

    // Mark current step as returned
    await db.update(approvalSteps)
      .set({ action: 'returned', actedAt: new Date(), comment })
      .where(eq(approvalSteps.id, pendingStep.id));

    // Find previous level and create new steps
    const prevLevel = await this.getPreviousLevel(pendingStep.levelId);
    if (prevLevel) {
      const approvers = await db.select()
        .from(approvalWorkflowLevelApprovers)
        .where(eq(approvalWorkflowLevelApprovers.levelId, prevLevel.id));

      for (const approver of approvers) {
        await db.insert(approvalSteps).values({
          invoiceId,
          levelId: prevLevel.id,
          approverId: approver.userId,
        });
      }
    }
  }

  /**
   * Get invoices pending approval by a specific user
   */
  async getPendingForUser(userId: string) {
    const steps = await db.select()
      .from(approvalSteps)
      .where(and(
        eq(approvalSteps.approverId, userId),
        isNull(approvalSteps.action),
      ));

    if (steps.length === 0) return [];

    const invoiceIds = [...new Set(steps.map(s => s.invoiceId))];
    const result = [];

    for (const id of invoiceIds) {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
        with: { supplier: true },
      });
      if (invoice) result.push(invoice);
    }

    return result;
  }

  private async findApplicableWorkflow(companyId: string, _amount: number) {
    // Get active workflow for the company
    return db.query.approvalWorkflows.findFirst({
      where: and(
        eq(approvalWorkflows.companyId, companyId),
        eq(approvalWorkflows.isActive, true),
      ),
    });
  }

  private async getPendingStep(invoiceId: string, userId: string) {
    return db.query.approvalSteps.findFirst({
      where: and(
        eq(approvalSteps.invoiceId, invoiceId),
        eq(approvalSteps.approverId, userId),
        isNull(approvalSteps.action),
      ),
    });
  }

  private async isLevelComplete(invoiceId: string, levelId: string): Promise<boolean> {
    const level = await db.query.approvalWorkflowLevels.findFirst({
      where: eq(approvalWorkflowLevels.id, levelId),
    });

    if (!level) return false;

    const steps = await db.select()
      .from(approvalSteps)
      .where(and(
        eq(approvalSteps.invoiceId, invoiceId),
        eq(approvalSteps.levelId, levelId),
      ));

    if (level.requiresAllApprovers) {
      // All must have approved
      return steps.every(s => s.action === 'approved');
    } else {
      // At least one approved
      return steps.some(s => s.action === 'approved');
    }
  }

  private async getNextLevel(currentLevelId: string) {
    const currentLevel = await db.query.approvalWorkflowLevels.findFirst({
      where: eq(approvalWorkflowLevels.id, currentLevelId),
    });
    if (!currentLevel) return null;

    return db.query.approvalWorkflowLevels.findFirst({
      where: and(
        eq(approvalWorkflowLevels.workflowId, currentLevel.workflowId),
        eq(approvalWorkflowLevels.levelOrder, currentLevel.levelOrder + 1),
      ),
    });
  }

  private async getPreviousLevel(currentLevelId: string) {
    const currentLevel = await db.query.approvalWorkflowLevels.findFirst({
      where: eq(approvalWorkflowLevels.id, currentLevelId),
    });
    if (!currentLevel || currentLevel.levelOrder <= 1) return null;

    return db.query.approvalWorkflowLevels.findFirst({
      where: and(
        eq(approvalWorkflowLevels.workflowId, currentLevel.workflowId),
        eq(approvalWorkflowLevels.levelOrder, currentLevel.levelOrder - 1),
      ),
    });
  }
}

export const approvalService = new ApprovalService();
