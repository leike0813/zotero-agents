# pi-conversation-integration Specification

## Purpose

Provide durable multi-turn Pi Conversations through the common Assistant Workspace, preserving canonical history, controlled tool execution, explicit resources and owner lifecycle.

## Requirements

### Requirement: Conversation turn admission and execution

The system SHALL create runnable Conversations with the resolved Conversation model default, and SHALL offer Configure or Cancel when unavailable. Send SHALL durably admit user input and turn start before execution, allow at most one active turn per owner, rebuild each invocation from canonical history, freeze model/tools/resources per turn, and route tool batches and permissions through the Gateway. Interrupt SHALL cancel without queuing another prompt or accepting late output. Manual compaction SHALL use the same canonical preparation path.

#### Scenario: A second turn uses durable history

- **WHEN** a Conversation streams text, executes a tool, completes and receives another message
- **THEN** the next invocation uses the selected canonical user/assistant/tool path and exposes safe usage/control state.

#### Scenario: An active turn is interrupted

- **WHEN** Send is invoked while execution is active
- **THEN** the owner requests cancellation, retains one admitted prompt and rejects late output.

### Requirement: Explicit one-send resources

The composer SHALL capture current Zotero selection when added and revalidate on send, use a native picker for regular local files, deduplicate resources, and allow pure attachments without hidden prompt. Combined resources SHALL be limited to 20, each local snapshot to 20 MiB and total snapshots to 50 MiB. Preflight failure SHALL retain the draft and resources without admitting a turn. Successful send SHALL clear only that owner's one-send resources. Historical snapshots SHALL remain available through managed references without access to originals.

#### Scenario: A file changes after send

- **WHEN** an accepted original file changes after sending
- **THEN** later turns read the immutable owner snapshot and do not receive original path permission.

#### Scenario: One resource fails preflight

- **WHEN** any selected resource is invalid, unavailable or exceeds a bound
- **THEN** no user turn is admitted and all composer resources remain selected.

### Requirement: Conversation titles and lifecycle

Titles SHALL be asynchronously generated only with the optional auxiliary model, using minimal bounded input and a single line of at most 48 characters, with deterministic fallback and separate title usage. Manual rename SHALL win over pending automatic results. Source/owner switching and archive SHALL preserve original title ownership; deleting or stale generation SHALL reject results. Archive/restore SHALL preserve identity and files. Permanent delete SHALL require archive, enter irreversible deleting, and retain cleanup_pending on cleanup failure. Counts SHALL exclude archived/deleting owners and attention SHALL reflect unread or actionable state.

#### Scenario: Manual rename races automatic title

- **WHEN** the user renames while the auxiliary call is running
- **THEN** the late result does not replace the manual title.

#### Scenario: Archived Conversation cleanup fails

- **WHEN** permanent delete cannot complete cleanup
- **THEN** the owner remains cleanup_pending and cannot be restored or sent another prompt.

### Requirement: Conversation preserves mutation identity and renewed permission

Conversation SHALL persist trusted operation and generated source identities before mutation dispatch, keyed by owner, original source turn and call. It SHALL record the full domain receipt once and keep Gateway evidence as a reference. Approval continuation SHALL retain a renewed pending call and safe actual plan in Workspace, remain waiting without model reissue, and preserve original source identity. Permission rendering SHALL use its own stable signature and SHALL NOT rebuild unrelated transcript or chrome regions.

#### Scenario: Approval finds a changed item revision

- **WHEN** renewed preflight produces a different domain plan
- **THEN** Workspace displays the new pending plan and Conversation waits for its decision

#### Scenario: Domain outcome is unknown

- **WHEN** Broker evidence reports unknown or repair required
- **THEN** canonical history and model projection preserve bounded recovery facts without replay

### Requirement: Navigation remains bound to the original Workspace interaction

A foreground Conversation turn SHALL receive transient trusted authority for the exact Workspace host window that submitted its prompt. Before effects, that window SHALL still exist, present the relevant Pi Conversation and retain its source interaction context. Closure, document replacement, source/owner switching SHALL invalidate that interaction permanently. Permission continuation SHALL preserve the original source-window authority, even if approved elsewhere. A new submitted turn SHALL bind its own source. Authority SHALL NOT enter model schemas, catalog identity, transcript, receipts or owner persistence.

#### Scenario: Same owner is presented in two windows

- **WHEN** a turn is submitted in one window while another shows the same owner
- **THEN** navigation targets only the submitting window

#### Scenario: Original Workspace changes while awaiting approval

- **WHEN** the original document, source or owner changes before continuation
- **THEN** its navigation authority fails closed and the approval window is not substituted

#### Scenario: Later prompt is submitted elsewhere

- **WHEN** a new turn is submitted from a different Workspace window
- **THEN** navigation binds to that later source without reusing old authority

### Requirement: Conversation recovery and deletion respect process holds

Conversation prompts and manual compaction SHALL use process foreground admission. Restart SHALL reconstruct state without dispatch. Existing Workspace recovery controls SHALL support explicit evidence checks; continuation SHALL remain blocked by unresolved effects. Permanent deletion SHALL preserve files while execution or outcome holds remain and retry through lifecycle maintenance.

#### Scenario: Archived Conversation still has a live executor

- **WHEN** the user requests permanent deletion
- **THEN** the owner remains deleting/cleanup_pending and its referenced files remain until safe cleanup
