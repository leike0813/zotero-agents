## Context

The Node sidecar currently rebuilds untrusted JSON into strict DTOs and thereby drops unknown fields, but no language-neutral artifact distinguishes raw input from normalized output. Canonical JSON is owned by the engine and recursively sorts keys with `localeCompare`, leaving byte ordering dependent on locale behavior. The system handshake imports the repository package for its schema version, reversing the intended dependency direction. Schemas, validators, compute DTOs, lifecycle envelopes, runtime bundle v1, and canonical fixtures are spread across contracts, service, worker, repository, engine, tests, and build scripts.

This change is Rust migration R1 only. Node remains the executable read-only behavior oracle. It does not create a Cargo workspace, port Metrics, define native manifest v2, change production routing, regenerate prebuilds, or alter XPI assets.

## Goals / Non-Goals

**Goals:**

- Freeze the complete current v1 process-boundary surface in versioned Draft 2020-12 schemas.
- Freeze normalized output bytes and hashes plus stable negative error codes in a language-neutral corpus.
- Make canonical serialization deterministic across JavaScript locales and reproducible in Rust.
- Restore `contracts -> repository` dependency direction and make protocol schema version contracts-owned.
- Provide strict, blocking governance that detects missing, duplicate, orphaned, or drifting contract artifacts.

**Non-Goals:**

- Creating or compiling Rust code.
- Replacing Node process ownership, routing, workers, bundle manifests, pointers, or prebuilds.
- Migrating Metrics or any other engine.
- Loading schemas or Ajv in production runtime code.
- Treating host/application ports that do not cross an OS process or service/worker boundary as v1 wire contracts.

## Decisions

### 1. Store one versioned contract set under `packages/synthesis-contracts`

The set contains Draft 2020-12 schemas, positive and negative corpus documents, and a manifest that lists every artifact and maps each capability to concrete schema definitions. Schema definitions describe normalized DTOs produced by existing TypeScript rebuilders. Corpus cases retain the raw UTF-8 JSON input separately, so unknown-field dropping remains observable without confusing admitted raw data with canonical output.

### 2. Compute the contract-set fingerprint

The checker canonicalizes the manifest inventory and every listed schema/corpus document and computes one `sha256:<hex>` fingerprint. The fingerprint is reported and tested, not copied into generated code or maintained as a second handwritten fact.

### 3. Define canonical JSON v1 explicitly

Canonical JSON has no BOM, insignificant whitespace, or trailing newline. Object keys are ordered by raw UTF-16 code units with no locale collation. Arrays retain order. Serialization otherwise follows the existing v1 normalization and ECMAScript `JSON.stringify`: undefined object fields are omitted, undefined array/root values and non-finite numbers normalize to `null`, number text retains ECMAScript form, and negative zero becomes `0`. Hashes are SHA-256 over the canonical UTF-8 bytes and use `sha256:<lowercase hex>`. Cycles and unpaired surrogates are rejected. Wire string rebuilders reject unpaired surrogates, and integer identity fields remain within the JavaScript safe-integer range.

### 4. Preserve compatibility through re-exports

Canonical functions move to contracts; the engine module re-exports them from its existing path so callers do not migrate in this change. The repository foundation schema version moves to contracts; repository re-exports the same name. `sidecarSystem.ts` imports its own package-owned SSOT, eliminating the reverse runtime dependency and its boundary allowlist.

### 5. Keep schema tooling outside runtime bundles

The checker uses the repository's existing Ajv dependency in strict Draft 2020-12 mode. Production rebuilders remain the runtime validators and no sidecar code reads JSON schema files. Build/emitted-import checks prove Ajv and schema JSON are absent from the service tree.

### 6. Freeze before refactoring

Existing durable and canonical fixtures are checked for byte/hash stability before callers switch to the contracts implementation. A mismatch blocks completion; this change does not rewrite fixtures. Any incompatible byte migration requires a separately versioned change.

### 7. Reuse canonical artifacts across the transfer hot path

Canonical v1 validation may produce one reusable artifact containing canonical text, UTF-8 bytes, byte length, and SHA-256. Citation Graph Build transfer page construction, worker pagination, service validation, and atomic staging reuse that artifact instead of recursively canonicalizing the same rows for each derived field. The service owner remains the single trust boundary for worker output: it strictly rebuilds each raw frame once, compares the received bytes and descriptor with the rebuilt canonical artifact, and only then stages the canonical bytes. Input frames are strictly validated before staging and are hash-checked when read for worker execution. Public DTOs, canonical bytes and hashes, the 30-second active deadline, and the 256 MiB worker limit do not change.

## Risks / Trade-offs

- **Inventory omission** -> Manifest/schema/corpus cross-checks reject missing capability mappings and orphaned definitions.
- **Schema overstates raw admission** -> Schemas model normalized DTOs while raw input is represented only in corpus cases.
- **Canonical drift after comparator replacement** -> Existing fixture bytes and hashes are frozen before and after the re-export switch.
- **Ajv leaks into production** -> Checker imports remain in scripts/tests and emitted service imports are inspected.
- **R1 expands into Rust implementation** -> Documentation and tests explicitly state that no Rust executable or production route exists.
- **Canonical validation makes the large-transfer canary miss its deadline** -> Reuse validated canonical artifacts across pagination, transfer, and staging while retaining one strict validation at every trust boundary; Core 202 continues to gate the unchanged normal profile and deadline.

## Migration Plan

1. Freeze current canonical/durable bytes and representative raw-to-normalized/error behavior.
2. Add failing Core 218 and contract-checker governance assertions.
3. Add the versioned schemas, corpus, manifest, and strict checker.
4. Move canonical JSON and hashing to contracts while preserving engine imports.
5. Move the repository schema-version SSOT to contracts and remove the reverse dependency allowance.
6. Run the complete conformance and service-boundary/build gates.
7. Mark Rust migration R1 complete and identify `introduce-synthesis-rust-sidecar-metrics-vertical-slice` as next.
