# Refine Host Bridge Agent-facing Surfaces

## Why

The first redesign established the correct three-layer ownership model, but two progressive-disclosure failures remain. Minimum renders all 122 CLI commands into one large reference, while every Generic task Skill requires a comparatively thin playbook before the task can begin. Generic also lacks a static, source-generated view of the plugin's built-in workflows, forcing an agent to perform live discovery even when it only needs to select a likely workflow.

## What Changes

- Split the generated Minimum command inventory into five primary command-surface references and three coherent support references, with exhaustive and disjoint command coverage.
- Make every Generic `SKILL.md` independently executable and move references to optional, scenario-triggered deep guidance.
- Expand each task playbook into a complete decision domain without duplicating its Skill's mandatory contract.
- Generate a Generic built-in workflow catalog from the official workflow package manifests while preserving live `workflow list/describe` as runtime authority.
- Share one pure workflow-manifest projection between runtime workflow descriptions and the catalog renderer.
- Update semantic governance, OpenSpec, architecture documentation, generated surfaces, and the Chinese ownership review mirror.

## Capabilities

### New Capabilities

- `host-bridge-command-reference-partitions`: deterministic, context-efficient command-surface references.
- `generic-built-in-workflow-catalog`: source-generated selection and invocation summaries for non-debug built-in workflows.

### Modified Capabilities

- `host-bridge-agent-surfaces`: progressive disclosure and semantic-parity requirements.
- `zotero-library-agent-bundle`: independently executable task Skills and optional comprehensive references.

## Impact

This change modifies Skill sources, workflow catalog projection, the unified surface renderer, generated packages, review governance, tests, documentation, and review artifacts. It does not change `host-bridge.agent-surface.v4`, CLI build inputs, the surface inheritance graph, release versions, release dispatch, or Gitee state.
