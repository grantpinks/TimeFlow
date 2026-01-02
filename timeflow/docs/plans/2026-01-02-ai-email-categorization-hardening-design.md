# AI Email Categorization Hardening (Design)

**Goal:** Improve email categorization accuracy for Newsletter, Travel, Work/Professional, Personal, and Updates, and add a Needs Response flag with a filter toggle, using rules first and AI fallback only for low-confidence cases.

## Architecture Summary
- Keep current rules-first pipeline: Gmail labels -> domain patterns -> keyword scoring -> heuristics.
- Add confidence scoring to rule results.
- If confidence is low or ambiguous, call AI to refine the category.
- Accept AI output only if AI confidence is above a threshold; otherwise keep rules.
- Add Needs Response as an orthogonal flag that can overlay any category; compute via rules with AI fallback when ambiguous.

## Rule Hardening Scope
- **Newsletter:** expand domains (newsletter platforms and known senders), subject phrases (edition, issue, daily brief), and unsubscribe cues.
- **Travel:** expand domains (airlines, hotels, booking engines), keywords (boarding, gate, itinerary, confirmation code, reservation number).
- **Work/Professional:** meeting invite language, interview and networking phrases, corporate domain signal.
- **Personal:** reinforce free-email domains and personal-language cues to avoid false work positives.
- **Updates:** security and account change language (verify, reset, alert, policy update).

## AI Fallback
- Only run when rule confidence is below a threshold or when category scores are close.
- Prompt uses sender name/email, domain, subject, snippet, and candidate categories.
- AI returns JSON with categoryId, confidence, and reasoning.
- Accept AI output only when confidence >= 0.7.

## Implementation Notes
- Rules confidence threshold: 0.6.
- AI confidence threshold: 0.7.
- Requires `OPENAI_API_KEY` for AI fallback in production.

## Needs Response Flag
- Rules detect reply intent via subject/snippet cues (questions, reply requests, meeting scheduling language).
- AI fallback used only when rules are uncertain.
- Stored as a boolean on the email response payload.
- UI shows a Needs Reply badge and a filter toggle to show any category with the flag.

## Metrics and Evaluation
- Add a small eval set of real-world email samples covering target categories.
- Track: rule vs AI usage rate, AI override rate, and user correction rate.
- Do not log raw email content.

## Risks
- AI costs or latency if fallback triggers too often. Mitigate with conservative thresholds.
- False positives for Needs Response. Mitigate with conservative thresholds and easy UI filter toggle.
