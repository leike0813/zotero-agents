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
- claims、debates、future directions 和 improvement dimensions 必须是 topic-level synthesis，并用 source_paper_refs 指向当前 evidence index 中的文献。
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

Host Bridge CLI 的完整命令映射由内置 `zotero-bridge-cli` wrapper skill 维护。
使用 Zotero host 能力前，先阅读该 wrapper skill 及其生成的
`references/host-bridge-cli.md` 参考。

<!-- host-bridge-surface:topic-synthesis-fragment:start -->

Host Bridge CLI 使用说明由内置 `zotero-bridge-cli` wrapper skill 维护。
当前 topic synthesis 相关命令族摘要：`citation-graph get-metrics`, `citation-graph get-slice`, `citation-graph overview`, `citation-graph query-cluster`, `citation-graph rank-external-references`, `citation-graph rank-library-papers`, `citation-graph refresh-metrics`, `insights attention-queue`, `library-index get`, `paper-artifacts export-filtered`, `paper-artifacts manifest`, `paper-artifacts read`, `paper-artifacts resolve-topic-digest`, `reference-index get`, `resolvers resolve`, `topics get-context`, `topics get-report`, `topics get-review-input`, `topics list`。
使用 Host Bridge 能力前，先读取该 wrapper skill 及其 `references/host-bridge-cli.md` 生成映射参考。
不要绕过 Host Bridge 直接读取 Zotero DB/storage；除非用户明确要求 MCP 诊断，否则不要切换到 MCP。

<!-- host-bridge-surface:topic-synthesis-fragment:end -->

在 ACP run workspace 中，优先使用工作区注入的 Host Bridge shim：

- Windows：`.\.zotero-bridge\bin\zotero-bridge.cmd`
- POSIX：`./.zotero-bridge/bin/zotero-bridge`

只有找不到 workspace shim 时，才使用裸命令 `zotero-bridge`。无论使用哪种入口，
都只能通过 Host Bridge 合同读取 Zotero 数据；不要直接读取 Zotero DB/storage，
也不要在用户未要求 MCP 诊断时切换到 MCP。

## 运行状态

- SQLite 只保存 stage state 和必要的跨 stage 上下文。
- 跨 skill 业务状态来自 SQLite 与 handoff/files，不从 prompt 文本传递。
- 命令型入口 stage 负责处理本包的 runtime 初始化或状态校验。

## LLM 与脚本职责边界

必须由 LLM 完成：

- core synthesis：taxonomy、timeline、claims、improvement dimensions、debates、future_directions、review_outline。
- KG enrichment：concept_details、existing_topic_relation_proposals、prospective_topic_relation_proposals、topic_matching_terms。

必须由脚本/runtime 完成：

- 校验 prepare handoff、DB 和必需 runtime views。
- 校验 core synthesis 和 KG enrichment payload。
- 生成 concept candidate context、KG sidecars、topic-interest metadata 和 core handoff。

绝对禁止：

- 手写 SQLite rows、handoff manifest 或 runtime-owned files。
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
2. 命令成功后重新运行 gate，进入当前 skill 的第一个 payload stage。

质量检查：

- 当前 skill 的输入必须来自 SQLite、handoff 和文件，不从聊天上下文继承业务状态。
- 不要写 payload 来绕过 state check。

常见错误：

- 不要重新生成上游 handoff。
- 只依据 gate JSON、当前 stage 指令和当前 runtime 文件判断下一步。

### stage_40_core_synthesis

- stage 类型：payload
- 任务：编写 taxonomy、timeline、claims、improvement dimensions、debates、future directions、review writing strategies 和 concept candidate labels。
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
2. 先锁定 prepare handoff 中的 topic_definition 和 scope_boundary；这是当前 topic 的语义边界真源。
3. 读取 `cross-paper-context.md`，只用 core_analysis context 写 taxonomy、timeline、claims、debates、future directions 和 outline。
4. 把 workset 当作库内证据覆盖，不要让库内样本密集子域反向改写 topic identity。
5. 在需要引用论文的对象中使用 `source_paper_refs`，让 runtime 后续关联 source paper。
6. 提交后 runtime 会生成 concept candidate context，供 KG stage 使用。

上下文获取方式：

- Runtime read：`runtime/handoff/prepare-analysis-context.json`。来源：create/update prepare 完成 Stage 30 后的 runtime handoff。用途：undefined
- Runtime read：`runtime/views/cross-paper-context.md`。来源：prepare runtime 在 paper triage submit 后生成。用途：作为 taxonomy、timeline、claims、debates、future directions 和 outline 的 core analysis context。
- Runtime read：`runtime/views/source-paper-evidence-index.json`。来源：prepare runtime 在 paper triage submit 后生成。用途：核对当前可引用的 source_paper_refs 和短 evidence。

