# Sprint 13 AI Regression Harness Runbook

This runbook documents the AI prompt regression harness so we can extend it safely over time.

---

## Purpose

Validate that the AI assistant still:
- Detects scheduling vs availability vs conversation requests.
- Produces `[STRUCTURED_OUTPUT]` for scheduling prompts.
- Returns schedule previews without breaking existing flows.

---

## What It Runs

Script: `timeflow/apps/backend/scripts/test-ai-prompts.js`  
Prompts: `timeflow/apps/backend/scripts/prompts/sprint13-regression.txt`  
Output: `timeflow/apps/backend/scripts/reports/ai-regression-<timestamp>.json`

Prompts are separated by `---` lines. Multi-turn flows can be defined with a `FLOW:` label and `USER:` lines.

---

## Prerequisites

- Backend running on `http://localhost:3001`
- Local LLM running (per `LLM_ENDPOINT` / `LLM_MODEL` in `.env`)
- DB seeded with tasks/habits for the target user
- `SESSION_SECRET` set in `timeflow/apps/backend/.env`

---

## Run (PowerShell)

From `timeflow/apps/backend`:

```powershell
$env:AI_REGRESSION_USER_EMAIL = "grantpinks@gmail.com"
$env:AI_REGRESSION_ENDPOINT = "http://localhost:3001/api/assistant/chat"
$env:PROMPT_DELAY_MS = "3000"
node scripts/test-ai-prompts.js
```

Notes:
- `AI_REGRESSION_USER_EMAIL` lets the harness mint a JWT using `SESSION_SECRET`.
- If you already have a token, you can skip email lookup:

```powershell
$env:AI_REGRESSION_TOKEN = "<jwt>"
node scripts/test-ai-prompts.js
```

---

## Report Format

Example:
```json
{
  "summary": {
    "total": 19,
    "ok": 19,
    "failed": 0,
    "previews": 12,
    "turnsTotal": 21,
    "turnsPreviews": 14,
    "timestamp": "2025-12-22T18:13:29.758Z",
    "endpoint": "http://localhost:3001/api/assistant/chat"
  },
  "results": [
    {
      "prompt": "Schedule my tasks for tomorrow.",
      "status": 200,
      "ok": true,
      "durationMs": 2412,
      "preview": true,
      "blocksCount": 4,
      "conflictsCount": 0,
      "confidence": "high"
    }
  ]
}
```

---

## Expanding the Harness

1. Add prompts to `apps/backend/scripts/prompts/sprint13-regression.txt`.
2. Keep prompts short and explicit. Separate with `---`.
3. For multi-turn flows, use:

```text
FLOW: Conversation -> Scheduling
USER: What tasks do I have?
USER: Schedule my tasks for tomorrow.
```

4. For stricter checks, extend `test-ai-prompts.js` to assert expected mode/preview counts.

---

## Troubleshooting

- 401 Unauthorized: missing/invalid token. Ensure `SESSION_SECRET` is set and user exists.
- 429 / rate limit: raise `PROMPT_DELAY_MS` to 3000-4000.
- No previews for scheduling prompts: confirm `scheduling.txt` still enforces `[STRUCTURED_OUTPUT]`.
- LLM errors: verify local LLM server and `LLM_ENDPOINT`.

---

## Security Notes

- Tokens are generated locally using `SESSION_SECRET` and the user id.
- Do not commit or share generated JWTs.
- This harness hits live endpoints and real user data.
