## 1. Behavior Tests

- [x] 1.1 Extend the public Literature export/import tests with a Markdown+PDF parent, complete notes and note images, Workbench payloads, and package-local relations.
- [x] 1.2 Add Literature Product validation tests for file closure, owner-scoped ids, primary-source references, payload provenance, and zero-mutation rejection.
- [x] 1.3 Update Research Product tests to require core-only Markdown/PDF sources and exactly the three analysis payload types.
- [x] 1.4 Update Research runtime tests for Topic-first call order, Topic/search deduplication, mandatory Topic papers, graph exclusion, and context diagnostics.

## 2. Literature Product

- [x] 2.1 Extract shared bibliography fallback and Workbench payload text-rendering helpers without changing Research Product behavior.
- [x] 2.2 Implement the lossless `literature_bundle.product@1.0.0` builder, README/index projections, manifest integrity records, and default export dispatch.
- [x] 2.3 Implement complete Literature Product validation and import materialization while preserving existing Literature v1 and Research Product v2 adapters.
- [x] 2.4 Register the new shared runtime module and remove the superseded test-only legacy export wrapper when no runtime caller remains.

## 3. Research Discovery And Product

- [x] 3.1 Move library search from Stage 20 to Stage 40 after selected Topic contexts have persisted their resolved paper refs.
- [x] 3.2 Remove graph-neighbor candidate expansion while retaining graph/reference/digest enrichment for Topic and search candidates.
- [x] 3.3 Restrict new Research Product exports to digest, references, and citation-analysis payloads while retaining historical import support.

## 4. Skill And Documentation

- [x] 4.1 Update `export-research-bundle/SKILL.md` as a current-state Tier 6 automation-facing contract with a concise description and no body When-to-Use section.
- [x] 4.2 Update the Literature export/import and Research export workflow READMEs for the independent Product contracts and Topic-first flow.
- [x] 4.3 Correct and synchronize the two main OpenSpec capabilities without changing the archived `af757a4b` change.

## 5. Verification

- [x] 5.1 Run the three targeted behavior suites and resolve every regression.
- [x] 5.2 Run Python syntax, workflow-manifest, formatting, lint, strict OpenSpec, and whitespace validation.
- [x] 5.3 Review the final diff for duplicate logic, current-state Skill language, compatibility boundaries, and unplanned changes.