材料使用说明：

- prepare handoff 中的 topic definition、aliases、scope include/exclude 用于确定 topic 的宏观语义范围。
- `runtime/views/cross-paper-context.md` 服务 core analysis，包含 runtime 选择的 filtered digest、paper triage 和 citation graph metrics。
- `runtime/views/source-paper-evidence-index.json` 用于核对可引用的 source_paper_refs。
- payload 路径：runtime/payloads/core-synthesis.json
- schema 文件：assets/schemas/stage-40-core-synthesis.schema.json

字段说明：

- `taxonomy`：解释 topic 语义边界内的研究路线、机制、边界、代表论文、成熟度、优势和局限；如果 workset 只覆盖子域，taxonomy 仍要按 topic 本身的宏观结构组织。
- `timeline_events`：解释历史递进、里程碑和后续影响，不是按年份排序的 bibliography。
- `claims`：topic-level findings；每条应有证据范围、适用边界和 source_paper_refs。
- `improvement_dimension_summary`：概括方法进展的主轴。
- `improvement_dimensions`：解释设计 tradeoff、评价轴和代表路线；单条 dimension 使用 `title` 命名、使用 `analysis` 写正文。
- `concept_candidate_labels`：列出值得交给 KG stage 补全的概念标签。
- `debates`：描述争议轴、不同立场和当前判断；每条使用 `title` 命名争议，用 `current_judgment` 写当前证据下的判断，并附上 `source_paper_refs`。
- `future_directions`：基于当前 source papers 支撑出的研究局限与未来研究方向。每条都要同时说明当前局限、下一步研究推进方向和成立理由。
- `review_outline`：提出针对当前 topic 撰写综述的候选思路和策略。`topic_importance` 说明为什么值得写，`writing_strategies` 给出多种组织综述的方式，`recommended_strategy_id` 指向当前最适合的策略。

质量检查：

- 不能把单篇摘要拼接成 taxonomy 或 claims。
- 不能把库内样本分布当作 topic 定义；样本偏向 DETR/检测时，Computer Vision 仍然是更大的视觉领域。
- future_directions 必须有 source_paper_refs 支撑；workset 未覆盖的宏观方向应通过 review_outline 的写作风险、coverage caveats 和 collection suggestions 表达。
- coverage 和 collection suggestions 留给 finalize，不在 core 阶段使用 external literature context。

常见错误：

- 不要读取或引用当前 stage 必读材料以外的上下文。
- 不要把大 topic 收缩成 resolved papers 最密集的子 topic。

Payload JSON 示例（可提交结构样例）：

