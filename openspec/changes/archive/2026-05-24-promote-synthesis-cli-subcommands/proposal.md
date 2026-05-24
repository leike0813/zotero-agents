## Why

Topic synthesis skills currently call Synthesis host capabilities through the
generic `zotero-bridge call synthesis.*` diagnostic interface. That makes the
agent-facing command surface look machine-oriented and weakens the CLI contract
that agents should follow during normal runs.

## What Changes

- Add first-class `zotero-bridge synthesis <subcommand>` commands for all
  registered Synthesis capabilities.
- Keep `call <capability>` available as an advanced diagnostic path, not the
  recommended Synthesis workflow surface.
- Update Host Bridge CLI documentation, run workspace guidance, injected prompt
  text, and built-in topic synthesis skill instructions to use the new
  `synthesis` subcommands.
- Preserve existing JSON output, profile, token, approval, and error contracts.

## Capabilities

### New Capabilities

- `host-bridge-cli-synthesis-subcommands`: The Host Bridge CLI exposes
  Synthesis capabilities through stable semantic subcommands for agent-facing
  workflows.

### Modified Capabilities

- None.

## Impact

- Code:
  - Rust CLI argument model and command dispatch.
  - Rust CLI tests for help text and command-to-capability mapping.
- Documentation:
  - Formal Host Bridge CLI manual.
  - ACP run workspace Host Bridge CLI README template.
  - ACP Host Bridge CLI prompt template.
  - Built-in create/update topic synthesis skill instructions and gate command
    examples.
- Compatibility:
  - Existing `call <capability>` usage remains valid for diagnostics.
