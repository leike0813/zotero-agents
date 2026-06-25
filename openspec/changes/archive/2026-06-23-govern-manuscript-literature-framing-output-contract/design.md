# Design: Manuscript Literature Framing Output Contract

## Output Shape

Completed results keep only fields that callers need directly:

- `kind`
- `title`
- `language`
- `topic_ids`
- `artifact_manifest_path`

The result may include additional business metadata, but `status`, `assets`, `diagnostics_summary`, and `product_metadata` are no longer required completed-output fields. Canceled results keep the existing canceled shape.

`artifact_manifest_path` is annotated as:

```json
{
  "type": "string",
  "minLength": 1,
  "x-type": "artifact-manifest",
  "x-role": "artifact-manifest"
}
```

## Artifact Manifest

The stage runtime writes `result/manuscript-literature-framing-artifacts.json`.
The manifest is a flat JSON object with stable asset ids as keys:

- `introduction_tex`
- `related_work_tex`
- `intent_brief`
- `evidence_inventory`
- `framing_analysis`
- `writing_plan`
- `citation_map`
- `diagnostics`

Every value is an absolute path under the run root. Before writing the manifest, the runtime writes the asset files and verifies that each path exists and stays under the run root.

## Gate and Instructions

Gate responses should not require the agent to interpret paths relative to the skill package. The gate returns absolute state paths, payload paths, required writes, and command examples derived from the provided state path.

The skill instructions should tell agents to run from the workspace root, not from the skill package, and to follow the absolute paths returned by gate.

## Apply Hook

The apply hook reads `artifact_manifest_path` through `resultContext.readArtifactText()` and parses the manifest. Product asset registration uses manifest paths as `rawPath`; fallback paths remain available for non-manifest-compatible older result bundles, but the new contract is manifest-first.

The hook return should expose `artifact_manifest_path`, not the old `assets` object.
