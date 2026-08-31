# 多问题用户交互工具调研

日期：2026-08-26

## 问题

Agent 一次提出多个问题时，成熟实现如何组织工具协议、待处理请求、UI 草稿、答案修改、最终提交和跨进程恢复？需要特别区分：

1. 一个工具调用内含多个问题；
2. 一个 assistant 工具批次内含多个独立询问调用；
3. UI 是否把这些请求合并为一个可编辑表单；
4. 恢复时如何把答案送回原始 `toolCallId`。

## 一手资料矩阵

| 实现 | 多问题形状 | 多个 pending call | UI / 提交 | 恢复身份 |
| --- | --- | --- | --- | --- |
| Claude Code | 一个 `AskUserQuestion` 调用携带 1–4 个 `questions[]`；每题含 `question`、`header`、`options` 和 `multiSelect` | 官方问答工具资料没有要求模型并发发出多个 AskUserQuestion 调用 | 工具一次返回整组 answers；官方资料证明多题和多选，但没有足够证据把所有编辑/Review 细节写成协议保证 | answers 属于该 AskUserQuestion 调用 |
| Gemini CLI | 一个 `ask_user` 调用携带 1–4 个问题，支持 choice、text、yes/no 与多选 | 工具层以一次调用的一组问题为主 | 明确存在逐题草稿、Review、返回修改与最终 Submit | 工具结果按问题位置返回整组 answers |
| OpenCode | 一个 `question` 调用携带 `questions[]` | 工具服务以一个 request 接收一组问题 | 官方文档明确允许在多题间导航，最后统一提交 | 工具 metadata 返回与原调用关联的 answers |
| PydanticAI | 每个 deferred tool call 可独立存在 | `DeferredToolRequests.calls` / `approvals` 可同时包含多个调用；可以解决全部或子集 | UI 由宿主实现；框架不规定表单形状 | `DeferredToolResults` 以 `tool_call_id` 字典回填；外部恢复用 conversation identity 关联新 run |
| OpenAI Agents SDK | HITL interruption 对应独立工具调用 | 一次暂停返回全部 pending `interruptions[]`；允许只处理其中一部分 | UI 由宿主实现；可逐项决定或批量处理 | 决定写入可序列化 `RunState`，以原 interruption/call 身份恢复 |

### Claude Code

