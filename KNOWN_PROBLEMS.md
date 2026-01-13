# Known Problems

- Sidebar nav order persistence may still fail after refresh in some environments. We will revisit after confirming backend responses and client update flow.

## Calendar Prefix Consistency

- Legacy `[TimeFlow …` event names can remain on Google Calendar even after we start using `TF|` for new blocks. To refresh every scheduled TimeFlow task/habit with the canonical prefix and event marker, run the rewrite script with `--dry-run` first:

```
pnpm --filter @timeflow/backend rewrite-timeflow-events -- --dry-run
```

The command updates both the summary and description using `buildTimeflowEventDetails`, so every refreshed event will begin with `TF|` (or the user’s configured prefix) and keep the TimeFlow marker. Once the dry-run output looks good, rerun without `--dry-run` after settling on the desired prefix in Settings (set it to `TF|` for a uniform experience).

## Event Prefix Settings

- You can toggle `TF|` (or another string) per user inside Settings → Event Prefix (the toggle/input stored as `eventPrefixEnabled`/`eventPrefix`). Disabling the prefix removes it from new events, while a custom string rewrites future summaries without editing backend code. After changing the prefix, rerun the rewrite script above to reapply the new label to all past habit/task events so the calendar stays consistent. The backend helper `buildTimeflowEventDetails` already trims legacy `[TimeFlow …]` summaries so they don’t carry forward any old branding.

## Credentialed Rewrite Pending

- The `rewrite-timeflow-events` script must run against a real Google service account so it can rewrite every scheduled habit/task with the chosen prefix. Our current sandbox doesn’t expose those credentials, so the command still needs to be executed manually in your credentialed environment. Steps:
  1. Ensure the OAuth tokens/client secrets are loaded (as outlined in `.env` or your local secrets store).
  2. Run `pnpm --filter @timeflow/backend rewrite-timeflow-events -- --dry-run` to preview the `TF|` (or custom) summaries in the log output.
  3. If the dry-run looks good, rerun without `--dry-run` to update every event.
  4. Share the logs or a quick note once complete, so we can mark the rewrite as done and confirm Google Calendar/Timeflow show the new prefix.

## Flow AI Habit Scheduling

- Flow AI habit scheduling now scopes previews to the single habit block the user asked to move/create and pushes only that block to the calendar; the calendar page now fetches scheduled habit instances and renders them natively alongside external events. The dominant prefix is now `TF|` (or the user’s custom string), and legacy `[TimeFlow …` events can be rewritten via the `rewrite-timeflow-events` script above.

## Backend Test Suite

- Running `pnpm --filter @timeflow/backend test -- assistantService` or `pnpm --filter @timeflow/backend test -- timeflowEventPrefix` still exercises controller/e2e files that rely on `typedFastifyMocks.ts` and the assistantService mock wiring. Until those helpers load cleanly (fixed in this round) and the Google API mocks are stabilized, the recursive commands will fail with module resolution/hoisting errors or deliberate “Calendar API error” logs. Re-run the targeted suites after this cleanup to confirm the broader suite becomes reliable.

## Resolved

- Gmail label colors were not applying because we used a non-Gmail palette; updated to Gmail’s allowed color set and confirmed sync works.
