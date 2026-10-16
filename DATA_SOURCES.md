# AOV data snapshot

## Provenance

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
