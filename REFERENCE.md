**English** · [Tiếng Việt](REFERENCE.vi.md)

# Technical UX/UI Design Standards — Consolidated Reference (2026)

> Last verified against primary sources: 2026-07-03.

> This document is the synthesized "single source of truth" merging two prior drafts: it keeps the
> broad, source-cited coverage of one and the interactive HCI-law angle of the other.
> Numeric values are language-neutral and stated once in shared tables where possible.
>
> **Legend:** 🔒 = hard requirement in a published spec (mandate) · 📐 = industry convention / heuristic (not a vendor mandate).

---

## 0. How to read this document

This is a lookup reference, not an essay. Every figure is meant to be droppable into an acceptance ticket. Three changes from 2023–2025 dominate everything below and you should internalize them first: (1) **INP replaced FID** as a Core Web Vital on **2024-03-12** (web.dev/Chrome); (2) **WCAG 2.2** became a W3C Recommendation on **2023-10-05**, adding target-size, focus-appearance, and authentication criteria; (3) the **W3C Design Tokens Format Module** reached its first stable version **2025.10** on **2025-10-28**. When a number is a published mandate it is marked 🔒; when it is a strong convention it is marked 📐. Build to the strictest relevant platform, never to the loosest floor.

**Scope.** Norma is a front-end **design** standard for HTML/CSS. In scope: everything below, plus lint-enforced frontend-markup security (`security.external-rel`, `security.sri`). **Out of scope:** backend/server engineering, and header/runtime security (CSP, HSTS, `frame-ancestors`/clickjacking, Trusted Types) — enforce those on the server, not from HTML/CSS.

---

## 1. Design Tokens & Systems

Design tokens are the indivisible, named design decisions of a system (color, spacing, type, motion, radius, elevation, duration), stored platform-agnostically so one source generates CSS, iOS, Android, Flutter, etc. The term originated with the Salesforce Lightning team (~2014–2016).

Three-tier taxonomy:
- **Primitive / reference / global** — raw values, no meaning: `color.blue.500 = #3b82f6`, `space.4 = 16px`.
- **Semantic / alias** — reference primitives, carry intent: `color.text.primary → color.blue.900`, `color.action.primary → color.blue.500`.
- **Component** — scoped to one component: `button.primary.background → color.action.primary`.

This layering lets you re-theme (light/dark, brand A/B) by remapping the semantic tier without touching every call site.

**W3C DTCG format 🔒 (interoperability standard, v2025.10):** JSON exchange format. Reserved keys are `$`-prefixed: `$value`, `$type`, `$description`. `$type` is case-sensitive, can be set at group level and inherited; tools **MUST NOT** infer type from the value. Aliases use curly braces: `{group.tokenName}`. The 2025.10 release adds theming/multi-brand support, modern color spaces (Display P3, OKLCH, all CSS Color 4 spaces), and the object form for `dimension` (`{"value": 8, "unit": "px"}`). Editors span Adobe, Google, Microsoft, Meta, Figma, Salesforce, Shopify and others.

```json
{
  "color": {
    "brand": {
      "primary": { "$value": "oklch(0.58 0.16 252)", "$type": "color", "$description": "Primary brand color" }
    },
    "text": {
      "primary": { "$value": "{color.brand.primary}", "$type": "color" }
    }
  },
  "spacing": {
    "md": { "$value": { "value": 16, "unit": "px" }, "$type": "dimension" }
  }
}
```

**Tooling 📐:** Style Dictionary (DTCG support since v4), Tokens Studio for Figma (toggle "W3C DTCG" format), Terrazzo, Figma Variables, Supernova, zeroheight, Penpot. Validate against the DTCG JSON Schema before shipping.

---

## 2. Spacing, Grid & Layout

Default is an **8px grid 📐 with a 4px sub-grid** for tight internal spacing. Rationale: 8 has clean integer factors and most resolutions divide by it evenly, avoiding sub-pixel blur. Both Material and IBM Carbon build on this.

Recommended spacing scale (tokens, px): **0 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128** (named `2xs…4xl`). Two governing rules:
1. **Internal ≤ external (Gestalt proximity):** padding inside a grouped element ≤ margin around it (a card with 16px padding needs ≥16px outer margin).
2. **Font sizes do NOT follow the spacing grid** — use a modular type scale (§3); but snap computed line-height to the grid (16px font / 24px line-height).

**Responsive breakpoints 🔒 (verbatim, min-width, mobile-first):**

| Framework | xs / sm | md | lg | xl | 2xl |
|---|---|---|---|---|---|
| **Tailwind CSS** (v3/v4) | 640px | 768px | 1024px | 1280px | 1536px |
| **Bootstrap 5** | 576px | 768px | 992px | 1200px | 1400px |
| **Material (window classes)** | Compact 0–599dp | Medium 600–839dp | Expanded 840–1239dp | Large 1240–1439dp | XLarge ≥1440dp |

**Column grids 📐:** 12-column with a 24px (1.5rem) gutter is the common desktop convention; a 1440px artboard typically uses ~60px side margins. Use `max-width` (not fixed `width`) so containers shrink on narrow viewports.

### Layout & composition

**Choose the engine by dimensionality 📐:** **Flexbox** distributes content along **one** axis (a row or a column that can wrap) and sizes to content — use it for toolbars, button rows, nav, chips, the media object. **Grid** controls **two** axes at once (rows *and* columns) — use it for page scaffolds, card galleries, and any real 2-D arrangement. `gap` works in both and replaces margin hacks. Anti-pattern: nesting flex containers to fake a grid; if you're aligning across both rows and columns, it's Grid.

