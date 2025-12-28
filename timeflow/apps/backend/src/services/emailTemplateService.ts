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
    // Only allow HTTPS URLs
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
