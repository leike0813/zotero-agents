## Context

Related-items sync is an external side effect from the Citation Graph to Zotero
native related-item relations. It must not be an input to reference resolution
and must not delete user-created relations.

## Goals / Non-Goals

**Goals:**

- Make sync idempotent and bounded.
- Make echo suppression durable across crashes.
- Track whether a relation was added by Synthesis or already existed.
- Revoke only Synthesis-created relations whose current Zotero state still
  matches recorded provenance.

**Non-Goals:**

- No reuse of legacy workflow reference-matching handler as the sync source.
- No deletion of pre-existing or user-created related links.
- No rollback of Registry or Graph facts on Zotero write failure.

## Decisions

- The source of truth is matched library-to-library citation edges.
- Pending effect rows are written before Zotero IO.
- Successful adds become `added` or `already_existed`.
- Revoke attempts require Synthesis-created provenance and a current Zotero state
  check.
- Missing provenance or diverged Zotero state produces `needs_attention`.
- Startup recovery reconciles pending attempts against observed Zotero
  related-item state before retrying.

## Risks / Trade-offs

- Sync state is more verbose than recent-write markers, but it removes echo-loop
  and accidental deletion failure modes.
