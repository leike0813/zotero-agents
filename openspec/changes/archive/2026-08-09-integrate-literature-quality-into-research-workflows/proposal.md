## Why

Literature scoring is already stored and displayed, but the Registry and research workflows still treat it as an independent annotation. That split lets a paper appear artifact-complete while its intrinsic-quality evidence is unavailable, and forces Topic Synthesis, Research Bundle, and Manuscript Framing to improvise incompatible quality judgments.

## What Changes

- **BREAKING** Define the paper artifact set once as `digest`, `references`, `citation_analysis`, and `literature_score`, and reuse it for Registry coverage, artifact reads/exports, Topic material readiness, freshness, and Index presentation.
- Add one validated `literature_quality` snapshot and confidence-weighted neutral quality prior shared by all research workflows.
- Replace Topic and Research Bundle's subjective or ambiguous quality fields with explicit selection scores and persisted quality snapshots while keeping relevance boundaries authoritative.
- Add a frozen manuscript evidence inventory that uses literature quality to calibrate evidence roles and wording strength without ranking or hard filtering.
- Make Index Analyze routing derive directly from four-artifact state and render a dedicated score artifact icon independently from the numeric Rating column.
- Update governed Host Bridge command cards and research-synthesis guidance through their semantic sources and unified renderer.

## Capabilities

### Modified Capabilities

- `synthesis-layer-integration`
- `synthesis-mcp-tools`
- `synthesis-workbench-ui`
- `topic-synthesis-runtime`
- `topic-synthesis-structured-artifact`
- `research-bundle-workflow`
- `manuscript-literature-framing`
- `host-bridge-agent-surfaces`

## Impact

This changes TypeScript Registry/API/Workbench contracts, Topic Synthesis source contracts and generated Skills, Research Bundle and Manuscript Framing runtimes, built-in workflow documentation, Host Bridge semantic sources and generated surfaces, and focused tests. It adds no CLI command, Rust change, automatic bulk scoring, release, prebuild, or Gitee operation.
