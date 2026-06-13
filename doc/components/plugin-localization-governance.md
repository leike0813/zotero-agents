# Plugin Localization Governance SSOT

## Overview

This document defines localization governance for the plugin:

- locale key ownership by FTL file,
- compatibility alias policy for duplicate keys,
- runtime fallback invariants,
- validation and CI gate rules.

## Ownership Matrix

| File | Owned key scope |
|---|---|
| `addon/locale/*/addon.ftl` | runtime-facing copy (dashboard, toasts, backend display names, runtime dialogs) |
| `addon/locale/*/preferences.ftl` | preferences pane controls and status text |
| `workflows*/**/locales/*.json` or `workflow.json#i18n` | workflow-owned labels, task-name templates, and parameter title/description copy |
| `workflow.json#display` | workflow-owned core status and emoji display metadata |

Rule: a key belongs to one owner file. Cross-file duplicates are forbidden unless explicitly allowlisted for migration compatibility.

Workflow packages are not governed by plugin Fluent key parity. Their localized display copy ships with the workflow package and is resolved through the workflow display projection, while raw manifest strings remain the fallback contract.

Workflow emoji prefixes and core status are manifest-owned display metadata. Plugin Fluent resources only provide fixed shell copy such as the Dashboard Core badge label.

## Compatibility Alias Policy

- Default: no duplicate keys across owner files.
- Migration compatibility may keep short-lived duplicates behind explicit allowlist.
- Alias must be removed in follow-up cleanup once call sites are migrated.

## Runtime Fallback Invariants

1. Unresolved locale value detection is centralized:
   - empty string,
   - raw key echo,
   - prefixed id echo (`<addonRef>-<key>`).
2. Managed local backend display-name fallback is centralized:
   - `local-skillrunner-backend` resolves through one path.
3. Runtime toast fallback is locale-aware:
   - `zh*` locale uses Chinese fallback text,
   - otherwise uses English fallback text.
4. Module-local fixed-language fallback is disallowed for managed local backend display/toast paths.

## Validation Rules

Governance validator must enforce:

- key parity for `en-US`, `zh-CN`, `ja-JP`, and `fr-FR` for `addon.ftl`, `preferences.ftl`.
- required keys existence:
  - `backend-display-local-skillrunner`
  - `skillrunner-local-runtime-toast-up`
  - `skillrunner-local-runtime-toast-down`
  - `skillrunner-local-runtime-toast-abnormal-stop`
  - local-runtime action working keys (`deploy/start/stop/uninstall`)
  - local-runtime user-visible stage-message keys used by preferences status renderer
- cross-file duplicate keys limited to explicit allowlist.
- managed local backend display/toast code path wired to shared helper.

## CI Gate Policy

- Governance validator runs before suite execution in `scripts/run-ci-gate.ts`.
- Any governance violation is blocking.
