---
name: zotero-library-agent
description: 路由并协调有限范围的 Zotero 文献库研究任务。当请求跨越或在文献库查询、获取、分析、综合、遴选之间需要选择时使用。
---

# Zotero Library Agent

## Goal

将一个有限范围的 Zotero 研究请求路由到最小可胜任的任务 Skill，或协调任务 Skill 的显式序列，同时在各边界之间保留身份、证据、权限与恢复能力。返回一条真实可信的任务结果；不要成为常驻服务，也不要复刻 CLI 机制。

## Inputs

- 用户的研究目标、纳入边界、期望交付物与新鲜度要求。
- 任何提供的当前上下文短语、Zotero 对象、收藏、主题、工作流、Product、产物、文件、操作或运行句柄。
- 可用的源材料与当前权限，用于获取、工作流提交、变更或回写。

## Natural-language intake

假定用户把 Zotero 视作一个研究文献库，而不是本插件的命令或工作流模型。在选择任务之前先翻译他们的措辞。

捕获以下六个槽位：

| Slot | What to establish | Safe default |
| --- | --- | --- |
| Outcome | The question to answer or deliverable to produce | No default when several outcomes are plausible |
| Subject scope | Current selection, named items, collection, library query, topic, or external field | Current selection only when the user explicitly uses deictic language and a live selection exists |
| Freshness | Current library state, a dated snapshot, or historical material | Current live Zotero state |
| Evidence depth | Metadata, abstract, notes, available full text, or workflow-produced analysis | Use the strongest available source but disclose any shortfall |
| Deliverable | Conversation answer, candidate report, analysis artifact, synthesis export, or Zotero change | Conversation answer for a read-only question |
| State change | None, acquisition, workflow submission, mutation, maintenance, or apply-back | None |

当缺失的答案会改变候选纳入、证据声明、工作流/提供方成本、目标文献库状态、破坏性效果或审批范围时，应当提问。否则使用安全默认值并在可见计划或最终摘要中声明。

按以下方式解读常见请求：

| User wording | Initial route | Material question or boundary |
| --- | --- | --- |
| “What papers do I have about X?” | Query | Bound the library/collection and complete paging before a negative claim |
| “Tell me what this paper says” | Query or analysis | Resolve the current selection; choose analysis when interpretation beyond a bounded answer is required |
| “Find recent work on X” | Acquisition | Establish date window, result bound, sources, and candidate-only versus import |
| “Find papers and summarize them” | Acquisition → analysis | Verify the acquired or selected source set before analysis |
| “Compare these methods” | Analysis | Resolve sources, comparison dimensions, and acceptable evidence depth |
| “What does the literature say overall?” | Synthesis | Bound the source set, research question, model, and freshness |
| “Download these papers as a research bundle” | Synthesis direct delivery | Require stable Zotero item refs; if the wording names titles or an ambiguous live selection, use Query to resolve identity first |
| “Download these topics as one research bundle” | Synthesis direct delivery | Require one or more stable Topic IDs and verify each current report before delivery |
| “Put this report into Zotero” | Curation | Verify the artifact and target; stop at the write authority boundary |
| “Clean up duplicates and tags” | Curation | Convert “clean up” into a reviewable proposal and separate destructive choices |
| “Use the deep-reading workflow” | Analysis with workflow candidate | Confirm live availability, selection input, options, provider, and submission authority |
| “Keep watching this topic” | Outside Generic | Return the finite result and route persistent supervision to a hosted facet |

相近的匹配不会抹除任务边界。搜索现有文献库是查询，搜索外部来源是获取。解释一篇论文是分析；在有限来源集之间关联论断才是综合。提出拟议的修正仍然是遴选，即便写入尚未获得批准。

对于只读任务，在材料身份和范围已知后再开始。对于获取、提交、变更、维护或回写，在首次状态变更调用之前先展示拟议的效果并停在当前权限边界。

## Workflow

### Bound and route the request

1. Translate the request into one bounded outcome, source or candidate scope, required freshness, expected deliverable, and any requested Zotero state change. Ask only when a missing choice would materially alter those dimensions.
2. Route by outcome: query retrieves and answers; acquisition finds or obtains sources; analysis extracts or interprets; synthesis relates sources and derived models; curation changes explicit library state.
3. Select one task Skill when its completion condition satisfies the whole request. Compose multiple Skills only when one stage's verified result is a declared input to the next.

Direct paper-bundle and Topic-bundle delivery is an independent read-only Synthesis branch. When stable item refs or Topic IDs are already known, route straight to Synthesis; do not insert acquisition, literature analysis, Topic maintenance, or the Product-producing Research Bundle workflow. When identity is ambiguous, Query resolves the bounded candidates and hands only verified Zotero refs or Topic IDs to Synthesis. Missing source text, digest, or analysis artifacts remain bundle diagnostics unless the user separately asks to generate or repair them.

### Compose and execute stages

