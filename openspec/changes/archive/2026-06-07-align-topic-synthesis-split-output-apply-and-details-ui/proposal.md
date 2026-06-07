# Change: Align Topic Synthesis Split Output, Apply, and Details UI

## Why

The split `create-topic-synthesis` sequence can complete all three skill steps,
but the final apply path rejects the result. The observed run
`acp-skill-mq274qrr-3ept5q` completed `topic-synthesis-finalize` in the reused
workspace `acp-skill-mq26kamz-l43wyn`, then failed during
`loadCompleteManifestAndSections` because the generated
`result/topic-analysis.json` only contained `summary` and `coverage` sections.

The Host apply/storage/UI contract still requires a complete
`synthesis.topic_analysis_manifest` and complete structured topic artifact.
Lowering that contract would hide missing data from storage, topic graph,
discovery hints, and the topic details page. The split runtime should instead
materialize Host-apply-ready output.

## What Changes

- Record a sanitized diagnostic artifact for the failing run and use it as
  regression evidence.
- Make split finalize generate a full structured topic artifact section set and
  a complete `synthesis.topic_analysis_manifest`.
- Keep final candidate output as a pure `topic_synthesis` business object with
  no ACP marker.
- Keep apply validation strict for create/update_full manifests, while adding
  clearer diagnostics and manifest-sidecar path fallback.
- Upgrade the topic details page to expose artifact provenance and make the
  split runtime structure readable without destabilizing legacy topic records.

## Impact

- New split create workflow output can be applied by the existing synthesis
  storage service.
- Topic details can show section hashes, sidecars, resolver provenance, coverage
  and diagnostics for newly generated artifacts.
- Legacy topic synthesis packages and existing persisted artifacts remain
  supported.
