## Context

ACP Chat and ACP Skills provide fixed startup instructions before task-specific prompts. On Windows, those agents can invoke command-line tools through PowerShell, where inline structured values and path-containing values are vulnerable to an additional quoting and escaping boundary.

## Goals / Non-Goals

**Goals:**

- Give both ACP surfaces the same concise `@file` preference when the invoked tool or script supports that form.
- Make the rule conditional so agents do not invent unsupported command syntax.

**Non-Goals:**

- Change PowerShell, ACP transport, CLI argument parsers, or existing `@file` contracts.
- Require `@file` for simple values or tools that do not document it.

## Decisions

### Place identical guidance in both fixed startup preambles

The startup preambles are directly prepended for ACP Chat and ACP Skills. A shared sentence there covers normal task execution without changing run-local skill instructions, individual CLI documentation, or backend-specific code.

### Prefer the target tool's documented `@file` form conditionally

The instruction applies only when the invoked CLI or script supports `@file`. This reduces inline quoting pressure for structured or path-containing values without claiming that `@file` is a universal PowerShell feature.

## Risks / Trade-offs

- [An agent may overapply the syntax] → State explicitly that the target tool or script must support the form.
- [A file itself can use an unsafe path] → This is a prompt-level mitigation only; agents still need a safely addressable file path.
- [Simple arguments become unnecessarily indirect] → Scope the preference to structured or path-containing values passed through PowerShell.
