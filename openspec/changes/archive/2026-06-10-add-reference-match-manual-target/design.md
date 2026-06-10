# Design

## Candidate Read Model

The Workbench service owns legal target candidate construction. The frontend must
not infer the full candidate set from currently visible table rows. Review and
Index surfaces provide `registry.matchTargetCandidates` containing:

- Zotero item candidates for `zotero_binding` proposals.
- Canonical reference candidates for `canonical_merge` proposals.

Candidates are sorted client-side for display, but their stable identifiers are
the submitted payload.

## Manual Target Picker

Open proposal rows and Index review cards render a `Manual target` action. The
button opens a local popover anchored near the action. The popover contains:

- a left index of `#` and `A-Z` groups;
- a scrollable candidate list with a bounded height;
- candidate rows showing title, year, and stable ref metadata.

Candidate grouping uses ASCII first letters. Chinese and other non-Latin titles
are grouped under `#`. Opening the picker scrolls to the source title's group
when present.

## Decision Payload

Pending decisions support:

```ts
{
  proposalId: string;
  action: "manual_target";
  target:
    | { kind: "zotero_item"; libraryId: number; itemKey: string }
    | { kind: "canonical_reference"; canonicalReferenceId: string };
}
```

The existing `Apply pending` command sends mixed batches of current actions and
manual target decisions.

## Service Semantics

For `zotero_binding`, manual target validates the selected Zotero item, writes an
accepted binding, creates an accepted manual audit proposal, and marks the
original proposal `retargeted`.

For `canonical_merge`, manual target validates the selected canonical target,
writes redirects for both source and original target into the selected target,
creates two accepted manual audit proposals, and marks the original proposal
`retargeted`.

Graph deltas include all changed canonical IDs so cache refresh stays scoped.

## Readonly Harness

The harness bridge recognizes the new payload but never writes. It records a
mock action log entry with readonly reason `db-write`.