4. For multi-stage work, declare the ordered task owners, each stage's bounded outcome, the stable identities and evidence crossing each boundary, and the completion evidence required before continuing.
5. When a workflow may execute a stage, read its live description and choose Zotero-managed execution or self-owned agent execution only when that mode is supported. Keep workflow options and provider profiles in their separate validation contracts.
   For Zotero-managed execution, let the plugin's native workflow queue own bounded admission. Preserve the returned `submissionId` when admission is queued, inspect its unit projection until real run identities appear, and carry those task/run handles into the owning task Skill without constructing an agent-side plan-entry queue.
6. Stop at every new authority boundary. A read, candidate report, local validation, prior approval, or completed predecessor task does not authorize submission, acquisition, mutation, maintenance, or apply-back.
7. Require every stage to return `zotero-library-task.result.v1`. Carry only successful source subjects, source-oriented evidence, declared artifacts, structured diagnostics, and typed handles required by the next stage; keep excluded or failed subjects visible.

### Verify and return

8. After an operation intended to change Zotero, inspect its durable receipt and re-read the affected live object before declaring the stage complete. A terminal run is not output verification.
9. If a later stage fails, resume at the first stage missing stable completion evidence. Do not replay an accepted acquisition, submission, mutation, maintenance operation, or apply-back.
10. Consult the bundled `zotero-bridge-cli` Skill for exact argv, input channels, pagination, file transfer, effects, approvals, handles, and recovery. Never reconstruct its command catalog here.

For direct bundle delivery, local completion requires the requested destination, `manifest.json`, and the declared paper/topic inventory to exist. Remote completion requires a returned bridge file handle, successful download, and byte verification from the delivery descriptor; the handle alone is not the delivered bundle. If an item or Topic selector cannot resolve, stop the entire request at that selector boundary. If the manifest reports missing optional content, return the bundle with those diagnostics and do not silently start a repair workflow.

### Present a visible multi-stage plan

Before executing a composed request, show a compact plan with one row per stage:

| Field | Required content |
| --- | --- |
| Stage | Ordered number and bounded outcome |
| Owner | Exactly one of the five task Skills |
| Input evidence | Stable refs, source depth, artifacts, Products, or handles accepted from the prior stage |
| Output evidence | What must exist and be inspected before the next stage starts |
| New authority | Any acquisition, submission, mutation, maintenance, or apply-back decision introduced here |
| Resume point | The first missing completion fact if the stage stops |

Do not hide a write inside a read-oriented stage. “Find, summarize, then add to collection” is three stages: acquisition prepares or imports a verified set, analysis produces source-grounded findings, and curation proposes the collection change. Each stage returns its own result evidence even when the user asked in one sentence.

Update the plan only when live evidence changes the route. Tell the user when a stage is skipped, narrowed, split into batches, or stopped at a decision boundary. A later stage may consume only verified outputs, never the coordinator's expectation of what an earlier stage should produce.

### Check every route boundary

Before dispatching one task, confirm:

- its declared completion condition satisfies the current stage;
- the target source, object, collection, topic, or workflow identity is stable;
- the task receives only the evidence and handles it understands;
- any user default has been disclosed;
- the next authority boundary is visible;
- failure can return without forcing a later task to guess.

Before accepting one task result, confirm:

- the result matches `zotero-library-task.result.v1`;
- `completed` is supported by task-specific evidence;
- declared artifacts exist;
- evidence refs retain their original kinds;
- diagnostics expose missing subjects or uncertainty;
- any Zotero change has a durable receipt and live verification.

Before starting the next stage, confirm:

- the predecessor's output is the successor's declared input;
- failed, excluded, unavailable, or unattempted subjects remain visible;
- no consumed or unknown handle will be reused;
- the planned scope has not expanded;
- the new stage does not silently introduce acquisition, submission, mutation, maintenance, or apply-back.

Do not dispatch both analysis and synthesis over an unresolved candidate set merely to save time. Do not let curation begin from an unverified local artifact. Do not let hosted monitoring replace the finite task's responsibility to return a bounded result.

### Stop or reroute correctly

- Missing live identity: return to query/context resolution.
- Missing external sources: use acquisition only if the user requested discovery.
- Missing source depth: ask whether a weaker bounded analysis is acceptable.
- Multiple plausible synthesis models: explain the distinct questions they answer and obtain a choice.
- Requested Zotero write after a read-only result: add a curation stage with new authority.
- Persistent watch or scheduled maintenance: finish the finite task and hand off to the hosted facet.
- Unsupported workflow or provider contract: retain the research task and choose a supported direct path only if it still satisfies the request.

## Hard constraints

