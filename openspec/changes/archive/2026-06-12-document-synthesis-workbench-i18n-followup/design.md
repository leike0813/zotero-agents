## Context

Synthesis Workbench is an iframe-based page served from
`addon/content/synthesis/index.html` and rendered by the browser bundle in
`src/synthesisWorkbenchApp.ts`. The real Zotero host in
`src/modules/synthesisWorkbenchTab.ts` owns localization because only the host
can resolve the active Zotero Fluent locale reliably. The readonly UI harness
runs outside Zotero and therefore must emulate the same envelope contract.

## Decisions

### 1. Host-owned i18n envelope

The Synthesis page accepts an optional envelope on Workbench UI payloads:

```ts
payload.i18n = {
  locale: string,
  messages: Record<SynthesisWorkbenchMessageKey, string>,
};
```

The host injects this envelope for `synthesis:init`, `synthesis:snapshot`,
`synthesis:chrome`, `synthesis:surface`, and `synthesis:surface-error`. The
page applies the envelope before rendering and strips it from snapshot data so
business DTO signatures, operation keys, and storage schemas remain unchanged.

### 2. Fixed UI only

Localization applies to fixed Workbench UI text: navigation labels, buttons,
table headers, controlled enum labels, placeholders, titles, aria labels,
status labels, and empty/loading/error UI. It does not translate user or model
content. Topic names, literature titles, topic detail prose, report markdown,
digest markdown, and free-form diagnostics are rendered as source content.

This boundary is important because the Workbench mixes UI labels and research
payloads in the same DOM tree. Rendering helpers must keep raw content paths
explicit so the DOM post-processing localization layer cannot rewrite generated
or user-provided text.

### 3. Harness compatibility layer

The readonly UI harness must keep loading the real Workspace and Synthesis
pages in iframes. Locale controls belong to the harness shell, not the real
Workbench iframe. When the developer changes locale, the harness replays the
standard Workbench initialization/surface messages with a new `payload.i18n`
envelope instead of injecting custom APIs into the Synthesis page.

The harness resolves locale text from the checked-in FTL files and falls back to
the default English Synthesis dictionary when a locale is unsupported or a key
is unavailable.

### 4. Live database reads use readonly snapshots

The harness reads real Zotero/plugin SQLite data for Synthesis surfaces, but it
must not contend with Zotero's live write activity. Readonly harness SQLite
adapters should open a stable snapshot using SQLite backup when available and
read from that snapshot. This keeps index/tags/concepts surfaces usable while
Zotero is running and preserves the readonly guarantee.

## Non-Goals

- Do not auto-translate user content, generated research content, artifacts, or
  diagnostic free text.
- Do not add locale-specific fields to Synthesis snapshot DTOs or persisted
  storage rows.
- Do not change `synthesis:action`, host command names, operation keys, workflow
  contracts, or repository schema.
- Do not make the readonly harness a separate implementation of the Workbench
  UI.

## Verification

- Synthesis UI source-level tests cover i18n envelope handling, key helpers,
  enum label helpers, and representative call sites.
- Readonly harness tests cover FTL envelope construction, locale selector
  wiring, transport-boundary injection, mocked write actions, and readonly
  SQLite snapshot reads.
- TypeScript and focused mocha tests are sufficient for this documentation
  follow-up; full localization governance may still be blocked by unrelated
  non-Synthesis locale parity gaps.
