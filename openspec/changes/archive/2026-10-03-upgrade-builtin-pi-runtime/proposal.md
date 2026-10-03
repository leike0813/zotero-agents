# Proposal

## Why

The admitted Pi 0.84.4 integration predates the upstream 1.0.0 request/turn hooks and transcript representation. Upgrade the matched SDKs while preserving project-owned execution and obtaining fresh host admission evidence before the catalog and ChatGPT changes.

## What Changes

- Pin Pi agent-core and ai to 1.0.0; keep the existing catalog and authentication for their subsequent changes.
- Prepare each request through one adapter and stop completed assistant/tool cycles according to project waits, unknown effects and limits.
- Normalize prepared instructions, messages and tool declarations together, without persisting SDK system messages.
- Move native estimation to Pi AI and derive execution/estimator versions from the exact dependency declarations.
- Revalidate browser imports, stable behavior and the existing blocking host matrix; preserve missing and failed evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `builtin-pi-runtime-spine`: prepared request authority and project-controlled continuation.
- `pi-api-key-provider-execution`: normalized Provider input preserves prepared instructions and tools.
- `pi-turn-preparation`: complete versioned estimation covers the actual prepared input.
- `builtin-pi-provider-configuration`: frozen execution versions reflect the admitted dependencies independently of catalog revision.

## Impact

Dependency manifest/lock, existing runtime/Provider/preparation/configuration and build-version modules, their behavior tests, browser checks and existing Zotero runners. No new durable owner, UI flow, catalog source, authentication or search implementation.

Approved contracts: [core admission](https://github.com/leike0813/zotero-agents/issues/61#issuecomment-5965358656) and [implementation handoff](https://github.com/leike0813/zotero-agents/issues/68#issuecomment-5967268824). This stage does not complete C20 or authorize publication, Git commits or archival.
