## Context

ACP Skills and ACP Chat prepend packaged startup templates before their task-specific prompts. A Windows agent can receive a source path whose filename has already become mojibake, while a known parent directory remains readable. The observed agent recovered successfully only after listing that directory and using the exact Unicode filename it received from the filesystem.

This change is deliberately a behavioral mitigation. It does not identify or alter the encoding boundary that produced the damaged source path.

## Goals / Non-Goals

**Goals:**

- Give both ACP surfaces the same concise, actionable recovery guidance.
- Require bounded recovery: inspect a known parent directory with a Unicode-capable tool, use returned filename plus available metadata, then retry.
- Prevent unsafe recovery behavior such as transliteration or filename guessing.
- Preserve the future root-cause options in change documentation.

**Non-Goals:**

- Repair mojibake before it reaches the agent.
- Change ACP transport, Host Bridge file APIs, backend launch commands, or user filesystem layout.
- Promise that an agent can recover when no trustworthy parent directory or metadata is available.

## Decisions

### Put identical guidance in both startup preambles

The packaged `acp_chat_startup_preamble` and `acp_skills_startup_preamble` are the fixed instructions directly prepended for their respective surfaces. Adding the guidance there gives both surfaces the same behavior without changing run-local skill contracts or shared workspace policy.

### Describe recovery behavior instead of prescribing a code-page command

The instruction names a Unicode-capable directory listing and exact returned filenames. It does not tell agents to run `chcp`, change system locale, or set a specific shell's output encoding: those steps do not reverse a path that was already mojibake and differ by backend.

### Keep recovery bounded and identity-preserving

The instruction requires one retry only after evidence from the known parent directory and available metadata. Agents must not transliterate, invent, or substitute filenames; a failed bounded retry remains a normal failure to report.

### Retain root-cause directions as follow-up work

If failures justify a broader change, evaluate: (1) strict UTF-8 and argv-safe backend launch on Windows while avoiding shell path-string interpolation, (2) removal of `cmd.exe` and legacy PowerShell path boundaries where direct executable launch is possible, and (3) handle-first Zotero file delivery with controlled compatibility staging. These are intentionally not included in this change.

## Risks / Trade-offs

- [Prompt guidance cannot repair a path corrupted before agent receipt] → Describe the bounded fallback honestly and retain root-cause directions.
- [Directory listing could select the wrong similarly named file] → Require the exact returned filename plus available extension and task metadata; prohibit guessing.
- [Different ACP backends expose different shell tools] → Specify the semantic recovery action, not a backend-specific command.
