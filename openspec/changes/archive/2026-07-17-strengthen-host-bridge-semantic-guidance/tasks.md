## 1. Agent Surface v2 facts

- [x] 1.1 Add tests that compare the complete Clap leaf-command inventory with Agent Surface entries and cover debug/raw discovery behavior.
- [x] 1.2 Export the internal Clap command inventory and replace source-regex command discovery with structured inventory consumption.
- [x] 1.3 Add the Agent Surface v2 schema and structured backend bindings for invocation, request/result shape, approval, effect, handles, retry, and recovery.
- [x] 1.4 Update offline identity, describe, and intent search for v2 identity, match reasons, bounded results, and debug opt-in.

## 2. Semantic composition

- [x] 2.1 Add semantic family defaults, sparse command overrides, and validation of effective guidance and unique source ownership.
- [x] 2.2 Generate progressive domain references and update the CLI wrapper semantic source to retain only connection, identity, output/error, and control invariants.
- [x] 2.3 Add bounded intent-to-command-to-evidence journeys to the Zotero Library Agent semantic sources.
- [x] 2.4 Add resident index, freshness, scheduled-read-only, monitoring, maintenance, and recovery overlays to the Zotero Librarian semantic sources.

## 3. Content and release separation

- [x] 3.1 Add version-neutral `render:host-bridge-content` and `check:host-bridge-content` commands and make the full surface flow compose them with release identity materialization.
- [x] 3.2 Update release planning to use the latest completed release baseline and support a later explicit minor preparation without changing versions in this change.
- [x] 3.3 Narrow unified workflow publication triggers so ordinary semantic/content merges do not publish and recovery remains keyed by `releaseSetId`.
- [x] 3.4 Update the project Host Bridge skills for the content-only feature workflow and deferred accumulated release workflow.

## 4. Verification

- [x] 4.1 Render deterministic content targets and confirm component versions and `host-bridge/release-set.json` remain unchanged.
- [x] 4.2 Run focused Rust, Agent Surface, renderer, semantic ownership, planner, workflow, bundle, and profile tests.
- [x] 4.3 Run strict change validation and record the semantic-surface review result without invoking release preparation or publication.

## 5. Repository README surfaces

- [x] 5.1 Add source-owned landing-page guidance for the CLI bundle, bounded Library Agent bundle, and resident Librarian Profile.
- [x] 5.2 Render and materialize all three repository READMEs through the content-only pipeline, removing publisher-owned prose.
- [x] 5.3 Verify README source ownership, surface boundaries, release materialization, and unchanged release identities.

## 6. Thick semantic correction

- [x] 6.1 Add failing coverage tests for command-specific semantic ownership, non-generic request/result contracts, typed recovery preconditions, direct reference routing, and detailed generated command cards.
- [x] 6.2 Replace sparse family guidance with schema-validated per-domain semantic sources that render one command-specific decision record for every CLI leaf command exactly once.
- [x] 6.3 Correct Agent Surface v2 to separate invocation, decoded payload, result data, effects, approval stages, handle transitions, and preconditioned recovery.
- [x] 6.4 Generate canonical detailed CLI command cards and a complete output/error recovery manual without renderer-owned task prose.
- [x] 6.5 Add bounded Library Agent journeys, helper-script contracts, and direct reference routing without duplicating the canonical CLI command manual.
- [x] 6.6 Add resident index, scheduled-job, monitoring, workflow-catalog, maintenance, helper-script, and agent-owned apply-back manuals to the Librarian Profile.
- [x] 6.7 Update all three source-owned READMEs and project Host Bridge review/release skills for the thick semantic source model.
- [x] 6.8 Record source-blind baseline/final evaluation fixtures and results with the agreed safety and score gates.
- [x] 6.9 Run content-only rendering and focused validation while proving versions, release manifests, and `host-bridge/release-set.json` remain unchanged.
