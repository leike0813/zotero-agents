# Design

## Projection model

The canonical operation strings in `MutationOperation` are the single source of truth for the 29 public capabilities. Each projection schema is derived from the existing operation input/result map, fixes its operation identity in the adapter, and exposes only operation-specific fields plus optional `dryRun` and `operationId`. The public payload never accepts `operation`; `dryRun` and `operationId` are removed or mapped before the Broker request is built.

Preview and execute remain separate inside the Broker. A projection handler performs validation, attachment file-id staging where needed, approval/prepared-plan callbacks, and then delegates to the existing canonical mutation adapter. The handler returns a per-operation result schema (preview or execution result with that operation fixed), rather than a cross-operation public union.

## Identity and transport

For execute, CLI and MCP generate an operation id when none is supplied; an explicit id is reused only for retry/observation. Host Bridge compares the optional body id with the request header id and rejects conflicts. Canonical projections bypass the generic HTTP operation reservation/history and carry the header id into the private registry context. Dry-run requests are effect-free and do not require an operation id.

## CLI and MCP

The CLI command contract maps every semantic mutation leaf directly to its capability. Existing semantic command names remain; missing operations use deterministic namespace/kebab-case leaves. `mutation preview` and `mutation apply` are removed. `--schema` resolves the operation-specific input/result schema, while global `--operation-id` remains the retry control.

MCP mirrors the same capability registry. Approval special-casing applies to all canonical projection names, and only execute projections request the existing prepared-action approval callback. `mutation.get_operation` remains the sole observation tool.

## Governed surfaces

Update the source Skill and command-catalog inputs, record the approved deletion list (the two generic mutation tools and their cross-operation projection only), then run the existing semantic review and render/check scripts. Generated addon/profile files are never edited directly.
