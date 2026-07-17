# Evidence Handoff

Use an evidence bundle when another agent, framework, or later task needs an auditable record of Zotero facts, artifacts, workflow handles, or writeback.

## Build Evidence

Prepare an input JSON with:

- `producer.surfaceVersion` and `producer.cliVersion`;
- `operation.kind` and a sanitized `operation.command` argv array;
- stable `subjects` such as Zotero item refs, topic IDs, product IDs, or typed run handles;
- artifact `path`, `role`, and `mediaType` entries;
- optional typed `workflow` ownership and handles;
- `writeback.state` plus non-sensitive targets or approval outcome.

Run:

```sh
python scripts/zotero_library_agent.py evidence build --input <input.json> --output <evidence.json>
python scripts/zotero_library_agent.py evidence validate --input <evidence.json>
```

The builder computes artifact SHA-256 digests. The validator re-reads local artifact paths when present and rejects a digest mismatch.

## Workflow Bundle Checks

Inspect a prepared agent-run handoff:

```sh
python scripts/zotero_library_agent.py workflow inspect --bundle <handoff-dir-or-zip>
```

Validate a finalized result against one prepared output contract:

```sh
python scripts/zotero_library_agent.py workflow validate-result \
  --contract <output-contract.json> \
  --result <result-dir-or-zip>
```

These checks validate deterministic files, JSON structure, result paths, and namespaces. They do not decide whether the result is semantically correct or whether apply-back should proceed.

## Privacy And Ownership

- Remove bearer tokens, authorization headers, passwords, cookies, full transcripts, and agent-private state before building evidence.
- Treat local paths as locators, not durable identities; use digests and stable Zotero refs for comparison.
- Do not treat an evidence bundle as current Zotero truth or as approval to write.
- Let downstream systems translate the evidence contract into their own artifact registries or receipts without giving this bundle ownership of their workflow state.
