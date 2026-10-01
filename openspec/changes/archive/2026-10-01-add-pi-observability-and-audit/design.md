# Design

## Context

Baseline: b26824f2572c6258d7fcd15fb807dcc610f143e3. C17 is archived and the worktree was clean. See proposal.md for motivation and issue #26 comments 5551328218/5551328345 for the approved contract. Current ACP append code uses bufferedWriteCoordinator; Runtime Log normalizes and sanitizes entries; Workflow archive already supports Gecko atomic ZIP. Pi owners have canonical JSONL but separate failure-code projections. Conversation workspace nests inside its private owner directory; the current quota scan incorrectly skips descendants of that owner.

## Goals / Non-Goals

Deliver the two narrow audit/export stores and canonical failure references. Process startup recovery, shared shutdown deadlines, Skill Run retention scheduling and final release matrix remain C19/C20 responsibilities. Audit cannot schedule models/tools, alter outcomes, duplicate semantic bodies or probe capabilities.

## Decisions

- Add piFailureContract as the shared type/code-policy source. A failure is recorded once in its existing owner's canonical transcript; upper propagation uses its identity. Keep legacy scalar result codes readable. failure_observed is a non-context record. A failed canonical append preserves existing recovery behavior and leaves an evidence gap.
- Extract runtimeAuditAppendQueue from the existing ACP core, keeping ACP defaults. It supports configurable pending budgets, a per-owner snapshot barrier, flush, release and discard. Barriers capture the pre-barrier batch and cannot chase an indefinitely active producer. No global lock and no policy/schema knowledge.
- PiRuntimeAudit owns record(fact), flushOwner(ownerRef), exportDiagnostics(scope,targetPath). Producer facts carry trusted owner/root/workspace context transiently; neither paths nor caller prose are persisted. Safe correlations include conversationId, skillRunId, sessionId, turnId, invocationId, callId and failureId, alongside existing Workflow identities.
- One operation-policy table controls tier, severity, origin and permitted attributes. Production retains the ten approved operations; Diagnostic adds structural boundaries; Debug requires both the build and an independent source switch, initially false. Failures persist only their reference/location in audit. Runtime Log normalization is shared without appending owner evidence to the global store.
- Resolve owner audit inside the managed workspace. Skill Run creates/reuses its existing workspace before preparation and canonically records its location. Owner storage has one NDJSON file and an independent byte/count cap. FIFO writes stay nonblocking; drops/write failures accumulate bounded gap summaries. Retention merges adjacent structural repeats, drops oldest debug then info, reduces old warning/error repeats retaining the newest, then drops oldest remaining records. Compaction atomically replaces the file at the 75% target.
- Audit participates in existing Native owner quota serialization. Correct nested-workspace measurement and include audit in totals. Business allocation can reclaim only audit via a private callback owned by the audit module; it never deletes canonical/business data. Missing quota evidence fails audit admission with a gap.
- Export captures the owner audit and Runtime Log snapshot at a barrier, then composes from detached temporary data without holding owner execution. Global reads no owner filesystem. Only correlations and fixed safe projections leave the module; arbitrary Runtime Log message/error/detail bodies are excluded. The 96 MiB uncompressed budget preserves manifest, typed failure and completeness data, trims global logs then owner evidence. Reuse Workflow archive atomic ZIP and remove temporary data on every path.
- Deleting owners reject new recording/export. Existing in-flight audit writes settle before removing the owner. A completed export snapshot can finish independently of deletion; an earlier deletion fails export. Archive retains audit. C19 later consumes the same lifecycle boundaries for retention and shutdown.
- Add export-diagnostics only to Pi action variants and registry sources. Router remains lazy; target path comes from the host save picker. Global export stays in the existing Backend Manager Built-in Agent section. Region signatures include only visible chrome changes.

## Risks / Trade-offs

- Audit filesystem failure → retain bounded gap counters; never downgrade business state.
- Mutable global logs contain semantic text → export applies a fresh allowlisted projection rather than trusting prior redaction.
- Queue or deletion races → fixed barriers and discard/in-flight completion tests.
- Different Node/Gecko ZIP implementations → separate actual-host evidence, not inferred parity.

## Migration Plan

Changes are additive to canonical history. Existing owners are read without rewriting old records or inventing historical failure IDs. ACP imports switch directly to the generic queue and the old source is removed. Verify behavior, update ADR/constraints/handoff, sync specs and archive; no commit or release.
