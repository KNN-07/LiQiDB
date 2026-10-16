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
Destructive confirmation only: danger #8d3341 dark / #b02c3b light, ink #f5eded. The reset confirmation uses this semantic treatment, never the brand-gold primary action. Confirmation titles use 40px desktop/28px phone, not the display headline scale.

## 3. Typography
Primary Arial/Helvetica sans-serif; editorial display Georgia serif. Display 56px desktop/36px phone, dialog title 40px desktop/30px phone, section 24px, card 18px, body 16px desktop/17px phone, metadata 13–14px, eyebrow 12px. Balanced headings avoid Vietnamese orphan words; body uses comfortable 1.7–1.8 leading and a 65–72ch measure. Numeric stats use tabular figures. No proprietary fonts or network font blocking.

## 4. Spacing & Layout
4px base: 4/8/12/16/20/24/32/40/48/64/80. Content cap 1328px, desktop gutters 56px, mobile 20px. Document scroll; sticky header. Open native dialogs lock body scrolling; stable scrollbar gutter prevents desktop layout jumps. Gallery 6 columns desktop, 4 tablet, 2 phone. Mobile card grid is a deliberate compact visual index; descriptions and detail content use one column. No horizontal primary-content scrolling.

## 5. Components
- Header: brand home link, navigation, theme select; wraps into two rows on phones. Active uses tonal wash and aria-current.
- Button: primary gold, secondary tonal, ghost text. Min-height 44px, 8px radius. Hover tonal change, pressed opacity, focus-visible outline.
- Search and select: visible labels, panel fill, neutral border, 44px hit target.
- Hero card: semantic button, 4:5 art frame, bottom scrim, title and Vietnamese class. Hover lifts the actionable card 4px and scales its image 1.04; press returns toward the surface. Neutral shadow, no accent edge. Cards reveal once when entering the viewport after navigation, not while typing.
- Reference card: image, name, descriptive text, source details; clicking opens detail dialog.
- Detail dialog: native dialog, labelled title, close button, focus restored, Escape supported; hero image, stats, skills, build, lore, source links. One dialog only. Native starting-style/allow-discrete transitions preserve top-layer exit while close/focus state updates immediately. Record detail uses an icon/title header, compact fact grid, and full description/stat/passive sections; long lore has paragraph spacing.
- Tier row: rank label and wrapping heroes; each hero has labelled rank select. Unranked pool and ranked rows share card primitive. Local persistence and export, explicit empty states.
- Empty state: title, reason and clear-filter action.
- Counter-pick guide: a sixth Vietnamese navigation destination, "Khắc chế". Directed pair cards place the counter on the left and target on the right with an explicit arrow and labels; two columns on desktop, one on phones. Each card includes a mechanism, limitation and source links. Hero names are buttons that open existing detail dialogs. A hero detail links to its matching pairs; missing coverage says so rather than implying a complete matchup database.
- Icons: locally bundled, individually imported Font Awesome Free solid SVGs replace decorative Unicode symbols. Icons inherit currentColor, use a 1em box and are hidden from assistive technology; visible text and accessible names retain meaning. Navigation labels remain visible; the six destinations wrap into a three-column phone grid.

## 6. Motion & Interaction
User approved retaining navy/gold on October 16, 2026.

- Tokens: micro 160ms, standard 260ms, entry 480ms, stagger 32ms, easing cubic-bezier(.22,1,.36,1).
- Route arrival: intro/feature briefly rise 12px while fading; visible cards stagger by 32ms, at most six delays. IntersectionObserver triggers each card once, then disconnects it. Source mechanism: beui tabs content arrival; implemented with bundled Anime.js, including pair cards. Anime.js owns only entry opacity/translation; completed/interrupted instances revert inline styles so CSS hover/press continues working. Render, focused cards and preference changes dispose owned instances.
- Search/sort/filter changes stay immediate and do not restart entrance animations. Focus cancels a card's reveal so keyboard users never focus hidden content. Replacing a view disconnects its observer.
- Sorting and role changes restore focus to the same control after updating the results, without scrolling the page.
- Dialog: opacity and 12px translation/.985 scale on open, reverse on close. Native discrete display/overlay transitions only retain the visual top layer, not animate layout or delay application state. Mechanism informed by beui center-morph-modal's mirrored entry/exit and opacity-only reduced-motion path.
- Hover/press: actionable card lift and image scale; buttons acknowledge press with .98 scale. No loops, cursor tracking, animated blur, or scroll hijacking.
- Reduced motion: opacity-only 100ms crossfades, no spatial/scale movement or stagger; native dialog focus/Escape behavior retained. A system preference change cancels in-flight spatial animation.

## 7. Depth & Surface
Mixed strategy: quiet neutral dividers, tonal panels, restrained media shadows. Radius 8 controls, 12 hero cards, 16 reference cards, 20 feature/dialog. Card shadow: 0 16px 40px rgba(3,8,17,.18), light mode rgba(26,34,46,.1). Dialog shadow: 0 32px 100px rgba(3,8,17,.35). Sticky header has a solid fallback and a subtle blurred translucent material when supported. Layers: base 0, header 10, native dialog top layer.

## 8. Accessibility Constraints & Accepted Debt
AA text contrast target, visible keyboard focus, named fields, semantic landmarks, native dialog keyboard behavior, labelled tier controls. System/light/dark theme choices. No accepted functional debt. Source imagery is hosted externally and subject to upstream availability; text and data are bundled locally.

## 9. Vietnamese-only content
`lang=vi`; Vietnamese navigation, filters, statuses, dialogs, accessibility labels, metadata and README. Dates and numbers use vi-VN. Source proper names and machine-consumed route/storage/export keys remain stable. Local lore-vi.json translates all 79 source stories (1,041 paragraphs) under CC BY-SA 3.0 while retaining the untouched original snapshot and source attribution.
