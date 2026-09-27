# Proposal

## Why

The Pi runtime and owner store have no project-owned model, credential, or default-selection configuration. W1 C03 establishes this plane before provider execution and user-facing Conversation flows use it.

## What Changes

- Normalize pinned static model metadata and a read-only, sanitized local overlay into an offline catalog.
- Store multiple profile-scoped Pi provider configurations, explicit credential references, defaults, and secret-free frozen selections.
- Store labeled credentials in versioned encrypted envelopes with redacted metadata.
- Add an independent Built-in Agent page to Backend Manager without creating Backend Profile rows or changing their persistence.

## Capabilities

### New Capabilities

- `builtin-pi-provider-configuration`: Catalog, provider configuration, credentials, and selection contract.

### Modified Capabilities

- `backend-manager-ui`: Independent Built-in Agent page and Pi-specific actions.

## Impact

Adds three project-owned Pi modules and a typed Backend Manager snapshot branch. Changes plugin preferences, Preact page, localized labels, and exact package pins. No real model call, OAuth flow, Provider registry entry, or Assistant Workspace selector is added. Follows [C03](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5520989998) as narrowed by [the Codex-only C05 decision](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5526041693).
