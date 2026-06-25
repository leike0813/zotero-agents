# Design

## Shared Renderer

`addon/content/shared/markdown-renderer.js` exposes `window.ZoteroSkillsMarkdownRenderer` with:

- `renderToHtml(markdown, options)`
- `renderInto(container, markdown, options)`
- `buildOutline(root, options)`

Profiles preserve existing behavior:

- `document`: full Markdown reader with limited raw HTML.
- `preview`: Dashboard product preview compatibility.
- `transcript`: ACP/SkillRunner transcript compatibility with `breaks: true`.
- `synthesis`: document mode plus post-render hooks.
- `standaloneDigest`: self-contained deep-reading digest modal fallback.

## Reader Tab

Markdown attachment interception is gated by `markdownReaderEnabled`. The reader page requests document data from the host tab runtime, renders via the shared renderer, and offers navigation/search/copy/open-default controls.

## Standalone Exports

Synthesis standalone export and literature-deep-reading generated HTML inline the shared renderer source so exported HTML remains usable without chrome URLs or network access.