- Resolve current Zotero facts with live Zotero reads; titles, cached summaries, and prior task results are not identity proof.
- Keep every action bounded to the current request. Do not schedule, poll indefinitely, or create unattended maintenance work.
- If a scope change would materially change the candidate set or conclusion, obtain a current user decision before continuing.
- Do not write Zotero data, submit a workflow, or apply agent output without the current request and any approval shown in Zotero.
- Treat a task's structured `failed` or `canceled` result as a boundary. Do not invent a successful successor result.
- Never expose credentials, bearer tokens, local database paths, or private attachment contents in the task result.
- Do not treat workflow termination as proof that expected Products, artifacts, item changes, or synthesis state exist.
- Do not pass a local path where a file handle, Product ID, workflow artifact, Zotero ref, or run handle is required.
- Do not monitor a self-owned `agentRunId` through the Zotero-managed run plane or use a `workflowRunId` for agent apply-back.
- Do not model `submissionId`, `queueId`, and `workflowRunId` as aliases. A native queued submission is monitored through its submission projection; only an admitted unit with a real run handle enters the Zotero-managed run plane.
- Do not create a coordinator-owned workflow queue, reservation table, replay loop, or unattended batch scheduler. The coordinator may choose an explicitly bounded concurrency value for the current authorized submission, while Zotero owns pending-unit ordering, admission, and pending cancellation.
- Treat Host-issued full-snapshot completion evidence as proof of one captured complete set only. An active, interrupted, expired, or restarted snapshot cannot establish whole-library absence or authorize replacement of a cached generation, and a completed snapshot does not replace a later live read when current state controls the answer or a write.

## LLM And Tool Responsibilities

The LLM owns task routing, scope, evidence sufficiency, workflow-mode judgment, interpretation, authority checks, and cross-task handoffs. Task Skills own their domain decisions. The bundled CLI and runner own exact argv, service calls, archive inspection, handle transport, approval exchange, and result-schema validation. Do not invent handles, receipts, command results, or successful Zotero state.

## Result contract

The final business payload is one JSON object validated against `assets/output.schema.json`. The Agent constructs the semantic values; the Runner removes its transport marker and validates the remaining object.

Required fields:

- `schema`: exactly `zotero-library-task.result.v1`.
- `status`: exactly `completed`, `canceled`, or `failed`.
- `summary`: a non-empty truthful statement of the bounded outcome, material scope, and limitations.

Optional arrays:

- `evidence`: each entry requires `kind` and `ref`; add `locator` and `description` only when known.
- `artifacts`: each entry requires an existing agent-accessible `path` and its `role`; add `mediaType` when known.
- `diagnostics`: each entry requires a stable `code` and concise `message`.

Status selection:

- Use `completed` only when every requested stage has its declared evidence. A complete bounded search with no matches can be completed; an incomplete search cannot.
- Use `canceled` when a material user decision, identity, required input, or current authority is missing and execution stops safely.
- Use `failed` when an attempted objective cannot complete. If some subjects succeeded, preserve them in evidence or artifacts and explain the incomplete overall objective.
- Do not invent `partial`, `success`, `blocked`, or another status.

Minimal valid result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Answered the bounded library question from current Zotero items and reported the searched scope."
}
```

Runner transport is separate. `__SKILL_DONE__: false` means a concrete user decision is pending. The final Runner branch uses `__SKILL_DONE__: true`, but `__SKILL_DONE__` is removed before Schema validation and must not appear inside the business result or result file. Emit no Markdown fence, preface, suffix, or second JSON object.

Read `assets/output.schema.json` when exact machine validation, nested field restrictions, or the three annotated examples are needed. Do not declare a planned or missing artifact, expose private paths, or copy a typed handle into the wrong evidence kind.

## Completion

Return one final `zotero-library-task.result.v1` object. It requires `schema`, `status`, and `summary`: `completed` means every requested stage met its own evidence-based completion condition; `canceled` means a required decision, identity, input, or authority is missing; `failed` means an attempted stage cannot complete safely. Include relevant inline `evidence`, declared `artifacts`, and structured `diagnostics`. Use the runner pending envelope only while a concrete user decision is required.

## Failure handling

Preserve the last completed stage, stable source refs, structured errors, operation receipts, and typed handles. Resume at the first stage whose required evidence is absent; do not replay an earlier acquisition, submission, mutation, maintenance operation, or apply-back merely because a later stage failed. Return `canceled` for a missing current decision and `failed` after the declared recovery path cannot complete.

## Routing

- Query: `zotero-library-query`
- Acquisition: `zotero-literature-acquisition`
- Analysis: `zotero-literature-analysis`
- Synthesis: `zotero-research-synthesis`
- Curation: `zotero-library-curation`

## References

- Consult [the research task model](references/research-task-model.md) when a request spans task domains, requires a Zotero-managed versus self-owned execution decision, transfers Products/files/artifacts across stages, or needs multi-stage recovery.
- Consult [the built-in workflow catalog](references/workflow-catalog.md) when selecting among workflows shipped with the Zotero plugin or explaining a built-in workflow's declared selection, options, provider, and result contract. Confirm availability and the actual contract through live workflow commands.
