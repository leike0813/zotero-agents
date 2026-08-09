## Why

On Windows, a Zotero attachment path can reach an ACP agent with a mojibake filename even though the parent directory remains usable. Agents currently may classify the path as corrupt and stop the task instead of performing a bounded recovery, turning a recoverable file lookup into a failed ACP Skills or ACP Chat task.

## What Changes

- Add the same Windows Unicode-path recovery instruction to the packaged ACP Skills and ACP Chat startup prompt templates.
- Require the instruction to preserve apparent mojibake paths, use a Unicode-capable listing of a known parent directory plus available metadata to recover the exact returned filename, retry once, and avoid guessing or transliterating filenames.
- Document non-prompt future remediation directions: UTF-8/argv-safe Windows backend launch, removal of shell path-string boundaries, and handle-first file delivery with compatibility staging.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: The packaged ACP Chat startup preamble must contain the Windows Unicode-path recovery instruction when it is rendered for a session.
- `acp-skillrunner-compatible-runner`: ACP Skills startup context must contain the same Windows Unicode-path recovery instruction before the run-local skill contract is followed.

## Impact

- Packaged ACP runtime prompt templates for ACP Chat and ACP Skills.
- Existing runtime prompt-template loading and rendering tests.
- No ACP protocol, backend configuration, file-format, or dependency changes.
