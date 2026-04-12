import type { EmailThreadMessageInput, FullEmailMessage } from '@timeflow/shared';

const MAX_BODY_PER_MESSAGE = 6000;
const MAX_THREAD_CHARS = 24000;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Build request body for /email/ai/thread-* from loaded thread messages.
 * Truncates per-message body and total size so prompts stay bounded.
 */
export function buildThreadAssistRequestBody(
  threadId: string,
  messages: FullEmailMessage[]
): { threadId: string; messages: EmailThreadMessageInput[] } {
  let totalChars = 0;
  const out: EmailThreadMessageInput[] = [];

  for (const m of messages) {
    const raw = m.body || m.snippet || '';
    let body = stripHtml(raw);
    if (!body) body = '(no content)';
    if (body.length > MAX_BODY_PER_MESSAGE) {
      body = `${body.slice(0, MAX_BODY_PER_MESSAGE)}\n…`;
    }
    if (totalChars + body.length > MAX_THREAD_CHARS && out.length > 0) {
      break;
    }
    totalChars += body.length;
    out.push({
      id: m.id,
      from: m.from || 'Unknown',
      subject: m.subject || '(no subject)',
      receivedAt: m.receivedAt,
      body,
    });
  }

  if (out.length === 0 && messages[0]) {
    const m = messages[0];
    out.push({
      id: m.id,
      from: m.from || 'Unknown',
      subject: m.subject || '(no subject)',
      receivedAt: m.receivedAt,
      body: '(no content)',
    });
  }

  return { threadId, messages: out };
}
