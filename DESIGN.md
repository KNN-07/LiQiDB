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

## 10. TierLQ reference direction (October 16, 2026)

The user explicitly replaced the previous visual direction with a detailed
reference to https://tierlq.github.io/ and its repository. This section overrides
earlier palette, typography, radius and shell rules where they differ.
Implementation remains original; source data and design reference are credited.

Runtime extraction: reference hero, spotlight and board at 1440/390, both themes,
plus source filter sheet. Evidence: `.omo/evidence/season-meta/ref-*.png`.
The source's WebGL hero uses its own gradient fallback in the QA browser.
Foregrounding the tab and dispatching real scroll events is necessary to refresh
its scroll-linked opacity before captures; stale blank frames are not references.

- Color: dark background #000, panel #0c0c0e, raised #141417, ink #f3f2ef,
  muted #a9a8ae, divider rgba(255,255,255,.12), gold #d9b56c. Light background
  #f2f1ed, panel #fff, raised #f6f5f2, ink #0b0b0c, muted #4f4e54,
  divider rgba(10,10,12,.12), gold #7f5d17. Tier S/A/B/C/D:
  #d9b56c/#b9a9ff/#86d0c3/#8ea3cc/#7a797f; light S #85611a,
  A #6a52d6, B #1d7f72, C #3e5e9e, D #6f6e74. Tier text labels carry meaning.
- Type: Lexend Exa display/navigation (weights 200–500); Be Vietnam Pro body
  (300–600), loaded with swap and system fallbacks. Display uppercase and
  letter-spaced: 89.6px at 1440, 32px phone; secondary line 30.5px desktop,
  12px phone. Section titles 32px/24px, body 15px/24px, metadata 12–13px.
  Paragraphs remain sentence case for Vietnamese readability.
- Geometry: document scroll, 1320px content cap, 56px desktop/16px phone gutters.
  Square corners and thin neutral dividers replace rounded cards/shadows.
  Controls remain at least 44px. LiQiDB's own brand and all destinations remain.
  Shared header is compact and wraps on phones; the meta toolbar owns sticky
  filtering behavior without covering focused content.
- Hero: full-width near-black cosmic gradient, centered spaced headline,
  compact season/balance dates, bordered calls to action and a four-cell
  statistical strip (2×2 on phone). Never imply decorative particles are live
  measured events. The actual data-source sample is explicitly labelled.
- Spotlight: cinematic real hero artwork, bottom/side scrim, lane selector,
  source tier/score and direct detail action. Manual lane selection is immediate;
  no automatic carousel is required to understand the content. Phone focal
  positions preserve faces: Ryoma 30%, Billow/Eland’orr 44%, other lane subjects
  62%. Selected lane labels have a persistent underline as well as a tonal wash.
- Tier board: S–D rows × five lanes on desktop, rank-label rail, square portrait
  tiles, visible secondary/manual markers. Phone shows one selected lane,
  with five accessible lane buttons; no document horizontal overflow.
  Search, class and trend controls filter source records, not personal ranks.
- Provenance: dates for season (29/09), source sample (11/10) and latest verified
  balance (15/10) are distinct. Source scores remain the original snapshot;
  no automatic post-patch promotions. Evita is explicitly not tiered by source.
- Details: existing native dialogs retain focus/Escape/scroll behavior.
  Source tiers and role-specific builds are separate from original source data;
  counter reasoning cites both skill records and the latest patch context.
  Phone catalog titles use 20px body type in sentence case so long rune names
  retain their full modifiers without excessive display-heading wrapping.
  All original features and personal storage/export keys survive the redesign.
- Motion: retain Anime.js interruptible entry/reduced-motion contract. Use the
  source ease cubic-bezier(.22,.8,.18,1), 400ms controls, 480ms arrivals.
  No mandatory looping background, scroll hijacking, or reduced-motion movement.
- Accessibility: preserve all visible labels, Font Awesome decorative SVGs,
  keyboard focus, readable paragraph case and minimum touch targets. Reference
  design is adapted to LiQiDB's richer navigation, not copied as a flat image.

