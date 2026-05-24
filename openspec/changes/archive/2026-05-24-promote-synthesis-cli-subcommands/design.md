## Context

The Host Bridge capability registry already exposes Synthesis as a collection of
`synthesis.*` capabilities. The Rust CLI currently has semantic first-class
commands for items, notes, workflows, tasks, and file downloads, while Synthesis
still depends on raw `call`. The topic synthesis skills are agent-facing and
should use the same semantic CLI style.

## Approach

- Add a `Synthesis` top-level CLI command with one kebab-case subcommand for
  each existing `synthesis.*` capability.
- Use a shared `--input <JSON_OR_FILE>` argument for all Synthesis subcommands.
  This keeps complex resolver, paper-ref, and export payloads in JSON rather
  than encoding them as fragile CLI flags.
- Dispatch each subcommand through the existing Host Bridge `POST /call`
  transport using the same JSON parsing and output envelope as `call`.
- Keep `call <capability>` unchanged for diagnostics and direct capability
  testing.
- Migrate all normal Synthesis examples in docs, injected run README, prompt,
  and built-in topic synthesis skill text to the new subcommands.

## Edge Cases

- `--input` omitted maps to `{}` for commands such as `list-topics`.
- Inline JSON, `@file`, existing file path, and `-` stdin retain the same
  behavior as existing `call --input`.
- Unknown or unsupported Synthesis behavior remains a Host Bridge capability
  error, not a new CLI-specific error.

## Non-goals

- Do not remove or restrict `call <capability>`.
- Do not change Host Bridge HTTP routes or capability names.
- Do not split Synthesis JSON payloads into per-command flag schemas in this
  change.
