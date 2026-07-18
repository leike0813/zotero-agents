## Context

The current ACP Workspace uses one shared owner-scoped runtime and exact browser
projector, but its semantic presentation does not cover
the full visible Chat/Skills contract at `dev@e5cda701`. Restoring the old
source-specific full snapshots would violate the current owner-first,
page-first, bounded-transcript architecture and managed-region DOM identity
constraints. The implementation therefore restores behavior at the strict
region DTO boundary rather than restoring the old state machines.

## Goals / Non-Goals

**Goals:**

- Make v1 the only accepted internal publication schema and remove every active
  superseded-schema reference without compatibility code.
- Represent every restored visible control through a minimal canonical region
  and route every action through one exact owner envelope.
- Keep transcript, plan, counts, permission, composer, navigation,
  presentation, services, control, and details independently publishable and
  independently rendered.
- Restore the complete Chat/Skills toolbar, banner, transcript, hint,
  permission, composer, drawer, and details behavior while preserving DOM
  identity, owner-first selection, and page-first cold loading.
- Localize all fixed visible copy and validate the result with paired
  conformance, browser behavior, replay, lint, build, help-doc, and strict
  OpenSpec gates.

**Non-Goals:**

- Do not restore panel/full/frontend snapshots, fallback projectors, legacy
  permission `source`, or source-specific browser state machines.
- Do not modify transcript/run/conversation persistence, JSONL/index formats,
  MCP service operation, preferences, external APIs, or SkillRunner transport.
- Do not make cold full-mirror or details data a prerequisite for transcript
  first paint.

## Decisions

### 1. v1 is the sole current-state protocol

The Host, runtime, children, tests, profiler, replay fixtures, and active specs
move atomically to `zotero-agents.assistant-workspace-publication.v1`. Exact
validators reject non-v1 payloads and unknown kinds,
regions, fields, or actions. Version aliases and dual-write were rejected
because every participant ships in the same plugin and compatibility would
create a second protocol authority.

### 2. Region registries are the UI contract SSOT

The publication registry declares the exact source support and managed region
for navigation, services, control, permission, plan, transcript, message
counts, composer, presentation, and details. Each kind changes only its listed
regions. Browser signatures contain only the user-visible content plus local
open/collapse state of their own region. A full chrome key was rejected because
transcript and prompting updates are the hottest path.

### 3. Details are lazy, bounded, and owner guarded

`owner-details` carries a dedicated read-only DTO. Opening Details mutates local
drawer state immediately and requests data for the canonical owner. The Host
reads bounded Chat diagnostics or Skills run detail sections without reading a
transcript page, event history, or complete session/run snapshot. Large result
JSON is read only for the drawer request. Runtime owner/epoch guards discard
late results; owner switches atomically clear details. Embedding details in
initialization was rejected because it expands steady publications and couples
transcript visibility to diagnostic I/O.

### 4. Permission review is structured at the Host boundary

Canonical permission uses `approvalKind: "acp-tool" | "zotero-write"`, bounded
summary/tool metadata, structured command/preview review, and exact backend
options. The shared mapper performs ACP/Zotero-write classification. UI actions
carry only request ID, outcome, and optional option ID; owner comes only from
the envelope. Raw JSON and legacy source strings were rejected because they
leak provider representation into the browser contract.

### 5. Domain SSOT stays behind thin adapters

Chat navigation/control/details read the session/backend managers. Skills title,
secondary label, run/backend/apply axes, attention, plan, composer, and details
read the run/task projection SSOT. Adapters project minimal DTOs and never infer
task state from transcript or presentation. Service projection contains only
ACP connection and Host Bridge; Zotero MCP remains operational but is not a
banner indicator.

### 6. Shared child restores behavior through local view state

Plain/bubble mode, drawer open/collapse state, tool-group expansion, code-copy
state, per-owner reply draft/history, and scroll anchoring remain local browser
state. Canonical display mode remains Host-owned. Owner selection closes the
drawer synchronously and publishes owner-first loading before indexed page
read or optional full-mirror hydration.

### 7. Connection, hint, and control residency are semantic contracts

A stored or restorable remote session identifies a conversation that can be
resumed; it does not prove that an ACP transport is live. Chat derives live
connection from the active runtime/adapter state and uses remote identity only
to make Connect available. Connect, Disconnect, Authenticate, and the Chat
auto-approve switch remain resident for a selected conversation, while Skills
keeps Connect, Disconnect, and Cancel Task resident for a selected run. Their
availability is expressed by disabled state.

Owner control publishes a structured semantic hint. Permission may override
that hint, but composer state does not provide a fallback hint and does not
repeat stop reasons or lifecycle tokens in the composer footer. Service LEDs
do not render raw values beside their localized labels. Banner metadata is
exact: Chat shows backend, an actual session title when present, and workspace;
Skills shows backend and workspace only. Task workflow/backend/apply axes stay
in task navigation and details.

## Risks / Trade-offs

- [Large contract migration can leave a partial superseded producer] → Exact schema and
  source-exhaustive registry tests plus zero-reference searches gate completion.
- [Restored controls can accidentally reintroduce chrome rebuilds] → Region
  signature tests lock toolbar/banner/plan/hint/composer/drawer identity across
  transcript, loading, streaming, control, and permission updates.
- [Lazy details can display stale owner data] → Clear on owner change and guard
  responses by owner identity and publication epoch before committing.
- [Eleven-locale changes can drift] → `AssistantPanelLabels` remains the SSOT
  and localization governance checks exact key parity.
- [The `dev` UI used broader snapshots] → The audit records visible semantics
  separately from obsolete transport so only user behavior is restored.

## Migration Plan

1. Add strict v1, region/action, permission/details, and DOM identity tests.
2. Migrate publication/runtime and both adapters together; remove superseded
   production branches and fixtures.
3. Add lazy owner-details and exact Host action routing.
4. Restore shared child/model/renderer/CSS behavior and labels/locales.
5. Run paired Chat/Skills replay and repository gates, then remove all active
   superseded-schema documentation references.

Repository history is the rollback mechanism. The runtime contains no
compatibility or rollback branch.

## Open Questions

None. The version, visible reference behavior, domain boundaries, and
performance constraints are fixed by the approved plan.
