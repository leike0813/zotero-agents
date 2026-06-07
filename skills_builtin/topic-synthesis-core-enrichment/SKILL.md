---
name: topic-synthesis-core-enrichment
description: 读取已准备的分析上下文，编写核心综合分析和知识图谱补全 payload。
---

<!-- 本文件由 skills_src/topic-synthesis 生成，请勿手工修改。 -->

# 主题综合核心分析与知识图谱补全

## 范围

读取已准备的分析上下文，编写核心综合分析和知识图谱补全 payload。

本包由 `skills_src/topic-synthesis/` 生成。执行时以包内 `SKILL.md`、
`scripts/` 和 `assets/schemas/` 作为当前技能的执行合同。

## 产品目标与质量标准

Topic Synthesis 是 Zotero 中的信息密集型 topic 知识窗口，也是 Introduction / Related Work 等写作 workflow 的上游证据材料。它的目标不是字段填空，也不是把论文摘要拼在一起，而是帮助用户理解一个 topic 的概念边界、研究路线、历史沿革、主要结论、争议、缺口、库内覆盖状态、库外补充方向和综述写作角度。

本技能的最低质量目标：

- taxonomy 必须解释研究路线、机制、边界、代表论文、成熟度、优势和局限，不是标签表。
- timeline_events 必须解释历史递进和里程碑逻辑，不是年份列表。
- claims、debates、gaps 和 improvement dimensions 必须是 topic-level synthesis，并用 source_paper_refs 指向当前 evidence index 中的文献。
- KG enrichment 只补全当前 core synthesis 产生的概念、候选 topic 关系和 matching terms，不写 sidecars 或 canonical KG。

## 必需运行输入

- runtime/topic-synthesis.sqlite
- runtime/handoff/prepare-analysis-context.json

## 执行合同

- `scripts/gate.py` 是唯一面向执行代理的 CLI。
- 不要直接调用 `scripts/topic_synthesis_db.py`。
- 不要传入 stage 名称或 action 名称。
- 命令型 stage 只执行 gate 返回 JSON 的 `command` 字段，不写 JSON payload。
- payload 型 stage 需要把一个 JSON payload 写入 gate 指定的 `payload_path`，
  然后用 gate 返回 JSON 的 `submit_command` 提交。
- gate 返回的 `command` / `submit_command` 是执行真源；本文档中的命令模板只用于解释等价形态。

## zotero-bridge CLI 使用说明

在 ACP run workspace 中优先使用工作区注入的 Host Bridge shim；只有 shim 不存在时才回退到环境中的裸命令 `zotero-bridge`。不要把插件内部 binary 路径写入 payload、日志或最终产物。

本说明中的 `<zotero-bridge>` 表示以下解析顺序：

1. Windows：如果存在 `.\.zotero-bridge\bin\zotero-bridge.cmd`，使用它。
2. POSIX：如果存在 `./.zotero-bridge/bin/zotero-bridge`，使用它。
3. 如果工作区没有注入 shim，才使用裸命令 `zotero-bridge`。

需要确认 Host Bridge 状态时先运行：

```bash
<zotero-bridge> status
<zotero-bridge> manifest
```

本 suite 的 agent-authored payload stage 只需要这些 Host read 命令：

```bash
<zotero-bridge> synthesis list-topics --input '{}'
<zotero-bridge> synthesis get-topic-context --input '{"topicId":"<topic_id>"}'
<zotero-bridge> synthesis get-library-index --input '{"cursor":0,"limit":200}'
```

Stage 20 payload 提交后，resolver、citation metrics 和 filtered artifact export 由 runtime 调用 Host Bridge cascade 完成；agent 不要手写 resolver result、metrics manifest 或 artifact manifest。

如果工作区 shim 和裸命令都不可用、capability missing 或返回非零退出码，不要伪造 Host 数据，也不要切换到 MCP。当前 payload stage 可以在 `diagnostics` 中记录不可用原因；如果无法继续满足当前 skill output contract，则停止并输出 gate/error 指定的合法 JSON。

## 运行状态

