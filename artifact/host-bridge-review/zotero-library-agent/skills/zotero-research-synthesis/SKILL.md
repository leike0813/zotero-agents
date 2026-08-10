---
name: zotero-research-synthesis
description: Synthesize bounded Zotero literature into traceable research context. Use when a user needs evidence-backed topic, claim, graph, gap, or cross-source synthesis for a current question.
---

# Zotero Research Synthesis

## Goal

Relate a bounded set of verified Zotero sources and derived research structures to a question, topic, claim, graph, gap, or export outcome while preserving source disagreement, model provenance, freshness, and stage-specific completion evidence.

## Inputs

- A research question plus a topic, claim, graph, index, resolver selector, artifact, Product, or resolved source set.
- Inclusion rules, desired synthesis model and deliverable, and required freshness.
- Current authority for workflow submission, derived-state maintenance, export, persistence, or agent apply-back.

## Natural-language intake

Translate broad wording such as “what does the literature say,” “map this field,” “find the gap,” or “update the topic” into a bounded source set, research question, synthesis model, and deliverable.

| User wording | Initial route | Material boundary |
| --- | --- | --- |
| “What does the literature say about X?” | Source-grounded synthesis | Bound the included Zotero sources and the question being synthesized |
| “How are these papers related?” | Comparative or graph-assisted synthesis | Decide whether relationships come from source claims, citations, computed graph edges, or interpretation |
| “What are the research gaps?” | Gap synthesis | Define corpus, time boundary, evidence standard, and whether missing coverage is distinguishable from a real gap |
| “Create a topic for X” | Synthesis workflow candidate | Establish source set, topic identity, workflow options, and submission authority |
| “Refresh this topic and tell me what changed” | Maintenance then synthesis | Diagnose stale model and scope; obtain separate maintenance authority |
| “Export the synthesis” | Product/artifact delivery | Identify the expected export, format, Product/asset, and local destination |
| “The graph has no X; update it” | Diagnosis before maintenance | An empty result does not itself justify refresh or graph mutation |

Capture:

- the research question and intended decision;
- the verified source set and inclusion/exclusion rules;
- source freshness and required derived-model freshness;
- synthesis form: narrative, claim table, topic report, citation graph, gap map, timeline, resolver result, or export;
- disagreement and uncertainty treatment;
- workflow or direct-read preference when both are supported;
- requested maintenance, persistence, export, or apply-back effects.

Ask when:

- the source set or research question is not bounded;
- several models could answer different questions;
- derived state is stale and a maintenance action would change it;
- graph structure could be mistaken for scholarly agreement or causality;
- a workflow/provider choice changes execution, cost, or output;
- “save,” “publish,” “attach,” or “update” introduces a new state-change boundary.

Safe defaults:

- synthesize from current verified Zotero sources without maintenance;
- preserve disagreement and missing evidence;
- use a narrative answer unless a structured deliverable is requested;
- inspect model status before using a derived view;
- keep generated output outside Zotero unless a later curation/apply-back stage is authorized.

There is no safe default for source inclusion, topic identity, maintenance scope, causal interpretation, workflow submission, export target, persistence, or apply-back.

## Workflow

### 选择 Synthesis 或直接交付

当用户需要已经识别的 Zotero 论文或现有 Topic 的可移植文件，且没有要求新的研究选材、面向稿件的 Product、生成分析或刷新模型时，使用直接研究包分支。论文研究包聚合请求的条目，包含可移植元数据、优先的 Markdown 正文及其有效本地图片或 PDF 回退，以及每项可用的 digest、references、citation-analysis 和 literature-score 工件。Topic 研究包包含每份当前报告，并为每个关联的规范 `libraryId:itemKey` 全局去重 digest；导出的报告副本会把通过校验的参考文献标记链接到这些 digest 路径，不修改已存储的 Topic 报告。

必须提供稳定条目引用或 Topic ID。请求给出标题、模糊短语或含糊选择时，把身份解析交给 Query，并且只用它验证过的有序选择器继续。不得用直接分支发现论文、生成缺失分析、刷新陈旧 Topic 或创建更广泛的面向稿件 Research Bundle Product。可选来源/工件缺失属于 manifest 警告；选择器无法解析则整个请求失败。

本地 Host 连接要求目标目录不存在或为空，并验证生成的 `manifest.json`、`index.md`、请求的报告/论文清单和诊断。远程连接不得发送客户端本地输出路径：保留返回的 bridge-download handle，执行所提供的下载步骤，验证返回的大小/checksum 证据，并且只在字节验证后解包。不得仅根据 handle 签发报告完成。handle 过期时，用同一组已验证选择器重新执行只读导出；本地目标非空时，选择新的或已清空的目录，不得覆盖。

