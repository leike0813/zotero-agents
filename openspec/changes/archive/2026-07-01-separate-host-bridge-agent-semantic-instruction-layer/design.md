# Design

## Layer Model

Host Bridge agent-facing artifacts are composed from two distinct sources:

- **Semantic instruction layer**: manually maintained Markdown for agent
  behavior, decision rules, safety boundaries, failure handling, and LLM/script
  responsibilities.
- **Generated surface layer**: deterministic output from the Host Bridge
  surface catalog, Rust CLI mappings, workflow manifests, and profile templates.

Semantic sources must not contain full generated command tables. Generated
surface sections must not contain long-form agent operating policy except for
small command-family payload notes already tied to the catalog.

## Source Layout

The wrapper skill semantic source lives under
`skills_src/zotero-bridge-cli/semantic/`. It owns the final wrapper skill
frontmatter, main runtime rules, reference routing, command selection model, and
Host Bridge workflow lifecycle guidance.

The Zotero Librarian profile semantic source lives under
`profiles_src/hermes/zotero-librarian/`. It owns `SOUL.md`, the profile skill
main instructions, and manually maintained profile references such as operating
principles. The existing rendered profile directory remains the publishable
output.

## Render Composition

`render-host-bridge-surface.ts` reads the wrapper semantic source and inserts
generated sections for CLI mappings and payload notes. The final
`skills_builtin/zotero-bridge-cli` package remains the source for the
host-bridge-cli-bundle publication pipeline.

`render-zotero-librarian-profile.ts` reads profile semantic sources and combines
them with generated Host Bridge and workflow catalog references. Profile
manifests, profile examples, and generated checksums continue to come from the
existing catalog and template sources.

Renderers must be idempotent: running render without changing semantic sources
or generated inputs must not produce diffs.

## Workflow Lifecycle Guidance

The semantic layer describes three workflow execution modes:

- `workflow submit`: Host-owned backend execution. It returns a
  `workflowRunId`, which is monitored and controlled through `run get`,
  `run active`, `run cancel`, and explicit `skillRunId` interactions.
- `workflow agent-run`: Agent-owned handoff. It creates an `agentRunId`,
  prepared request metadata, bundled output-contract tooling, and apply-back
  instructions. It does not dispatch backend work and is not an active run.
- `workflow agent-apply`: Apply-back for finalized local SkillRunner-compatible
  bundles. It targets `agentRunId` and maps each `agentRequestId` to a bundle
  path. It is one-shot after apply side effects begin and requires Host-side
  readiness recheck plus Zotero-side approval.

The semantic layer must explicitly state that `agentRunId` is not a
`workflowRunId`, that `agentRequestId` is not a `skillRunId`, and that agent-run
handoffs must not be registered with `run-register` or monitored by `run-watch`.

## Current-State-Only Text

Final skill/profile artifacts must describe only current valid behavior. They
must not include historical migration wording such as `legacy`, `deprecated`,
`old command`, `previous version`, or compatibility notes. Invalid inputs and
unsupported paths should be described as invalid or unsupported in the current
contract.

## Governance Checks

Profile checks scan cron YAML and other profile business logic for
`zotero-bridge` argv arrays. Commands must use canonical CLI namespaces.

Host Bridge doc sync checks scan wrapper/profile semantic and generated outputs
for stale CLI fragments, historical protocol wording, and missing generated
sections. They also verify that `workflow agent-apply` appears in generated
references when present in the surface catalog.

## Out of Scope

- Reimplementing workflow agent-run apply-back.
- Changing REST endpoints, Rust CLI command behavior, capability names, or
  workflow execution semantics.
- Replacing the output-contract toolkit. The semantic layer only explains when
  agents should use the bundled toolkit and where the authoritative handoff
  instructions live.
