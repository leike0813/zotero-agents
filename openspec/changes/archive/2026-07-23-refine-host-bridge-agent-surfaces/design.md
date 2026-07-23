# Design

## Context

The Minimum command descriptor contains 122 canonical commands but no explicit semantic-surface field. Each command's first token is stable and already defines its top-level CLI surface. The current renderer ignores that boundary and emits a single 2322-line reference.

Generic publishes one coordinator and five bounded task Skills. Their `SKILL.md` files contain the required headings, but each workflow begins by reading a 60–76 line playbook. This makes the reference a mandatory continuation of the main contract instead of optional depth.

The plugin's built-in workflow truth is already declarative: `workflows_builtin/manifest.json` defines the shipped closure, `workflow-package.json` defines package membership, and each `workflow.json` defines behavior. Runtime visibility uses `debug_only`; `display.core` affects presentation only.

## Decisions

### Partition Minimum by canonical command root

The renderer owns one partition table:

- `connection-and-context`: `surface`, `bridge`, `context`
- `library`: `library`
- `mutation`: `mutation`
- `files-products-and-operations`: `file`, `product`, `operation`
- `workflow`: `workflow`
- `run`: `run`
- `synthesis`: `synthesis`
- `diagnostics`: `debug`, `call`

It rejects an unknown root, overlapping ownership, missing command, or duplicate command. Every generated card keeps all public v4 descriptor fields. `SKILL.md` links every file directly and tells the agent to load only the selected command's partition. No intermediate index is added.

### Use the reference-backed B pattern for all Generic Skills

Every Generic `SKILL.md` owns the first executable action, core decision flow, mandatory authority/evidence rules, completion, and first recovery action. Its reference owns only conditional branches, detailed decision tables, worked paths, evidence templates, and recovery matrices.

The coordinator applies the same rule. Its research model becomes optional for multi-stage composition, self-owned handoffs, cross-task evidence, and complex recovery. A second coordinator reference owns only the built-in workflow inventory.

Published instructions contain only the current contract. Design history and parity evidence remain in OpenSpec.

### Generate the built-in workflow catalog outside the CLI descriptor

The catalog enumerates workflows declared by official package manifests and filters only `debug_only === true`. It currently contains 19 workflows. Each entry exposes the declared identity, description, provider requirements, execution modes, selection facts, parameters, result evidence, and an invocation-input synopsis.

A shared pure workflow catalog projection derives compatible provider types, required workflow options, result evidence, execution modes, and selection facts. Runtime `workflow describe` and the Node renderer consume the same projection. The renderer does not read an older generated catalog.

The catalog is a compile-time selection aid. Live `workflow list/describe`, workflow validation, provider-profile validation, submission, run inspection, and output/live-state verification remain the runtime sequence and authority.

### Preserve two semantic baselines

The semantic ledger checks both the clean pre-redesign baseline `4b9a3b4b0fab7fdcce54571ba07dd770b4d3219f` and the clean refinement starting point `5caa6224b99bf91a4bea3c38576c0c0377ddbb43`. Moving content between `SKILL.md` and a reference does not count as preservation unless the current owner keeps the same decision, evidence, completion, and recovery semantics. Generated command partitioning must preserve every descriptor field.

## Risks

- Partition drift is prevented by exhaustive renderer assertions and coverage tests.
- Static workflow drift is prevented by manifest-based rendering and runtime/catalog shared projection.
- Optional references could become too thin; semantic review requires coherent decision domains, not line-count thresholds.
- Moving rules can create paraphrased duplication; the deterministic duplicate gate is supplemented by the parity ledger and semantic review.

## Verification

Tests first lock command coverage, optional reference loading, baseline semantic topics, workflow catalog membership, runtime/catalog projection equality, inheritance identity, and review-mirror discovery. Rendering, package validation, language checks, OpenSpec validation, type checking, and mirror verification complete the gate.