### Establish source and model boundary

1. State the research question, inclusion and exclusion rule, required freshness, and intended deliverable. Resolve every source ref and the exact topic, graph, index, resolver selector, artifact, Product, or schema used.
2. Select the derived model that actually answers the question. Record its identity, scope, paging completion, freshness status, and any missing source coverage before interpreting it.
3. Distinguish direct source claims, current Zotero facts, notes/annotations, computed relationships, workflow-produced interpretation, your inference, disagreement, and evidence gaps.

对论文级综合材料，将 `digest`、`references`、`citation_analysis` 和 `literature_score` 视为一组四件套工件。在读取或导出 payload 前先检查 `paper_artifacts.get_manifest`。只有在确实需要完整集合时才省略 `artifact_types`；任务只需较少工件时使用明确过滤器。只有四行全部可用时，论文工件才算完整。即使其他三行可用，缺失或无效的 literature score 仍使覆盖保持 partial。

Manifest 中的 `literature_quality` 快照记录评分状态、schema/rubric 身份、论文类型、分数、置信度、中性化质量先验、payload hash 和诊断。将该固化快照用作论文内在质量证据，不要以新的主观质量标签取代它。评分缺失或无效时使用中性先验，并在诊断中明确保留。Topic 相关性、Research Bundle 候选资格、证据角色、分歧和 claim 支持仍需要任务特定判断；质量不得扩展选定的来源边界，也不能单独成为硬过滤依据。

### Separate read, workflow, and maintenance

4. Synthesize directly from supported reads when no reusable execution contract is needed. Use a live-described workflow when it owns the requested provider execution or multi-artifact output; validate workflow input and provider profile separately.
5. Treat sidecar refresh, citation-graph update, graph-metric repair, cache invalidation, and index status as separate maintenance contracts. Diagnose the exact stale model and scope before proposing one.
6. Preserve each workflow or maintenance stage's handle, approval, source scope, pre-state, post-state, successful and failed refs, retryability, and basis hash. One receipt never completes another stage.

### Verify each requested output

7. Verify the requested topic identity/report, graph result, resolver scope, artifact, Product, downloaded export, or live Zotero effect independently of terminal run state.
8. Submit, persist, attach, or apply a synthesis output only through a new current authority boundary. A local artifact is not proof of Zotero state.
9. Return `zotero-library-task.result.v1` with traceable evidence, declared artifacts, explicit disagreement and gaps, and every failed, skipped, or unavailable source subject.

### Build the synthesis in layers

1. Inventory the verified sources and available evidence depth.
2. Extract source-level claims with locators.
3. Group claims by the declared question or model without erasing disagreement.
4. Separate direct evidence, bibliographic relation, computed structure, workflow output, and your inference.
5. State coverage gaps and whether they reflect missing sources, inaccessible content, stale derived state, or a supported research gap.
6. Verify every requested artifact, Product asset, topic report, graph result, or export.

评分变化后，将 Topic context selection 及依赖它的 topic synthesis 视为 stale，直到所属 workflow 完成刷新。Reference-sidecar refresh 只维护 reference index，不会创建或修复 literature score。如果三个非评分工件完整且只缺评分，修复路径是 literature-analysis score-only；如果 digest、references 或 citation analysis 任一不可用，使用完整 literature-analysis 路径。

When a workflow is used, preserve the live workflow description, selection, provider profile, options, run handle, expected result evidence, and inspection outcome. When maintenance is used, preserve the diagnosed model, pre-state, scope, operation ID, receipt, post-state, and basis hash if declared.

Do not merge workflow execution and maintenance into one authority decision. Do not treat a completed maintenance operation as proof that the requested synthesis was recomputed or inspected.

For a human-facing result, state:

- the bounded question and source set;
- major supported themes or relationships;
- disagreement and uncertainty;
- evidence and locators;
- derived-model provenance and freshness;
- unavailable sources or incomplete stages;
- produced artifacts and their verification;
- any separately proposed next state change.

### Synthesis completion checklist

Source boundary:

- Every included source is resolved and within the declared rule.
- Excluded and unavailable sources are visible.
- Source-level evidence is not replaced by graph or topic membership.
- Freshness is recorded for both live sources and derived models.

Model boundary:

- The selected model answers the declared question.
- Model identity, scope, paging, basis, and status are preserved.
- Graph, topic, resolver, index, artifact, and Product identities remain distinct.
- Computed structure is not promoted to causality or consensus.

Execution:

- Direct synthesis, workflow execution, and maintenance are separate stages.
- Workflow selection, options, provider, and expected outputs were validated.
- Maintenance has diagnosed scope, authority, operation receipt, and post-state.
- One receipt is not reused as evidence for another model.

