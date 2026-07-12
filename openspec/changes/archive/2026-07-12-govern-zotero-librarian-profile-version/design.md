## Context

The CLI release manifest already records the binary release version, while the
Profile distribution owns an unrelated manual version. The renderer, checker,
publisher, release skill, and surface-only workflow all need one consistent
version decision without allowing the CI publisher to silently mutate source
metadata.

## Goals / Non-Goals

**Goals:**

- Derive Profile major/minor from the CLI release and retain a Profile-owned
  patch.
- Make Profile version decisions explicit in the existing Host Bridge release
  skill and verifiable before publication.
- Preserve the current Profile version as the migration baseline.

**Non-Goals:**

- Change CLI version bump policy, rebuild prebuilds for Profile-only changes,
  or publish tags/releases from this implementation.

## Decisions

- A small Profile version source records a CLI major/minor scope and patch. A
  shared TypeScript resolver reads the CLI release manifest, making the CLI the
  sole authority for final major/minor. A mismatched scope yields patch zero.
- The bump command writes only the Profile version source and creates or
  increments the patch for the current CLI line. It is intentionally invoked by
  the release procedure, not by CI, so version decisions remain reviewable.
- The renderer writes the resolved version into distribution metadata and
  generated manifest metadata. The checker recomputes the same value; the
  PowerShell publisher consumes generated metadata rather than duplicating the
  resolver in PowerShell.
- The release skill gets a dedicated version-governance stage and reference
  table. Version-only source edits are classified as release metadata rather
  than semantic guidance, so they do not require a semantic wording review.
- A renderer `--check` aggregate becomes a surface-only workflow gate before
  its existing render/publish steps. CLI build publishing keeps its current
  record-release then render sequence because that workflow intentionally
  creates the new generated output.

## Risks / Trade-offs

- [A bump can be run twice] → the skill states that bump is executed exactly
  once per public Profile release and inspect reports the resolved state.
- [A stale generated file can be published] → the surface workflow gains a
  pre-render freshness gate.
- [CLI and Profile patch values can coincide] → published manifests always
  expose both independently named version fields.

## Migration Plan

1. Seed the Profile version source with CLI line `0.2` and patch `0`.
2. Render generated metadata; the Profile remains `0.2.0`.
3. Enable checks and workflow gates before the next surface release.

## Open Questions

None.
