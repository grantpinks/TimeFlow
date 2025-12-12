# Sprint 9 Plan (Codex) — Branding, Visual Identity & AI Mascot

**Focus**: Brand identity system, logo/mark concepts, AI assistant mascot, and integration touchpoints (web + mobile).  
**Duration**: 2 weeks

## Goals
- Define a clear brand narrative and attributes that guide all visuals.
- Produce logo directions (primary, monochrome, icon-only) ready for integration.
- Create AI assistant mascot concepts (small/large usage, states).
- Integrate logo/mascot into web and mobile entry points (layout/header, assistant UI, splash/login/tab icons).

## Scope (Codex Tasks 9.1–9.5)
1) **Brand Narrative & Attributes (9.1, P0)**
   - Deliver a concise brand narrative: mission, tone, personality, keywords, do/don’t.
   - Output: Markdown brand brief consumable by design/eng teams.

2) **Logo System (9.2, P0)**
   - Three variants: primary lockup, monochrome, and icon-only.
   - Output: Vector-friendly description + usage guidance (spacing, min size, dark/light).
   - Integration plan: where/how to drop assets in web/mobile.

3) **AI Assistant Mascot (9.3, P0)**
   - Concept + states (idle, listening, thinking, responding, success) for small (favicon/avatar) and large (hero) use.
   - Output: Style sheet with shapes, colors, motion cues; textual spec for rendering/animation.

4) **Web Integration (9.4, P1)**
   - Update web layout/header/sidebar and Assistant UI with logo/icon/mascot placeholders and token hooks.
   - Output: Code updates (Next.js app) referencing asset slots and brand tokens.

5) **Mobile Integration (9.5, P1)**
   - Define splash/login/tab icon usage for logo + mascot.
   - Output: Config updates (Expo) with placeholder assets/paths and guidelines for final exports.

## Deliverables
- `docs/BRAND_GUIDELINES.md` additions: brand narrative, logo system rules, color/type guidance, mascot spec.
- `docs/FEATURES_IN_PROGRESS.md`/`docs/HELP.md` unaffected; only touch branding docs.
- Web app updates: layout references to brand tokens, logo/mascot placeholders.
- Mobile app updates: asset slots for splash/login/tab icons.

## Out of Scope (Claude/Gemini)
- Interaction performance/accessibility audits (Claude).
- Long-form brand guidelines doc (Gemini).

## Definition of Done
- Brand narrative + mascot + logo specs documented in Markdown.
- Web layout shows logo/icon and assistant avatar slot without breaking existing UX.
- Mobile config prepared for logo/mascot assets (even if placeholders).
- Tests/builds continue to pass (`pnpm -r test`).

## Progress Update 1
- Assets: Verified existing logos/mascot in `assets/branding`; copied web-ready variants to `apps/web/public/branding` and mobile-ready to `apps/mobile/assets/branding`.
- Docs: Brand guidelines refreshed with narrative, palette, mascot spec, asset paths.
- Web: Header now displays branded logo; Assistant page shows Flow avatar header; dnd-kit calendar/today interactions intact.
- Mobile: `app.json` updated to use branded icon/splash colors and branding assets.
- Tests: `pnpm -r test` passing.