**CSS Grid mechanics 🔒:**
- `fr` distributes leftover space; `minmax(min, max)` sets a track's floor/ceiling; `grid-template-areas` names regions in ASCII art (readable holy-grail layouts); named lines (`[content-start]`) anchor placement.
- **Responsive without media queries — the RAM technique (Repeat, Auto, Minmax):**
  `grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` — cards are ≥16rem, wrap to fit the container, and the inner `min(100%, 16rem)` stops a single card from overflowing a narrow parent. `auto-fit` collapses empty tracks (cards stretch to fill); `auto-fill` keeps them (cards stay their size). One line replaces a stack of breakpoints.
- **Subgrid** (Baseline 2023) lets a child inherit its parent's tracks, so card titles/bodies/footers align across a gallery.

**Alignment & gap 🔒:** the box-alignment properties work in Flex and Grid — `justify-*` runs along the inline axis, `align-*` along the block axis; `place-content`/`place-items`/`place-self` are shorthands. Center anything with `display:grid; place-items:center` (no `margin:auto`/transform hacks). `justify-content: space-between | space-around | space-evenly` distribute leftover space between/around/evenly around items.

**Composition primitives 📐 (Every Layout / CUBE CSS):** compose layouts from a small vocabulary of self-contained, intrinsically-responsive primitives rather than ad-hoc per-component CSS — it makes layouts reviewable ("this is a Switcher at 30rem"):
- **Stack** — vertical flow with one owned gap (`display:flex; flex-direction:column; gap`).
- **Cluster** — items that wrap and stay grouped (`display:flex; flex-wrap:wrap; gap`) — chips, tags, button rows.
- **Sidebar** — a fixed-ish aside + fluid main that wraps when the main hits a min-width (Flexbox `flex-basis` + `flex-wrap`).
- **Switcher** — flips row↔column at a **content threshold**, not a viewport breakpoint (`flex-basis: calc((30rem - 100%) * 999)`).
- **Cover** — vertically centers a payload with header/footer pinned (min-block-size + auto margins).
- **Grid/RAM** — the auto-fit card gallery above.
- **Center / Wrapper** — `width: min(100% - 2rem, 65ch); margin-inline: auto` — a fluid, gutter-safe, measure-capped content column.
- **Reel** — a horizontally scrolling track (scroll-snap); **Frame** — a cropped aspect-ratio box; **Imposter** — a centered overlay.

