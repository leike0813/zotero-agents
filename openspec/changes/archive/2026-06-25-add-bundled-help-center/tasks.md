# Tasks

## 1. Help Docs Build Script

- [x] Add `scripts/build-help-docs.ts`.
- [x] Discover all Docusaurus docs locales from `site/i18n`.
- [x] Strip frontmatter and convert Docusaurus admonitions.
- [x] Rewrite internal doc links to bundled help navigation anchors.
- [x] Rewrite image links to packaged chrome asset URLs.
- [x] Emit safe generated figure blocks for standalone images.
- [x] Copy only referenced images.
- [x] Compress raster images with `sharp`.
- [x] Generate and validate `manifest.json`.

## 2. Package Scripts and Dependencies

- [x] Add `sharp` as a dev dependency.
- [x] Add `npm run build:help-docs`.
- [x] Add `npm run check:help-docs`.
- [x] Run help-doc generation before `zotero-plugin build`.

## 3. Help Center Runtime

- [x] Add the bundled help center chrome page.
- [x] Load manifest/docs from `addon/content/help-docs`.
- [x] Render documents through the shared Markdown renderer.
- [x] Add locale selection and locale fallback.
- [x] Keep sidebar and document pane independently scrollable.
- [x] Apply Docusaurus-like image sizing and captions.
- [x] Localize help-center shell labels for bundled locales.

## 4. Host Integration

- [x] Add `openHelpCenterTab`.
- [x] Install a narrow bridge for Online Docs and external links.
- [x] Write the bridge to both frame window and `wrappedJSObject`.
- [x] Add retry installation after frame load.
- [x] Route Online Docs through the centralized docs URL helper.

## 5. Entry Points

- [x] Add Help and Online Docs buttons to the Dashboard/Synthesis toolbar.
- [x] Add Help and Online Docs text buttons to the preferences About section.
- [x] Keep legacy `open-docs` workspace action as an Online Docs alias.

## 6. Online Docs Routing

- [x] Keep debug docs routing pointed at local Docusaurus.
- [x] Route production Online Docs to GitHub Pages.
- [x] Remove Gitee Pages from runtime docs URL selection.

## 7. Validation

- [x] Update targeted URL, toolbar, and bundled-help tests.
- [x] Run `npm run build:help-docs`.
- [x] Run `npm run check:help-docs`.
- [x] Run targeted core tests.
- [x] Run `npm run check:localization-governance`.
- [x] Run `npm run build`.
