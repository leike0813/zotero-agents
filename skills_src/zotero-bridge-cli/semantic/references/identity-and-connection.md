# Identity And Connection

Read this reference before trusting command help or live Host Bridge results.

## Select one installation

Prefer the run-local shim supplied with the current workspace. If it is absent, use the CLI binary packaged in the same release repository as this skill. Do not combine a wrapper, binary, manifest, or profile copied from different Release Sets.

Run `zotero-bridge surface identity --json` before connecting. Compare `protocol`, `cliSchema`, `version`, `buildFingerprint`, and `commandCatalogChecksum` with the release envelope. Any mismatch means the command contract is unknown; stop instead of inferring compatibility from SemVer.

## Select one profile

Use the scoped `ZOTERO_BRIDGE_PROFILE` when supplied. Otherwise use explicit `ZOTERO_BRIDGE_ENDPOINT` plus `ZOTERO_BRIDGE_TOKEN`, or the installed default profile. Never print or persist the bearer token in evidence.

Local mode can return verified local paths. Remote mode returns registered file delivery and requires `file download`; do not treat a remote path as locally readable.

## Diagnose in order

1. `surface identity` proves only the embedded offline contract.
2. `bridge status` proves unauthenticated reachability.
3. `bridge manifest` proves authenticated protocol and capabilities.
4. `bridge profile inspect` shows redacted effective profile state.
5. `bridge profile diagnose` reports missing or conflicting profile inputs.
6. `bridge backend list|status` diagnoses configured runtimes.
7. Load the diagnostics command manual only if these checks cannot explain the failure.

Do not use a library read to diagnose a profile problem, and do not treat a successful offline identity call as proof that Zotero is running.
