## Why

Research Bundle products currently encode a single document or payload behind several nested directories. This makes file discovery and consumption unnecessarily expensive for downstream agents, while the generated README is too sparse to guide either agents or people through the product.

## What Changes

- **BREAKING** Replace the nested Research Bundle Product layout with a shallow, stable `topics/` and `papers/` layout and upgrade its manifest schema from `1.0.0` to `2.0.0`.
- Add a generated, agent-oriented README with navigation, content indexes, integrity guidance, and localized fixed prose.
- Pass a normalized workflow locale to package hooks so Product documentation can select one supported language and fall back to English.
- Preserve all existing portable metadata, analysis payloads, source material, local Markdown images, provenance, warnings, and integrity records.

## Capabilities

### New Capabilities

- `research-bundle-readable-product`: Produce a shallow, navigable, locale-aware Research Bundle Product for human and agent consumption.

### Modified Capabilities

- `research-bundle-workflow`: Change the registered Product's path and manifest contract while preserving its material set and integrity semantics.

## Impact

- `researchBundle.mjs` materialization and Markdown image relocation.
- Workflow runtime context receives a normalized locale.
- Built-in package manifest, product documentation, OpenSpec requirements, and materialization tests.
- Consumers hard-coding the v1 nested paths must read the v2 manifest and README instead.
