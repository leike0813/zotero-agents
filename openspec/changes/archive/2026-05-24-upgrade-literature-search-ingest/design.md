## Design

The workflow manifest declares `execution.zoteroHostAccess.allowWriteApprovalBypass`.
When present, the submit settings UI exposes a default-off run-level option for
auto-approving Zotero writes. This option is carried as
`executionOptions.runOptions.zoteroHostAccess.autoApproveWrites`, is not saved
as a workflow parameter, and is converted into
`runtime_options.zotero_host_access.auto_approve_writes` only for ACP skill run
requests.

Temporary SkillRunner compatibility: the current SkillRunner backend does not
support `runtime_options.zotero_host_access`. A single declarative switch,
`SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS`, controls this
compatibility layer. While it is false, SkillRunner-bound requests strip that
runtime option and log
`skillrunner_zotero_host_access_runtime_option_stripped` if a workflow explicitly
declares `execution.zoteroHostAccess.required: true`. Provider/backend
compatibility is otherwise unchanged, so workflow authors remain responsible for
using `provider: "acp"` when a workflow is ACP-only.

ACP run setup writes the auto-approve flag into the workspace Host Bridge CLI
profile scope and records the profiled state in the ACP run store. The Host
Bridge server only skips write approval when the incoming scope carries
`autoApproveWrites` and matches an ACP run record whose Host Bridge CLI state
has auto-approval enabled. The in-process registry remains a narrow runtime
optimization, not the sole trust source. The bypass applies to mutation
capabilities only; workflow submit continues through the existing approval path.

`literature-search-ingest` keeps the single-paper ingest contract. Multiple
confirmed candidates are still handled by repeated single-paper CLI calls. The
new `targeted_ingest` mode is a skill-level planning behavior, not a new backend
mutation.
