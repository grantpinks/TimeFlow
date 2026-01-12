/**
 * Email Routes (Gmail)
 *
 * Full email functionality: read, send, search, and manage emails.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import {
  getInboxEmails,
  getFullEmail,
  sendEmail,
  searchEmails,
  markEmailAsRead,
  archiveEmail,
  getEmailCategories,
  updateEmailCategory,
  explainEmailCategory,
} from '../controllers/emailController.js';
import {
  deleteInboxView,
  getInboxViews,
  updateInboxViews,
} from '../controllers/inboxViewsController.js';
import {
  generateEmailDraft,
  generateEmailPreview,
  createOrSendDraft,
  getWritingVoice,
  updateWritingVoice,
} from '../controllers/emailDraftController.js';
import {
  draftTaskFromEmail,
  draftLabelSync,
  draftLabelExplanation,
} from '../controllers/inboxAiController.js';
import { updateEmailActionState } from '../controllers/emailActionStateController.js';
import { extractTasksFromThread, summarizeEmailThread } from '../controllers/emailThreadAssistController.js';

export async function registerEmailRoutes(server: FastifyInstance) {
  // Get inbox messages (list view)
  server.get('/email/inbox', { preHandler: requireAuth }, getInboxEmails);

  // Get/update inbox view configurations
  server.get('/inbox/views', { preHandler: requireAuth }, getInboxViews);
  server.put('/inbox/views', { preHandler: requireAuth }, updateInboxViews);
  server.delete('/inbox/views/:id', { preHandler: requireAuth }, deleteInboxView);

  // Get full email content
  server.get('/email/:id', { preHandler: requireAuth }, getFullEmail);

  // Send email or reply
  server.post('/email/send', { preHandler: requireAuth }, sendEmail);

  // Search emails
  server.get('/email/search', { preHandler: requireAuth }, searchEmails);

  // Mark email as read/unread
  server.post('/email/:id/read', { preHandler: requireAuth }, markEmailAsRead);

  // Archive email
  server.post('/email/:id/archive', { preHandler: requireAuth }, archiveEmail);

  // Update action-state queues
  server.post(
    '/email/thread/:threadId/action-state',
    { preHandler: requireAuth },
    updateEmailActionState
  );

  // Get email category configurations
  server.get('/email/categories', { preHandler: requireAuth }, getEmailCategories);

  // Update email category configuration
  server.patch('/email/categories/:id', { preHandler: requireAuth }, updateEmailCategory);

  // Get explanation for email categorization
  server.get('/email/:id/explanation', { preHandler: requireAuth }, explainEmailCategory);

  // AI Email Draft endpoints
  server.post('/email/draft/ai', { preHandler: requireAuth }, generateEmailDraft);
  server.post('/email/draft/preview', { preHandler: requireAuth }, generateEmailPreview);
  server.post('/email/drafts', { preHandler: requireAuth }, createOrSendDraft);

  // Writing voice profile endpoints
  server.get('/user/writing-voice', { preHandler: requireAuth }, getWritingVoice);
  server.put('/user/writing-voice', { preHandler: requireAuth }, updateWritingVoice);

  // Inbox AI draft endpoints (always draft + confirm)
  server.post('/email/ai/task-draft', { preHandler: requireAuth }, draftTaskFromEmail);
  server.post('/email/ai/label-sync', { preHandler: requireAuth }, draftLabelSync);
  server.post('/email/ai/label-explain', { preHandler: requireAuth }, draftLabelExplanation);

  // Inbox AI thread assist
  server.post('/email/ai/thread-summary', { preHandler: requireAuth }, summarizeEmailThread);
  server.post('/email/ai/thread-tasks', { preHandler: requireAuth }, extractTasksFromThread);
}
