## Command Model

The CLI command surface is now organized by agent intent:

- `bridge`: Host Bridge health and manifest.
- `library`: Zotero library object reads. This group owns item, note, and
  bounded library page commands.
- `synthesis`: Synthesis topics, concepts, graph, indexes, resolvers,
  artifacts, insight queues, and schemas.
- `workflow`: workflow definition, description, submission, and agent-owned
  handoff.
- `run`: runtime control plane for workflow runs, active tasks, and explicit
  skill run interactions.
- `mutation`: preview and approval-gated write operations.
- `file`: broker-issued file handle downloads.
- `debug`: debug-only or dangerous diagnostics.
- `call`: raw capability diagnostics.

Legacy top-level groups are not retained as aliases. The minor version bump is
the compatibility boundary.

## Mapping Rules

The CLI maps canonical commands to existing Host Bridge contracts:

- Endpoint-backed commands keep their current endpoint path and body semantics.
- Capability-backed commands keep their current capability name and input shape.
- `mutation preview` maps to `mutation.preview`.
- `mutation apply` maps to `mutation.execute`.
- `mutation literature-ingest` builds the current `literature.ingest` operation
  payload and sends it through `mutation.execute`.
- `run skill reply|connect` always targets `skillRunId`; workflow run ids are
  never used as implicit interaction targets.

## Surface Governance

`scripts/host-bridge-surface-catalog.ts` is the canonical surface inventory.
It must list only canonical CLI commands. Governance checks require every public
non-raw Host Bridge capability to have a canonical CLI mapping or a raw-only
classification, and every semantic runtime endpoint to have a canonical CLI
mapping.

Generated documents and skills must be updated by render scripts. Manual edits
to generated output are not accepted as a complete change.

## Workflow Skill Updates

Any skill that depends on Host Bridge CLI commands is part of this change. This
includes wrapper skill documentation, topic synthesis generated skills,
literature deep-reading source/runtime, literature search ingest instructions,
and the Hermes zotero-librarian profile. Command examples and runtime argv lists
must migrate to canonical commands together with the Rust CLI.

## Release Boundary

Local validation can prove CLI/parser/surface correctness, but packaged
prebuild fingerprints are expected to become stale after the Rust CLI version
or source changes. The release pipeline is responsible for rebuilding and
publishing prebuild artifacts after this implementation lands.