Output:

- Themes, claims, relationships, gaps, and disagreements trace to evidence.
- Missing coverage is distinguished from a supported research gap.
- Every promised Product or artifact is inspected and, when requested, downloaded and verified.
- 直接研究包需说明其选择器 scope、交付模式、manifest 清单、警告集合，以及已验证的本地目录或下载文件；不得把缺失的可选条目报告为已生成。
- Persistence or apply-back has its own authority and receipt.

Near misses:

- An empty graph query does not prove no scholarly relationship.
- A topic cluster does not prove authors agree.
- A stale index does not automatically authorize refresh.
- A completed refresh does not prove the synthesis report was regenerated.
- A local export does not prove a Zotero note or attachment exists.
- A workflow artifact does not become live library truth without verification.

If the model cannot answer the question, choose another supported model only after explaining the difference; do not silently reinterpret the user's objective.

## Hard constraints

- Do not represent a generated graph, topic, or workflow output as live Zotero truth without live verification.
- Do not submit workflows or apply agent-owned output without current authority and any approval shown in Zotero.
- Do not turn a bounded synthesis request into background topic maintenance or continuous monitoring.
- Preserve source disagreement, uncertainty, and missing evidence rather than forcing a conclusion.
- Do not infer causality or scholarly agreement from a computed graph edge, cluster, ranking, or topic membership alone.
- Do not use an empty derived query as automatic justification for cache invalidation, sidecar refresh, graph update, or metric repair.
- Do not treat one maintenance receipt as completion evidence for another model or reuse an operation ID across stages.
- Do not claim export completion until the intended Product or artifact asset has been downloaded and verified.

## LLM And Tool Responsibilities

The LLM owns source boundaries, model choice, relationship interpretation, evidence sufficiency, disagreement, gap analysis, and workflow judgment. The bundled CLI and runner own exact argv, live service calls, run/operation/file/artifact handles, approval transport, and result-schema validation. Do not invent handles, receipts, graph facts, workflow outcomes, basis hashes, or applied state.

## Result contract

Return one business JSON object matching `assets/output.schema.json`.

必填：

- `schema`: `zotero-library-task.result.v1`.
- `status`: `completed`, `canceled`, or `failed`.
- `summary`: state the research question, source/model boundary, synthesis outcome, verified deliverables, disagreement, and material limits.

Optional:

- `evidence` is an optional array; each entry requires `kind` and `ref`; use it for Zotero sources, source locators, topics, graph queries, model status, workflow runs, Products, artifacts, or maintenance receipts.
- `artifacts` is an optional array; each entry requires an existing `path` and `role`, such as `topic-report`, `claim-matrix`, `graph-export`, or `synthesis-bundle`; add `mediaType` when known.
- `diagnostics` is an optional array; each entry requires `code` and `message` for stale models, source gaps, unsupported inferences, workflow/maintenance failures, missing Products, or another stable limitation.

Status rules:

- `completed`: the bounded source/model basis supports the synthesis and every promised output is inspected.
- `canceled`: the question, source boundary, model choice, maintenance scope, export target, or authority is missing.
- `failed`: an attempted read, workflow, maintenance operation, or output verification cannot complete the overall synthesis objective.

Minimal result:

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Synthesized the bounded source set into a claim map, preserved two material disagreements, and verified the requested export artifact."
}
```

Do not invent `partial`. If a valid subset result exists but the overall requested synthesis failed, use `failed`, preserve the valid evidence and artifacts, and diagnose missing stages or sources.

The Runner's `__SKILL_DONE__` marker is transport metadata, not a business field. Use the pending branch only for a concrete user decision and emit the final business object without Markdown or extra prose.

## Completion

Return one final `zotero-library-task.result.v1` object with required `schema`, `status`, and `summary`. Use `completed` when the declared source/model boundary supports the requested synthesis and every promised output is inspected. Use `canceled` when the question, source boundary, model choice, maintenance scope, or authority is missing, and `failed` when required reads or approved execution cannot complete safely.

## Failure handling

Report the source set, topic/model identity, run and operation handles, committed basis facts, produced artifacts, and stable diagnostics. Resume at the first synthesis stage lacking valid completion evidence. If a workflow needs interaction or a maintenance precondition fails, return the required decision or diagnostic; do not substitute another workflow, broaden the source scope, or bypass the basis check.

## References

Consult [the comprehensive synthesis playbook](references/playbook.md) when the task needs a detailed derived-model choice, freshness decision record, workflow/maintenance precondition, basis-hash lifecycle, multi-stage literature-to-topic sequence, Product/export verification, or staged recovery.
