# LiQiDB Design System

## 0. Research Log
- Embedded shortlist: PlayStation, Spotify, Runway. Picked taste-skill + PlayStation for image-led browsing, quiet chrome, restrained media depth. Adapted to fantasy encyclopedia rather than copying brand tokens.
- Source research: actual Garena hero portraits and splash art define the visual character.
- StyleGallery: intrinsic grid and document-scroll composition; body owns scroll, header is sticky, detail dialog owns its bounded scroll.
- Lazyweb anonymous endpoint reachable; supplemental screens are not a fidelity contract.
- Concept direction: editorial field guide, dark ink and parchment-gold. No generated artwork shipped; authentic source artwork is more useful for identifying heroes.

## 1. Atmosphere & Identity
An illustrated field guide to Athanor. Deep navy, warm gold, generous display type and hero artwork contrast with compact reference tools. Signature: wide cinematic artwork above a precise portrait gallery. Informational accuracy beats marketing claims.

## 2. Color
CSS tokens: background #0d111a, panel #151b27, raised #1d2634, ink #eef0f4, muted #a8b1c0, line #2a3444, accent #e8c68a, accent ink #241c10. Light swaps background #f4f2ed, panel #ffffff, raised #e9e6df, ink #18212d, muted #566170, line #d7d5cf, accent #886024, accent ink #ffffff. Art scrims use #0d111a at 0/.2/.85. Tier labels use neutral raised surfaces and text labels, not color alone. Focus uses accent outline.

## 3. Typography
Primary Arial/Helvetica sans-serif; editorial display Georgia serif. Display 64px desktop/40px phone, page title 36/28px, section 24px, card 18px, body 16px, metadata 14px, eyebrow 12px. Display line height 1.06; body 1.6. No proprietary fonts, no network font blocking.

## 4. Spacing & Layout
4px base: 4/8/12/16/20/24/32/40/48/64/80. Content cap 1328px, desktop gutters 56px, mobile 20px. Document scroll; sticky header. Gallery 6 columns desktop, 4 tablet, 2 phone. Mobile card grid is a deliberate compact visual index; descriptions and detail content use one column. No horizontal primary-content scrolling.

## 5. Components
- Header: brand home link, navigation, theme select; wraps into two rows on phones. Active uses tonal wash and aria-current.
- Button: primary gold, secondary tonal, ghost text. Min-height 44px, 8px radius. Hover tonal change, pressed opacity, focus-visible outline.
- Search and select: visible labels, panel fill, neutral border, 44px hit target.
- Hero card: semantic button, 4:5 art frame, bottom scrim, title and class. Hover image scale 1.03; focus ring. Grid uses consistent image dimensions.
- Reference card: image, name, descriptive text, source details; clicking opens detail dialog.
- Detail dialog: native dialog, labelled title, close button, focus restored, Escape supported; hero image, stats, skills, build, lore, source links. One dialog only.
- Tier row: rank label and wrapping heroes; each hero has labelled rank select. Unranked pool and ranked rows share card primitive. Local persistence and export, explicit empty states.
- Empty state: title, reason and clear-filter action.

## 6. Motion & Interaction
150ms opacity/transform feedback. No automatic looping animation. Reduced motion disables scale. Inputs respond synchronously. Tier change is immediately reflected in rows and stored locally.

## 7. Depth & Surface
Mixed strategy: quiet neutral dividers, tonal panels, restrained media shadows. Radius 8 controls, 12 cards, 16 hero/dialog, pill badges. Layers: base 0, header 10, native dialog top layer.

## 8. Accessibility Constraints & Accepted Debt
AA text contrast target, visible keyboard focus, named fields, semantic landmarks, native dialog keyboard behavior, labelled tier controls. System/light/dark theme choices. No accepted functional debt. Source imagery is hosted externally and subject to upstream availability; text and data are bundled locally.
