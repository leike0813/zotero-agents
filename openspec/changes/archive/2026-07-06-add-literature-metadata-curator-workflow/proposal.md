## Why

Existing literature workflows can ingest new papers, but there is no lightweight workflow for correcting and completing metadata on one existing Zotero parent item. Zotero already has authoritative identifier lookup through `Zotero.Translate.Search`, and the new workflow preflight hook now gives us a clean place to use that local lookup before falling back to an agent search.

## What Changes

- Add a `literature-metadata-curator` workflow to the builtin literature workbench package.
- Use `hooks.preflight` to try local `Zotero.Translate.Search` lookup for parent DOI/ISBN and short-circuit directly into standard `applyResult` when the lookup is trustworthy.
- Add a lightweight `literature-metadata-search` SkillRunner skill for fallback metadata search when local lookup is unavailable or inconclusive.
- Add a parent metadata apply handler that writes bibliographic fields and creators through one Zotero save path.
- Package the workflow, skill, docs, and localization resources with the builtin content package.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-workflows`: Adds the metadata curator workflow behavior and local-preflight/fallback execution contract.
- `result-apply-handlers`: Adds parent metadata update semantics for fields and creators.

## Impact

- Builtin workflow package: new workflow files, README, locale keys, and manifest entries.
- Builtin skills: new `literature-metadata-search` skill instructions.
- Runtime-facing hook code: new `preflight`, `buildRequest`, and `applyResult` hook modules.
- Handlers: new parent metadata update helper used by workflow apply.
- Tests: focused handler, workflow hook, and packaging/loader coverage.
