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
