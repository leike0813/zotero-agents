## Context

Semantic CLI commands currently share a single Clap input struct, so
read-only queries and mutation payloads both surface as `--input`. Workflow
selection and product export use similarly ambiguous flag names. The Host
Bridge HTTP routes and capability payloads are already correct and remain the
contract below this intent layer.

## Goals / Non-Goals

**Goals:**

- Express read intent with `--query` and write/request payload intent with
  `--input` without changing JSON-or-file decoding.
- Keep compatibility aliases hidden from help and reject ambiguous duplicate
  forms.
- Keep the search and list semantics visibly distinct in both CLI and guidance.
- Keep semantic sources and generated surfaces aligned.

**Non-Goals:**

- Add separate JSON-file or JSON-stdin flags.
- Change capability names, HTTP routes, Host Bridge payload shapes, approval,
  or pagination behavior.
- Make raw `call` an alternative path for semantic commands.

## Decisions

1. Split the generic Clap argument DTO into query and input DTOs. `BridgeQueryArgs`
   exposes `--query` with hidden `--input` alias; `BridgeInputArgs` remains for
   writes and raw calls. This makes intent explicit at the parser boundary
   without changing `read_json_arg`.
2. Make item search consume a JSON query object and reuse the JSON decoder,
   then validate/map its supported `query`, `limit`, and `libraryId` fields to
   the existing `library.search_items` payload. This intentionally rejects the
   prior bare string and avoids a special parser.
3. Use named domain arguments (`--selection`, `--workflow`, `--output-dir`)
   with hidden aliases or hidden positional compatibility only where the
   proposal requires it. Clap conflict declarations reject duplicate forms and
   preserve `--none` exclusivity.
4. Update semantic source files and regenerate their rendered destinations via
   the surface renderer. The catalog retains command mappings; prose owns
   argument guidance and the restriction of raw `call` to raw-only capabilities
   or diagnostics.

## Risks / Trade-offs

- [Hidden aliases can drift from formal flags] → Parser tests cover both forms
  and duplicate rejection, while generated documentation is checked for sync.
- [Search JSON fields may diverge from the existing payload] → Mapping tests
  assert the capability payload rather than parser internals.
- [Rendered files can be manually edited] → Change only semantic sources and
  use the renderer plus its sync check.

## Migration Plan

1. Release the CLI with hidden compatibility aliases, except for the documented
   item-search bare-text query break.
2. Regenerate bundled skill, profile, and CLI guidance with canonical examples.
3. Existing agents transition to inline JSON `--query` for reads and retain
   file/stdin forms only when intentionally selected.

Rollback consists of restoring the previous CLI binary and generated surface
bundle; no data or protocol migration is needed.

## Open Questions

None.