**Intrinsic, content-driven sizing 📐:** prefer intrinsic sizing over hard pixels. `min-content`/`max-content`/`fit-content()` size to content; `min()`/`max()`/`clamp()` build fluid widths/gaps without breakpoints (the wrapper `width: min(100% - 2rem, 65ch)` above; `clamp()` is documented for type in §3 but applies to any length). Lay out on the **logical axes** — `inline-size`/`block-size`, `margin-inline`, `padding-block`, `inset` — not physical `width`/`left`/`top`, so an EN-authored layout mirrors correctly in the VI/RTL sibling (extends §3's i18n to the layout axis; linted as `i18n.logical-properties`). For media, `aspect-ratio` is a **layout** tool (reserve the box — also a §6 CLS fix) and `object-fit: cover|contain` + `object-position` control focal cropping so images never stretch or squish.

**Container queries 📐 (Baseline 2023):** style a component by **its own container's** size, not the viewport — the reason a component is *truly* reusable (a card adapts to a 300px sidebar slot and a 900px main region identically). Set `container-type: inline-size` (+ optional `container-name`) on the parent, then `@container (min-width: 30rem){ … }`; container units `cqi`/`cqb`/`cqmin` size relative to the container. Reach for container queries over viewport media queries inside reusable components. Style queries (`@container style(--state: active)`) are emerging (not yet Baseline).

**Overflow, scroll & stacking 📐:**
- **z-index as a token ladder** — stop the `z-index: 9999` arms race with named layers: `base 0 · dropdown 1000 · sticky 1100 · fixed 1200 · overlay 1300 · modal 1400 · popover 1500 · toast 1600 · tooltip 1700`. A **stacking context** is created by `position` + `z-index`, but also by `opacity < 1`, `transform`, `filter`, `will-change`, and `isolation: isolate` — a transformed ancestor **traps** a child's `z-index`, the #1 "why won't this go on top" bug. Use `isolation: isolate` to scope a context deliberately. The browser **top layer** (`<dialog>`, popover) renders above every `z-index`, so prefer native overlays (see §9).
- **Scroll** — `scroll-snap-type`/`scroll-snap-align` for carousels/reels; `scrollbar-gutter: stable` reserves the scrollbar's space (a hidden §6 CLS source); `overscroll-behavior: contain` stops scroll-chaining out of a modal/drawer; `position: sticky` pins headers within a scroll container; and `scroll-margin-top`/`scroll-padding-top` keep an anchored target from hiding under a sticky header.

---

## 3. Typography

**Modular scale 📐:** `size = base × ratio^step`. Base is almost universally **16px** (1rem; use 18px for reading-heavy content). Common ratios:

| Ratio | Value | Best for |
|---|---|---|
| Minor second | 1.067 | Dense minor UI |
| Major second | 1.125 | Dense dashboards |
| Minor third | 1.200 | Text-heavy, compact UI |
| **Major third** | **1.250** | **General app UI (Material)** |
| **Perfect fourth** | **1.333** | **Editorial / spacious (safe default)** |
| Augmented fourth | 1.414 | Landing pages |
| Perfect fifth | 1.500 | Dramatic headlines |
| Golden ratio | 1.618 | Display / art-directed |

Use `rem` (not `px`) so type respects user font-size. Typically 6–8 steps; negative steps (base ÷ ratio) yield captions ≈ 12–13px.

- **Line-height / leading 📐:** body ~1.5 (WCAG text-spacing floor is exactly 1.5× 🔒); headings tighter 1.1–1.25. Keep computed line-height on the grid.
- **Measure (line length) 📐:** **45–75 characters per line** for Latin body (~66 ideal).
- **Line breaking 📐:** `text-wrap: balance` for headings (Baseline 2024); `text-wrap: pretty` for paragraph rag as progressive enhancement (not yet Baseline).
- **Minimum body size 📐:** 16px is the practical floor; 12px only for captions, never long-form. WCAG mandates scalability, **not** a pixel size 🔒 (see §5).
- **Fluid typography:** `font-size: clamp(min, preferred, max)` with linear interpolation between viewport bounds (Utopia method; CSS Values & Units L4). Scales without breakpoints and still passes 200% zoom.
- **Font loading:** `font-display: swap` (FOUT, protects LCP) for body; `optional` for max performance; `block` only for icon fonts. Best practice: `swap` **+ metric-adjusted fallback** (`size-adjust`, `ascent-override`) to kill CLS on swap. Serve **WOFF2** (~30% smaller than WOFF), self-host with `Cache-Control: public, max-age=31536000, immutable`, preload critical fonts. **Variable fonts** win when you use ≥3 weights (one file replaces many).

**CJK / Traditional Chinese 📐:** CJK fonts hold 20,000–80,000+ glyphs (5–20MB) vs ~200 for Latin — delivery is the core problem. Google Fonts splits CJK into 100+ `unicode-range` subsets; subset per script. **Raise line-height to ~1.7** (denser glyphs) vs ~1.2 Latin. When mixing scripts, the Latin often needs optical scaling up (CJK sits in a square em-box). **Ship region-specific fonts (Traditional TC vs Simplified SC)** — pan-CJK localized variants are unreliable; Taiwan/Hong Kong readers reject Simplified. Traditional Chinese also commonly uses vertical layouts.

**Vietnamese 📐:** the most demanding Latin script — 134+ accented characters whose precomposed forms are spread across **four Unicode blocks**: Latin-1 Supplement, Latin Extended-A, Latin Extended-B, and **Latin Extended Additional** (U+1E00–U+1EFF, which holds the largest single share, ~90). A font that covers only Latin Extended Additional will still miss Vietnamese glyphs — budget fonts often skip Extended-A/B/Additional, so **verify glyph coverage before deploying** (Noto Sans/Serif and Be Vietnam Pro are safe). Give Vietnamese slightly more line-height so stacked diacritics don't collide.

**Multi-language design (i18n) 🔒📐:** declare `<html lang>` (WCAG 3.1.1 🔒) with a **valid BCP-47 tag** (`en`, `vi`, `zh-Hant` — never `english` or `en_US`), and tag inline foreign-language runs with `lang` (SC 3.1.2). Lay out with **logical properties** — `margin-inline`, `padding-inline`, `border-inline-start`, `text-align:start` — not physical `margin/padding/border-left/right`, so RTL (Arabic, Hebrew) and vertical writing modes mirror automatically; set `dir` and honor `writing-mode`. Norma enforces these as `i18n.html-lang` (🔒, presence), `i18n.lang-valid` (🔒, BCP-47 well-formedness), `i18n.logical-properties` (📐, CSS Logical Properties L1), and `i18n.inline-lang` (🔒, SC 3.1.2, agent-verified).

**Locale formatting, expansion & bidi 📐:** never hand-format numbers, dates, currencies or lists — use **ECMA-402 `Intl`** (`Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`) so `1,234.56` / `1.234,56` / `١٬٢٣٤` render per locale. Pluralization is **not** `n === 1 ? 'item' : 'items'` — Arabic has 6 plural categories, Polish 4, Vietnamese 1; use **`Intl.PluralRules`** (CLDR). Budget for **text expansion**: translated UI grows ~30% (German, Finnish) and short labels can double — size buttons/tabs to wrap or truncate gracefully, never to the English string. For bidirectional text, isolate mixed-direction or user-generated runs with `unicode-bidi: isolate` / `<bdi>` and set `dir="auto"` on inputs so a Hebrew or Arabic name inside an LTR sentence doesn't reorder surrounding punctuation.

---

## 4. Color

**Color spaces.** RGB is device-native but perceptually meaningless. **HSL's lightness is NOT perceptually uniform** — HSL(60,100%,50%) yellow looks far brighter than HSL(240,100%,50%) blue at the "same" lightness. **OKLCH** (cylindrical OKLab, Björn Ottosson 2020) is perceptually uniform: equal numeric steps in L (0–1), C (0–~0.4), H (0–360°) produce equal perceived change. Consequences:
- Build tonal ramps by fixing H+C and stepping L in equal increments — no manual correction.
- Generate hover/active/disabled states by nudging L predictably; invert L for consistent dark themes.
- OKLCH expresses wide-gamut (Display P3) colors HEX/RGB/HSL cannot. Interpolate with `color-mix(in oklch, …)`. LCH (CIELAB) is the older cousin; OKLCH is preferred.

**WCAG 2.x contrast 🔒 (enforceable today):**

| Requirement | Ratio | Level |
|---|---|---|
| Normal text (<18pt / <14pt bold) | **4.5:1** | AA |
| Large text (≥18pt / ≥14pt bold) | **3:1** | AA |
| UI components & graphical objects (SC 1.4.11) | **3:1** | AA |
| Normal / large text | **7:1 / 4.5:1** | AAA |

Ratio = (L1 + 0.05)/(L2 + 0.05), range 1:1–21:1.

**APCA (WCAG 3.0 direction) 📐:** the Accessible Perceptual Contrast Algorithm outputs **Lightness Contrast (Lc)** (≈ −108…+106), polarity-aware and font-size/weight-aware. Simple thresholds: **Lc 90 preferred / 75 minimum for body text; ~60 for large/bold**; ~Lc 15 = one perceivable step. WCAG 2.x overstates contrast for near-black colors, so it **cannot reliably guide dark-mode** — APCA can. Status caveat: APCA was reverted to "Placeholder" in the 2023-06-02 WCAG 3.0 Editor's Draft; WCAG 3.0 has no release date (informally ~2030). **Keep WCAG 2.x as the enforceable standard.**

**Dark mode & elevation 📐:** convey elevation with progressively lighter surfaces (not just shadows — shadows are weak on dark). Avoid pure black/white pairings; use near-black surfaces + slightly-off-white text to reduce halation. For token-level theming, pair `color-scheme` with the `light-dark()` function (Baseline 2024) so one custom property expresses both themes.

---

## 5. Accessibility (measurable)

**WCAG 2.2** — W3C Recommendation **2023-10-05** (updated edition **2024-12-12**; approved as **ISO/IEC 40500:2025**), 86 success criteria (31 A, 24 AA, 31 AAA); Level **AA** is the near-universal legal target (EU Accessibility Act / Directive 2019/882 — enforceable in all EU member states since **2025-06-28**; Section 508; EN 301 549; ADA case law). New in 2.2: 2.4.11/2.4.12 Focus Not Obscured, 2.4.13 Focus Appearance, 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8/3.3.9 Accessible Authentication. SC 4.1.1 Parsing was removed.

**Target sizes:**

| Authority | Minimum | Notes |
|---|---|---|
| **WCAG 2.5.8 (AA)** 🔒 | **24×24 CSS px** | 5 exceptions: spacing (24px circle test), equivalent, inline, UA control, essential |
| **WCAG 2.5.5 (AAA)** 🔒 | 44×44 CSS px | |
| **Apple HIG** 🔒 | **44×44 pt** (≈59px) | visionOS 60pt |
| **Material** 📐 | **48×48 dp** (≈9mm) | pointer ≥44dp; ≥8dp separation |

**Focus indicators:**
- 2.4.7 Focus Visible (AA) 🔒 — a visible indicator must exist.
- 2.4.11 Focus Not Obscured (AA) 🔒 — focused element at least partially visible (not fully hidden by sticky bars). Agent-verified as `a11y.focus-not-obscured`.
- 2.4.13 Focus Appearance (AAA) 🔒 — indicator ≥ a **2 CSS px thick perimeter** of the component, **≥3:1 contrast between focused/unfocused states**, plus ≥3:1 vs adjacent. Implement with `:focus-visible`, ≥2px outline, `outline-offset`; never `outline:none` without a compliant replacement.

**Keyboard / ARIA / SR 🔒:** all functionality keyboard-operable (2.1.1); logical focus order (2.4.3); landmark roles (`banner`, `nav`, `main`, `contentinfo`); descriptive labels (not "Button"); DOM reading order matches visual order; `aria-live` (`polite`/`assertive`) for dynamic updates like errors. Accessible names on controls are linted statically as `a11y.control-name` (4.1.2).

**Motion 🔒:** honor `prefers-reduced-motion: reduce` (2.3.3 AAA); auto-playing motion that lasts >5s needs a visible pause/stop/hide control for **all** users — an OS preference is not a substitute (2.2.2 A); no content flashes >3×/second (2.3.1 A).

**Text spacing / reflow / resize:**
- 1.4.12 Text Spacing (AA) 🔒 — no loss when users set line-height **1.5×**, paragraph spacing **2×**, letter-spacing **0.12×**, word-spacing **0.16×** (for 16px: 24 / 32 / 1.92 / 2.56px). Scripts that don't use a property are exempt (e.g. letter-spacing for Chinese).
- 1.4.10 Reflow (AA) 🔒 — no 2-D scrolling at **320 CSS px** width (≈ 1280px @ 400% zoom). Exceptions: tables, maps, diagrams, games, toolbars.
- 1.4.4 Resize Text (AA) 🔒 — text resizable to **200%** without loss; no pixel minimum imposed. Never block zoom in the viewport meta — no `user-scalable=no`, no `maximum-scale` < 2 (linted as `a11y.meta-viewport`).

---

## 6. Performance & Core Web Vitals

**Thresholds 🔒 (Google, 75th percentile of real-user CrUX):**

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| **LCP** (loading) | ≤ 2.5s | 2.5–4s | > 4s |
| **INP** (responsiveness) | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** (visual stability) | ≤ 0.1 | 0.1–0.25 | > 0.25 |

**INP replaced FID on 2024-03-12** (web.dev/Chrome). INP measures every interaction's full latency (input → next paint) across the whole visit and reports the worst (excluding outliers); FID measured only the first interaction's input delay. INP is markedly stricter — at the 2024 switch, ~93% of mobile sites had good FID but only ~65% had good INP; HTTP Archive 2025 Almanac: 77% of mobile origins now have good INP (74% in 2024), and 48% pass all three CWV. Failures trace to heavy JS, long tasks (>50ms), third-party scripts. TTFB (<800ms) and TBT are diagnostics, **not** Core Web Vitals. Soft navigations (SPA route changes) are gaining first-class measurement in Chrome — final origin trial Chrome 147–149, Intent to Ship targeting Chrome 151 (2026); CrUX reporting is still TBD and thresholds are unchanged.

**UX/business impact:** these are the metrics users *feel* (load speed, tap responsiveness, layout stability) and are confirmed ranking signals (a tiebreaker, not dominant vs relevance).

**Perceived-performance 📐:** skeleton screens, optimistic UI (reflect the action before server confirmation), progressive/streaming loading, prioritize above-the-fold.

**Image optimization 📐:**
- Formats: serve **AVIF** → **WebP** → JPEG/PNG via `<picture>`/`<source>`. AVIF's lossy edge over WebP is modest (~10–12% at equal quality); the big wins are vs legacy JPEG/PNG.
- Responsive: `srcset` (w-descriptors) + `sizes` matching real layout; 3–5 width variants.
- **Always set `width`/`height`** (or `aspect-ratio`) to reserve space and prevent CLS.
- Lazy-load below-the-fold (`loading="lazy"`), but **never** the LCP/hero image — use `loading="eager"` + `fetchpriority="high"` (± preload).

---

## 7. Motion & Interaction

**Duration 📐:** micro-interactions (buttons, toggles) **100–300ms**; optimal perceived UI range **200–500ms**; <100ms reads instantaneous, >1s feels laggy. Adjustments (Material): desktop 150–200ms (faster), tablet ~+30% vs mobile, wearables ~−30%. Exit < entrance; larger travel → longer duration.

**Material 3 motion — spring-first since M3 Expressive (Google I/O, May 2025) 📐:** the motion *physics* system is now Material's primary system — spring composite tokens (damping + stiffness), organized **Spatial** (position/size/shape; may overshoot) vs **Effects** (color/opacity; high damping), each in fast/default/slow. The duration/easing tokens below remain documented as the **fallback**, still used for transitions.

**Material Design 3 duration/easing tokens 🔒 (verbatim, fallback system):**
- *Durations (ms):* short1 50 · short2 100 · short3 150 · short4 200 · medium1 250 · medium2 300 · medium3 350 · medium4 400 · long1 450 · long2 500 · long3 550 · long4 600 · extra-long1 700 · extra-long2 800 · extra-long3 900 · extra-long4 1000.
- *Easing:* standard `cubic-bezier(0.2, 0, 0, 1)` · standard-decelerate `cubic-bezier(0, 0, 0, 1)` · standard-accelerate `cubic-bezier(0.3, 0, 1, 1)` · emphasized-decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)` · emphasized-accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)` · linear `cubic-bezier(0, 0, 1, 1)`. The **emphasized** token is a two-segment path (`M 0,0 C 0.05,0 0.133,0.06 0.166,0.4 C 0.208,0.82 0.25,1 1,1`) and **cannot** be a single cubic-bezier — web approximations are just that.
- *Legacy:* M2 "standard" easing = `cubic-bezier(0.4, 0, 0.2, 1)` (FastOutSlowIn), still the default interpolator inside M3 transition classes. The spring system is the default in Jetpack Compose (21+ components; expressive vs standard schemes).

