## Why

Synthesis Workbench multilingual support was implemented across the host bridge,
browser bundle, locale files, governance checks, and the readonly UI harness.
The behavior now needs an OpenSpec follow-up so future work preserves the i18n
contract instead of treating the implementation as incidental UI cleanup.

## What Changes

- Document that Synthesis Workbench UI chrome, fixed controls, table headers,
  aria/title/placeholder text, and controlled enum labels are localized through
  the Synthesis i18n envelope.
- Document that user content and generated research content remain untranslated:
  topic text, literature titles, report markdown, digest markdown, diagnostic
  free text, and artifact payloads keep their source language.
- Document the readonly UI harness compatibility layer:
  - the harness injects the same optional `payload.i18n` envelope as the real
    Zotero host,
  - the harness shell may expose a locale selector outside the real UI iframe,
  - changing locale replays standard Workbench messages instead of modifying the
    Synthesis page code.
- Document the readonly harness database snapshot behavior used by Synthesis
  index/tags/concepts surfaces when Zotero is running.
- Keep public bridge commands, snapshot DTOs, storage schema, operation keys,
  and workflow contracts unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-tab-ui`: Adds the Synthesis Workbench i18n envelope and rendering
  requirements for localized fixed UI and controlled enum labels.
- `ui-readonly-harness`: Adds locale switching and i18n envelope injection for
  the readonly harness, plus snapshot-based SQLite reads for live Zotero data.
- `plugin-localization-governance`: Adds Synthesis Workbench key parity and
  hardcoded-UI guard requirements to localization governance.

## Impact

- Affects Synthesis Workbench host/message payload documentation and browser
  rendering expectations.
- Affects readonly UI harness behavior and tests.
- Affects localization governance expectations for `en-US`, `zh-CN`, `ja-JP`,
  and `fr-FR`.
- No new dependencies, no migration, and no breaking change to host commands,
  snapshot DTOs, or persisted data.
