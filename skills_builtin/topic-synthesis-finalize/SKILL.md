---
name: topic-synthesis-finalize
description: 读取核心分析与知识图谱补全结果，编写 coverage 与 summary payload，并准备最终候选输出。
---

<!-- 本文件由 skills_src/topic-synthesis 生成，请勿手工修改。 -->

# 主题综合收尾

## 范围

读取核心分析与知识图谱补全结果，编写 coverage 与 summary payload，并准备最终候选输出。

本包由 `skills_src/topic-synthesis/` 生成。执行时以包内 `SKILL.md`、
`scripts/` 和 `assets/schemas/` 作为当前技能的执行合同。

## 产品目标与质量标准

Topic Synthesis 是 Zotero 中的信息密集型 topic 知识窗口，也是 Introduction / Related Work 等写作 workflow 的上游证据材料。它的目标不是字段填空，也不是把论文摘要拼在一起，而是帮助用户理解一个 topic 的概念边界、研究路线、历史沿革、主要结论、争议、缺口、库内覆盖状态、库外补充方向和综述写作角度。

本技能的最低质量目标：

- coverage verdict 必须解释当前库内材料的覆盖档位，并区分领域真实空白、库内覆盖不足、artifact 证据不足和评价口径缺口。
- reliability summary 必须说明本次 synthesis 的证据边界，不能把文献数量或 citation metrics 机械当作可靠性。
- external context summary 和 collection suggestions 只服务覆盖判断和入库建议，不能重写 core synthesis。
- final summary 必须基于 runtime 已渲染的 synthesis report，不新增未在 report 中出现的 claim。

## 必需运行输入

- runtime/topic-synthesis.sqlite
- runtime/handoff/core-enrichment.json

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

- coverage verdict、coverage reason、reliability summary、coverage caveats。
- external context summary 和 collection suggestions。
- 最终 summary_brief、summary_overview 和 key_takeaways。

必须由脚本/runtime 完成：

- 校验 core handoff、sidecars、finalize context 和 report context。
- 校验并登记 coverage 和 summary payload。
- 生成完整 Host apply-ready result sections、synthesis report、topic-analysis manifest 和 final-output candidate。

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
- 任务：校验既有 DB、core enrichment handoff、sidecars 和收尾上下文。
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

### stage_60_coverage_and_collection_suggestions

