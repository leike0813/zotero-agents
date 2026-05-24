## Why

Users currently need to manually fill ACP backend profile fields for common
agent tools. This is error-prone because command, args, and agent-family
metadata must be entered consistently for each tool.

## What Changes

- Add Backend Manager ACP presets for common ACP-compatible agents.
- Let users append a preset ACP profile as an editable row instead of typing
  command metadata by hand.
- Keep existing ACP profile persistence and validation behavior unchanged.
- Avoid duplicate preset rows by stable preset backend ids.

## Impact

- Affects Backend Manager UI only.
- Does not change ACP transport, runtime protocol, session state, or workflow
  execution semantics.