```json
{
  "taxonomy": {
    "summary": {
      "text": "Computer Vision 的宏观结构包括视觉表示学习、图像分类、目标检测、分割、三维视觉、视频理解和视觉语言多模态；当前库内证据主要覆盖检测与分割相关路线。"
    },
    "nodes": [
      {
        "id": "area:object-detection",
        "title": "Object detection",
        "definition": "在图像或视频中定位并分类目标，是 Computer Vision 的核心任务之一。",
        "core_problem": "在复杂视觉场景中同时完成目标定位、类别识别和实例区分。",
        "mechanism": "结合候选区域、密集预测或 query-based set prediction，将视觉特征映射为带类别的目标位置。",
        "strengths": ["直接支撑场景理解、自动驾驶和机器人感知等应用。"],
        "limitations": [
          "当前库内 evidence 偏向 DETR-family，对传统检测器和开放词汇检测覆盖不足。"
        ],
        "maturity": "established subfield with active method evolution",
        "representative_papers": ["1:DETR"],
        "source_paper_refs": ["1:DETR"]
      },
      {
        "id": "area:detection-optimization",
        "title": "Detection optimization",
        "definition": "围绕检测模型的训练稳定性、收敛速度和查询设计进行改进，是当前 workset 中最充分的证据区域。",
        "core_problem": "让端到端检测公式在有限训练预算和复杂场景中保持稳定有效。",
        "mechanism": "通过 denoising、anchor/query design 和训练目标设计改善匹配学习过程。",
        "strengths": ["能解释当前库内 DETR-family 改进论文的主要证据贡献。"],
        "limitations": [
          "它只是 Computer Vision 的检测子域，不能代表分类、视频、三维和视觉语言路线。"
        ],
        "maturity": "active method family",
        "representative_papers": ["1:DINO"],
        "source_paper_refs": ["1:DINO"]
      }
    ]
  },
  "timeline_events": {
    "summary": {
      "text": "当前 evidence 支持检测与分割路线中的若干里程碑；分类、视频理解和视觉语言路线需要后续补证。"
    },
    "events": [
      {
        "id": "event:query-based-detection",
        "label": "Query-based detection",
        "year": 2020,
        "description": "query-based set prediction 成为目标检测子域的重要范式，但它只是 Computer Vision 的一个分支。",
        "historical_role": "query-based set prediction 成为目标检测子域的重要范式，但它只是 Computer Vision 的一个分支。",
        "phase": "subfield reformulation",
        "source_paper_refs": ["1:DETR"]
      }
    ]
  },
  "claims": [
    {
      "id": "claim:detection-evidence-concentration",
      "text": "当前库内证据能较好支撑 Computer Vision 中的检测/分割子域，但不足以代表整个 Computer Vision。",
      "analysis": "resolved papers 集中在 DETR-style detection variants，因此它们能解释局部路线，却不能重写 Computer Vision 的整体语义边界。",
      "scope": "library evidence coverage rather than full domain definition",
      "limitations": [
        "该判断依赖当前 resolver workset，需要补充分类、视频、三维和多模态视觉材料。"
      ],
      "confidence": "high",
      "source_paper_refs": ["1:DETR", "1:DINO"]
    }
  ],
  "improvement_dimension_summary": {
    "text": "当前可证据化的进展主轴集中在检测和分割；更完整的 Computer Vision 综述还需要补充分类、表示学习、视频和多模态材料。"
  },
  "improvement_dimensions": [
    {
      "id": "dim:convergence",
      "title": "检测中的端到端训练效率",
      "analysis": "DETR-family 工作展示了目标检测子域中端到端公式和训练效率之间的 tradeoff。",
      "source_paper_refs": ["1:DETR", "1:DINO"]
    }
  ],
  "concept_candidate_labels": [
    "Object detection",
    "Image segmentation",
    "Visual representation learning"
  ],
  "debates": [
    {
      "id": "debate:task-specific-vs-foundation-models",
      "title": "任务专用模型与视觉基础模型的取舍",
      "current_judgment": "当前库内证据主要来自任务专用检测/分割模型，对基础模型路线支撑不足。",
      "source_paper_refs": ["1:DETR"]
    }
  ],
  "future_directions": [
    {
      "id": "future:efficient-query-detection",
      "title": "更高效的 query-based detection",
      "direction_type": "method_limitation",
      "current_limitation": "当前 evidence 显示 query matching 和长训练 schedule 仍是端到端检测路线的重要成本来源。",
      "future_direction": "后续研究可以围绕更稳定的 query initialization、轻量 matching objective 和低 epoch 收敛机制展开。",
      "rationale": "DETR 与 DINO 等论文共同表明，set prediction 范式清晰但训练效率和稳定性会影响实际可用性。",
      "source_paper_refs": ["1:DETR", "1:DINO"]
    }
  ],
  "review_outline": {
    "topic_importance": "Computer Vision 是视觉感知、识别和理解的上位领域；当前 workset 能支撑检测与分割相关路线的综述入口。",
    "writing_strategies": [
      {
        "id": "strategy:method-evolution",
        "title": "按方法演进组织综述",
        "review_thesis": "以 query-based detection 如何重塑目标检测公式为主线，并说明它只是 Computer Vision 的一个证据充分子域。",
        "writing_strategy": "先定义 Computer Vision 的宏观边界，再解释当前 evidence 为什么适合写检测/分割子域的路线演进，最后把不足覆盖交给 coverage caveats。",
        "section_plan": [
          "定义视觉任务谱系和当前 evidence-covered scope",
          "解释 query-based detection 的公式重构",
          "比较后续变体如何处理收敛、query design 和效率问题",
          "指出该综述策略不覆盖分类、视频、三维和视觉语言路线"
        ],
        "best_for": "适合写方法演进型 Related Work 或 topic survey 的一个章节。",
        "risks": "不要把 Computer Vision 整体压缩成 DETR-family，也不要把 coverage caveats 写成已被 source papers 支撑的研究结论。",
        "source_paper_refs": ["1:DETR", "1:DINO"]
      }
    ],
    "recommended_strategy_id": "strategy:method-evolution"
  }
}
```

### stage_50_kg_enrichment

- stage 类型：payload
- 任务：编写 concept details、existing/prospective relation proposals 和 topic matching terms。
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
2. 读取库中已有 topic 列表。优先执行 `./.zotero-bridge/bin/zotero-bridge topics list --input '{}'`；工作区没有 shim 时执行 `zotero-bridge topics list --input '{}'`。
3. 为关键概念写 definition、aliases、disambiguation 和 topic relevance。
4. 以当前 synthesis topic 为出发点，判断每个 target topic 的方向关系：target 更宽、target 更窄、相关、交叉或对照。
5. 判断关系时使用当前 topic 的语义全集，不使用 workset 最密集子域替代当前 topic。
6. 把指向已有 topic 的关系写入 existing_topic_relation_proposals，把未来 topic seed 写入 prospective_topic_relation_proposals。
7. 写 topic matching terms，供 runtime 生成 sidecars。

