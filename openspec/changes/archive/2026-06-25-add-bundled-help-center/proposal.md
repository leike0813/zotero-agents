# add-bundled-help-center

## Why

The migration to the `zotero-agents` repository removes Gitee Pages as a
documentation deployment option. Users in environments where GitHub Pages is
unreliable still need a documentation path that works immediately after
installing the plugin.

The plugin already has a shared Markdown renderer and a Docusaurus documentation
source tree. Packaging a compact, generated copy of the docs inside the XPI gives
users an offline-capable help center without adding an embedded HTTP server or a
new hosting dependency.

## What Changes

- Add a build script that converts Docusaurus docs into bundled Markdown and
  compressed image assets under `addon/content/help-docs`.
- Generate bundled help docs for every Docusaurus docs locale present under
  `site/i18n/*/docusaurus-plugin-content-docs/current`, plus English.
- Rewrite Docusaurus-only Markdown constructs into renderer-compatible Markdown
  or safe generated HTML:
  - strip frontmatter;
  - convert admonitions into blockquotes;
  - rewrite internal doc links to in-help navigation anchors;
  - rewrite image links to packaged chrome asset URLs;
  - emit figure blocks for standalone images so Docusaurus-like image sizing and
    captions remain available in the plugin.
- Add a bundled help center chrome page that reads the generated manifest,
  renders Markdown through the shared renderer, provides locale selection, and
  keeps navigation and reading panes independently scrollable.
- Add a host-side help center tab opener and bridge for Online Docs and external
  links.
- Add Help and Online Docs entry points to the Dashboard/Synthesis toolbar and
  preferences About section.
- Keep Online Docs pointing to GitHub Pages in production and localhost in debug
  mode; remove Gitee Pages as a runtime docs target.
- Add `sharp` as a build-time dev dependency and wire help-doc generation into
  `npm run build`.

## Non-Goals

- Do not run a plugin-internal HTTP server.
- Do not make bundled help update independently of plugin releases.
- Do not change plugin identity, addon ID, prefs prefix, or chrome namespace.
- Do not alter the existing Markdown attachment reader's file-opening behavior.

## Success Criteria

- `npm run build:help-docs` generates a valid manifest, Markdown docs, and only
  referenced image assets.
- `npm run check:help-docs` validates doc paths, internal links, image assets,
  and size budget.
- `npm run build` includes the generated help docs before XPI packaging.
- Help opens in a Zotero tab without external network access.
- Online Docs opens the configured published docs root in the system browser.
