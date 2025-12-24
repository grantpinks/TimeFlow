# TimeFlow Brand Guidelines

## 1. Brand Narrative & Attributes

### Narrative (Sprint 9)
TimeFlow is the calm, intelligent co-pilot that turns chaos into momentum. It reads your day, understands your energy, and choreographs tasks into a schedule that feels inevitable—not forced. The promise: *flow without friction*.

### Attributes
- **Personality:** Intelligent, reassuring, quietly confident; never shouty or gimmicky.
- **Tone:** Crisp, plain-language, forward-looking; avoids jargon and filler.
- **Positioning:** Premium, trustworthy productivity layer for busy professionals and ambitious students who value calm clarity over hustle hype.
- **Keywords:** Focus, clarity, momentum, composure, precision, supportive.
- **Do/Don’t:** Do be concise, directional, and encouraging. Don’t be cute for its own sake; don’t use productivity guilt.

---

## 2. Logo System (Sprint 9 Spec)

### Concept
- **Primary mark:** Interlocking hourglass + flow ribbon. Two tapered shapes form a subtle hourglass with negative space; a diagonal “flow” ribbon crosses to imply motion.
- **Icon-only:** Simplified hourglass/ribbon without wordmark; round-cornered lozenge silhouette for app icons.
- **Wordmark:** “TimeFlow” set in a geometric sans with slightly softened terminals; title case preferred.

### Variants
- **Primary:** Teal + Midnight on light background.
- **Monochrome:** Single-color (black/white) for emboss/print.
- **Icon-only:** Teal lozenge with white hourglass/ribbon.

### Usage
- **Clear space:** 0.5× logotype cap height around all sides.
- **Min size:** Digital icon ≥24px; wordmark lockup ≥120px width.
- **Backgrounds:** Prefer solid light backgrounds; invert to white mark on dark/teal surfaces.
- **Don’t:** No bevels, glows, drop-shadows, or hue shifts outside palette.

### Integration Slots
- Web header/sidebar: 24–32px icon-only; 120–160px lockup on marketing or auth screens.
- Mobile: 1024px master app icon export from icon-only lozenge; 256px avatar for assistant.

---

## 3. Color Palette (Updated)

| Role | Hex | Notes |
|---|---|---|
| **Primary / Teal Flow** | `#0BAF9A` | Brand hero, CTAs, focused states. |
| **Midnight** | `#0F172A` | Headlines, high-contrast text on light. |
| **Stone** | `#1F2937` | Secondary text on light. |
| **Fog** | `#E5E7EB` | Panels/dividers on light. |
| **Paper** | `#F8FAFC` | App background (light). |
| **Accent / Amber Pulse** | `#F59E0B` | Highlights, progress, celebratory micro-interactions. |
| **Success / Mint** | `#22C55E` | Completion states, positive signals. |
| **Error / Coral** | `#F97316` | Errors/warnings (use sparingly). |
| **Dark Surface** | `#0B1120` | Icon inversion and dark chips. |

Accessibility: Target AA for text on backgrounds; reserve Amber for accents, not body text.

---

## 4. Mascot “Flow” (Sprint 9 Spec)

### Concept
- Form: Rounded droplet silhouette with a negative-space hourglass centered. Subtle tilt to imply motion.
- Face: Two soft oval eyes; no mouth by default. Expression via eye angle and body tilt.
- Style: Flat 2D vector, minimal gradients; allow a soft inner glow only on large hero use.

### Palette
- Body: Primary Teal `#0BAF9A`.
- Hourglass void: Paper `#F8FAFC`.
- Spark/celebration: Amber Pulse `#F59E0B` (sparks/dots only).

### States
- **Idle:** Neutral eyes, upright droplet.
- **Listening:** Slight lean forward, eyes upward-left; tiny concentric rings on one side.
- **Thinking:** Head tilt 10–15°, two small bubbles rising inside hourglass.
- **Responding:** Subtle bounce (scale 1.02), eyes open, micro sparkle.
- **Success:** Quick upward pop + amber sparkle; optional mint outline flash for completion events.

### Sizes
- Small (24–32px): Eyes-only, hourglass hinted.
- Medium (48–64px): Full hourglass visible, minimal sparkle.
- Large (128–256px): Allow subtle gradient in body and inner glow; keep flat outlines.

### Motion Guidance
- Durations 120-200ms ease-out; respect `prefers-reduced-motion`.
- Limit sparkle bursts to 3-5 particles, fade within 250ms.
- Assistant UI motion tokens:
  - Message entrance: 200ms ease-out with small vertical offset (disable when reduced motion).
  - Mascot float/glow: 2-3s loop; render static when reduced motion.
  - Confidence pulse: 1s loop with 2s delay; disable when reduced motion.
  - Hover/tap scale: 1.02/0.98 on buttons; disable when reduced motion.

---

## 5. Typography (for wordmark + UI)
- Primary: A geometric sans with softened terminals (e.g., Aeonik/Whyte/Inter with custom rounding). Use current Inter in-app until custom face is sourced.
- Hierarchy: H1 32–36px semi-bold; H2 24–28px semi-bold; body 14–16px regular.
- Letterspacing: Slightly negative for headings (-0.5%); normal for body.

---

## 6. Integration Guidance (Web & Mobile)

### Web
- Header/sidebar: Icon-only at 24–32px; replace text logo on auth/marketing pages with primary lockup.
- Assistant UI: Show Flow (mascot) in the chat avatar; swap typing indicator dot colors to Primary/Amber.
- Favicon: Icon-only lozenge with white hourglass; provide 32/64/128px exports.

### Mobile (Expo)
- App icon: Icon-only lozenge, teal background, white hourglass; 1024px master.
- Splash/Login: Primary lockup centered on Paper background; optional large mascot watermark at 12% opacity.
- Tab icons: Use simplified icon-only (2-color max).

---

## 7. Usage Quick Rules
- Maintain AA contrast for all text/icons.
- Avoid drop-shadows on logos; use subtle blur only for large hero art.
- Keep motion optional (respect reduced-motion) and under 250ms.
- Reserve Amber for highlights and celebration—not for body text.

### Asset Locations
- Source assets: `assets/branding/*.png`
  - Primary logo: `assets/branding/main_logo.png`
  - Mascot states: `Flow Mascot Default/Thinking/Celebrating/Guiding*.png`
- Web-ready copies: `apps/web/public/branding/`
- Mobile-ready copies (Expo): `apps/mobile/assets/branding/`

---

**Last Updated:** 2025-12-09 (Sprint 9 refresh)