上下文获取方式：

- Runtime read：`runtime/views/concept-candidate-context.json`。来源：Stage 40 core synthesis submit 后的 runtime materialization。用途：读取待补全的概念候选、来源和上下文。

材料使用说明：

- `runtime/views/concept-candidate-context.json` 来自已校验 core synthesis，用它核对概念候选。
- `topics list` 返回当前库中已有 topics，以及这些 topic metadata 中保存的 prospective_topic_relation_proposals。
- payload 路径：runtime/payloads/kg-enrichment.json
- schema 文件：assets/schemas/stage-50-kg-enrichment.schema.json

字段说明：

- `concept_details`：解释 topic 边界、路线、机制、任务、benchmark、数据集、评价轴或训练信号相关概念。
- `existing_topic_relation_proposals`：只引用 `topics list` 返回的已有 topic_id，写出 relation_type、confidence、rationale 和 source_paper_refs。
- `prospective_topic_relation_proposals`：只写未来可能 synthesis 的 target_topic_seed 和 relation_type。
- `relation_type`：`target_is_broader_topic_candidate` 表示 target 比当前 topic 更宽；`target_is_narrower_topic_candidate` 表示 target 比当前 topic 更窄；`related_topic_candidate` 表示相关但没有清晰包含或交叉；`overlap_topic_candidate` 表示两者部分交叉且互不包含；`contrast_topic_candidate` 表示同一问题空间中的替代路线或对立视角。
- `topic_matching_terms`：用于 topic discovery/matching 的 include、must-have、methods、exclude terms。

质量检查：

- KG enrichment 是语义补全，不是重复 core synthesis。
- 已有 topic 关系要能对应 list-topics 中的 topic_id。
- 所有关系判断都以当前 synthesis topic 指向 target topic 的视角书写。
- 如果当前 topic 是 Computer Vision，Object Detection、DETR-style Object Detection 等应按下位或相关 target 判断；不能因为 workset 偏向 DETR 就把当前 topic 改写成 DETR-series。
- 如果一个 topic 明确包含另一个 topic，使用 broader/narrower 关系；overlap 只用于互不包含的部分交叉范围。
- 预备关系只保留可复用的 topic seed。

常见错误：

- 不要写 canonical KG assets、SQLite rows 或 Git metadata。
- 不要把宽泛领域词都加入 must-have terms。

Payload JSON 示例（可提交结构样例）：

```json
{
  "concept_details": [
    {
      "label": "Object detection",
      "aliases": ["目标检测"],
      "concept_type": "task",
      "definition": "在图像或视频中定位并识别目标，是 Computer Vision 的下位任务。",
      "topic_relevance": "当前 workset 覆盖较多的 Computer Vision 子域。"
    }
  ],
  "existing_topic_relation_proposals": [
    {
      "relation_type": "target_is_narrower_topic_candidate",
      "target_topic_id": "object-detection",
      "target_topic_title": "Object Detection",
      "confidence": 0.88,
      "rationale": "Object Detection 是 Computer Vision 的下位任务；即使当前 workset 偏向检测，Computer Vision 的语义范围仍更宽。",
      "source_paper_refs": ["1:DETR"]
    },
    {
      "relation_type": "target_is_narrower_topic_candidate",
      "target_topic_id": "detr-style-object-detection",
      "target_topic_title": "DETR-style Object Detection",
      "confidence": 0.76,
      "rationale": "DETR-style Object Detection 是 Computer Vision 中目标检测方向的更窄方法族。",
      "source_paper_refs": ["1:DETR"]
    }
  ],
  "prospective_topic_relation_proposals": [
    {
      "target_topic_seed": "query-centric object detection",
      "relation_type": "target_is_narrower_topic_candidate"
    }
  ],
  "topic_matching_terms": {
    "include_terms": ["DETR", "object queries", "set prediction"],
    "must_have_terms": ["object detection"],
    "methods": ["Hungarian matching", "transformer decoder"],
    "exclude_terms": ["NLP transformers"]
  }
}
```

## 输出合同

本技能输出一个用于 `core_enrichment` 的 `topic_synthesis_handoff` JSON 对象。

- 返回对象必须符合 `assets/output.schema.json`。
- handoff manifest path 用来标识本 skill 的持久化输出。
- 大段正文和业务状态以 SQLite 与 runtime 文件为真源。

## 失败规则

- 如果 gate 返回 error JSON，停止当前技能。
- 不要手动修改 SQLite。
- 不要绕过 `gate.py` 调用内部 helper。
- 只依据 gate JSON、当前 stage 指令和当前 runtime 文件判断恢复方式。
