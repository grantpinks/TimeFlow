# TimeFlow — UI patterns (Sprint 18.45)

Internal reference for consistent surfaces. **Brand:** teal primary (`teal-600` / `#0BAF9A` where inbox uses hex), slate neutrals, Flow mascot for product personality.

## Mascot & AI

| Use | Pattern |
|-----|---------|
| **Flow (product / AI)** | `FlowMascot` from `@/components/FlowMascot` with `expression` (`happy`, `thinking`, `encouraging`, etc.) |
| **Assistant page** | Branded PNG states in chat (`/branding/…`) + metadata mascot state |
| **Avoid** | 🤖 emoji for “our AI” on marketing or in-app coach surfaces; prefer Flow |
| **User / human** | Lucide `User`, initials in circles, or neutral avatars—not empty gray circles |

## Empty states

Prefer **`BrandedEmptyState`** (`@/components/ui`) for app-shell empties: title, description, optional CTA, Flow mascot.

Legacy **`EmptyState`** remains for minimal icon + text without mascot.

## Marketing homepage

- Sections: `HeroSection`, `ProblemStatement`, `FeaturesGrid`, `HowItWorks`, `FeatureDeepDive`, **`CompetitiveDifferentiation`** (`#why-timeflow`), `Testimonials`, `PricingTeaser`, `FinalCTA`.
- **How It Works:** Step that describes Flow scheduling uses **`FlowMascot`**, not 🤖.

## Inbox

- Custom fonts: Manrope, Crimson Pro, JetBrains Mono—documented in inbox styles.
- **Identity hint:** `suggestIdentityFromEmail` + pill **Supports {Identity}** on thread rows when score ≥ threshold.

## Navigation

- Sidebar label for chat: **“Flow AI”** with spark icon (`SparkIcon` in `Layout.tsx`).

## Components to align over time

- `IdentityDashboardBanner` defines a **local** `FlowMascot` function name—rename to avoid confusion with the shared component.
- Replace ad-hoc ✨/emoji accents in scheduling/today with teal iconography or Flow where it signals “product AI.”
