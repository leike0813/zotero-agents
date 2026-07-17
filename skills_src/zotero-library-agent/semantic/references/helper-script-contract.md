# Helper Script Contract

The helper performs deterministic evidence construction and workflow-bundle validation. It does not choose Host Bridge commands, interpret Zotero facts, decide approval, or judge whether evidence is sufficient.

## Build evidence

Start from `assets/evidence-input.example.json`. Record the producing surface and CLI versions, the exact sanitized command argv, stable subjects, local artifacts, typed workflow handles when present, and the writeback state. Then run:

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
```

The input and output conform to `assets/evidence-bundle.schema.json`. The helper rejects credential-like fields, reads every declared local artifact, computes its SHA-256 digest and byte count, and writes one deterministic evidence JSON file. Success prints a JSON result containing the output path and evidence digest. Failure prints a structured error and does not produce a valid evidence record.

## Validate evidence

Before handoff, validate the produced record and re-read any local artifacts:

```sh
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

Validation rejects schema violations, credential-like fields, missing artifacts, and digest or byte-count mismatches. Do not hand-edit `evidence.json` and then represent it as validated; update the source input and rebuild it.

## Inspect an agent-run handoff

Use the workflow family only for bundles produced by `zotero-bridge workflow agent-run`:

```sh
python scripts/zotero_library_agent.py workflow inspect --bundle handoff-dir-or.zip
python scripts/zotero_library_agent.py workflow validate-result \
  --contract output-contract.json \
  --result result-dir-or.zip
```

`workflow inspect` returns the `agentRunId`, request identifiers, and contract locations found in the prepared handoff. Run `workflow validate-result` separately for every finalized request result and its own `output-contract.json`. These commands validate deterministic structure and namespaces; they do not authorize apply-back or prove semantic correctness.

If any helper command fails, preserve its structured error, correct the input or bundle, and rerun the same command. Do not use the helper to fabricate absent Host Bridge evidence, normalize incompatible handle types, or bypass `workflow agent-apply` approval and receipt rules.
