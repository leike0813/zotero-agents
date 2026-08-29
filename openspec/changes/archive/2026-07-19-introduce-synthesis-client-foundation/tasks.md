## 1. Contract and Consumer Tests

- [x] 1.1 Add failing tests for environment-neutral contract boundaries, grouped Topic client behavior, stable error mapping, and narrow legacy composition.
- [x] 1.2 Update the existing workflow parameter option test to require the grouped client dependency rather than a service-shaped facade.

## 2. Contract Workspace

- [x] 2.1 Register npm workspaces and add an independently typechecked `packages/synthesis-contracts` package.
- [x] 2.2 Define JSON-safe common types, stable client errors, bounded page/request primitives, and the initial Topic option capability.
- [x] 2.3 Move workflow Topic option DTO ownership to the contracts package and retain only migration re-exports from the legacy service.

## 3. Client Seam and First Consumer

- [x] 3.1 Implement the in-process `SynthesisClient` using a narrow legacy Topic port with centralized error normalization.
- [x] 3.2 Add default client composition as the only new legacy service resolver.
- [x] 3.3 Migrate workflow parameter Topic options to `client.topics.listWorkflowOptions` without changing observable option or diagnostic behavior.
- [x] 3.4 Update the service migration inventory and guards so the direct-consumer set shrinks or moves only to approved composition.

## 4. Documentation and Validation

- [x] 4.1 Update active Synthesis documentation to describe the implemented client seam while retaining current in-process ownership.
- [x] 4.2 Run contract and root typechecks, targeted tests, Synthesis invariants, formatting/lint checks, and the production build.
- [x] 4.3 Run `openspec validate` and verify completeness, requirement coverage, and design coherence.
