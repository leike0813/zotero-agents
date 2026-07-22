# Ordered Research Lifecycle

Use this journey for a complete, bounded research pass. Each stage has its own contract and evidence; do not collapse provider validation, workflow execution, sidecar maintenance, and graph maintenance into one opaque action.

## 1. Literature search and ingest

Describe and validate `literature-search-ingest` as a workflow. If Host-owned execution is selected, independently list provider backends, describe the chosen backend profile, and validate that profile. Submit the workflow only after both contracts pass and preserve the `workflowRunId`, terminal state, ingested item refs, and provenance evidence.

## 2. Literature analysis

Run `literature-analysis` for the successfully ingested or explicitly selected parent items. Default to serial submissions unless concurrency is authorized. Confirm the digest, references, and citation-analysis artifacts for each completed item; carry only successful paper refs into maintenance.

## 3. Refresh the references sidecar

Call `synthesis cache refresh-reference-sidecar --input <JSON_OR_FILE>` with the successful paper refs, or an explicit library scope for a deliberate full refresh. This approval starts only sidecar maintenance. Poll `synthesis cache status --operation-id <id>` to a terminal receipt and retain its `reference_basis_hash`, successful refs, failed refs, and retryability. A partial receipt does not authorize treating failed refs as refreshed.

## 4. Update the citation graph

Call `synthesis graph update --input <JSON_OR_FILE>` as a separate approval, using the committed paper scope and `expected_reference_basis_hash` from stage 3. Poll the returned operation independently. On a basis mismatch, reread sidecar status and decide whether to refresh again; never bypass the comparison. A paper-scoped update requires an existing graph, while a deliberate library scope can build the full graph.

## 5. Create or update topic synthesis

Choose `create-topic-synthesis` for a new topic seed and `update-topic-synthesis` for an existing topic id. Describe and validate the chosen workflow, independently validate the provider profile for Host-owned execution, then submit. Confirm the final topic report and topic id rather than treating run termination alone as synthesis evidence.

## 6. Export the research bundle

Run `export-research-bundle` only after the desired literature artifacts and topic synthesis are current. Confirm the Product, download the selected asset, and verify its file metadata or digest. Return the ordered stage receipts, skipped or failed paper refs, topic id, Product id, and exported bundle path as completion evidence.

## Recovery boundary

Resume at the first stage whose stable evidence is missing. Do not rerun an earlier mutating stage merely because a later operation failed. Workflow approval never substitutes for sidecar or graph approval, and one maintenance operation id never names the other operation.
