# Step 07 Taxonomy And Timeline

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Taxonomy 深度

`taxonomy` 必须包含 `summary` 与 `nodes`。`summary` 不是一句简介，而是把所有路线串联起来，
说明主流路线、新兴路线、成熟路线和关键 trade-off。

每个 node 至少分析：路线定义、核心问题、机制、代表论文、优势、局限、成熟度、与其他路线关系。

## Taxonomy 分析粒度

本阶段对应内容合同中的 `taxonomy`：研究路线分析。它不是普通分类表，而是要回答
“这个 topic 内部到底有哪些实质性研究路线，以及这些路线为什么形成、各自解决什么问题”。

推荐每条路线至少写到以下深度：

- `definition`：路线边界是什么，什么论文算入、什么不算入。
- `core_problem`：这条路线主要面对的技术、理论、数据或评价问题。
- `mechanism`：路线采用什么机制或方法范式解决问题。
- `representative_papers`：引用库内 `paper_evidence`，不要引用外部 reference 作为主证据。
- `strengths` / `limitations`：优势和限制必须具体到任务、场景、数据、效率、泛化或可复现性。
- `maturity`：可用 `emerging`、`developing`、`mature`、`declining` 等半定性判断。
- `relations`：说明与其他路线是替代、互补、融合、前置还是分支关系。

`taxonomy.summary` 必须把所有 node 串起来，形成可以直接进入 synthesis report 的“研究路线分析”章节。
它应说明主流路线、新兴路线、路线间 trade-off、路线演化方向和当前库内证据覆盖情况。

## 路线发现 heuristics

判断一组论文是否构成一条研究路线，可以看它们是否共享以下至少两类特征：

- 共同瓶颈：都在解决同一类问题，例如训练收敛、计算效率、数据标注、泛化、部署。
- 共同机制：采用相似的模型结构、训练信号、检索/匹配策略、benchmark 设计或系统架构。
- 共同评价场景：都围绕同一任务、数据集、指标、硬件约束或应用场景展开。
- 递进关系：后续论文明确延续、修正、融合或反驳前序工作。
- 综述价值：该分组能帮助读者理解 topic，而不是仅仅为了分类数量均衡。

拆分路线的标准：机制或目标不同到会改变后续 claim/comparison/gap 的判断时，应拆分。
合并路线的标准：只是命名或局部模块不同，但解决的瓶颈、机制和评价语境高度一致时，应合并。

路线粒度不宜太粗，例如“Transformer 方法”；也不宜太细，例如每篇论文一个路线。理想 node
应能支撑一个 Related Work 段落或 synthesis_report 的一个分析段。update patch 中若替换 taxonomy
或 timeline，也要输出完整 summary 和完整 changed section，而不是只补一个节点。

## Timeline 深度

`timeline_events` 必须是 `{ "summary": ..., "events": [...] }`。summary 负责历史沿革综合，
events 负责前端 marker。

## Timeline 分析粒度

本阶段对应内容合同中的 `timeline_events`：历史沿革与递进逻辑。它不是年份列表，而是要回答
“这个 topic 是怎样一步步发展到现在的，哪些论文改变了问题定义、方法范式或评价标准”。

每个 event 至少说明：

- `year`：事件年份。年份不确定时写诊断，不要伪造。
- `paper_refs` / `evidence_refs`：指向库内 paper evidence。
- `event_type`：如 `definition_shift`、`method_breakthrough`、`scaling`、`benchmark_shift`、`deployment`、`critique`。
- `description`：该事件发生了什么。
- `historical_role`：它对后续研究的影响是什么。
- `relation_to_previous`：它延续、修正、反驳或融合了哪些前序路线。

`timeline_events.summary` 必须是连续综合分析，说明阶段划分、历史递进逻辑、里程碑论文和当前趋势。
前端 timeline marker 会展示所有参与 synthesis 的论文，但 summary 要把 marker 串成可理解的历史叙事。

## Event、Phase 与 Milestone

- `phase` 是一段时期的主导问题或研究重心，例如“范式建立”“瓶颈拆解”“实用化组合”“实时部署”。
- `event` 是可以定位到一年或一组论文的具体节点，例如提出新问题定义、引入关键机制、改变 benchmark 或形成评价争议。
- `milestone` 是对后续论文产生结构性影响的 event。判断标准包括：改变问题定义、打开新路线、暴露核心瓶颈、成为后续工作的共同对照、或触发评价标准变化。

每篇参与 synthesis 的论文都应在 timeline 或 coverage 视角中有位置，但不是每篇论文都是 milestone。
普通论文可以作为某个 phase 的 supporting event；里程碑论文需要解释 follow-on effect。

## 合格与不合格写法

合格写法：说明“为什么这条路线形成”“这件事如何影响后续研究”“它和前一个阶段是什么关系”。

不合格写法：

```json
{
  "taxonomy": {
    "summary": { "text": "这个 topic 有很多方法。" },
    "nodes": [{ "id": "route:a", "label": "Method A" }]
  },
  "timeline_events": {
    "summary": { "text": "2020 到 2024 年有很多论文。" },
    "events": [{ "id": "event:paper", "year": 2020, "description": "A paper was published." }]
  }
}
```

问题：没有 route boundary、机制、trade-off、成熟度、递进逻辑和里程碑意义，无法成为 report 章节上游。

```json
{
  "taxonomy": {
    "summary": { "analysis": "Transformer detection evolves from dense anchors toward query-based set prediction..." },
    "nodes": [
      {
        "id": "route:set-prediction",
        "label": "Set-prediction detectors",
        "definition": "Detection as bipartite matching over object queries.",
        "core_problem": "Remove heuristic post-processing.",
        "mechanism": "Transformer decoder object queries.",
        "representative_papers": ["pe:1:ABC12345"],
        "strengths": ["End-to-end formulation"],
        "limitations": ["Slow convergence"],
        "maturity": "mature"
      }
    ]
  },
  "timeline_events": {
    "summary": { "analysis": "The field first reframed detection, then optimized convergence and scale..." },
    "events": [
      {
        "id": "event:detr-set-prediction",
        "year": 2020,
        "description": "DETR introduced set prediction for detection.",
        "evidence_refs": ["pe:1:ABC12345"],
        "evidence_map_refs": ["claim:set-prediction-reframes-detection"]
      }
    ]
  }
}
```


