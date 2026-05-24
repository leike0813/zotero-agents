## Tasks

- [x] 1. Add OpenSpec delta spec for workflow-declared Zotero host access and centralized prompt injection.
- [x] 2. Add workflow schema/types support for `execution.zoteroHostAccess.required`.
- [x] 3. Inject `runtime_options.zotero_host_access.required` during ACP request adaptation with default `true`.
- [x] 4. Update ACP skill runner to resolve host access requirement and skip Host Bridge injection when disabled.
- [x] 5. Append the Host Bridge prompt snippet to the engine instruction file with stable markers.
- [x] 6. Keep ACP Chat Host Bridge injection always enabled through profile/README/shim/env and prompt snippet injection.
- [x] 7. Clean built-in workflow manifests, runner prompts, skill docs, and injected instruction text of default MCP host-access wording.
- [x] 8. Update focused tests for workflow propagation, runner injection, disabled host access, ACP Chat injection, and built-in cleanup.
- [x] 9. Run targeted tests, OpenSpec validation, and build.
