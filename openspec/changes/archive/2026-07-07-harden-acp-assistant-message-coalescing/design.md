## Context

ACP Chat and ACP Skills both project ACP `session/update` events into durable
transcript item streams. Each path owns different storage and snapshot details,
but both currently decide message boundaries inline while handling update kinds.

Real ACP streams can interleave assistant text chunks with tool progress updates.
The problematic case is a partial assistant message followed by one or more
`tool_call_update` events and then more assistant text for the same natural
message. Treating every tool update as a hard boundary creates multiple
`message:assistant` transcript items from one assistant sentence.

The fix must be backend-agnostic. ACP transcript projection must not assume that
the backend has already normalized chunks into clean assistant messages, and it
must not branch on backend names or provider-specific strings.

## Goals / Non-Goals

**Goals:**

- Define one shared ACP transcript boundary classification for ACP Chat and ACP
  Skills.
- Keep assistant text open across soft side-channel updates such as
  `tool_call_update`, usage updates, and session metadata updates.
- Preserve hard boundaries for new tool calls, user turns, plans, explicit turn
  boundaries, and terminal request/session states.
- Keep existing file-backed transcript formats and UI snapshot contracts.
- Add regression coverage for ACP Chat and ACP Skills so future changes cannot
  reintroduce `tool_call_update` message splitting.

**Non-Goals:**

- No historical JSONL rewrite or backfill for already split transcripts.
- No SkillRunner canonical row projection changes.
- No hydrate, virtualization, or render performance changes.
- No backend-specific compatibility branch for CodeBuddy, OpenCode, Kilo,
  Hermes, or any other ACP implementation.

## Decisions

### Decision 1: Share boundary classification, not transcript storage

ACP Chat and ACP Skills should share a small internal classifier that maps ACP
session update kinds to `text-continuation`, `soft-side-channel`, or
`hard-boundary`.

Alternative considered: extracting a full shared transcript writer. That would
couple two paths with different persistence, snapshot, and lifecycle contracts.
The smaller classifier removes the duplicated boundary decision while keeping
each owner in control of its own transcript item storage.

### Decision 2: `tool_call_update` is a soft side-channel

`tool_call_update` updates an existing tool region and may arrive at high
frequency while assistant text is still streaming. It should upsert or patch the
tool item, but it should not complete the active assistant or thought text item.

Alternative considered: keeping all tool-related updates as hard boundaries.
That matches older assumptions but fails real streams where tool progress and
assistant text chunks are interleaved.

### Decision 3: New `tool_call` remains a hard boundary

A new `tool_call` represents a visible tool region starting between assistant
regions. Keeping it as a hard boundary preserves the existing readable
transcript shape: assistant preamble, tool region, assistant continuation.

Alternative considered: treating all tool events as soft side-channels. That
would over-merge distinct assistant regions across a newly started tool call and
would break existing user-visible transcript expectations.

### Decision 4: User turns are hard boundaries

User text chunks must not append to or reopen a previous assistant message.
The shared classifier treats user message chunks as hard boundaries; each owner
can still write the user text as its own transcript item according to its local
projection rules.

Alternative considered: treating all text chunks as continuation candidates.
That is simpler, but it allows assistant messages to cross user turns when a
backend omits reliable message ids.

### Decision 5: No backend-name policy

Boundary classification is based only on ACP update semantics. Tests guard that
the shared classifier does not include backend ids, provider ids, agent family
names, command names, or product-specific strings.

Alternative considered: patching the observed backend stream shape. That would
be brittle and would leave other ACP implementations exposed to the same class
of message splitting.

## Risks / Trade-offs

- Soft side-channel classification may keep a text item open longer than before
  if a backend emits only tool updates after a partial assistant chunk.
  Mitigation: hard boundaries still complete the item, and terminal/finalization
  paths continue to close active streaming items.
- A backend could emit a semantically new assistant message after a
  `tool_call_update` without a new hard boundary or message id.
  Mitigation: this is preferable to sentence-level fragmentation; explicit
  message/content identity can be added later without changing the classifier
  contract.
- ACP Chat and ACP Skills still have separate transcript writers.
  Mitigation: tests cover both paths, and the shared classifier is the single
  source for update-kind boundary semantics.

## Migration Plan

1. Add the shared boundary classifier as an internal module.
2. Update ACP Skills so `tool_call_update` upserts the tool item without calling
   the text completion helper.
3. Update ACP Chat so `tool_call_update` patches the tool item without clearing
   active assistant or thought item ids.
4. Add behavior tests for ACP Skills and ACP Chat, plus source-level guard tests
   for backend-agnostic classification and no direct update-branch finalization.
5. Validate the OpenSpec change and focused/full transcript test suites.

Rollback is straightforward: revert this change to restore the previous inline
boundary behavior. No data migration is performed, so rollback does not require
runtime data repair.

## Open Questions

- No blocking questions remain for this change.
- Future work may add explicit message/content identity grouping if ACP
  backends expose reliable ids consistently.
