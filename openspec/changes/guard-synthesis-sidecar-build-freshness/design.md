# Design

## Context

See [proposal.md](proposal.md). `package.json` defines both the ordinary build chain and the existing `check:synthesis-sidecar-runtime-freshness` command. The checker already validates the seven materialized runtime bundles against the current runtime fingerprint.

## Goals / Non-Goals

**Goals:**

- Make an ordinary build fail before help-document generation and XPI packaging when any of the seven runtime bundles does not match current source identity.
- Reuse the existing checker and build pipeline.

**Non-Goals:**

- Downloading or rebuilding native runtime artifacts during `npm run build`.
- Changing runtime protocols, APIs, release behavior, or dependencies; an ordinary build SHALL NOT modify native bundle bytes.

## Decisions

- Put the existing freshness command first in the ordinary `build` script. This applies the same check to local and automated ordinary builds; relying on CI alone would leave local XPI generation unprotected.
- Keep the existing checker as the only validation implementation. A second build-specific verifier would duplicate fingerprint and bundle-inventory semantics.
- Treat the source sequence as mandatory: the raw bytes of `package.json` participate in the runtime fingerprint, so editing its `build` script changes the expected identity. Commit and push the exact source change, run the seven-platform prebuild for that commit, and synchronize those bundles before running preflight and the full build.

## Risks / Trade-offs

- Existing prebuilt runtime bundles become intentionally stale when the `package.json` patch changes the fingerprint. The failure blocks XPI packaging until all seven bundles are produced from the pushed source commit and synchronized.
- A failed or incomplete synchronization must stop the build; there is no automatic download or fallback path.
