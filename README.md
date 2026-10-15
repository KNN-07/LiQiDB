# LiQiDB

A responsive Arena of Valor / Lien Quan Mobile reference site built with vanilla JavaScript and Vite.

## Run

```sh
bun install
bun run dev
```

Open the URL Vite prints. Production checks:

```sh
bun test
bun run build
bun run preview
```

## Included

- All 129 source heroes with class filters, accent-insensitive search, stats, abilities, suggested builds, and lore.
- 112 equipment records, 88 arcana records, and 11 spells with search and complete record details.
- Personal S-D tier lists with automatic browser-local saving, reset confirmation, and JSON export.
- Light, dark, and system themes; responsive layouts; keyboard search shortcut `/`; native accessible detail dialogs.

Rankings are personal, not claims about the current competitive meta. No match or win-rate data is fabricated. Tier lists stay in the current browser; exporting provides a portable backup. Descriptions remain in their original Vietnamese.

## Data

`public/data` contains a pinned snapshot from `MLuc24/lien-quan-data`. See `DATA_SOURCES.md` for revision, provenance, and licensing. Images load from their original Garena hosts and require network access.

To prepare a refreshed snapshot:

```sh
bun scripts/sync-data.mjs --patch > snapshot.patch
apply_patch < snapshot.patch
bun test
bun run build
```

The refresh checks the upstream record shape before generating a patch. Review source changes before applying them.
