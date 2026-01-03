function extractEmails(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      return (match ? match[1] : part).trim();
    })
    .filter(Boolean);
}

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of emails) {
    const normalized = email.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(email);
  }
  return result;
}

export function buildReplyAllRecipients(params: {
  from: string;
  replyTo?: string;
  to?: string;
  cc?: string;
  userEmails: string[];
}): { to: string; cc?: string } {
  const userEmails = params.userEmails.map((email) => email.toLowerCase());
  const fromEmail = extractEmails(params.from)[0] ?? '';
  const replyToEmail = extractEmails(params.replyTo)[0];
  const primaryTo = replyToEmail || fromEmail;

  const originalTo = extractEmails(params.to);
  const originalCc = extractEmails(params.cc);

  const ccCandidates = [...originalTo, ...originalCc].filter((email) => {
    const normalized = email.toLowerCase();
    if (!normalized) return false;
    if (normalized === primaryTo.toLowerCase()) return false;
    return !userEmails.includes(normalized);
  });

  const ccList = dedupeEmails(ccCandidates);

  return {
    to: primaryTo,
    cc: ccList.length > 0 ? ccList.join(', ') : undefined,
  };
}

export function shouldShowReplyAll(params: { to?: string; cc?: string }): boolean {
  const recipients = dedupeEmails([...extractEmails(params.to), ...extractEmails(params.cc)]);
  return recipients.length > 1;
}