- SQLite 是 stage state、receipt、artifact registry 和 handoff registry 的真源。
- 跨 skill 业务状态来自 SQLite 与 handoff/files，不从 prompt 文本传递。
- 命令型入口 stage 负责处理本包的 runtime 初始化或状态校验。

## LLM 与脚本职责边界

必须由 LLM 完成：

- core synthesis：taxonomy、timeline、positioning、claims、improvement dimensions、debates、gaps、review_outline。
- KG enrichment：concept_details、topic_relation_candidates、topic_matching_terms。

必须由脚本/runtime 完成：

- 校验 prepare handoff、DB、artifact hash 和必需 runtime views。
- 校验并登记 core synthesis 和 KG enrichment payload。
- 生成 concept candidate context、KG sidecars、topic-interest metadata 和 core handoff。

绝对禁止：

- 手写 SQLite rows、hashes、handoff manifest 或 runtime-owned files。
- 用临时脚本生成语义分析 payload。
- 把 citation metrics 或外部文献当作 core claim/timeline 的主 evidence。
- 修改 gate 返回的 command 或 submit command 来跳 stage。

## 阶段循环

1. 运行 gate，读取返回 JSON。
2. 只处理返回 JSON 中的当前 `stage`，不得跳 stage。
3. command stage 执行返回 JSON 的 `command` 字段。
4. payload stage 先按返回 JSON 的 `required_reads` 获取材料，再写 `payload_path`，最后执行 `submit_command`。
5. 每次 command 或 submit 成功后，都必须重新运行 gate。
6. gate 返回 `stage: "completed"` 时，输出其中的 `output` 对象作为本技能结果。

## 严格执行顺序

每个 stage 都按 gate JSON 驱动执行。不要根据记忆跳 stage。

初始 gate：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite"
```

如果 gate 返回 `needs_payload: false`：

1. 确认 `stage` 是当前 `SKILL.md` 中的本地 stage。
2. 复制并执行 gate JSON 的 `command` 字段。
3. 等价命令模板是：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action run
```

4. 命令成功后，立刻重新运行初始 gate。

如果 gate 返回 `needs_payload: true`：

1. 确认 `stage` 是当前 `SKILL.md` 中的本地 stage。
2. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
3. 按本 stage 的“上下文获取方式”执行 Host read 命令或读取 runtime 文件。
4. 只手写 `payload_path` 指向的 JSON payload，不写 runtime-owned 文件。
5. 复制并执行 gate JSON 的 `submit_command`。
6. 等价命令模板是：

```bash
python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"
```

7. submit 成功后，立刻重新运行初始 gate。

## 阶段

### stage_00_runtime_state_check

- stage 类型：command
- 任务：校验既有 DB、prepare handoff 和必需的上下文 artifacts。
- 语义目标：校验上一 skill 产生的 DB、handoff 和必需 artifacts，确保当前 skill 只基于持久化状态继续。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_00_runtime_state_check`。
3. 确认 `needs_payload` 是 `false`。
4. 复制并执行 gate JSON 的 `command` 字段；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action run`。
5. command 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 读取 gate 返回的 command，并只执行该 command。
2. 如果 gate 报 missing handoff、hash mismatch 或 artifact 缺失，停止当前 skill，不要自行修补 runtime-owned files。
3. 命令成功后重新运行 gate，进入当前 skill 的第一个 payload stage。

质量检查：

- 当前 skill 的输入必须来自 SQLite、handoff 和文件，不从聊天上下文继承业务状态。
- 不要写 payload 来绕过 state check。

常见错误：

- 不要重新生成上游 handoff。
- 不要基于旧单体 stage 名推断恢复路径。

### stage_40_core_synthesis

