## Why

ACP Skill runs can receive backend permission requests for tool calls, and
today every request must be manually confirmed through the ACP Skills UI. Some
trusted local ACP backends need a per-run option to proceed without repeatedly
blocking on approve/allow prompts.

Because this bypasses an approval boundary, the option must be explicit,
default-off, limited to ACP Skill runs, and visually marked as high risk.

## What Changes

- Add an ACP provider runtime option `autoApproveAcpPermissions`, defaulting to
  `false`.
- When enabled for an ACP Skill run, automatically select approve/allow
  permission options for ACP backend tool-call permission requests.
- Preserve manual permission handling when no approve/allow option is present.
- Render the option label in bold red text in workflow settings UIs.
- Keep ACP Chat permissions and Zotero Host Bridge write approval separate.

## Impact

- Affected areas: ACP provider runtime options, ACP Skill runner permission
  handling, workflow settings UI rendering, OpenSpec coverage, and focused
  tests.
- Compatibility: existing runs keep manual permission behavior by default;
  `zoteroHostAccess.autoApproveWrites` remains a separate run option.
