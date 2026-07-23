# Zotero Bridge CLI Workflow Commands

Use this generated reference for `workflow` commands after selecting the exact canonical operation.

## `zotero-bridge workflow agent-abandon`

Abandon an unconsumed agent run

- Argv: `["workflow","agent-abandon"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"state":{"type":"string"},"leaseExpiresAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"renewable":{"type":"boolean"},"abandonable":{"type":"boolean"},"renewedAt":{"type":"string"},"abandonedAt":{"type":"string"}},"required":["agentRunId","workflowId","state","leaseExpiresAt","retentionExpiresAt","renewable","abandonable"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"one-shot"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/abandon"}]`.
- Aliases: `workflow agent-abandon`, `workflow`, `agent-abandon`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-apply`

Apply finalized self-owned agent workflow result bundles

- Argv: `["workflow","agent-apply"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]},{"property":"result","kind":"option","token":"--result","takesValue":true,"required":true,"valueNames":["AGENT_REQUEST_ID=BUNDLE_PATH"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1},"result":{"type":"array","items":{"type":"string"},"description":"Apply-back result mapping. Repeat for multiple request bundles."}},"required":["agent_run_id","result"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"},"result":{"type":"string","description":"Apply-back result mapping. Repeat for multiple request bundles."}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"applyReceipt":{"type":"string"}},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."},{"kind":"zotero-library","stateChanged":true,"description":"May apply finalized Agent results to the Zotero library."}]`.
- Approval: `{"kind":"conditional","timing":"apply-back","scope":"Each result request is preflighted before any approval or handle consumption."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"one-shot"},{"handle":"agentRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"applyReceipt","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"Apply-back fails after preflight or may have partially written results.","stateCheck":"caller-held-handle","requiresHandles":["agentRunId"],"action":"Read the persisted per-request apply receipt before retrying any result.","nextCommand":"workflow agent-apply-status"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"}]`.
- Aliases: `workflow agent-apply`, `workflow`, `agent-apply`, `agent_run_id`, `AGENT_RUN_ID`, `results`, `result`, `AGENT_REQUEST_ID=BUNDLE_PATH`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-apply-status`

Read the auditable apply-back receipt for an agent run

- Argv: `["workflow","agent-apply-status"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"schema":{"const":"host-bridge.agent-apply-receipt.v2"},"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"status":{"type":"string"},"updatedAt":{"type":"string"},"stateChange":{"enum":["unchanged","changed","unknown"]},"handleConsumption":{"enum":["unconsumed","consumed","unknown"]},"recoverable":{"type":"boolean"},"results":{"type":"array","items":{"type":"object"}}},"required":["schema","agentRunId","status","results"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required to read persisted apply status; the read does not consume it.","lifetime":"caller-owned"},{"handle":"applyReceipt","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply"}]`.
- Aliases: `workflow agent-apply-status`, `workflow`, `agent-apply-status`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-bundle inspect`

Inspect a local agent handoff directory

- Argv: `["workflow","agent-bundle","inspect"]`.
- Argv bindings: `[{"property":"bundle","kind":"option","token":"--bundle","takesValue":true,"required":true,"valueNames":["DIR_OR_ZIP"]}]`.
- Invocation schema: `{"type":"object","properties":{"bundle":{"type":"string","description":"Agent handoff directory or ZIP"}},"required":["bundle"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"bundle":{"type":"string","description":"Agent handoff directory or ZIP"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `workflow agent-bundle inspect`, `workflow`, `agent-bundle`, `inspect`, `bundle`, `DIR_OR_ZIP`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-renew`

Renew an unconsumed agent-run lease