## 11. Revisioned wiki and matchup detail

The existing source-inspired tokens and native dialog remain the contract.
Additional encyclopedia content uses sentence-case body text, square neutral
dividers, 24px section titles and 16/24px gaps. No new motion or palette.

- Wiki details: a named section with source revision/edit/import dates and a
  permanent community-source warning. Native disclosures separate skills,
  profile, lore relationships and recommendations; skills open initially.
  Skill tables become stacked labelled rows on phones rather than document
  horizontal scrolling. Raw HTML is never inserted from the source.
- Source differences: the original Garena records stay separate. Wiki edit
  dates do not imply post-patch correctness; dated official patch context stays
  visible. Lore relationships are explicitly not gameplay counter-picks.
- Matchup groups: separate incoming and outgoing directions, real opponent
  actions, and explicit empty states. An opponent button opens that hero;
  reasons, conditions and counterplay are available in native disclosures.
- Score: a compact textual ordinal N/5 badge with a named editorial anchor,
  scenario and confidence. No percentage, progress bar or count-derived grade.
  Unresolved causal interactions are unranked and separated from recommendations.
  Every score exposes its justification and why the next anchor is unsupported.

## 12. Mechanics graph

Reuse the existing square counter cards, labelled selects, native disclosures,
dialog and neutral dividers; add no palette or motion rules. The counter view
offers "Phân tích đã đối chiếu" and "Đồ thị cơ chế" as a labelled source selector.
Graph controls select the responding hero, opponent and evidence status.
Results render twelve cards at a time, never the complete matrix as DOM.

- States use visible text: reviewed, automatically inferred, unknown, and
  changed/missing source. Generated candidates never inherit reviewed confidence.
- A compact graph card names both directions, the interaction-level ordinal
  anchor and whether opposing evidence exists. Counts describe coverage only.
- The existing dialog opens the full path from each hero's cited skill through
  a named rule, conditions, cost, counterplay and exclusions. Opposing paths have
  a separate heading, not a hidden subtraction or win-rate calculation.
- Hero dialogs retain reviewed incoming/outgoing lists, then a native disclosure
  of generated incoming/outgoing candidates. Six compact candidates per direction
  are visible when opened, with the rest in a nested native disclosure.
- Unknown lookup offers the source gap and any opposing evidence; it never says
  neutral or 0/5. Both Flowborn forms retain their role labels in every selector.

## 13. Team draft advisor

- Dedicated top-level "Cấm chọn" navigation tab at `#draft`, separate from
  "Khắc chế" and its reviewed/graph selector. Two five-slot team panels,
  labelled native selects, portraits, class summaries and removable ban chips.
  Desktop panels sit side by side; phone panels stack in document flow.
- Reuse panel/raised/line/accent tokens, square controls, 16/24/32px spacing,
  44px minimum targets and sentence-case body labels. No new animation.
- Score summary separates a signed draft heuristic from coverage. Pair grades
  remain ordinal 1–5; the aggregate index is not a win probability. Reviewed
  direction weight 1, inferred direction weight 0.5; unknown contributes no
  evidence and remains visibly unknown. Explain the formula in a disclosure.
- Recommendations show available picks against enemies and bans against allies,
  separate benefit/risk directions, evidence links, and explicit empty states.
  A reviewed-only toggle changes scoring immediately. Search/class filtering
  affects recommendations, never removes selected team members.
- Selection, replacement, removal and reset recalculate immediately without
  entrance motion, restore focus, and announce a concise score status.
  Duplicate heroes and alternate forms cannot occupy multiple draft positions.
  Draft survives navigation within this page session, not browser reload.
- Multi-target recommendations name favorable enemy targets and adverse targets
  before details. Breadth is a separate count, not an inflated mechanics grade.
  Existing neutral panels and text labels carry the distinction, never color alone.
- Professional history is separate from mechanics: show games/wins, selected year,
  actual same-game opponent pairs, recorded player names and source match links.
  A native disclosure holds pair samples and missing-data limits. A labelled year
  select defaults to the newest observed year; "all history" never implies current
  patch strength. Historical results are observational, not causal counter proof.
