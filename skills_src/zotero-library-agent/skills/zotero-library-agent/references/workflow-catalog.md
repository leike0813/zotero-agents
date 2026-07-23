# Built-in Workflow Catalog

## Scope and authority

Use this catalog to select a likely workflow that ships with the Zotero plugin. It records the manifest contract used to build this surface; it does not prove that the workflow is installed, enabled, compatible with the selected backend, or unchanged at runtime.

Before execution, use live commands in this order:

1. `zotero-bridge workflow list --json` to confirm current availability.
2. `zotero-bridge workflow describe --workflow <id> --json` to obtain the current selection, option, provider, execution-mode, and output contract.
3. `zotero-bridge workflow validate` with either the declared selection or no-selection form and the intended workflow options.
4. `zotero-bridge workflow profile describe` and `zotero-bridge workflow profile validate` for the separately selected backend profile.
5. `zotero-bridge workflow submit` only after the bounded request and Zotero-side authority are current.
6. Use the returned run handles to inspect execution, then verify every requested Product, artifact, or changed Zotero object independently.

Consult the bundled `zotero-bridge-cli` Skill's `workflow` and `run` command references for exact argv and structured recovery.

## Choosing among workflows

Start from the research outcome, not from a workflow name:

- Acquisition workflows own external provider interaction, ingest, or repeated candidate preparation.
- Analysis workflows own per-source digest, translation, extraction, deep reading, or structured analytical artifacts.
- Synthesis workflows own bounded cross-source topics, framing, graph-aware outputs, or research bundles.
- Curation workflows own reusable classification or metadata/tag proposal logic, while the final Zotero change still follows its declared authority path.
- Import/export workflows own declared package transformations, not arbitrary library mutation.

Then compare:

1. **Outcome:** Does the description promise the deliverable the user requested?
2. **Selection:** Does the live input unit accept the resolved items, parents, attachments, or no-selection form?
3. **Execution mode:** Is execution Zotero-managed or self-owned, and can the current agent satisfy that mode?
4. **Options:** Which options are required, which have defaults, and which materially change scope or output?
5. **Provider:** Is a backend profile required, compatible, configured, and separately validated?
6. **Evidence:** Does the result contract name the Product, artifact, live change, or request bundle needed for completion?
7. **Authority:** Does submission, mutation, maintenance, or apply-back introduce a current approval boundary?

If two workflows remain plausible, explain the difference in their declared outcomes or result evidence and ask only when that choice matters. Do not choose by label similarity, emoji, package position, or a cached success from another source.

Typical conversational cues:

- “find and import literature” suggests an acquisition/ingest candidate;
- “summarize this paper” suggests analysis;
- “deep read these PDFs” suggests an attachment-oriented analysis workflow;
- “translate this source” suggests translation with a declared output artifact;
- “what does this literature say together?” suggests synthesis;
- “create or update a topic” suggests distinct topic lifecycle workflows;
- “prepare a manuscript literature frame” suggests a framing workflow;
- “normalize tags or metadata” suggests curation, with writes independently reviewed;
- “export the research bundle” suggests an export workflow whose Product/asset must be verified.

A static match is only a candidate. If the live workflow description differs, use the live contract and report the changed assumption before execution.

## Catalog

<!-- zotero-builtin-workflow-catalog:entries -->