**Apple 📐:** motion should be fluid, reinforce spatial hierarchy and direct manipulation, never distract; honor Reduce Motion (`UIAccessibility.isReduceMotionEnabled`), swapping large motion for cross-fades.

**When NOT to animate 📐:** high-frequency repetitive actions where motion adds latency; decorative bounce/stretch in utility contexts (IBM Carbon discourages bounce/stretch); anything under `prefers-reduced-motion`.

**Gestures (mobile) 📐:** use the standard vocabulary (tap, long-press, swipe, pinch, rotate). Provide a visible single-pointer alternative for every custom gesture (WCAG 2.5.1 for path-based gestures 🔒; 2.5.7 for dragging, agent-verified as `a11y.dragging-alternative`). Never override system-reserved gestures (edge swipes, Control/Notification Center). Add grabber handles to hint draggable sheets.

---

## 8. Platform Guidelines

**Apple HIG (iOS):**
- Type: system **SF Pro** (SF Pro Text ≤19pt, SF Pro Display ≥20pt, optical sizing); New York is the serif. Default Dynamic Type Body **17pt**, Large Title **34pt**; named text styles must scale via Dynamic Type. SF ships 9 weights.
- Targets: **44×44pt** minimum; min list row height 44pt.
- Spacing: 8pt grid with 4pt subdivisions is a reliable convention 📐 (Apple does not brand-mandate "the 8pt grid" the way Material does).
- Color: design to **semantic/adaptive system colors** (`systemBlue`, `label`, `systemBackground`) 🔒, not hardcoded hex, so light/dark/contrast come free.
- Safe areas 🔒: keep interactive/essential content out of status bar, Dynamic Island, notch, home indicator; use `safeAreaLayoutGuide`.
- Navigation: tab bars for top-level (**3–5 tabs max on iPhone**, "More" overflow); nav bars for drill-down; modals for focused tasks.
- Since iOS 26 (2025), **Liquid Glass** is the system-wide material language. iOS 27 (WWDC 2026) dialed default transparency down, added a user-facing clear↔opaque intensity control and retuned content diffusion — a legibility-driven correction that makes contrast-on-glass a first-class compliance risk (§14's glassmorphism TELL separates platform-native material from decorative CSS glass).

**Google Material Design 3 (Material You):**
- Dynamic color: tonal palettes from a source color into semantic roles; **elevation via tonal surface overlays**, not only shadows.
- Component specs 📐: standard button ~40dp visual / 48dp touch target / 16dp horizontal padding; text fields ~56dp (outlined) / 48dp (filled); checkbox/radio 40dp visual in 48dp target; chips ≥32dp (40dp recommended); FAB small 40 / regular 56 / large 96dp.
- Grid: 4px baseline, components in multiples of 8; type scale 1.25.

**Key iOS vs Android differences 📐:** nav — iOS bottom **tab bar** vs Android **navigation bar/rail** + system Back; targets 44pt vs 48dp; type SF Pro vs Roboto; back — iOS top-left + edge swipe vs Android global system back; elevation — iOS blur/translucency vs Material tonal+shadow. Respect each platform's share sheet, date pickers, and system components rather than cloning one onto the other.

---

## 9. Components & States

**States to design for every interactive component 🔒/📐:** default, hover (pointer only), focus (`:focus-visible`), active/pressed, disabled, loading, error — plus selected/checked, read-only where relevant. Material adds **state layers** (overlay tints) occupying the full 48dp target.

**Common specs 📐:**
- **Buttons:** height 40–48px; horizontal padding ~16px; min width ~64–88px; clear primary/secondary/tertiary hierarchy; loading disables + shows spinner; action-specific labels ("Create account", not "Submit").
- **Inputs/text fields:** ≥44–56px height; visible persistent label above the field; helper/error text below; never placeholder-as-label.
- **Modals/dialogs:** trap focus, restore focus on close, `Esc` to dismiss, backdrop, single clear dismissal path; avoid stacking modals. Prefer the native `<dialog>` element and Popover API (Baseline 2025) — the top layer gives focus management, Esc, backdrop and light-dismiss for free; a hand-rolled overlay `<div>` is the anti-pattern. Position tooltips/menus with CSS anchor positioning as progressive enhancement (Chrome/Edge, Firefox 151+; not yet in Safari — not yet Baseline).
- **Cards:** 16–24px internal padding; 16–24px gaps between sibling cards from the spacing scale.

**Reference design systems 📐 (study for concrete specs):** Google Material 3, Apple HIG, IBM Carbon, Shopify Polaris, Ant Design, Atlassian Design System, Salesforce Lightning.

**Atomic Design (Brad Frost) 📐:** atoms → molecules → organisms → templates → pages. Maps onto the primitive/semantic/component token tiers.

---

## 10. Forms & Responsive

> *§10 (Forms) and §11 (Responsive) are merged into this one section — there is no standalone §11; the reference site labels it "§10–11".*

**📐**
- **Layout:** single-column, top-aligned labels (best for scanning + mobile full-width). Avoid left-aligned labels and placeholder-as-label.
- **Labels:** every input has a programmatically associated `<label>` (`for`/`id`) 🔒 — improves SR context and enlarges the tap target.
- **Validation timing:** inline validation **on blur** (after leaving a field), not on every keystroke; show positive confirmation where useful.
- **Error messaging:** inline, directly below the field, specific and actionable ("Enter a 10-digit phone number, e.g. 123-456-7890" — not "Invalid input"). Don't rely on color alone (color + icon + text) 🔒 — agent-verified as `a11y.color-only-meaning`; announce via `aria-live`.
- **Required fields:** mark clearly; ask only for what's necessary.
- **Mobile input:** set correct `type`/`inputmode` (email/tel/number/url) to summon the right keyboard; enable `autocomplete`/autofill; support one-time-code autofill. WCAG 3.3.7 Redundant Entry 🔒 — don't force re-entry of provided info (agent-verified as `forms.redundant-entry`).

**Responsive & adaptive (📐)**
- **Mobile-first:** author base styles for the smallest viewport, then layer `min-width` media queries upward (matches Tailwind/Bootstrap). Include `<meta name="viewport" content="width=device-width, initial-scale=1">` (linted as `responsive.viewport-meta`; zoom-blocking values — `user-scalable=no`, `maximum-scale` < 2 — are an `a11y.meta-viewport` error).
- **Fluid layouts:** `max-width` (not fixed `width`), Flexbox/Grid, relative units, `clamp()` for fluid type/space.
- **Container queries** (modern CSS): style a component by *its container's* size, not the viewport — the right tool for reusable components in varying contexts (sidebars, grids).
- **Adaptive vs responsive:** responsive = continuously fluid; adaptive = discrete layouts snapped to breakpoints. Most modern products blend both.
- **Viewport widths to test:** 320 (small phone / WCAG reflow floor), 360–414 (typical phones), 768 (tablet portrait), 1024 (tablet landscape / small laptop), 1280–1440 (desktop), 1536+ (large desktop).

---

## 12. HCI Mathematical Laws

These predictive models turn "feel" into estimates you can design against. They are **empirical models 📐**, not spec mandates, but they are foundational and battle-tested.

- **Fitts's Law** — `MT = a + b · log₂(D/W + 1)`. Time to acquire a target grows with distance **D** and shrinks with target width **W**. Implication: make primary actions large and close; screen edges/corners are "infinitely large" (the pointer stops there) → good for menus and CTAs. The `log₂(D/W + 1)` term is the **Index of Difficulty (ID)** in bits.
- **Hick's Law** — `T = a + b · log₂(n + 1)`. Decision time grows logarithmically with the number of equally-probable choices **n**. Implication: split large menus into hierarchical tiers; reduce simultaneous options; progressive disclosure.
- **Miller's Law** — working memory holds ~**7 ± 2** items. Chunk content (phone numbers, nav groups); don't rely on it as a hard cap — it's about chunking, not a magic number.
- **Doherty Threshold** — keep system response **< 400ms** to sustain flow and productivity; below this, users work faster and engagement rises. Ties directly to INP < 200ms.
- **Jakob's Law** — users spend most time on *other* sites, so they expect yours to work the same way. Implication: honor established conventions (nav placement, icons, gestures) unless you have strong evidence to deviate.
- **Tesler's Law (Conservation of Complexity)** — every system has irreducible complexity; the only question is who absorbs it — the user or the developer. Push it to the system where possible (smart defaults, autofill).
- **Postel's / Robustness Principle (applied to UX)** — be liberal in what inputs you accept (parse messy phone/date formats), conservative in what you output.

---

## 13. Implementation Roadmap & Caveats

**5-stage roadmap:**
1. **Foundation.** DTCG token file (primitive/semantic/component); 8px spacing scale; 16px-base modular scale (1.25 app / 1.333 editorial); OKLCH neutral+accent+semantic ramp; adopt your framework's breakpoints. *Advance when:* one source generates CSS + native, zero hardcoded hex/px.
2. **Accessibility & platform.** WCAG 2.2 AA: 4.5:1 / 3:1 contrast, targets 24px→44pt(iOS)/48dp(Android), `:focus-visible` ≥2px ≥3:1, keyboard, reduced-motion, reflow@320px + 200% resize. *If native:* treat 44pt/48dp — not 24px — as the floor.
3. **Performance budget.** Field targets LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 @ p75; alert at 80% (LCP>2.0s, INP>160ms, CLS>0.08). AVIF+WebP + explicit dimensions, eager LCP image, `font-display:swap` + metric fallback + WOFF2. *If INP fails:* cut JS/long tasks before images.
4. **Motion & components.** Tokenize motion (50–1000ms, standard `cubic-bezier(0.2,0,0,1)`) with a reduced-motion scalar; specify all states per component; document in Storybook/zeroheight.
5. **Internationalization.** Vietnamese: verify Latin Extended Additional coverage, add line-height for stacked diacritics. Traditional Chinese: ship region-specific TC fonts (not pan-CJK), line-height ~1.7, subset via `unicode-range`. *If CJK market:* treat font delivery as a performance workstream.

**Caveats (mandate vs convention):**
- The 8pt grid is Material-mandated but only an Apple *convention*; "45–75 CPL" and "200–500ms optimal" are heuristics, not spec constants.
- AVIF's edge over WebP is ~10–12% (controlled tests), not dramatic; big wins are vs legacy JPEG/PNG.
- Bounce-rate/conversion claims tied to CWV come from SEO/perf vendors — directional, not exact. Audited pass-rates (77% good INP on mobile, 2025 Almanac) come from HTTP Archive/Google.
- APCA is a moving target (reverted to "Placeholder" in the 2023-06 WCAG 3.0 draft); its Lc thresholds are from APCA/ARC docs; final WCAG 3.0 role unconfirmed (~2030).
- Material 3 motion: since M3 Expressive (May 2025) springs are the documented primary system and the easing/duration tokens are the fallback — verify which your toolkit uses.
- Breakpoint values differ by framework/version — confirm against the version you deploy.

---

## 14. AI-era Design Anti-patterns

AI coding tools reliably emit two kinds of defect, and it matters which one you are fighting:

- **VIOLATION** 🔒 — an objective, testable failure against a named WCAG 2.2 / platform-HIG rule. These are gate-in-CI material.
- **TELL** 📐 — a subjective aesthetic signal that screams "machine-generated." Not a compliance failure, but it erodes brand distinctiveness and can *induce* a violation.

**Level 1 — visual & CSS defects:**

| Item | Type | Fix |
|---|---|---|
| **Nested focus rings** — `border` + `outline` + `box-shadow` stacked | VIOLATION (2.4.11/2.4.13) | one `:focus-visible` ring, ≥2px, ≥3:1 |
| **Low-contrast gray text** — `#999` on `#fff`; ~84% of home pages (WebAIM Million) | VIOLATION (1.4.3) | ≥4.5:1 (3:1 large/UI) |
| **Gratuitous animation** — everything animates, ignores reduced-motion; incl. typewriter heroes, particle fields, cursor trails | VIOLATION (2.3.3) | animate for meaning; honor `prefers-reduced-motion` |
| **Emoji as icons** — 🚀🔥 as controls; render + SR-name vary | VIOLATION (1.1.1) | inline SVG + a real label |
| **Placeholder-as-label** — hint disappears on input | VIOLATION (3.3.2/4.1.2) | persistent associated `<label>` |
| **Halo / glow overuse** — stacked colored shadows | TELL | neutral elevation scale, one light source |
| **Purple→violet gradient** — `#667eea → #764ba2` indigo default | TELL | brand tokens (Tailwind's creator publicly apologized in 2025 for the indigo-500 default "leading to every AI generated UI on earth also being indigo") |
| **Glassmorphism everywhere** — `backdrop-filter` spam, dynamic-contrast fails, GPU cost | TELL | 2–3 glass surfaces + a scrim, never by default (platform-native material like Apple's Liquid Glass is HIG-governed — decorative CSS glass is not) |
| **Arbitrary spacing / over-rounding** — `mt-[13px]`, mixed radii | TELL | token scales |
| **Pure `#000`/`#fff` dark mode** — halation for astigmatism | TELL | `#121212` surface + `#E4E4E7` text |
| **Default-font monoculture** — reflex Inter/Roboto/Space Grotesk stack, no pairing strategy | TELL | a deliberate typeface pairing tied to the brand (§3) |
| **Gradient-text headline** — `background-clip: text` over a gradient | TELL | solid ink / brand token — gradient text has no single computable contrast, so 1.4.3 can silently fail |
| **Stock-AI imagery** — plastic over-symmetric illustrations, 3D gradient blobs, impossibly-lit fake team photos | TELL | real product shots or a deliberate illustration system |
| **Dead controls** — `href="#"` links, CTAs wired to nothing | TELL | every control does what it says, or ship it disabled with a reason |

**Level 2 — UX & product diseases:**

- **Inaccessible by default** 🔒 — `<div onClick>` instead of `<button>`, no ARIA/keyboard → semantic HTML (4.1.2).
- **AI slop / sameness** 📐 — the template skeleton: centered hero + uniform rounded card grid + logo bar + testimonial carousel + bento-by-default, the shadcn/Tailwind default look, dark-glow "premium" theme as a reflex. Apply the "logo-removed test": is it mistakable for a competitor? → build a brand system first; dark mode is a theme, not a default.
- **Chatbot shoehorning** 📐 — chat bolted where direct manipulation is faster → task UI; chat only to help formulate intent.
- **AI feature bolt-on** 📐 — ✨ buttons as marketing → gate on user-need × AI-strength (Google PAIR).
- **Over-automation / lost control** 🔒 — no undo/oversight, automation bias → human-in-the-loop, global controls (MS HAX, HIG).
- **Dark patterns, unprompted** 🔒 — fake urgency / hidden costs; 55.8% of 1K LLM-generated e-commerce components contained at least one deceptive design (arXiv 2502.13499 v2, "Deception at Scale", 2026) → audit + prohibit.
- **Hallucinated content shipped** 📐 — lorem ipsum, fabricated stats/terms, invented testimonials or "trusted by" customer logos → never ship placeholder or fabricated social proof; fact-check.
- **No AI transparency** 🔒 — no disclosure / confidence / verify path → label AI, show sources + undo (HIG, PAIR, MS G11).

**Remediation (three layers):**
1. **Gate VIOLATIONs in CI** — automated checks for contrast (1.4.3), focus (2.4.7/2.4.11), labels (3.3.2/4.1.2), reduced-motion and semantic roles, build-breaking. Tools catch only ~57% of issues, so add a manual keyboard + screen-reader pass. *(This is exactly what `@norma/design-lint` does — see the repo.)*
2. **Systematize inputs** — feed agents a 3-tier token file plus rule files (`AGENTS.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`) mandating semantic HTML, one focus ring, token-only color/spacing, and explicit anti-defaults ("no indigo gradients, no Inter-only, no arbitrary px, no glass by default").
3. **Govern the product layer** — justify each AI feature (user-need × AI-strength); require disclosure + confidence + undo/oversight; audit commerce/forms against a dark-pattern taxonomy; ban fabricated content.

---

## Sources (authoritative primary sources)

- **W3C WCAG 2.2** — Recommendation 2023-10-05, updated 2024-12-12; ISO/IEC 40500:2025 · https://www.w3.org/TR/WCAG22/
- **W3C Design Tokens Format Module** (DTCG), v2025.10 (stable) · https://www.designtokens.org/TR/2025.10/format/
- **Apple Human Interface Guidelines** · https://developer.apple.com/design/human-interface-guidelines/
- **Google Material Design 3** · https://m3.material.io/ · Motion tokens: material-components-android (GitHub) `docs/theming/Motion.md`
- **web.dev / Chrome — Core Web Vitals & INP** · https://web.dev/articles/vitals · "INP becomes a Core Web Vital on March 12" (2024-01-31)
- **HTTP Archive Web Almanac 2025 — Performance** · https://almanac.httparchive.org/en/2025/performance
- **OKLCH / OKLab** — Björn Ottosson (2020) · https://bottosson.github.io/posts/oklab/ · APCA: https://git.apcacontrast.com/
- **CSS Values and Units Level 4** (clamp/fluid) · https://www.w3.org/TR/css-values-4/
- **Laws of UX** (Fitts, Hick, Miller, Doherty, Jakob, Tesler) · https://lawsofux.com/

> **Note on citations:** Numeric mandates (WCAG ratios, CWV thresholds, target sizes, Material motion tokens, DTCG keys) are traceable to the primary specs above. Some figures (spacing scales, type-scale ratios, "optimal" animation ranges, characters-per-line) are widely-adopted conventions with no single canonical authority and are marked 📐 throughout.
