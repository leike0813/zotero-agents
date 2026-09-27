# Mature Agent loop-budget defaults

Date: 2026-08-26

## Research question

Which published defaults from mature Agent runtimes are relevant when choosing the Built-in Pi Skill Run MVP limits for model turns, total tool calls, tool calls in one assistant batch, and repeated no-progress tool calls?

The figures below distinguish product or framework defaults from examples and optional configuration. The units are not always equivalent: a model turn, graph step, multi-agent message, and tool execution should not be compared as if they were the same counter.

## Primary-source findings

### Pi Agent Core 0.84.3

The pinned Pi core does not expose a `maxTurns`, `maxToolCalls`, or repeated-call limit. It provides loop hooks and cancellation primitives, leaving budgets to the embedding product. This means the Zotero integration must choose and persist its own effective limits rather than assuming an upstream Pi default.

Sources:

- [Pi Agent Core types at v0.84.3](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/types.ts#L360-L375)
- [Pi Agent loop at v0.84.3](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/agent-loop.ts#L205-L264)

### OpenAI Agents SDK for JavaScript

The SDK's documented `maxTurns` default is **10**. Reaching it raises `MaxTurnsExceededError`. A turn is an iteration of the model loop, not one tool execution; one response may contain several tool calls.

The SDK exposes `toolExecution.maxFunctionToolConcurrency`, but leaving it unset or `null` starts all local function calls emitted in that turn. This is a concurrency control, not a default per-batch call-count cap. The public run options do not document a default total-tool-call budget or repeated-identical-call detector.

Sources:

- [OpenAI Agents SDK: run arguments and `maxTurns`](https://openai.github.io/openai-agents-js/guides/running-agents/#run-arguments)
- [OpenAI Agents SDK: tool execution configuration](https://openai.github.io/openai-agents-js/guides/running-agents/#run-config)

### PydanticAI

The current `UsageLimits` source sets `request_limit` to **50**. Its `tool_calls_limit` default is **None**, so the framework does not impose a total tool-call limit unless the embedding application supplies one.

When a total tool-call limit is configured, PydanticAI checks the projected usage before running the next call or parallel batch. Its documentation says a parallel batch that would exceed the remaining limit executes no tools. This fail-before-batch behavior is relevant to avoiding a partially executed side-effect batch.

PydanticAI separately gives tool argument validation and `ModelRetry` a built-in retry budget of **1** per tool unless overridden. That is a schema/error retry policy, not a detector for repeated successful calls and not a general Agent-loop budget.

Sources:

- [PydanticAI `UsageLimits` source](https://github.com/pydantic/pydantic-ai/blob/main/pydantic_ai_slim/pydantic_ai/usage.py#L379-L416)
- [PydanticAI usage limits and parallel-batch behavior](https://github.com/pydantic/pydantic-ai/blob/main/docs/agent.md#usage-limits)
- [PydanticAI tool retry precedence and built-in default](https://github.com/pydantic/pydantic-ai/blob/main/docs/tools-advanced.md#which-retry-limit-wins)

### CrewAI

CrewAI documents `Agent.max_iter` with a default of **20**. It describes the value as the maximum iterations before the Agent must provide its best answer. The separate error retry limit defaults to 2, so it must not be treated as evidence for a repeated-tool threshold.

Source:

- [CrewAI Agent attributes](https://github.com/crewAIInc/crewAI/blob/main/docs/en/concepts/agents.mdx#agent-attributes)

### Gemini CLI

Gemini CLI provides several useful but differently scoped reference points:

- The main interactive session setting `model.maxSessionTurns` defaults to **-1**, meaning unlimited. It is a session-history control and is not a suitable autonomous-task budget by itself.
- The built-in non-interactive generalist subagent uses **20 turns** and a ten-minute time limit.
- The experimental browser subagent uses `maxActionsPerTask = 100`, explicitly described as a runaway-prevention tool-call limit.
- Its deterministic loop detector hashes tool name plus JSON arguments. It detects a cycle of length 1 through 5 after that cycle repeats **5 times**.
- The same detector checks repeated streamed text separately. It can also invoke an LLM-based semantic loop check after 30 turns, at a 0.9 confidence threshold. That model-judged layer is substantially more complex and is not necessary for a deterministic MVP guard.

Sources:

- [Gemini CLI settings: `maxSessionTurns` and loop detection](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/settings.md#model)
- [Gemini CLI generalist subagent definition](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/agents/generalist-agent.ts)
- [Gemini CLI browser subagent action limit](https://github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md#browser-agent)
- [Gemini CLI loop detector constants and algorithm](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/loopDetectionService.ts#L26-L60)
- [Gemini CLI repeated tool-cycle check](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/loopDetectionService.ts#L285-L319)

### LangGraph

LangGraph illustrates why graph-step limits are poor numeric peers for a model-loop limit. Older JavaScript API material lists a recursion default of 25, while current documentation says version 1.0.6 raised the default to **1000 graph steps**. One model turn may traverse several nodes, and some graph nodes may not call a model at all.

Source:

- [LangGraph recursion-limit documentation](https://langchain-ai.github.io/langgraph/how-tos/configuration/#recursion-limit)

### AutoGen

Current AutoGen group-chat types default `max_turns` to **None**, meaning no limit unless the host supplies a termination condition or explicit maximum. AutoGen also offers message, token, timeout, and handoff termination conditions rather than prescribing one universal iteration budget.

Sources:

- [AutoGen `SelectorGroupChat` source and defaults](https://github.com/microsoft/autogen/blob/main/python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py)
- [AutoGen termination conditions](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/termination.html)

### Claude Code and Codex CLI

Claude Code officially exposes `--max-turns` for non-interactive runs, but its CLI reference does not publish a general product default. Examples using 3, 5, or 10 turns are examples, not evidence of one stable default across Claude Code, the Agent SDK, subagents, and GitHub Actions wrappers.

Codex's public repository contains an open request to add deterministic `--max-agent-turns` support. That issue is evidence that callers want such a limit, but an issue request is not a product contract or a trustworthy source for choosing a default. Neither product contributes a defensible numeric default to this decision.

Sources:

- [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage)
- [Codex request for deterministic execution budgets](https://github.com/openai/codex/issues/33294)

## What the survey does and does not establish

There is no industry-standard number. Published model-loop defaults range from 10 to 50 where a default exists, while several mature systems default to unlimited or use graph-specific counters that are not comparable. Total tool-call defaults are even less common.

The most relevant coding/autonomous-agent precedents cluster around:

- **10–20 model turns** for a bounded single task in OpenAI Agents SDK, CrewAI, and Gemini's generalist subagent;
- **100 tool actions** for Gemini's bounded browser task;
- **5 repeated cycles** for Gemini CLI's deterministic repeated-tool detector.

No surveyed primary source establishes **16 calls per assistant batch** as a mature default. A per-batch numeric cap also overlaps poorly with Provider-native parallel calls. The stronger pattern is to check a total remaining tool budget before dispatching the complete batch, then separately cap execution concurrency.

## Recommendation for Built-in Pi Skill Runs

Use explicit product defaults rather than claiming an inherited or industry-standard Pi behavior:

| Guard | MVP default | Rationale |
| --- | ---: | --- |
| Model turns | 20 | Matches CrewAI and Gemini's bounded generalist; more room than OpenAI Agents SDK's 10 without approaching PydanticAI's broad 50-request ceiling. |
| Attempted tool calls | 100 | Matches Gemini's autonomous browser-task action ceiling and provides a separate bound when one model response emits several calls. |
| Repeated no-progress cycle | 5 repetitions | Uses Gemini CLI's production deterministic threshold and supports cycles, not only one identical call. |
| Cycle length inspected | 1–5 calls | Matches Gemini CLI's deterministic detector while remaining cheap and explainable. |
| Calls per assistant batch | No separate numeric default | Preflight the whole batch against the remaining 100-call budget; concurrency belongs to Tool Gateway execution policy. `submit_skill_result` remains batch-exclusive for its own contract reason. |

The 20/100/5 values are a project recommendation inferred from the closest precedents, not a universal consensus.

### Counting and failure semantics

- Count one model turn for each model request/response iteration attempted by the Pi loop.
- Count every dispatched tool attempt, including validation or execution failures, because failed loops still consume resources. This is intentionally stricter than PydanticAI's successful-call counter.
- Before executing a parallel batch, project the whole batch against the remaining total. If it would exceed the limit, execute none of its tools and stop with `agent_loop_limit_exceeded`.
- Detect exact deterministic cycles using tool name, canonical arguments, result category, and a digest of relevant progress state. A changed target or changed progress state breaks the cycle.
- Do not add fuzzy argument matching or an LLM-as-loop-judge to the MVP. Total budgets catch varying pathological calls, and deterministic detection remains auditable.
- Persist counters and effective limits in the Skill Run record. Restart, user interaction, and deferred continuation do not reset them.
- Trusted backend configuration may override the defaults. Workflow/job/Skill input may only request a lower budget.
- Exhaustion before result sealing fails the run with `agent_loop_limit_exceeded`; exhaustion after a sealed result records diagnostics without downgrading success.

This combination supplies a coarse ceiling and an earlier deterministic fuse without introducing an output-repair loop or a second Skill-specific state machine.
