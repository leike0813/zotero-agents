# Design

## Overview

The bundled help center has two parts:

1. A Node build script that transforms the Docusaurus source tree into plugin
   static assets.
2. A chrome page hosted inside Zotero that reads those assets and renders them
   with the existing shared Markdown renderer.

This keeps the runtime simple: no local web server, no Docusaurus runtime inside
Zotero, and no dependency on external docs hosting for basic help.

## Build Pipeline

`scripts/build-help-docs.ts` is the single source of truth for bundled help
generation.

Inputs:

- `site/docs/**`
- `site/i18n/*/docusaurus-plugin-content-docs/current/**`
- `site/static/img/**`
- `site/sidebars.ts`

Outputs:

- `addon/content/help-docs/manifest.json`
- `addon/content/help-docs/docs/{locale}/**/*.md`
- `addon/content/help-docs/assets/img/**`

The script discovers locales from the Docusaurus i18n directory instead of
hardcoding a locale list. English is always included from `site/docs`.

## Markdown Transform

The generated Markdown is intentionally plain enough for the shared renderer:

- Frontmatter is stripped.
- Docusaurus admonitions are converted to blockquotes.
- Internal doc links become `#doc/{id}` anchors, which the help center intercepts
  and routes without opening an external browser.
- External HTTP(S) links remain links, but the help center opens them through the
  Zotero host launcher.
- Referenced images are rewritten to packaged `chrome://zotero-skills/...`
  assets.

Standalone Markdown image syntax is converted into safe figure HTML. The figure
classes are stable (`zs-doc-figure`, `zs-doc-figure--icon`,
`zs-doc-figure--poster`) and do not depend on the compressed output extension.

## Image Compression and Sizing

Only images actually referenced by bundled docs are copied. PNG, JPEG, and WebP
assets are resized without enlargement and encoded as WebP through `sharp`.
SVG/GIF assets are preserved as-is.

Docusaurus image sizing is represented in help-center CSS:

- ordinary screenshots are constrained to the reading column;
- icon images render compactly;
- poster images render compact and centered;
- generated captions use the source alt/title text.

## Runtime UI

The help center page is a static chrome page under
`addon/content/help-center/index.html`. It:

- fetches `help-docs/manifest.json`;
- chooses the initial locale by exact match or language-prefix match against the
  Zotero/system locale;
- falls back to English when no locale matches;
- exposes a compact locale selector;
- renders a sidebar from the generated manifest sidebar;
- renders documents with `ZoteroSkillsMarkdownRenderer.renderInto`;
- keeps the navigation and document panes independently scrollable.

## Host Bridge

The help center needs host access only for opening external URLs. The host bridge
is intentionally narrow:

- `openOnlineDocs()`
- `openUrl(url)`

Because Zotero hosts plugin pages in a Firefox chrome browser context, the host
writes the bridge to both the frame window and `wrappedJSObject` when present,
then retries briefly after load. Page-side `postMessage` remains a fallback, but
the direct bridge is the primary path.

## Online Docs Routing

Runtime docs routing remains centralized in `src/utils/docsUrl.ts`:

- debug mode: `http://localhost:3000/zotero-agents/`
- production: GitHub Pages root

The bundled help center is the fallback for environments where GitHub Pages is
not reachable. Gitee Pages is not used as a docs runtime target.

## Risks

- Safe generated figure HTML depends on the document renderer profile allowing
  sanitized HTML.
- The in-page help shell message table can drift if the shell grows. Keep it
  limited to the small set of labels needed before Fluent is available.
- Full Online Docs click behavior depends on Zotero's chrome browser bridge and
  should be smoke-tested in Zotero when practical.
