# Design

## Threat Model

This change protects normal skill protocol boundaries, not the local filesystem
against a malicious process. The agent can submit only schema payloads through
`gate.py`; runtime commands overwrite runtime-owned files. We do not attempt to
prove that a local file was never modified outside the protocol.

## Runtime Contract

SQLite remains useful as the stage-state coordinator, but it should not become
an audit database. It only needs to answer:

- which operation is running;
- which stages have completed;
- what topic/workset context later stages need.

The runtime can still keep implementation-private tables if that is cheaper
than rewriting all helper functions at once, but tests and public contracts must
not depend on artifact hashes, action receipts, registry hashes, or transcript
files.

## Output Contract

`digest_ref` identifies a digest artifact; it does not prove freshness.
The final artifact must not embed full digest bodies. Host apply may verify that
the referenced paper has an available digest artifact, but it must not reject a
topic synthesis result because a digest hash changed.

Section and sidecar manifests need paths and content types. Hashes are optional
legacy metadata and should not be required for split runtime apply.

## Agent Boundary

The boundary is enforced by API shape and overwrite behavior:

- payload schemas define what the agent may write;
- runtime actions materialize handoffs, views, sections, sidecars, manifests,
  and final candidate;
- finalize submit overwrites any pre-existing final candidate.

No audit transcript is needed to make that boundary workable.