Claude Code 的 `AskUserQuestion` 原生支持一次调用提出一到四个问题；每题有短标题、选项和可选的多选标志。答案作为整组结果返回。证据见 Anthropic 官方 [Hooks reference](https://code.claude.com/docs/en/hooks#askuserquestion)、[Agent SDK user-input guide](https://code.claude.com/docs/en/agent-sdk/user-input) 和官方仓库的 [interactive command patterns](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/command-development/references/interactive-commands.md)。

这些资料支持“一个调用内含多个问题”，并不证明 Claude Code 依赖运行时把多个独立 AskUserQuestion tool call 猜测性合并。

### Gemini CLI

Gemini CLI 的 `ask_user` 同样接收 `questions[]`，数量为一到四，支持单选、多选、自由文本和确认。调用会暂停执行，最终把整组答案返回给模型。见官方 [Ask User Tool 文档](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/ask-user.md) 和 [`ask-user.ts`](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/tools/ask-user.ts)。

其 UI 源码提供了最明确的 Review/修改/提交证据：`AskUserDialog` 保存独立 answers 草稿和 submitted 状态；Review 页面展示所有回答，允许返回修改，最后统一 Submit。见官方 [`AskUserDialog.tsx`](https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/ui/components/AskUserDialog.tsx)。

### OpenCode

OpenCode 的 `question` 工具也以 `questions[]` 为输入。官方文档明确说明，多题时用户可以在问题间导航，完成后统一提交。工具实现把 answers 作为原 tool call 的结果和 metadata 返回。见官方 [Tools 文档](https://opencode.ai/docs/tools/#question) 与 [`question.ts`](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/tool/question.ts)。

### PydanticAI

PydanticAI 展示了另一层能力：一次 Agent 暂停可携带多个独立 deferred call。`DeferredToolRequests` 收集调用，`DeferredToolResults.calls` 以每个 `tool_call_id` 为键回填结果；handler 可以处理全部或只处理一部分，未解决的继续向外冒泡。外部 UI 场景会结束当前 run，随后以原消息历史、deferred results 和 conversation identity 启动恢复 run。见官方 [Deferred Tools](https://github.com/pydantic/pydantic-ai/blob/main/docs/deferred-tools.md) 和 [API reference](https://pydantic.dev/docs/ai/api/pydantic-ai/tools/)。

### OpenAI Agents SDK

OpenAI Agents SDK 的 approval HITL 会在一个 turn 结束时返回全部 pending `interruptions[]`。调用方可以一次解决全部，也可以只解决其中一部分；状态可序列化，并以同一个 `RunState` 恢复。它证明框架层应能表达多个并列待处理调用，但没有规定必须采用何种问答 UI。见官方 [Human-in-the-loop guide](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/) 和 [Results guide](https://openai.github.io/openai-agents-js/guides/results/#interruptions-and-resumable-state)。

## 判断

用户提出的产品方向成立：成熟 coding agent 确实常见多问题、逐题编辑、Review 和统一 Submit。此前从单值 `AssistantPendingInteraction` 推导“每个 owner 只允许一个问题”是把现有 UI 投影误当成领域约束，应撤销。

需要修正的一点是：成熟工具通常优先让一次 ask-user 调用携带 `questions[]`。框架层可以同时承载多个独立 deferred call，但“将多个调用聚合成一个 UI”属于宿主产品能力，不应靠丢失调用身份或合并 tool result 来实现。

## 对 Built-in Pi Agent Runtime 的建议

### 两层批处理

1. 模型侧的通用 `ask_user` 工具原生接收 `questions[]`。系统提示词优先要求模型在一次调用中组织相关问题。
2. Runtime 仍允许同一 assistant tool batch 出现多个 `ask_user` call，并将它们收集到一个持久化 `UserInteractionBatch`。
3. UI 把 batch 中所有调用的问题展平为一个交互流程，支持逐题回答、前后导航、修改草稿、Review 和最终 Submit。
4. Submit 后按原调用分组，生成一个 `toolResult` 对应一个原始 `toolCallId`；不能把多个调用压成一个伪造 tool result。

### 最小持久化模型

```ts
type UserInteractionBatch = {
  batchId: string;
  ownerId: string;
  turnId: string;
  assistantMessageId: string;
  status: "collecting" | "submitted" | "dismissed";
  calls: UserInteractionCall[];
  draftAnswers: Record<string, UserInteractionAnswer>;
};

type UserInteractionCall = {
  toolCallId: string;
  callIndex: number;
  questions: UserInteractionQuestion[];
};

type UserInteractionQuestion = {
  questionId: string;
  kind: "choice" | "multi_choice" | "text" | "confirm" | "files";
  prompt: string;
  header?: string;
  options?: UserInteractionOption[];
  required: boolean;
};
```

`questionId` 必须是稳定身份，不能用问题文本或数组位置充当恢复主键。`toolCallId` 保留模型协议身份；`batchId` 只负责产品 UI 聚合。草稿答案属于产品持久化状态，只有最终 Submit 才产生 tool results 并恢复 Agent loop。

### 与现有实现的关系

当前 `AssistantPendingInteraction | null` 只能作为旧 ACP 路线或单问题投影，不能继续充当新领域模型的唯一事实源。新的共享 Assistant Workspace wire 应投影整个 interaction batch；ACP 的单问题 pending 可适配为一个 batch、一个 call、一个 question，从而逐步共享 UI，而无需改写 ACP 的既有收敛协议。

## 尚待决定

- Submit 是否要求所有 `required` 问题完成，是否允许 optional 问题留空。
- 用户 dismiss 是向每个 call 返回取消结果、保持 pending，还是取消当前 Agent turn。
- 单次调用和整个 batch 的问题数量上限。
- 是否允许分批提交；建议 MVP 仅保存草稿并原子提交整个 batch，减少部分恢复状态。
