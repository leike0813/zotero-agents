## Why

Agents sometimes need to run a Zotero workflow as their own work rather than asking the Host Bridge to submit it to a configured backend. The current Host Bridge workflow submit path is host-owned: it selects provider settings, starts backend tasks, and may apply results back to Zotero.

This change adds a lightweight self-owned handoff path that gives the agent the raw workflow context it needs without expanding the workflow manifest protocol or adding workflow-specific host materializers.

## What Changes

- Add a read-only Host Bridge workflow agent-run endpoint that packages workflow handoff context for an agent.
- Add a `zotero-bridge workflow agent-run` CLI command that accepts explicit `--items` or `--none` selection and writes or downloads the handoff bundle.
- Include the raw workflow definition, referenced skill packages, selection context, selected files, output validation/finalization materials, workflow protocol instructions, and a short stdout instruction.
- Do not accept workflow options, provider profiles, provider backend choices, or agent engine flags for agent-run.
- Do not execute `buildRequest`, submit backend jobs, apply workflow results, or add workflow-id-specific packaging branches.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host-bridge-cli-interface`: Adds the workflow agent-run CLI and Host Bridge endpoint contract for agent-owned handoff bundles.
- `workflow-runtime`: Clarifies that agent-run uses existing workflow manifests and sequence candidate metadata as context only, without interpreting dynamic conditions or extending the workflow protocol.

## Impact

- Host Bridge workflow control and server routing gain a read-only agent-run handoff path.
- Rust CLI gains a `workflow agent-run` subcommand and output/download handling.
- Handoff bundle creation reuses existing workflow loading, selection validation, file registry, and skill package discovery.
- Documentation, wrapper skill guidance, generated Host Bridge references, and doc-sync checks are updated.
