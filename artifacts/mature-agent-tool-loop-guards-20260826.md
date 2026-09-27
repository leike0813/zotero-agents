# Mature Agent tool-loop guards and terminal tools

Date: 2026-08-26

## Question

When a Pi Skill Run reports `completed` or `pending` through dedicated tools, can a general repeated-tool-call circuit breaker replace a separate output-repair loop? This note distinguishes semantic repetition detection, hard usage budgets, tool argument validation, structured-output retries, and terminal-tool behavior.

## Findings

### Pi Agent Core 0.84.3

The pinned Pi core already supports clean terminal-tool behavior. An `AgentToolResult` may set `terminate: true`; the loop skips the automatic follow-up model call when every finalized result in that tool batch carries the flag. It also exposes `shouldStopAfterTurn`, which can stop after observing the completed assistant turn and tool results. See the tagged [`AgentToolResult` contract](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/types.ts#L360-L375) and [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/agent-loop.ts#L205-L264), including the batch rule in [`shouldTerminateToolBatch`](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/agent-loop.ts#L580-L584).

Pi validates tool arguments and returns a tool error for invalid arguments, allowing the normal model/tool loop to react. The 0.84.3 Agent package does not expose a `maxTurns`, `maxToolCalls`, or semantic duplicate-call detector. A product embedding Pi must therefore enforce its own run budgets and any no-progress policy above the SDK loop.

The batch termination rule matters for control tools: if a model emits a terminal control tool together with another non-terminal tool, Pi will not terminate from the result flag alone. The embedding runtime must reject mixed terminal/non-terminal batches, serialize these control tools, or stop through `shouldStopAfterTurn` after preventing later side effects.

### OpenAI Agents SDK

The OpenAI Agents SDK exposes `toolUseBehavior`, including stopping on the first function tool or selected tool names. It resets forced tool choice after a call by default to reduce repeated forced-tool loops. Separately, each run has a `maxTurns` safety limit that raises `MaxTurnsExceededError`. These are termination configuration and a total-turn budget, not semantic comparison of repeated arguments. See the official [agent tool-use behavior](https://openai.github.io/openai-agents-js/guides/agents/#forcing-tool-use) and [run limits](https://openai.github.io/openai-agents-js/guides/running-agents/#run-arguments).

### PydanticAI

PydanticAI keeps three mechanisms distinct:

- `request_limit` and `tool_calls_limit` bound a run and stop runaway loops.
- Tool argument validation errors and `ModelRetry` return corrective feedback to the model under a per-tool retry budget.
- Structured output has its own output retry budget, including per-output-tool limits.

The official docs explicitly describe these separate counters and failure modes in [Usage Limits](https://ai.pydantic.dev/agent/#usage-limits), [Retries](https://pydantic.dev/docs/ai/core-concepts/retries/), and [Advanced Tool Features](https://pydantic.dev/docs/ai/tools-toolsets/tools-advanced/). This is strong evidence that a hard tool-call cap does not by itself replace schema validation or define terminal-output semantics.

### LangChain and LangGraph

LangChain provides model-call and tool-call limit middleware. Limits may apply per run, per thread, globally, or to a named tool; exhaustion may continue with an error result, end, or throw. The middleware counts calls rather than comparing the semantic equality of consecutive arguments. LangGraph separately enforces a graph-step recursion limit. See the official [built-in middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in) and [LangGraph recursion-limit documentation](https://langchain-ai.github.io/langgraph/how-tos/configuration/#recursion-limit).

## Assessment

“Mature Agents generally have a repeated-call circuit breaker” is accurate only at low resolution. Mature frameworks commonly provide hard turn, request, graph-step, or tool-call budgets and extension hooks. A built-in detector for “the same tool with the same or near-equivalent arguments without progress” is not a common portable primitive.

A repetition detector also cannot cover every missing-terminal case:

- A valid terminal control call already ends the turn, so it cannot normally repeat.
- Repeated invalid terminal calls can be stopped by ordinary per-tool/run budgets.
- Varying invalid calls may evade exact duplicate detection but still consume a budget.
- A model that emits only text and never calls a terminal tool produces no repeated tool call to detect.

## Recommendation for Pi Skill Runs

Do not add a Pi Skill Run-specific output-repair state machine or hidden corrective model turns.

1. `complete_skill_run` and `request_user_input` remain strict, dynamically prepared tools. Schema validation is mandatory; it is contract enforcement, not a separate repair workflow.
2. A valid control-tool result sets `terminate: true` and records the authoritative candidate outcome. Control tools are sequential, and a terminal control call mixed with other calls in one assistant message is rejected fail-closed before later side effects execute.
3. Invalid arguments return the normal structured Pi tool error. The model may correct them only within the already-running Agent loop and the ordinary run budget. There is no additional Skill Finalizer retry counter or injected repair prompt.
4. The Built-in Pi Runtime lifecycle layer enforces general limits for model turns and total tool calls. It may add a conservative no-progress detector later, but MVP correctness must not depend on fuzzy argument equivalence.
5. If Pi reaches `agent_end` without an accepted terminal control tool, the Pi Skill Run fails with a typed `terminal_signal_missing` result. It is not inferred from assistant text and is not automatically re-prompted.
6. Exhausting the general loop budget fails with a typed `agent_loop_limit_exceeded` result. The failure retains bounded, redacted diagnostics and permits an explicit user retry; it does not become `pending` automatically.

This keeps the finalization state machine small: `running` accepts one validated control signal and moves to `completed` or `pending`; cancellation and general loop exhaustion move to their own terminal failures. The shared Skill Run Finalizer still validates and maps the accepted outcome, while loop budgets remain a responsibility of the runtime lifecycle layer.
