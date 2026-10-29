# Proposal

## Why

ACP connection progress currently leaves the connect action available, and model catalogs lose provider identity or misparse backend identifiers. Large catalogs need searchable provider groups and durable favorites in both ACP panels.

## What Changes

- Publish connection progress immediately and share pending connection work per conversation.
- Offer OpenCode v2 first using `opencode2 acp`; retain the explicitly labeled v1 preset last without migrating saved profiles.
- Preserve provider metadata and raw model selections through normalization, caches and workflow settings.
- Share a bounded, searchable, grouped model picker with backend-scoped favorites across Chat and Skills.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-model-effort-selector`: provider identity, faithful model selection and grouped favorites picker.
- `acp-status-visual-feedback`: immediate disabled busy connect action.
- `backend-manager-ui`: versioned OpenCode presets and ordering.

## Impact

ACP runtime/model serializers, workspace composer/action contracts, plugin metadata persistence, Preact controls, shared styles, localization and related regression tests. No dependency or database schema changes.
