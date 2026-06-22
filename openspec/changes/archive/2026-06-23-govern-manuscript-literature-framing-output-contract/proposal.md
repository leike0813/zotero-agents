# Change: Govern Manuscript Literature Framing Output Contract

## Summary

Align the builtin `manuscript-literature-framing` workflow with the current cross-task file contract. The completed output should expose only the meaningful business fields and one artifact manifest path; detailed product assets move into a runtime-authored manifest.

## Motivation

`manuscript-literature-framing` currently exposes every generated file through `assets` on the final output and duplicates a static artifact list in the workflow manifest. This makes the output noisy and keeps too many cwd-sensitive paths in the cross-task contract. The workflow should publish a single manifest artifact and let consumers read product asset paths from that manifest.

## Scope

- Update the skill output schema to identify the manifest with `x-type: "artifact-manifest"`.
- Update stage runtime output generation so all product asset paths and `artifact_manifest_path` are absolute paths.
- Update the apply hook to read product asset paths through the manifest.
- Update workflow expectations and tests to reflect the manifest-based output contract.

## Non-Goals

- Do not change SkillRunner backend implementation.
- Do not remove the actual draft/audit files generated under `result/`.
- Do not redesign the manuscript framing writing process.
