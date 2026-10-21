# Proposal

## Why

Topic synthesis produces valid seed-based prospective proposals, rich coverage, triage and Concept proposal fields that strict public schemas or native projections reject or discard. Commit `ce9764f98d71f25eec510d83959c7579b6171af3` introduced the prospective mismatch while hardening DTOs; synchronized command cards merely reproduce that incorrect contract.

## What Changes

- Share producer-owned nested Topic contracts across offline Skill schemas and public DTOs, distinguishing canonical proposals from normalized views and Concept KB facts.
- Preserve prospective metadata, Concept proposal metadata, summary, coverage and source triage across apply, reopen and consumer reads.
- Execute formal JSON Schema validation in both Python skill runtimes; retain domain validation and declare the runtime dependency.
- Add isolated generated-Skill checks to build, content packaging and existing CI gates, plus production-chain regression evidence.
- Remove the unused parallel stdout envelope schema.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-recursive-dto-contracts`: producer-backed nested shapes and explicit historical-read branches.
- `synthesis-sidecar-topic-application-foundation`: write/read continuity for Topic proposals and structured consumer data.
- `builtin-workflow-skill-contracts`: formal runtime structural validation and non-mutating generated-package checks at delivery boundaries.

## Impact

Synthesis contract-set/TS DTOs, Rust Topic and Concept adapters, both Python runtimes and renderers, generated builtin packages, build/content CI entry points and targeted tests. New Concept output uses categorical confidence; historical numeric values remain readable and require review without automatic grading. No new storage table, public path parameter, whole-DTO code generator, dependency installation, real-library writes or publication is included.
