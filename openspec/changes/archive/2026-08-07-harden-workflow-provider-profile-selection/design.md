# Design

Baseline commit for surface review: `78997525`.
Explicit deletion inventory: none. No existing instruction is authorized for removal.

## Resolution boundary

The CLI resolves an explicit flag before `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`.
The environment value is transported with a non-sensitive source marker for
profile validation. Host workflow settings remain read-only candidates exposed
by `POST /bridge/v2/workflows/defaults`; submit never merges them implicitly.

## Host contract

`providerProfileProvided` preserves the difference between an omitted profile
and an explicit empty object. Backend-required workflows reject either missing
authority with `provider_profile_required`, while direct providers may submit
without a profile. Profile validation returns normalized options, source,
catalog diagnostics, and an FNV fingerprint.

## ACP catalog

The existing flat `providerOptions` wire shape remains unchanged. ACP model
provider and model are compared as one semantic tuple before runtime folding.
Catalog state is derived from the persisted cache timestamp and model selector
consistency. Missing, stale, or contradictory data is not ready for
catalog-sensitive dispatch. Refresh probes the existing ACP session and
persists the resulting cache for GUI and CLI consumers.

## Surfaces

`workflow defaults` and `workflow profile refresh` are ordinary read/control
commands in the embedded CLI contract. Materialized Skills and references are
updated only through the Host Bridge renderer.
