# Design

## Run Truth

The artifact captures one real create run for `topicSeed: "DETR"`. The actual
Host-validated run root must be created under the Zotero Host Bridge runtime
persistence `acpSkillRunsDir`, because `synthesis.export_filtered_paper_artifacts`
rejects any `run_root` outside that directory. After the gated run completes,
the whole run workspace is mirrored into the repository artifact at:

```text
artifact/topic-synthesis-create-detr-gated-playbook/workspace/runtime/acp/skill-runs/acp-skill-detr-create-topic-synthesis/
```

The agent may write only `runtime/input.json` and payload files returned by
gate instructions. All SQLite state, gate transcripts, action transcripts,
resolver manifests, views, handoffs, sidecars, sections, and final candidate
files must be produced by generated package scripts.

## Bridge Use

The playbook records read-only `zotero-bridge` diagnostics and discovery
transcripts. The formal runtime path calls Host Bridge from Stage 20 through
the generated split runtime. A run-local `.zotero-bridge/bin/zotero-bridge.cmd`
shim or `ZOTERO_BRIDGE_BIN` may be used to make the CLI available to the
runtime, but secrets, bearer tokens, and local attachment paths are redacted or
excluded from the committed artifact. The artifact records the actual Host run
root only as a redacted logical location.

## Five-Paper Workset

Discovery may inspect the full live resolver result, but the gated run uses an
explicit resolver payload containing five selected paper refs. The selected set
must be deterministic and documented: original DETR paper, representative
improvements, training/convergence work, detection-paradigm extension, and a
recent or highly relevant variant when available from the resolver result.

## Playbook Shape

`playbook.md` is the human-facing record. It describes the exact gate loop,
payload files, Host Bridge reads, selection policy, and replay caveats in
Chinese. `diagnostics.json` records bridge status, capability availability,
timestamps, redaction policy, and resolver selection counts. `schemas/examples/`
contains copies of the real payload and output examples used by tests.
