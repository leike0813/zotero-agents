# Pi Turn Preparation

## Purpose

Prepare bounded, reconstructible context before Built-in Pi model invocations, with durable provenance and safe compaction of canonical owner history.

## Requirements

### Requirement: Each invocation reconstructs a deterministic context

Preparation SHALL consume a frozen Pi turn selection, Gateway catalog, trusted resource snapshots, and one canonical transcript revision and active leaf. It SHALL select only committed active-path history, preserve roles and complete tool pairs, and assemble instructions in stable order with exact-text deduplication. It SHALL reject structurally incomplete history without replaying execution.

#### Scenario: Continuation after a committed tool result
- **WHEN** a turn continues after a complete tool call and durable result on its active path
- **THEN** the next invocation contains that pair once, using the same frozen turn facts

#### Scenario: Incomplete work is encountered
- **WHEN** the selected path has partial assistant content, unresolved permission or interaction, or an uncertain tool effect
- **THEN** preparation fails with a structured state/recovery code before Provider invocation

### Requirement: Resource admission retains source and trust boundaries

Preparation SHALL accept instructions only from registered canonical Managed Agent Workspace control snapshots and explicit global or owner facts. It SHALL expose Skill metadata before lazy content, explicit bounded Zotero selection manifests and opaque attachment references, and authorized user file paths without reading or copying bodies. External Workspace content SHALL NOT become control instructions. Tool descriptions and schemas SHALL come from the frozen Gateway catalog.

#### Scenario: External workspace has an AGENTS file
- **WHEN** an external execution workspace contains an AGENTS.md file
- **THEN** it does not enter the instruction blocks or their provenance

#### Scenario: User supplies a file
- **WHEN** a user authorizes a file path for the turn
- **THEN** the path may be presented as context while durable provenance keeps only its opaque path reference

### Requirement: Budget admission fails closed

Preparation SHALL calculate the effective context window from the smallest declared model, provider and resource limits, then subtract the frozen output reserve and adapter safety margin. It SHALL use a named versioned provider-aligned estimator, reject unknown or nonpositive context limits, and reject unsupported tool or modality requirements. A native Codex selection whose official discovery omits an output ceiling MAY reserve output within the known context without inferring a separate ceiling; other provider selections SHALL require a known positive output ceiling. It SHALL never silently truncate mandatory context or historical units.

#### Scenario: Mandatory input exceeds the budget
- **WHEN** mandatory instructions, current input, or tool schema cannot fit even without compactable history
- **THEN** preparation fails with `context_budget_exceeded`

#### Scenario: History makes the request too large
- **WHEN** projected input exceeds the budget and the selected path has a safe compaction boundary
- **THEN** automatic compaction is planned before a normal Provider invocation

#### Scenario: Codex discovery omits a separate output ceiling
- **WHEN** the frozen native Codex selection has known context and an unknown output ceiling
- **THEN** preparation admits only an output reserve and safety margin that leave positive input budget within that context

### Requirement: Automatic and manual compaction use one safe plan

Compaction SHALL run only at a durable revision and active leaf with no unsettled tool, permission, interaction or unknown effect. Automatic compaction SHALL trigger on an over-budget full projection; manual compaction SHALL use the same planner and validator. Retained history SHALL consist of complete semantic units, with a versioned 20k-token target and no fixed message-count cut. A summary SHALL cover required goals, decisions, work, refs, effects and unresolved state; its range, digest and retained refs SHALL be validated before a compare-and-swap commit. Failure or stale CAS SHALL preserve the old selection.

#### Scenario: Summary commit loses the race
- **WHEN** transcript revision or active leaf changes before compaction commit
- **THEN** preparation reports stale input and the previous selected path remains active

#### Scenario: Manual compaction is requested
- **WHEN** the owner is idle at a safe boundary
- **THEN** the same summary schema and CAS validation apply as for automatic compaction

### Requirement: Every Provider invocation has bounded durable preparation evidence

Preparation SHALL append a versioned record before either an ordinary model request or a compaction summary request. The record SHALL identify owner, turn and invocation, transcript revision and leaf, ordered source refs and digests, tool and capability identity, nonsecret model identity, estimator and budget versions/statistics, schema versions and prepared-context digest. It SHALL omit credentials, headers, body copies, executable objects and absolute user paths. If evidence cannot commit, the Provider request SHALL NOT start. If the canonical append advances transcript revision or leaf, later records and compaction CAS SHALL use the resulting durable basis.

#### Scenario: Preparation record append fails
- **WHEN** the durable record callback rejects
- **THEN** neither normal model invocation nor compaction summarization starts

#### Scenario: Identical reconstruction
- **WHEN** the same immutable facts and canonical revision are prepared again with compatible versions
- **THEN** block order, stable-prefix identity and context digest remain identical
