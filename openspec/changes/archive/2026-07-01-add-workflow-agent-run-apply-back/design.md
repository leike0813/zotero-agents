# Design

## Agent-Run Lifecycle

`workflow agent-run` creates a lightweight Host-managed handoff record. The
record stores `agentRunId`, workflow id, explicit selection snapshot, prepared
requests, per-request namespace, timestamps, expiry, and apply outcome. It does
not store transcript or long-running task state and is not listed as an active
run.

Handoff executes workflow request preparation for context only. It may call
`buildRequest` or compile declarative requests, but it must not inject scoped
Host Bridge credentials, choose an agent engine, dispatch backend work, or run
`applyResult`.

## Apply-Back

Apply-back targets `agentRunId` and one or more `agentRequestId` results. Each
result references a local SkillRunner-style bundle path. The Host validates
that the record exists, is not expired, is not consumed, that all request ids
belong to the record, and that each bundle matches the expected namespace and
contains a valid result.

Before approval, Host Bridge recalculates current apply readiness from the
stored selection. The preview returned during handoff is informational only. If
current readiness is not allowed, apply-back fails without consuming the record.

After Zotero-side approval succeeds and before calling `applyResult`, the
record is sealed. Sealed records cannot be applied again, even when `applyResult`
fails after side effects may have started.

## Bundle Contract

Agents finalize output with the vendored SkillRunner-compatible
output-contract Python toolkit bundled from Zotero Agents assets into the
handoff. The toolkit materializes the target output schema, validates final
payloads, normalizes artifact paths, expands `x-type: "artifact-manifest"`, and
builds canonical bundle files under:

- `result/<namespace>/result.json`
- `bundle/<namespace>/manifest.json`
- `bundle/<namespace>/run_bundle.zip`

Zotero Host Bridge does not depend on Python at runtime. It performs defensive
bundle safety checks before applying: safe paths, no zip traversal, namespace
match, result JSON availability, and declared artifact existence.

## Apply Seam Reuse

The existing workflow submit path remains the canonical Host-owned execution
path. Agent-run apply-back reuses the same `executeApplyResult`,
`createWorkflowResultContext`, and feedback sidecar contracts so hook invocation
and result context semantics stay aligned.

## Out of Scope

- Remote upload/import file handles for result bundles.
- Exposing agent-run records through active task or run control endpoints.
- Replaying sequence step-level apply from agent-owned execution.
- Session repair, auth, engine resume, or output repair orchestration in the
  vendored output-contract toolkit asset.
