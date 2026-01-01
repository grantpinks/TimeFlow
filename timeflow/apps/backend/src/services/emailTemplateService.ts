/**
 * Email Template Service
 *
 * Generates professional email templates for meeting link sharing
 */

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate booking URL is safe to use in emails
 */
function isValidBookingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Require HTTPS; disallow javascript: and http:
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generate professional meeting link email with HTML and plain text versions
 *
 * @param message - User's personalized message (will be HTML-escaped for security)
 * @param bookingUrl - Booking page URL (must be valid HTTPS URL)
 * @returns Object containing html and text versions of the email
 * @throws Error if bookingUrl is not a valid HTTPS URL
 *
 * @example
 * const email = generateMeetingLinkEmail(
 *   "Hi! Let's schedule a meeting.",
 *   "https://app.timeflow.com/book/quick-chat"
 * );
 */
export function generateMeetingLinkEmail(
  message: string,
  bookingUrl: string
): { html: string; text: string } {
  // Validate URL security
  if (!isValidBookingUrl(bookingUrl)) {
    throw new Error(`Invalid booking URL "${bookingUrl}": must be a valid HTTPS URL`);
  }

  const escapedMessage = escapeHtml(message);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">

    <!-- User's message -->
    <div style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
      ${escapedMessage}
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Book a Meeting
      </a>
    </div>

    <!-- Fallback link -->
    <div style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
      Or copy this link: <a href="${bookingUrl}" style="color: #4F46E5; word-break: break-all;">${bookingUrl}</a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center;">
      Sent via TimeFlow
    </div>
  </div>
</body>
</html>`;

  const text = `${message}

Book a meeting: ${bookingUrl}

---
Sent via TimeFlow`;

  return { html, text };
}

/**
 * Generate meeting confirmation email with HTML and plain text versions
 *
 * @param data - Meeting confirmation data
 * @returns Object containing html and text versions of the email
 *
 * @example
 * const email = generateMeetingConfirmationEmail({
 *   inviteeName: "John Doe",
 *   linkName: "Coffee Chat",
 *   dateTime: "Tuesday, December 31, 2025 at 12:00 PM CST",
 *   durationMinutes: 30,
 *   meetLink: "https://meet.google.com/abc-defg-hij",
 *   rescheduleUrl: "https://app.timeflow.com/book/coffee-chat/reschedule?token=...",
 *   cancelUrl: "https://app.timeflow.com/book/coffee-chat/cancel?token=..."
 * });
 */
export function generateMeetingConfirmationEmail(data: {
  inviteeName: string;
  linkName: string;
  dateTime: string;
  durationMinutes: number;
  meetLink?: string;
  rescheduleUrl: string;
  cancelUrl: string;
  notes?: string;
}): { html: string; text: string } {
  const escapedName = escapeHtml(data.inviteeName);
  const escapedLinkName = escapeHtml(data.linkName);
  const escapedDateTime = escapeHtml(data.dateTime);
  const escapedNotes = data.notes ? escapeHtml(data.notes) : undefined;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">

    <!-- Success Icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 60px; height: 60px; background: #10B981; border-radius: 50%; line-height: 60px; font-size: 40px; color: white;">✓</div>
    </div>

    <!-- Title -->
    <h1 style="margin: 0 0 10px; text-align: center; font-size: 24px; color: #1f2937;">Meeting Confirmed!</h1>
    <p style="margin: 0 0 30px; text-align: center; font-size: 16px; color: #6b7280;">Hi ${escapedName}, your meeting has been confirmed.</p>

    <!-- Meeting Details -->
    <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Meeting</div>
        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${escapedLinkName}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">When</div>
        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${escapedDateTime}</div>
      </div>

      <div${data.meetLink ? '' : ' style="margin-bottom: 0;"'}>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Duration</div>
        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${data.durationMinutes} minutes</div>
      </div>

      ${
        data.meetLink
          ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Join Meeting</div>
        <a href="${data.meetLink}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Join Google Meet
        </a>
      </div>`
          : ''
      }
    </div>

    ${
      escapedNotes
        ? `
    <!-- Notes -->
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
      <div style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Your Notes</div>
      <div style="font-size: 14px; color: #78350f; line-height: 1.5;">${escapedNotes}</div>
    </div>`
        : ''
    }

    <!-- Actions -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="margin-bottom: 12px;">
        <a href="${data.rescheduleUrl}" style="display: inline-block; color: #4F46E5; text-decoration: none; font-size: 14px; font-weight: 500;">
          Need to reschedule? Click here
        </a>
      </div>
      <div>
        <a href="${data.cancelUrl}" style="display: inline-block; color: #dc2626; text-decoration: none; font-size: 14px; font-weight: 500;">
          Cancel this meeting
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center;">
      Sent via TimeFlow
    </div>
  </div>
</body>
</html>`;

  let text = `Hi ${data.inviteeName},

Your meeting has been confirmed!

Meeting: ${data.linkName}
When: ${data.dateTime}
Duration: ${data.durationMinutes} minutes`;

  if (data.meetLink) {
    text += `\nJoin Meeting: ${data.meetLink}`;
  }

  if (data.notes) {
    text += `\n\nYour Notes:\n${data.notes}`;
  }

  text += `

To reschedule: ${data.rescheduleUrl}
To cancel: ${data.cancelUrl}

---
Sent via TimeFlow`;

  return { html, text };
}
