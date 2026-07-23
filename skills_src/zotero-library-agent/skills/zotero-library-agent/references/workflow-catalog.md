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

## Catalog

<!-- zotero-builtin-workflow-catalog:entries -->
