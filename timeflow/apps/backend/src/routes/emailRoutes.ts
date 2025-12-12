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
} from '../controllers/emailController.js';

export async function registerEmailRoutes(server: FastifyInstance) {
  // Get inbox messages (list view)
  server.get('/email/inbox', { preHandler: requireAuth }, getInboxEmails);

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

  // Get email category configurations
  server.get('/email/categories', { preHandler: requireAuth }, getEmailCategories);

  // Update email category configuration
  server.patch('/email/categories/:id', { preHandler: requireAuth }, updateEmailCategory);
}
