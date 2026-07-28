## 1. Executable contract foundation

- [x] 1.1 Add failing tests for canonical contract structure, capability/handler parity, Clap/command parity, and the `query` versus `text` regression.
- [x] 1.2 Add the v2 capability and CLI command contracts plus meta-schemas, then migrate existing command and output-boundary facts without duplicate owners.
- [x] 1.3 Add shared TypeScript and Rust contract loaders with Draft 2020-12 validation and closed reference checks.

## 2. Host Bridge v2 enforcement

- [x] 2.1 Refactor capability registration to bind private handlers by canonical ID and validate input before permission evaluation.
- [x] 2.2 Move capability effect and approval selection to the canonical contract and remove duplicate capability policy maps.
- [x] 2.3 Validate handler output before success and return structured input/output contract failures.
- [x] 2.4 Move the Host and CLI endpoint/protocol identity to `/bridge/v2` and `host-bridge.v2`.

## 3. CLI contract execution and errors

- [x] 3.1 Add the Rust JSON Schema dependency and implement the single remote contract executor with closed binding modes.
- [x] 3.2 Route every remote command through the executor, make low-level transport private, and eliminate handwritten JSON field adapters.
- [x] 3.3 Implement structured argv, JSON source/syntax, input, payload, and result errors with redacted violation details.

## 4. Runtime-derived Agent Surface

- [x] 4.1 Replace the embedded Agent Surface snapshot and TypeScript Rust-AST reconstruction with one Rust runtime descriptor builder and offline exporter.
- [x] 4.2 Render and verify minimum-core, Generic, and Hermes materialized content without changing semantic ownership or deleting instructions.
- [x] 4.3 Update CLI version/schema identities and build fingerprint inputs while leaving release, prebuild, and publication state untouched.

## 5. Verification

- [x] 5.1 Run focused Host, CLI, surface, output-boundary, TypeScript, and OpenSpec validation and resolve failures.
- [x] 5.2 Run the semantic parity, package depth, duplicate, content, documentation, and review-mirror gates; record zero unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts.

## 6. Follow-up composition SSOT

- [x] 6.1 Add failing table-driven tests that require every fixed capability command to expose executable composition, prove all composition references resolve to real Clap arguments, and cover the eleven mutation plus three readiness payloads.
- [x] 6.2 Extend the command-contract meta-schema and both contract loaders with closed base, constant, mapping, and transform rules; expose command-specific composed payload schemas in the runtime descriptor.
- [x] 6.3 Move fixed capability target selection and payload construction into the contract executor, remove handwritten mutation/readiness/object payload adapters, and preserve structured parameter failures at every composition boundary.

## 7. Built-in Host Bridge consumers

- [x] 7.1 Correct the connectivity probe's v2 commands, protocol identity, failure contract, and structured parameter-error handling.
- [x] 7.2 Remove the obsolete topic-synthesis wrapper pointer and duplicate command catalog, regenerate its four consumers, and require complete topic-list pagination where absence is used as evidence.
- [x] 7.3 Correct Tag Bootstrapper pagination and vocabulary inputs, manuscript framing CLI vocabulary plus runtime guard, and literature-ingest envelope, permission, receipt, and recovery guidance.
- [x] 7.4 Add a semantic consumer gate for live wrapper references, resolvable semantic commands, v2 identity, raw-call boundaries, and renderer-owned governed command fragments.

## 8. Follow-up verification

- [x] 8.1 Run focused Rust, contract, Host, consumer-Skill, renderer, TypeScript, and OpenSpec validation.
- [x] 8.2 Render the governed sources and refresh the review mirror without changing release, prebuild, publication, or Gitee state.
