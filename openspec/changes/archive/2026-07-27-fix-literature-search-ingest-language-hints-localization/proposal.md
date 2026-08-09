## Why

`literature-search-ingest` accepts `languageHints`, but its ACP runner startup
prompt omits that parameter, so the executing agent cannot reliably see the
user's language preferences. The same addition left `searchBreadth` absent
from the runner prompt, package locale catalogs, and localized documentation.

## What Changes

- Include `searchBreadth` and `languageHints` in the literature-search-ingest
  ACP runner prompt with the request parameters rendered for the agent.
- Complete title and description coverage for both parameters in every bundled
  literature-workbench package locale.
- Bring the English and localized workflow documentation into alignment and
  regenerate embedded help from the site sources.
- Add regression coverage for runner prompt rendering and package-locale
  parameter completeness.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: The literature-search-ingest runner and
  bundled parameter metadata must expose all supported search controls.
- `workflow-docs-contract-alignment`: Localized workflow documentation must
  reflect the complete literature-search-ingest parameter contract.

## Impact

Affected systems are the bundled literature-search-ingest runner, the
literature-workbench locale catalogs, localized site/help documentation, and
their focused contract tests. No public parameter names, values, or backend
protocols change.
