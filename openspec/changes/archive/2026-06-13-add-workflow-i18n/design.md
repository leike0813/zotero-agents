## Overview

Workflow i18n is implemented as a display-only projection. The loader keeps raw manifests intact, reads optional package locale JSON resources, and stores parsed i18n resources on `LoadedWorkflow`. UI code asks a shared resolver for workflow labels, task-name templates, and parameter titles/descriptions.

## Manifest Contract

- `workflow.json` may define `i18n.defaultLocale` and `i18n.messages`.
- `workflow-package.json` may define `i18n.defaultLocale` and `i18n.locales`.
- Package locale JSON uses fully-qualified keys such as `workflows.literature-analysis.label`.
- Inline workflow messages use workflow-local keys such as `label` and `parameters.language.title`.
- v1 supported keys are `label`, `taskNameTemplate`, `parameters.<key>.title`, and `parameters.<key>.description`.

## Resolution Rules

- Locale matching order is exact locale, language-only locale, default locale, raw manifest string, then id/key fallback.
- Inline workflow messages override package locale messages.
- Missing or unreadable package locale files produce loader diagnostics and do not block unrelated workflows.
- Invalid inline i18n shapes are rejected by manifest schema validation.

## Runtime Boundary

- The resolver must not mutate `workflow.manifest`.
- Workflow ids, parameter keys, request payloads, hook runtime inputs, diagnostics codes, and historical task rows remain raw/stable.
- Newly created visible labels can use the current locale, while historical labels remain unchanged.
- Plugin Fluent governance continues to cover plugin-owned UI. Workflow packages own workflow-specific display copy.
