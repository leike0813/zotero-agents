## Context

`literature-metadata-curator` has a trusted Zotero identifier fast path and a
networked agent fallback. Both paths already converge on one canonical result
and `handlers.parent.updateMetadata()`, but the result contract excludes item
type and the fallback instructions do not explicitly protect a direct-work title
from container-title substitution.

## Decisions

### Canonical item type

`metadata.itemType` is an optional Zotero type-name string. It remains separate
from `metadata.fields`, so fields stay scalar bibliographic properties and a
type correction is explicit in the contract. Both Translate Search and the
fallback skill can emit it.

### Identity and title safety

An identifier match remains sufficient when it resolves a trustworthy candidate.
Without a stable identifier, a title change or type recommendation requires the
same direct bibliographic work, normalized title agreement, at least two
independent corroborating signals, and an authoritative landing page. A book,
proceedings volume, journal issue, or other container is not the same work as a
chapter, article, or contribution.

### Atomic apply order

The handler resolves the target type through Zotero, rejects special target
types, changes a regular parent item first, then filters and applies fields for
the target type and replaces non-empty creators. One save covers all accepted
mutations. Unknown or disallowed target types are skipped so otherwise valid
metadata still applies.

## Risks and Mitigations

Zotero item-type conversion can map or remove type-incompatible fields and
creator roles. Applying the conversion before the curated metadata ensures the
result's type-specific fields are validated against the corrected type. The
skill's stricter identity rule keeps automatic conversion limited to
well-supported candidates.
