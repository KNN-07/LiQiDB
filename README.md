# LiQiDB

A responsive Arena of Valor / Lien Quan Mobile reference site built with vanilla JavaScript and Vite.

## Original data and credits

Built on **[MLuc24/lien-quan-data](https://github.com/MLuc24/lien-quan-data)**.
Thank you to MLuc24 and the upstream contributors for collecting and maintaining
the open hero, equipment, arcana, and spell data that powers this WebUI.
LiQiDB is an independent interface, not the original dataset or an official game site.

Game data and artwork belong to Garena / TiMi Studios. Wiki-derived text is
attributed to Arena of Valor Fandom contributors under CC BY-SA 3.0.
See [DATA_SOURCES.md](DATA_SOURCES.md) for the pinned revision, individual sources,
and licensing details. The WebUI also links the original repository in its footer.

## Publish the WebUI on GitHub Pages

This is a fully static browser app: GitHub Pages serves the built WebUI and
bundled JSON directly. No API server, database service, or API keys are needed.

1. Push this project to the `main` branch of your GitHub repository.
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Open **Actions > Deploy WebUI to GitHub Pages** and run the workflow, or
   push another commit to `main`.
5. Open the deployed URL shown by the workflow's `github-pages` environment.

The workflow installs locked dependencies, runs tests, builds `dist`, and
deploys that folder. Relative asset/data paths support both repository sites
(for example `https://your-account.github.io/LiQiDB/`) and root/custom-domain
sites without changing the build. Hash navigation keeps direct links such as
`/LiQiDB/#tier-list` compatible with Pages without a server rewrite.

Personal tier lists are saved in the visitor's browser, not a shared server.
Artwork still loads from the original Garena hosts.

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