- stage 类型：payload
- 任务：编写 taxonomy、timeline、positioning、claims、improvement dimensions、debates、gaps、review outline 和 concept candidate labels。
- 语义目标：基于 prepare handoff、cross-paper context 和 evidence index 写 topic-level 核心综合分析。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_40_core_synthesis`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/core-synthesis.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 读取 prepare handoff，确认 workset、context manifest 和 evidence index。
2. 读取 `cross-paper-context.md`，只用 core_analysis context 写 taxonomy、timeline、claims、debates、gaps 和 outline。
3. 在需要 paper evidence 的对象中使用 `source_paper_refs`，让 runtime 后续编译 evidence/provenance。
4. 提交后 runtime 会生成 concept candidate context，供 KG stage 使用。

上下文获取方式：

- Runtime read：`runtime/handoff/prepare-analysis-context.json`。来源：create/update prepare 完成 Stage 30 后的 runtime handoff。用途：确认 workset、artifact manifest 和上游 handoff hash。
- Runtime read：`runtime/views/cross-paper-context.md`。来源：prepare runtime 在 paper triage submit 后生成。用途：作为 taxonomy、timeline、claims、debates、gaps 和 outline 的 core analysis context。
- Runtime read：`runtime/views/source-paper-evidence-index.json`。来源：prepare runtime 在 paper triage submit 后生成。用途：核对当前可引用的 source_paper_refs 和短 evidence。

材料使用说明：

- `runtime/views/cross-paper-context.md` 服务 core analysis。
- `runtime/views/source-paper-evidence-index.json` 用于核对可引用的 source_paper_refs。
- payload 路径：runtime/payloads/core-synthesis.json
- schema 文件：assets/schemas/stage-40-core-synthesis.schema.json

字段说明：

- `taxonomy`：解释研究路线、机制、边界、代表论文、成熟度、优势和局限，不是标签表。
- `timeline_events`：解释历史递进、里程碑和后续影响，不是按年份排序的 bibliography。
- `positioning`：说明 topic 的领域位置、综述角度和 scope boundary。
- `claims`：topic-level findings；每条应有证据范围、适用边界和 source_paper_refs。
- `improvement_dimension_summary`：概括方法进展的主轴。
- `improvement_dimensions`：解释设计 tradeoff、评价轴和代表路线。
- `concept_candidate_labels`：列出值得交给 KG stage 补全的概念标签。
- `debates`：描述争议轴、不同立场和当前判断。
- `gaps`：区分真实研究空白、证据缺口、评价缺口和库内覆盖缺口。
- `review_outline`：把综合分析转为可写综述的结构。

质量检查：

- 不能把单篇摘要拼接成 taxonomy 或 claims。
- coverage 和 collection suggestions 留给 finalize，不在 core 阶段使用 external literature context。

常见错误：

- 不要读取或引用当前 stage 必读材料以外的上下文。
- 不要手写 evidence_map_refs、hashes 或 final sections。

Payload JSON 示例：

```json
{
  "taxonomy": {
    "summary": {
      "text": "该 topic 可分为集合预测公式、收敛加速和面向部署的效率路线。"
    },
    "nodes": [
      {
        "id": "route:set-prediction",
        "definition": "使用 object queries 将目标检测表述为全局集合预测。",
        "representative_papers": ["1:DETR2020"],
        "source_paper_refs": ["1:DETR2020"]
      }
    ]
  },
  "timeline_events": {
    "summary": {
      "text": "历史递进从公式建立开始，随后转向收敛和效率改进。"
    },
    "events": [
      {
        "id": "event:detr-formulation",
        "year": 2020,
        "historical_role": "建立 query-based set prediction 作为该路线的基线。",
        "source_paper_refs": ["1:DETR2020"]
      }
    ]
  },
  "positioning": {
    "importance": "定义了一条目标检测的端到端研究路线。",
    "scope_boundary": {
      "include": ["DETR-style object detection"],
      "exclude": ["generic transformer NLP"]
    }
  },
  "claims": [
    {
      "id": "claim:set-prediction-shift",
      "text": "DETR-style 工作把检测问题推进到 query-based set prediction 范式。",
      "confidence": "high",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "improvement_dimension_summary": {
    "text": "该方向的进展最适合从公式清晰度、收敛行为和效率三个维度解释。"
  },
  "improvement_dimensions": [
    {
      "id": "dim:convergence",
      "label": "收敛行为",
      "analysis": "后续工作在保留集合预测框架的同时改善训练效率。",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "concept_candidate_labels": ["Set prediction", "Object queries"],
  "debates": [
    {
      "id": "debate:pipeline-vs-set-prediction",
      "title": "Pipeline components 与 set prediction 的取舍",
      "current_judgment": "集合预测让公式更清晰，但也带来优化压力。",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "gaps": [
    {
      "id": "gap:deployment-evidence",
      "title": "部署证据仍不均衡",
      "gap_type": "evidence_gap",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "review_outline": {
    "introduction_logic": ["先定义集合预测路线及其瓶颈。"],
    "body_sections": ["公式", "收敛", "效率"]
  }
}
```

### stage_50_kg_enrichment

- stage 类型：payload
- 任务：编写 concept details、topic relation candidates 和 topic matching terms。
- 语义目标：把 core synthesis 中的概念候选转成可供 sidecar materialization 的 KG 补全 payload。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_50_kg_enrichment`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/kg-enrichment.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 读取 concept candidate context。
2. 为关键概念写 definition、aliases、disambiguation 和 topic relevance。
3. 提出 topic relation candidates 和 matching terms，供 runtime 生成 sidecars。

上下文获取方式：

- Runtime read：`runtime/views/concept-candidate-context.json`。来源：Stage 40 core synthesis submit 后的 runtime materialization。用途：读取待补全的概念候选、来源和上下文。

材料使用说明：

- `runtime/views/concept-candidate-context.json` 来自已校验 core synthesis，不要绕回旧 resolver context。
- payload 路径：runtime/payloads/kg-enrichment.json
- schema 文件：assets/schemas/stage-50-kg-enrichment.schema.json

字段说明：

- `concept_details`：解释 topic 边界、路线、机制、任务、benchmark、数据集、评价轴或训练信号相关概念。
- `topic_relation_candidates`：只写候选关系和理由，不写 canonical topic graph。
- `topic_matching_terms`：用于 topic discovery/matching 的 include、must-have、methods、exclude terms。
- `diagnostics`：记录概念歧义、候选为空、关系不确定等诊断。

质量检查：

- KG enrichment 是语义补全，不是重复 core synthesis。
- relation candidates 要带 rationale，避免只列目标 topic 名。

常见错误：

- 不要写 canonical KG assets、SQLite rows 或 Git metadata。
- 不要把宽泛领域词都加入 must-have terms。

Payload JSON 示例：

```json
{
  "concept_details": [
    {
      "label": "Object queries",
      "aliases": ["detection queries"],
      "concept_type": "mechanism",
      "definition": "DETR-style decoder 用来以集合形式预测目标的可学习 query slots。",
      "topic_relevance": "DETR-family detection 的核心机制。"
    }
  ],
  "topic_relation_candidates": [
    {
      "relation_type": "related_topic_candidate",
      "target_topic_title": "Transformer-based Object Detection",
      "rationale": "目标 topic 更宽，通过 transformer detector architecture 与当前 topic 重叠。"
    }
  ],
  "topic_matching_terms": {
    "include_terms": ["DETR", "object queries", "set prediction"],
    "must_have_terms": ["object detection"],
    "methods": ["Hungarian matching", "transformer decoder"],
    "exclude_terms": ["NLP transformers"],
    "diagnostics": []
  },
  "diagnostics": []
}
```

## 输出合同

本技能输出一个用于 `core_enrichment` 的 `topic_synthesis_handoff` JSON 对象。

- 返回对象必须符合 `assets/output.schema.json`。
- handoff manifest path 和 hash 用来标识本 skill 的持久化输出。
- 大段正文、业务状态和 hashes 仍以 SQLite 与文件为真源。

## 失败规则

- 如果 gate 返回 error JSON，停止当前技能。
- 不要手动修改 SQLite。
- 不要手动生成由 runtime 管理的 hashes。
- 不要绕过 `gate.py` 调用内部 helper。
- 不要基于旧字段、旧 stage 或历史路径猜测恢复方式。
