# AOV data snapshot

## Provenance

### Local recrawl on October 16, 2026

The current shipped data is a fresh local crawl, not byte-for-byte content from
the immutable snapshot below. The unchanged upstream crawler at commit
`c92526a134b434ca3f40936e393deb86f90dffc2` ran its full `npm run data` pipeline
against Garena and both Fandom APIs in an isolated checkout. All stages succeeded.
`meta.refresh` records this distinction, the crawler revision, completion time
and source URLs; `meta.commit` identifies the base/crawler revision, not a new
upstream data commit. The upstream main branch still had the October 12 snapshot
when checked.

The recrawl contains 130 heroes (added Evita), 112 items, 88 runes and 9 spells.
Eight existing hero records changed. Two seasonal spells disappeared from the
official list: Lá chắn sinh mệnh and Tụ bảo bồn. All existing source lore paragraphs
are unchanged; Evita has no source lore, so the 79 Vietnamese translations retain
their existing source revision and exact paragraph coverage.

A fresh crawl does not guarantee that the source CMS reflects the latest game
balance. For example, Taara's hero page and the February 5, 2026 balance note
describe different healing numbers. Counter-pick explanations therefore use
qualitative mechanics, not unsupported current percentages or win rates.

### Original immutable snapshot

The complete records in `public/data/heroes.json`, `items.json`, `runes.json`,
`spells.json`, and `crawl-info.json` come from MLuc24's
`https://github.com/MLuc24/lien-quan-data`, branch `main`, pinned to commit
`c92526a134b434ca3f40936e393deb86f90dffc2`.

Downloads use the immutable template:

```text
https://raw.githubusercontent.com/MLuc24/lien-quan-data/<commit>/data/<name>.json
```

The initial snapshot contains 129 heroes, 112 items, 88 runes (arcana), and
11 spells. `public/data/meta.json` is generated locally, recording the commit,
counts, and complete upstream crawl metadata. `snapshotDate` is the latest
upstream `crawledAt`, not the download date: `2026-10-12T08:10:03.376Z`.
The Vietnamese wiki crawl is `2026-10-12T08:10:02.358Z`.

Records and their nested fields are retained without renaming, flattening, or
invented rankings, win rates, or statistics. JSON files end in a newline.
The metadata JSON is authoritative after refresh; these initial counts describe
the original snapshot.

## Actual schema

All four collections are arrays with unique `slug` and display `name`.
Heroes have `title`, Vietnamese `classes`, `lane`, `faction`, `portrait`,
`skills`, `skins`, `stats`, `profile`, `lore`, `trivia`, `build`,
`balanceHistory`, and `sources`, among other upstream fields.

For example, Airi has `slug: "airi"`, `title: "Ninja rồng"`,
`classes: ["Sát thủ"]`, `goldCost: "18888"` and `voucherCost: "1199"`.
Prices here are strings. Hero `stats` is an array of `{ id, label, value }`
objects whose values are strings, not normalized numeric ratings.
`lore` is an array, not a single string.

The actual top-level hero image field is `portrait`, not `image` or `thumb`.
Each skin has `splash` and `thumb`; all 129 initial heroes have a first-skin
splash. `getArtwork` selects `skins[0].splash`, then `skins[0].thumb`, then
top-level `thumb`, `image`, `icon`, and `portrait`, or an empty string.
Items, runes, and spells use `icon`.

Items also have `group`, `tier`, numeric `gold`, string-array `stats` and
`passives`. Runes have `rawName`, `color`, `tier`, and string-array `stats`.
Spells have `description` and a boolean `seasonal`; seasonal spells are retained.
Upstream `searchKey` is preserved in each collection.

## Browser exports

`src/data.js` uses top-level await to fetch document-relative `./data/*.json`
snapshots and exports `heroes`, `items`, `runes`, `spells`, and `meta`.
The static build includes these files beside the WebUI, so it can be hosted
at the domain root or beneath a GitHub Pages repository path.

