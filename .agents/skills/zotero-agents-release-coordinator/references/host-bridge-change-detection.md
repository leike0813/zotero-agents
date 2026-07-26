# Host Bridge Change Detection

Use this reference when the release gate reports Host Bridge candidate files.

## Trigger Paths

Treat these groups as requiring `$host-bridge-release-pipeline` unless the user
explicitly limits release scope:

- CLI contracts, build inputs, packaging, installers, and checks under
  `cli/zotero-bridge/**`, `scripts/build-zotero-bridge-cli.mjs`, and the related
  `scripts/*zotero-bridge-cli*` files.
- Agent-facing sources and generated surfaces under
  `skills_src/zotero-bridge-cli/**`, `skills_src/zotero-library-agent/**`,
  `skills_builtin/zotero-bridge-cli/**`, the six manifest-owned Generic Skill
  roots under `skills_builtin/**`, `profiles_src/hermes/zotero-librarian/**`,
  and `profiles/hermes/zotero-librarian/**`.
- Host Bridge protocol, capability, broker, workflow, and OpenSpec contracts.
- Release contracts and coordination under `host-bridge/**`,
  `schemas/host-bridge.*`, `scripts/host-bridge-*`,
  `scripts/render-host-bridge-*`, the unified surface renderer/materializer, and
  `.github/workflows/release-host-bridge.yml`.
- Human review governance and output under
  `.agents/skills/host-bridge-review-mirror/**`,
  `scripts/host-bridge-review-mirror.ts`, and `artifact/host-bridge-review/**`.

## Required Action

When triggered:

1. Use `$host-bridge-release-pipeline`.
2. Record the prepared `releaseSetId` and exact CLI identity: version, build
   fingerprint, and command catalog checksum.
3. Keep preparation distinct from publication. A prepared release set is not
   completion evidence.
4. Confirm that all three immutable surface manifests name the same
   `releaseSetId` and CLI identity, all seven CLI platform checksums are present,
   and mutable pointers advanced only after immutable verification.
5. Rerun the release gate with `--host-bridge-done` only when a
   `host-bridge.release-receipt.v2` for that `releaseSetId` reports
   `status: complete`.

Do not inline or paraphrase the Host Bridge release commands here; the dedicated
skill is the source of truth for that pipeline.