- stage 类型：payload
- 任务：编写 coverage verdict、reliability interpretation、external context summary 和 collection suggestions。
- 语义目标：基于 core handoff、finalize context 和 external literature context 判断库内覆盖、可靠性和后续入库方向。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_60_coverage_and_collection_suggestions`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/coverage-and-collection-suggestions.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 读取 core handoff、finalize context manifest 和 `external-literature-context.md`。
2. 判断当前库内材料对 topic 的覆盖档位和证据可靠性。
3. 写出 external context summary 和可执行的 collection suggestions。
4. 提交后 runtime 生成 synthesis report view，并登记 coverage payload；完整 result sections 和 manifest 会在 Stage 70 submit 后由 runtime 统一物化。

上下文获取方式：

- Runtime read：`runtime/views/external-literature-context.md`。来源：prepare runtime 在 paper triage submit 后生成，并经 core handoff 暴露给 finalize。用途：用于 coverage、external context summary 和 collection suggestions。
- Runtime read：`runtime/views/finalize-context.manifest.json`。来源：Stage 50 KG enrichment submit 后的 runtime materialization。用途：定位 sidecars 和 finalize 输入 artifact。

材料使用说明：

- `runtime/views/external-literature-context.md` 只服务 finalize 的 coverage、statistics 和入库建议。
- `runtime/views/finalize-context.manifest.json` 用于定位 sidecars 和 finalize 输入。
- payload 路径：runtime/payloads/coverage-and-collection-suggestions.json
- schema 文件：assets/schemas/stage-60-coverage-and-collection-suggestions.schema.json

字段说明：

- `coverage_verdict`：`sufficient`、`partial`、`insufficient`、`severely_missing` 或 `unknown`。
- `coverage_reason`：解释 verdict，区分领域真实空白、库内覆盖不足和 artifact 证据不足。
- `reliability_summary`：说明当前 synthesis 的可靠性边界。
- `coverage_caveats`：结构化记录证据范围、graph uncertainty、artifact 缺失或 topic 边界不确定。
- `external_context_summary`：总结外部/邻近文献对覆盖判断的影响，不重写 core synthesis。
- `suggested_collection_directions`：给出具体补充方向、理由、示例标题或关键词、优先级。
- `diagnostics`：记录 conservative-empty、缺失 context、无法判断等原因。

质量检查：

- coverage 是对当前库和证据链的解释，不是对整个领域成熟度的绝对判断。
- collection suggestions 要具体到方向或示例 term，不能只写“增加更多论文”。

常见错误：

- 不要把 core taxonomy/claims 整段复制到 external_context_summary。
- 不要从代表文献数量机械推断统计结论。

Payload JSON 示例：

```json
{
  "coverage_verdict": "partial",
  "coverage_reason": "库内已经覆盖 DETR 公式和若干收敛改进变体，但部署与更广 benchmark 覆盖仍不均衡。",
  "reliability_summary": "关于公式和收敛趋势的核心 claims 较可靠；collection-level 结论应视为暂定。",
  "coverage_caveats": [
    {
      "type": "library_coverage_gap",
      "note": "效率导向和部署导向的变体覆盖不足。"
    }
  ],
  "external_context_summary": "外部 context 指向若干邻近 DETR variants 和 surveys，可补强效率与 benchmark comparison 覆盖。",
  "suggested_collection_directions": [
    {
      "direction": "补充效率导向的 DETR variants。",
      "reason": "这些文献能改善部署和 latency tradeoff 的覆盖。",
      "example_titles_or_terms": ["DAB-DETR", "Deformable DETR"],
      "priority": "medium"
    }
  ],
  "diagnostics": []
}
```

### stage_70_summary

- stage 类型：payload
- 任务：基于已渲染的 synthesis report 编写最终 summary。
- 语义目标：基于 runtime 已渲染 synthesis report 写最终用户可读 summary。

本 stage 精确执行序列：

1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。
2. 确认 gate JSON 的 `stage` 是 `stage_70_summary`。
3. 确认 `needs_payload` 是 `true`。
4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。
5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。
6. 手写且只手写 `runtime/payloads/summary.json`；不要写 runtime-owned 文件。
7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。
8. submit 成功后，立刻重新运行 gate，读取下一条指令。

语义处理步骤：

1. 读取 synthesis report 和 manifest。
2. 写一个短摘要、一个概览段落和若干 key takeaways。
3. 保持总结面向用户理解 topic，不新增未在 report 中出现的 claim。
4. 提交后 runtime 生成完整 Host apply-ready sections、`result/topic-analysis.json` 和最终 `topic_synthesis` 或 canceled 输出。

上下文获取方式：

- Runtime read：`runtime/views/synthesis-report.md`。来源：Stage 60 coverage payload submit 后的 runtime report rendering。用途：作为最终 summary 的主要依据。
- Runtime read：`runtime/views/synthesis-report.manifest.json`。来源：Stage 60 coverage payload submit 后的 runtime report rendering。用途：核对 synthesis report 的来源和 hash。

材料使用说明：

- `runtime/views/synthesis-report.md` 是最终 summary 的主要依据。
- `runtime/views/synthesis-report.manifest.json` 用于核对 report 来源。
- payload 路径：runtime/payloads/summary.json
- schema 文件：assets/schemas/stage-70-summary.schema.json

字段说明：

- `summary_brief`：一到两句，说明 topic 的核心定位和当前 synthesis 结论。
- `summary_overview`：一个较完整段落，连接路线、演进、覆盖和可靠性。
- `key_takeaways`：面向用户行动或理解的要点，每条应具体。
- `diagnostics`：记录 report 缺失、summary 保守化、语言不确定等诊断。

质量检查：

- summary 不应替代 result sections，也不应引入新证据。
- key takeaways 要能帮助用户决定如何阅读或补充该 topic。
- 不要手写 sections、manifest、sidecars 或 final candidate；这些都是 runtime-owned 输出。

常见错误：

- 不要输出 Markdown fence 或解释性尾注。
- 不要手写 final-output candidate。

Payload JSON 示例：

```json
{
  "summary_brief": "DETR-style object detection 以 query-based set prediction 为中心，并围绕如何让该公式更易训练和部署展开。",
  "summary_overview": "当前 synthesis 将该 topic 组织为公式、收敛和效率三条路线。库内材料支持核心公式和若干改进方向，但对部署导向变体和更广 benchmark comparison 的覆盖仍是 partial。",
  "key_takeaways": [
    "理解该 topic 时应以 set prediction 和 object queries 作为概念入口。",
    "后续 variants 主要应从收敛、query 设计和效率 tradeoff 解释。",
    "在判断 collection coverage 充分之前，应补充更多效率导向 variants。"
  ],
  "diagnostics": []
}
```

## 输出合同

本技能输出一个 `topic_synthesis` JSON 对象，或一个 `topic_synthesis_canceled` JSON 对象。

- 返回对象必须符合 `assets/output.schema.json`。
- 成功输出包含 operation、language、artifact metadata 和 analysis manifest path。
- 运行器负责把通过校验的结果接受为 `result/result.json`。

## 失败规则

- 如果 gate 返回 error JSON，停止当前技能。
- 不要手动修改 SQLite。
- 不要手动生成由 runtime 管理的 hashes。
- 不要绕过 `gate.py` 调用内部 helper。
- 不要基于旧字段、旧 stage 或历史路径猜测恢复方式。
