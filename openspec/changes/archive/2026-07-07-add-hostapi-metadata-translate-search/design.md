## Context

Workflow package hooks now execute under `precompiled-host-hook`, which deliberately hides raw `Zotero` and `addon` access. The metadata curator preflight still assumes `runtime.zotero.Translate.Search`, so its fast path is unavailable in the production execution contract.

## Design

Add `hostApi.metadata.translateIdentifier(args)` as a read-only facade over Zotero `Translate.Search`. The method accepts one stable identifier at a time, runs identifier lookup without saving attachments or importing into a library, and returns a JSON-safe DTO containing translators, item count, a normalized candidate item, and diagnostics.

The workflow preflight should call this Host API method first. If it is absent, direct test or legacy runtime may still fall back to `runtime.zotero.Translate.Search`. Candidate trust remains workflow-owned: the workflow checks identifier match and core bibliographic metadata before returning `short-circuit-apply`.

`WORKFLOW_HOST_API_VERSION` remains unchanged because this capability is introduced before the current version has shipped. The new field is still part of the current v6 shape.

## Risks

- Zotero `Translate.Search` can return host-native item-like objects. The Host API implementation must convert them to plain data before returning.
- Tests that directly call preflight can mask the production precompiled-hook contract. Add `executeBuildRequests()` coverage to keep this path honest.
