# Design

## Compatibility Boundary

`skillrunner.job.v1` remains the workflow-facing contract. The provider
registry treats it as compatible with both:

- `skillrunner` backend -> `SkillRunnerProvider`
- `acp` backend -> `AcpProvider`

ACP chat remains `acp.prompt.v1` and is not affected by the workflow runner.

## Runner Lifecycle

The ACP runner creates a run context with:

- a deterministic request id,
- an isolated workspace,
- a plugin-side skill registry entry,
- an agent-family-specific skill injection plan,
- a structured output contract,
- runtime dependency status.

The orchestrator materializes the skill, builds a prompt, creates an ACP task
session, sends the prompt, reads `result/result.json`, validates it, and sends
repair prompts until the result is valid or the repair limit is reached.

## Agent Skill Roots

Agent family is resolved by:

1. explicit backend `acp.agentFamily`,
2. backend id/displayName,
3. backend command/args,
4. fallback `unknown`.

Default roots:

- `codex`: `.agents/skills`, `.codex/skills`
- `claude-code`: `.claude/skills`
- `opencode`: `.agents/skills`, `.claude/skills`
- `gemini-cli`: `.agents/skills`, `.gemini/skills`
- `qwen-code`: `.qwen/skills`
- `unknown`: `.agents/skills`

`backend.acp.skillRoots` may override the default roots.

## uv Dependency Injection

When the skill manifest declares `runtime.dependencies`, the workflow-run ACP
launch plan is wrapped as:

```text
uv run --with <dependency> ... -- <original acp command> <original args>
```

The wrapper is never applied to ACP chat. Before using the wrapper, the runner
probes `uv run --with ... -- python -c ...`. Probe failure fails the run with a
clear `runtime_dependencies_injection_failed` diagnostic instead of silently
continuing in an incomplete environment.

## Output Contract

The runner expects `result/result.json` under the run workspace. The initial
implementation validates JSON shape and, when an output schema is available,
validates against that schema. On failure, the runner sends a repair prompt with
the validation error and output path. Repair is bounded to three rounds.