- Argv: `["workflow","agent-renew"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"state":{"type":"string"},"leaseExpiresAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"renewable":{"type":"boolean"},"abandonable":{"type":"boolean"},"renewedAt":{"type":"string"},"abandonedAt":{"type":"string"}},"required":["agentRunId","workflowId","state","leaseExpiresAt","retentionExpiresAt","renewable","abandonable"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/renew"}]`.
- Aliases: `workflow agent-renew`, `workflow`, `agent-renew`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-result validate`

Validate a local agent result directory against an output contract

- Argv: `["workflow","agent-result","validate"]`.
- Argv bindings: `[{"property":"contract","kind":"option","token":"--contract","takesValue":true,"required":true,"valueNames":["FILE"]},{"property":"result","kind":"option","token":"--result","takesValue":true,"required":true,"valueNames":["DIR_OR_ZIP"]}]`.
- Invocation schema: `{"type":"object","properties":{"contract":{"type":"string","description":"Authoritative output-contract JSON file"},"result":{"type":"string","description":"Agent result directory or ZIP"}},"required":["contract","result"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"contract":{"type":"string","description":"Authoritative output-contract JSON file"},"result":{"type":"string","description":"Agent result directory or ZIP"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `workflow agent-result validate`, `workflow`, `agent-result`, `validate`, `contract`, `FILE`, `result`, `DIR_OR_ZIP`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-run`

Prepare a self-owned agent workflow handoff bundle

- Argv: `["workflow","agent-run"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"output-dir","kind":"option","token":"--output-dir","takesValue":true,"required":false,"valueNames":["DIR"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to prepare for self-owned agent execution"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Prepare a no-selection workflow"},"output-dir":{"type":"string","description":"Download the handoff zip into this directory"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to prepare for self-owned agent execution"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"output_dir":{"type":"string","description":"Download the handoff zip into this directory"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"workflowLabel":{"type":"string"},"generatedAt":{"type":"string"},"expiresAt":{"type":"string"},"requests":{"type":"array","items":{"type":"object"}},"instruction":{"type":"string"},"applyStatus":{"type":"object"},"bundle":{"type":"object"},"contents":{"type":"object"},"notes":{"type":"array","items":{"type":"string"}}},"required":["agentRunId","workflowId","expiresAt","requests","bundle"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":false,"condition":"Required only for an explicit --selection input; --none carries no itemRef.","lifetime":"caller-owned"},{"handle":"agentRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"one-shot"},{"handle":"agentRequestId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"},{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- Recovery: `[{"when":"Handoff preparation fails or its response is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the structured error; do not enter the Zotero-managed run plane.","nextCommand":"workflow describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-run"}]`.
- Aliases: `workflow agent-run`, `workflow`, `agent-run`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `output_dir`, `output-dir`, `DIR`.
- Intent search: `visible`.

## `zotero-bridge workflow describe`

Describe workflow selection and workflow options

- Argv: `["workflow","describe"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to describe"},"workflow-options":{"type":"string","description":"Draft workflow options JSON object, file path, @file, or '-' for stdin"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to describe"},"workflow_options":{"type":"string","description":"Draft workflow options JSON object, file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/describe"}]`.
- Aliases: `workflow describe`, `workflow`, `describe`, `WORKFLOW`, `workflow_options`, `workflow-options`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge workflow list`

List loaded workflows

- Argv: `["workflow","list"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows"}]`.
- Aliases: `workflow list`, `workflow`, `list`.
- Intent search: `visible`.

## `zotero-bridge workflow profile describe`

Describe the provider profile contract for one backend

- Argv: `["workflow","profile","describe"]`.
- Argv bindings: `[{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":true,"valueNames":["BACKEND"]}]`.
- Invocation schema: `{"type":"object","properties":{"backend":{"type":"string","description":"Configured backend id whose provider profile is described"}},"required":["backend"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"backend":{"type":"string","description":"Configured backend id whose provider profile is described"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/provider-profiles/describe"}]`.
- Aliases: `workflow profile describe`, `workflow`, `profile`, `describe`, `backend`, `BACKEND`.
- Intent search: `visible`.

## `zotero-bridge workflow profile list`

List configured backend provider profiles

- Argv: `["workflow","profile","list"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/provider-profiles"}]`.
- Aliases: `workflow profile list`, `workflow`, `profile`, `list`.
- Intent search: `visible`.

## `zotero-bridge workflow profile validate`

Validate and normalize one backend provider profile

- Argv: `["workflow","profile","validate"]`.
- Argv bindings: `[{"property":"provider-profile","kind":"option","token":"--provider-profile","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"provider-profile":{"type":"string","description":"Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"provider_profile":{"type":"string","description":"Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/provider-profiles/validate"}]`.
- Aliases: `workflow profile validate`, `workflow`, `profile`, `validate`, `provider_profile`, `provider-profile`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge workflow requirements`

Read workflow requirements

- Argv: `["workflow","requirements"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"legacy_workflow","kind":"positional","token":"LEGACY_WORKFLOW","position":1,"takesValue":true,"required":false,"valueNames":["LEGACY_WORKFLOW"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"legacy_workflow":{"type":"string","position":1}},"required":[],"allOf":[{"not":{"required":["workflow","legacy_workflow"]}},{"oneOf":[{"required":["workflow"]},{"required":["legacy_workflow"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"legacy_workflow":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/requirements"}]`.
- Aliases: `workflow requirements`, `workflow`, `requirements`, `WORKFLOW`, `legacy_workflow`, `LEGACY_WORKFLOW`.
- Intent search: `visible`.

## `zotero-bridge workflow submit`

Submit a workflow with explicit JSON input

- Argv: `["workflow","submit"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"provider-profile","kind":"option","token":"--provider-profile","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to submit"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Submit a no-selection workflow"},"workflow-options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"},"provider-profile":{"type":"string","description":"Provider profile JSON object with backendId and providerOptions"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to submit"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"workflow_options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"},"provider_profile":{"type":"string","description":"Provider profile JSON object with backendId and providerOptions"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"workflowId":{"type":"string"},"workflowLabel":{"type":"string"},"workflowRunId":{"type":"string"},"jobIds":{"type":"array","items":{"type":"string"}},"totalJobs":{"type":"integer"},"tasks":{"type":"array","items":{"type":"object"}},"permission":{"type":"object"}},"required":["workflowId","workflowRunId","jobIds","totalJobs","tasks"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":false,"condition":"Required only for an explicit --selection input; --none carries no itemRef.","lifetime":"caller-owned"},{"handle":"workflowRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/submit"}]`.
- Aliases: `workflow submit`, `workflow`, `submit`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `provider_profile`, `provider-profile`.
- Intent search: `visible`.

## `zotero-bridge workflow validate`

Validate workflow input without starting execution

- Argv: `["workflow","validate"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to validate"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Validate a no-selection workflow"},"workflow-options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to validate"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"workflow_options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/validate"}]`.
- Aliases: `workflow validate`, `workflow`, `validate`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`.
- Intent search: `visible`.