`public/data/lore-vi.json` is a local Vietnamese translation of the upstream
hero lore, not another upstream snapshot. It records `locale`, `sourceCommit`,
`license`, and a `heroes` object keyed by source slug. Every source paragraph
is retained as one translated paragraph. The original English lore remains
unchanged in `heroes.json` for provenance; the Vietnamese-only interface uses
the translated paragraphs. These translations retain the wiki's CC BY-SA 3.0
terms and attribution to Arena of Valor Fandom contributors.

`src/data.js` additionally exports `loreTranslation` (the translation metadata
and payload) and `loreVi` (the hero lookup). Refreshing the upstream snapshot
requires refreshing the translations too; the integrity test checks the source
commit, slug coverage, and paragraph counts.

It also exports `normalize(text)`, `filterRecords(records, query,
className = 'All')`, `roles`, and `getArtwork(hero)`. Search matches normalized
names, titles, Vietnamese classes, and their English equivalents.
Normalization strips combining accents and maps Vietnamese `đ`/`Đ` to `d`.
The class filter accepts Vietnamese or English role names and combines with
the text query. `roles` maps Assassin, Mage, Support, Warrior, Tank, and
Marksman from their Vietnamese class labels.

## Counter-pick guide

`public/data/counters.json` is original Vietnamese editorial content, separate
from the crawled collections. It records review date, directed `counter` and
`target` hero slugs, a mechanism, limitations, evidence type and per-pair URLs.
There are 132 directed pairs, covering all 130 hero/form slugs as targets.
130 are LiQiDB inferences from official ability descriptions, checked against
the September 29 baseline and October 15, 2026 balance notes. The distinct
Alice → Aleister and Thane → Grakk selections from Sforum's September 6, 2023
article are retained with their historical attribution.

Every pair includes exact hero/skill-slot/name references, an explanation of
the interaction, a limitation, qualitative role/range/damage context and URLs.
All 130 targets and all referenced skill identities are checked by tests.
Missing or implausible CMS stats are not treated as current numerical evidence.
These are conditional editorial recommendations, not measured matchup win
rates, an exhaustive matchup matrix or official Garena counter endorsements.
Dirak's CMS still combines his cannon with skill 3; the October 15 note moves
it to independent skill 4. The UI warns about that mismatch rather than
silently rewriting the source kit. Triệu Vân's new untargeted dash and the
other October 15 changes are included in the reasoning.

The browser exports `counterGuide`, `matchups` and `filterMatchups(query)`.
Search accepts either hero's name/title/class without reversing direction.
The source URLs and date are shipped with every card; official pages generally
do not state their last skill-update date.

## TierLQ seasonal reference

`public/data/season-meta.json` and `reference-builds.json` import factual
seasonal data from `https://github.com/tierlq/tierlq.github.io`, pinned at
`6a37d2310fdaf22c37d98389736a63cad253857e` (October 15, 2026 code commit).
The live `assets/data.js` matched that revision. Its SHA-256 is
`90bc5a759804e799efdca494945f4d0aa4541373c810ee5cf3acac757d5166bb`.
`assets/builds.js` SHA-256 is
`25a3d81f7e95acbbfce3fcb7d9ec09117a6fc6203183afbb89eaf2e9e51f1c92`.
The original source scripts are not shipped or run in the application.

The displayed TierLQ sample date is **October 11, 2026**, with an October 10
community ROV META component. The current Vietnam season is **2026-S4,
Vết Nứt Thời Không**, which began September 29 at 06:00 Vietnam time.
Official sources:

```text
https://lienquan.garena.vn/quy-trinh-cap-nhat-phien-ban-vet-nut-thoi-khong-29-09-2026/
https://lienquan.garena.vn/chi-tiet-ban-cap-nhat-vet-nut-thoi-khong-29-09-2026/
https://lienquan.garena.vn/dieu-chinh-giua-mua-pb-vet-nut-thoi-khong-15-10-2026/
```

The latest balance verified on October 16 is October 15. It postdates the tier
sample. Imported tiers are therefore labelled pre-balance and not recalculated
from patch direction. Eight affected heroes have a separate official patch
overlay. Original skill and stat fields remain intact.

