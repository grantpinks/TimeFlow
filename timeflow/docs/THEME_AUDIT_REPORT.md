# Theme & brand audit — full website (2026-04-12)

This report lists **visual/theming gaps**, **random or inconsistent icons**, and **AI / Flow mascot** usage across `apps/web`. It is a snapshot for prioritizing polish—not a blocker list.

## Brand tokens (intended)

- **Primary:** Teal (`primary-*` Tailwind, marketing `teal-600`, inbox `#0BAF9A`).
- **Neutrals:** Slate/gray for app chrome; inbox uses cream reading pane `#FFFEF7`.
- **AI personality:** **Flow** — mascot assets under `/branding/` (e.g. `Flow Mascot Default.png`, `flow-default.png`).

---

## Where theme is strong

| Area | Notes |
|------|--------|
| **Assistant (`/assistant`)** | Flow mascot states in-thread, `ThinkingState`, branded copy “Flow assistant”. |
| **Habits / Coach** | `FlowMascot` on habits page, coach card, recommendations. |
| **Inbox** | Cohesive teal/cream; loading uses `flow-thinking.png`; empty uses mascot. |
| **Layout sidebar** | Nav item **Flow AI** → `/assistant` (not “ChatGPT-style” naming). |
| **Homepage (after stretch)** | “Why TimeFlow” section; How It Works step 2 uses **FlowMascot** instead of 🤖; AI deep-dive uses `flow-default.png` for assistant reply. |

---

## Gaps & inconsistencies

### 1. Dual “FlowMascot” naming (confusing for devs)

- **`IdentityDashboardBanner.tsx`** had a **local** component named `FlowMascot`. **Fixed:** renamed to **`IdentityBannerMascotSvg`** (still inline SVG for the banner; not the shared raster `FlowMascot`).

### 2. Emoji / sparkle used instead of brand for “magic” or AI-adjacent UI

| Location | What we saw | Suggestion |
|----------|-------------|------------|
| `SchedulePreviewCard.tsx` | ✨ in UI | **Fixed:** Lucide `Sparkles` (white on gradient header). |
| `today/page.tsx` | ✨ / 📋 on quick actions | **Fixed:** `Sparkles` + `ClipboardList` from Lucide. |
| `settings/identities/page.tsx` | Emoji palette + ✨ toasts | Acceptable for identity **emoji** pickers; keep product AI surfaces on Flow. |
| `EventDetailPopover.tsx` | 💡 “Why track actual time?” | **Fixed:** Lucide `Lightbulb` + label text. |
| **Marketing `FeaturesGrid` / various** | Category emojis in feature cards | OK as illustration; not “AI”. |

### 3. Generic AI robot (🤖) — addressed on homepage How It Works

- **Previously:** Step 2 used 🤖 for “AI finds time”.
- **Now:** Uses **`FlowMascot`** + copy says **Flow** (Sprint 18 stretch).

### 4. Placeholder “user” bubble in homepage mock

- **Previously:** Gray circle for user message in `FeatureDeepDive` mock.
- **Now:** **Lucide `User`** in a neutral circle (clearer than empty gray).

### 5. Pages with mixed design language (not wrong, but not one system)

| Page / area | Issue |
|-------------|--------|
| **Inbox** | Inline hex + custom fonts vs `primary-*` elsewhere—intentional “editorial” look but differs from Tasks/Habits. |
| **Calendar** | Dense toolbar; “AI-powered scheduling” copy without Flow avatar in header (optional enhancement). |
| **Pricing / Help / Contact / Legal** | Marketing or minimal layouts; less `Panel`/`SectionHeader` than app shell—acceptable. |
| **Meetings** | Verify empty states use same patterns as Tasks (can adopt `BrandedEmptyState`). |

### 6. Empty states

- **Tasks** (`TaskList`): Now uses **`BrandedEmptyState`** + Flow for zero-state lists.
- **Categories**: **`BrandedEmptyState`** when no categories and form not open.
- **Other pages** (calendar blocks, assistant history, etc.): may still use plain text or spinners—candidate for **18.43** follow-up.

### 7. Icons in nav

- **Flow AI** uses **spark** icon (`SparkIcon`)—good differentiation from generic “message” icon.
- Other items use consistent Lucide-style inline SVGs in `Layout.tsx`.

---

## AI vs mascot — summary rule

- **Anything that represents TimeFlow’s assistant** → **Flow** (component or `/branding` PNG in context).
- **Anything that represents the user** → User icon, initials, or neutral avatar—not robot emoji.
- **Third-party / generic “magic”** → Prefer Lucide icons + brand colors, not ✨ in product chrome unless intentional delight.

---

## Files touched in stretch implementation

- `components/homepage/CompetitiveDifferentiation.tsx` — new.
- `components/homepage/HowItWorks.tsx`, `Testimonials.tsx`, `app/page.tsx`.
- `components/ui/BrandedEmptyState.tsx`; `TaskList.tsx`, `categories/page.tsx`.
- `app/inbox/page.tsx` — identity “Supports …” pills (uses `suggestIdentityFromEmail`).

---

## Recommended next passes (optional)

1. Replace remaining ✨/`💡` in **Today** and **SchedulePreviewCard** with Lucide + teal.
2. Rename duplicate **FlowMascot** in `IdentityDashboardBanner.tsx`.
3. Sweep **calendar** / **meetings** empty states with `BrandedEmptyState`.
4. Add Flow thumb to **calendar** header optional “Ask AI” entry (if product wants stronger AI branding there).