The import contains 146 lane records for 129 local hero/form slugs, including
both Flowborn forms, with source rank, score, tier, secondary-role markers,
manual overrides and source tournament samples. Edras resolves to local slug
`11596`. Evita is absent from the tier source, so no tier is invented for her.
TierLQ cites a 214-game ĐTDV sample and a 299-game previous-season sample.
Those counts and rates are attributed source claims, not independently
verified global or ranked statistics. The composite combines Vietnamese and
Thai professional play, older samples, community and editorial/media inputs.
Actual weights are 0.4/0.15/0.12/0.2/0.1, normalized over available inputs;
low-presence Thai pro records use 0.04. Rounded displayed percentages total
99, so they are not substituted for the actual weights. Existing computed
results and manual overrides are preserved.

148 hero/lane builds include item IDs, arcana counts and spell IDs. They were
imported on October 16; the source provides no separate build verification
date. The October 11 tier sample is not a claimed build freshness date. Supplementary
catalogs contain 64 items, 21 arcana and 9 spells; they are selectable alongside
the original 112/88/9 catalogs. Every build ID resolves to its catalog.
Images point to immutable raw GitHub assets under the same commit (`b/i-*`,
`b/a-*`, `b/t-*`); no image binaries are copied into this project.

The source repo had no declared license when checked. No source application,
analytics or long skill-summary prose was copied. LiQiDB uses original DOM
components informed by measured palette, type, geometry and interactions,
with visible credit to the source site and repository. Game rights remain
with Garena / TiMi. Lexend Exa and Be Vietnam Pro load through Google Fonts
with swap and local system fallbacks; icons and Anime.js remain bundled.

## Refresh

With an `apply_patch` executable on PATH:

```sh
bun scripts/sync-data.mjs
bun scripts/sync-data.mjs c92526a134b434ca3f40936e393deb86f90dffc2
```

The default resolves `main` once to a SHA before downloading all five upstream
files from that SHA. The optional revision supports reproducible refreshes.
Downloads and schema validation finish before a patch is applied; unchanged
files are skipped. This script never writes files directly.

In agent environments that provide an `apply_patch` tool instead of an
executable, use `bun scripts/sync-data.mjs --patch [revision]` to emit the patch
on stdout and pass it to that tool. Alternatively import
`createRefreshPatch(revision)` and pass its returned `patch` to the tool when
nonempty. Metadata goes to stderr in CLI mode. Do not redirect patch output
over the snapshot JSON files.

Verify with:

```sh
bun test tests/data.test.js
```

Tests serve the real snapshots over local HTTP, exercise the browser fetch
contract, and check field preservation, metadata, unique slugs, actual image
fields, accented search, and role filters.

## Attribution and rights

MLuc24 maintains the upstream data collection. Its README and LICENSE at the
pinned commit distinguish the MIT-licensed crawler/merge code from game data.
No upstream crawler code is copied here.

Game names, statistics, images, and skill text belong to Garena / TiMi Studios.
The upstream project describes itself as an unofficial, non-commercial
reference, unaffiliated with and not endorsed by those companies.
Image URLs remain on their original hosts; image files are not rehosted here.

Wiki-derived lore, trivia, and balance history are attributed to the Arena of
Valor Fandom wiki contributors under CC BY-SA 3.0
(`https://creativecommons.org/licenses/by-sa/3.0/`). Preserve attribution and
share-alike terms when redistributing that material. Hero `sources.garena`,
`sources.fandomVi`, and `sources.fandomEn` retain the individual source pages.
Items, runes, and spells do not have per-record `sources` objects in this
snapshot; their official-site icon URLs and upstream provenance remain intact.

Pinned upstream reference files:

```text
https://github.com/MLuc24/lien-quan-data/blob/c92526a134b434ca3f40936e393deb86f90dffc2/README.md
https://github.com/MLuc24/lien-quan-data/blob/c92526a134b434ca3f40936e393deb86f90dffc2/LICENSE
https://lienquan.garena.vn/
https://arenaofvalor.fandom.com/wiki/Arena_of_Valor_Wiki
https://arenaofvalor.fandom.com/vi/wiki/Li%C3%AAn_Qu%C3%A2n_Mobile_Wiki
```
