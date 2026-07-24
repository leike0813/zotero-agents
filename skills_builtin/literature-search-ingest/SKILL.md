---
name: literature-search-ingest
description: Conduct guided literature search with multilingual and topic expansion, seed-paper expansion, targeted record ingest, candidate review, evidence-backed metadata and public-PDF verification, and typed Zotero ingest through zotero-bridge. Use when a user wants to discover scholarly literature, fill a Zotero or Synthesis coverage gap, expand from a known paper, verify and ingest an exact record, review candidates before mutation, or add approved literature with provenance to Zotero.
---

# 文献检索与入库

## 任务

将研究问题、主题、种子论文或精确的文献线索转化为一组经过审核的可追溯文献记录，然后仅将用户批准的直接作品入库到 Zotero。

本 Skill 以交互模式运行。使用合法的公开发现来源和 `zotero-bridge` 进行只读的 Zotero/Synthesis 上下文查询以及经批准的 Zotero 变更。禁止使用浏览器自动化、Zotero Connector、CDP、登录会话、机构代理、验证码绕过、Sci-Hub、LibGen 或其他盗版来源。

## 输入

从 `runtime/input.json` 读取运行器输入；不要从对话记忆中重建。

- `query`：字符串；默认 `""`。可以是研究问题、主题/知识空白、种子论文线索或精确标题/标识符。仅含空白字符视为空。
- `searchMode`：精确值为 `auto`、`guided`、`topic_expansion`、`paper_seed_expansion` 或 `targeted_ingest`；默认 `auto`。
- `searchBreadth`：精确值为 `broad`、`balanced` 或 `quick`；默认 `broad`。广度控制查询/来源覆盖范围，不影响候选质量阈值。
- `languageHints`：可选的 BCP 47 风格字符串，如 `en`、`zh-CN` 或 `ja`；默认 `[]`。语言提示增加查询和来源覆盖范围，不会排除未列出的语言。
- `targetCollection`：可选的 Zotero 集合引用。空值表示用户的默认文库；不要猜测集合。

支持的四种查询形式：

1. 空白或不完整的研究意图；
2. 主题、问题、方法、对象、应用或覆盖空白；
3. 已知论文、作者、项目、数据集、Topic 或本地工件；
4. 精确的文献记录或标识符。

## 交互契约

仅两个阶段可以等待用户：

1. 阶段 10：批准或取消检索简报。
2. 阶段 30：批准入库范围、请求新一轮发现或取消。

遵循以下规则：

- 仅询问会改变检索计划的缺失信息。说明缺失内容及其对发现的影响。
- 将非空 `query` 和只读本地上下文视为已知事实；不要重复它们已经回答的问题。
- 允许"未知"或"无偏好"。一旦存在最低研究目标即停止信息收集。
- 在阶段 10 批准之前，不要执行外部发现、下载文件或变更 Zotero，包括非空的 `auto`。
- 阶段 30 的扩展仍然是同一个入库范围决策。它以新的 `discovery_round` 返回阶段 20，然后再次返回阶段 30；不会创建第三个决策阶段。
- 进度消息是普通的助手更新。它们不得进入等待状态，也不得类似最终 JSON。
- 阶段 30 范围批准后，元数据解析、三路线 PDF 探测、载荷准备和逐篇入库自动运行。不要再请求确认或使用 `open_text`。
- 范围批准后允许非阻塞的最终准备表格，但不得暂停执行。
- 仅在门控返回 `return_final_output` 后才返回已完成或已取消的 JSON 对象。不要将 pending、收据、计划摘要或进度占位符作为最终输出返回。

## 运行时模型

从运行器工作区运行。不要切换到 Skill 包目录。

权威运行时路径：

- 运行器输入：`runtime/input.json`；
- JSON 门控状态：`runtime/literature-search-ingest-gate.json`；
- 代理编写的阶段载荷：当前门控 `payload_path`，位于 `runtime/payloads/` 下；
- 已批准范围的单篇论文任务规格和轻量级工作器结果：`runtime/agent-batches/batch-NNN/`；
- 运行时生成的不可变入库载荷：`runtime/payloads/ingest-paper-NNN.json`；
- 精确的 Host 响应或最小致命收据：当前门控 `receipt_path`，位于 `runtime/host/` 下；
- 运行时生成的紧凑审计摘要：`result/search-ledger.json`；
- 最终业务输出：由 `assets/output.schema.json` 验证的单个助手 JSON。

`runtime/` 是完整的中间工作边界。主代理通过成功执行门控发布的 `prepare_agent_batches` 动作来证明该边界可写，该动作原子性地为每篇已批准的论文写入一个任务规格。每个规格在其自身的 `runtime/agent-batches/batch-NNN/` 目录下精确命名一个工作器结果路径。子代理仅写入该单个结果文件；它不创建探测、清单、阶段载荷、终结器输入、哈希、收据或其他任务的文件。每个派生工件必须保留在 `runtime/` 下；不要创建系统临时目录、主目录缓存或外部回退。唯一的公开输出例外是现有的 `result/` 契约：`result/search-ledger.json` 和运行器拥有的最终结果保留在那里，而每个任务、草稿、审核载荷、规范入库载荷和 Host 收据保留在 `runtime/` 下。

JSON 门控状态是执行的真实来源。它存储阶段状态、发现轮次、决策、已批准的候选 id、任务路径、主代理审核状态、已准备的载荷路径和哈希以及收据索引。阶段载荷保存详细的语义证据。工作器 `result.json` 是不受信任的研究材料：它的存在仅满足所有工作器完成屏障，本身不能推进规范元数据、PDF 或入库状态。只有主代理通过门控提交的正式审核载荷才能做到这一点。`result/search-ledger.json` 是紧凑审计摘要，绝不能用于推断或推进状态。

`scripts/gate_runtime.py` 是唯一的代理面对运行时入口。`scripts/stage_runtime.py` 在该入口下验证和变更状态、派生门控已知字段、合并发现增量、写入紧凑账本并构建最终输出。`assets/runtime-action.schema.json` 是每个代理编写的语义载荷的结构契约。运行器拥有 `result/result.json`；不要手写它。

## 门控纪律

将 `<absolute-skill-package>` 替换为包含本文件的绝对目录。第一条命令、每条恢复命令以及每次状态变更后的命令是：

```bash
python "<absolute-skill-package>/scripts/gate_runtime.py" \
  --state "runtime/literature-search-ingest-gate.json" \
  --input "runtime/input.json"
```

门控是唯一的下一步权威。精确复制其绝对路径和命令。

有效的 `next_action` 值：

| `next_action` | 必需行为 |
| --- | --- |
| `await_user_input` | 读取 `required_reads`，呈现当前决策，等待真实用户响应，选择 `payload_variants` 中的对应条目，将语义决策写入 `payload_path`，运行 `submit_command`，然后重新运行初始门控。 |
| `submit_stage_payload` | 对返回的阶段/候选/轮次执行语义工作，遵循 `payload_schema_ref`、`payload_template` 和 `payload_enums`，仅写入 `payload_path`，运行 `submit_command`，然后重新运行初始门控。此动作用于范围批准前以及主代理的门控修复路径。 |
| `prepare_agent_batches` | 阶段 30 批准后，为每个已批准的候选在 `runtime/agent-batches/` 下原子性地创建一个单篇论文任务规格。成功准备证明主代理运行时边界可写。不要在准备成功前委派、提前写入规范审核载荷或变更 Zotero。 |
| `delegate_agent_research` | 将 `dispatch_plan.assignments` 视为一个全任务启动集。在同一调度轮次中，为每个返回的描述符启动一个新的子代理，然后再等待任何结果或重新运行门控。从本文件中的静态 prompt 加上描述符的 `worker_spec_path` 构建每个工作器消息；门控不提供 prompt、阶段链、脚本、终结器、Host 命令或收据路径。 |
| `review_agent_result` | 此动作仅在每个任务都有工作器 `result.json` 后出现。主代理读取返回的 `raw_result_path`，必要时修复或补充研究，将一个正式的 `researchReviewPayload` 写入 `payload_path`，运行 `submit_command`，然后重新运行初始门控。审核逐个处理已批准的候选，使规范状态变更保持确定性；它不是工作器动作，绝不能委派回工作器。 |
| `run_stage` | 精确执行 `command`，不要编辑生成的文件，然后重新运行初始门控。 |
| `execute_ingest` | 执行单篇论文变更 `command`，将精确的 Host JSON 或记录的致命失败写入 `receipt_path`，运行 `submit_command`，然后重新运行初始门控。 |
| `blocked` | 停止状态变更。报告阻塞因素并仅遵循门控发布的修复路径。 |
| `return_final_output` | 读取所需的恢复/输出引用并精确输出门控的 `final_output`。运行时已写入紧凑账本。 |

将 `allowed_actions` 用作语义载荷背后运行时决策的完整列表，而不是要复制到载荷中的字段。当前动作路由：

- 阶段 10：`approve_search_plan`、`cancel_workflow`。
- 阶段 20：`record_discovery`。
- 阶段 30：`approve_ingest_scope`、`request_discovery_expansion`、`cancel_workflow`。
- 阶段 30 后的已批准范围研究：`prepare_agent_batches`、一轮全任务 `delegate_agent_research` 启动、一次统一等待，然后在每个工作器结果就绪后进行仅主代理的 `review_agent_result` 提交。
- 工作器结果修复或回退：主代理修复原始研究或执行有界的缺失查找，然后编写正式审核载荷；工作器从不运行修复阶段、终结器或提交命令。
- 规范入库准备：运行时在所有已批准任务都已审核后投射已接受的主代理审核载荷。
- 阶段 70：`execute_ingest`，然后 `record_ingest_receipt`。
- 终止：`return_final_output`。

每条状态变更命令后都跟随初始门控命令，即使该命令也打印了刷新的门控。全任务委派动作是每条命令重读的例外：启动每个返回的任务，然后将这些工作器作为一组等待，仅在整个轮次都达到终止工作器结果后才重新运行门控。工作器不写入任何状态变更命令输出。门控或 Host 命令的 stdout 是运行时收据，不是最终助手输出。

门控暴露当前写入所需的每个字段和剩余枚举：

- 单载荷阶段返回 `payload_schema_ref`、`payload_template` 和 `payload_enums`；
- 阶段 10 和阶段 30 返回特定于决策的 `payload_variants`；
- 任务准备写入不可变的纯数据规格；委派返回一个 `dispatch_plan.assignments` 数组，包含每个缺失的工作器结果。每个描述符仅暴露 `assignment_id`、`worker_spec_path` 和状态。规格本身仅暴露任务 id、一个已批准的候选、有界的检索限制和该工作器的 `result_path`；
- 主代理审核返回当前唯一符合条件的任务 id、其原始工作器结果路径、正式审核的 `payload_path`、`researchReviewPayload` 模式引用/模板及其提交命令。原始结果在主代理编写并提交模式有效的审核之前不受信任；
- `discovery_round`、`candidate_id`、已准备的哈希、收据绑定、固定的分层/材料/PDF 策略、身份键、计数和批准确认来自门控状态或确定性运行时派生。除非当前模式显式暴露该字段，否则不要将它们添加到代理编写的载荷中。

如果普通的单载荷验证失败：

1. 不要声称阶段已完成；
2. 重新运行初始门控；
3. 仅修复当前的 `payload_path`；
4. 重新提交当前动作；
5. 再次重新运行初始门控。

如果统一等待后工作器结果缺失，重新运行门控并在同一调度轮次中派遣返回的结果缺失集中的每个任务。如果结果格式错误、稀疏、矛盾或仅在工作器 stdout 中返回，主代理仅将有用的研究事实复制到其自己的审核工作中，执行任何有界修复检索以达到诚实的决策，并自行编写正式审核。不要指示工作器运行修复阶段或脚本，不要将工作器 JSON 视为规范载荷，不要更改已批准的范围，也不要将未经审核的工作器输出手动复制到全局路径。

如果门控返回阻塞，不要编辑状态、载荷哈希、生成的入库载荷、Host 收据或另一阶段的载荷。上下文丢失、进程重启或压缩后，重新运行初始门控，读取 `resume_packet`，仅读取当前的 `required_reads`，并仅执行返回的 `next_action`。

## 模式路由

在准备阶段 10 时确定有效模式：

| 输入 | 有效路由 |
| --- | --- |
| 空白 `query` + `auto` | 进入 `guided`；收集最低研究目标。 |
| 非空 `query` + `auto` | 使用查询和只读本地覆盖在检索简报中推荐一个有效模式；不要先执行外部发现。 |
| 显式 `guided` | 保持 `guided`；仅询问未解决的改变计划的问题。 |
| 显式 `topic_expansion` | 保持该模式；需要规划发现所需的主题/问题/空白。 |
| 显式 `paper_seed_expansion` | 保持该模式；识别种子并在规划外部发现前读取可用的本地种子工件。 |
| 显式 `targeted_ingest` | 保持该模式；精确识别一个请求的直接作品，不推荐相关文献。 |

一旦引导式检索简报被批准，在最终输出中保持 `search_mode: "guided"`。永远不要重新映射显式模式。

### 引导式信息收集

仅收集以下相关未知项：

- 研究问题、学科、应用、目标知识空白；
- 时期、文献类型、人群/对象、方法、地区和语言偏好；
- 已知论文、作者、项目、数据集、Topic 和本地工件；
- 纳入/排除标准和需避免的相关主题；
- 期望的审核批次大小、深度以及召回率与速度的偏好。

### 本地覆盖和种子工件

在呈现检索简报前，使用以下命令只读检查 Zotero/Synthesis：

- `zotero-bridge synthesis topic list`；
- `zotero-bridge synthesis index library get`；
- 需要时执行有界的文库搜索/获取命令；
- `zotero-bridge synthesis artifact read` 用于读取选定种子的参考文献、引用分析、摘要或 Topic 报告。

总结已覆盖的主题、年份、方法、文献类型、语言、精确/可能的重复、可重用种子和结构性空白。`paper_seed_expansion` 在外部发现前使用可用的种子工件；如果没有可用的，则从种子的原始标题、创建者、年份、标识符和容器进行规划。

### 检索简报

阶段 10 的计划必须包含：

- 有效模式、目标、学科/应用和检索广度；
- 日期、语言、文献类型、地区、纳入和排除范围；
- 本地覆盖、精确/可能的重复、可重用种子引用、空白和种子工件使用；
- 计划的核心、多语言、种子和空白查询，包括适用时的原文、翻译、简体/繁体和英文变体；
- 主要、补充和回退来源通道及其角色；
- 候选分层、材料冲突策略、审核批次大小和重复策略；
- 三路线公开 PDF 策略；
- 具体的停止条件。

## 高召回检索

### 查询通道

在每轮发现中使用适用的通道并记录每次实际尝试：

| 通道 | 目的 | 典型查询形式 |
| --- | --- | --- |
| `core` | 覆盖研究问题的主要表达。 | 概念组合、引号标题、方法 + 对象、应用 + 结果 |
| `multilingual` | 查找原始语言和地区记录。 | 原始术语、已发表翻译、罗马化、简体/繁体变体、地区术语 |
| `seed` | 从已知作品或实体扩展。 | 创建者、参考文献、引用、类似作品、项目、数据集 |
| `gap` | 填补累积候选中的结构性遗漏。 | 缺失的时期、方法、地区、语言、文献类型、人群或本地文库空白 |

在查询和候选中保留原始文本。翻译、音译和罗马化仅生成检索和匹配变体；它们永远不替代原始标题、创建者、期刊、会议、大学、机构或出版商。

### 来源组成

按学科、语言、地区和文献类型选择来源：

- 跨学科索引：Crossref、OpenAlex、Semantic Scholar、Google Scholar 或同等的公开学术索引；
- 权威出版来源：DOI 着陆页、出版商、期刊、会议、作者、实验室、项目；
- 领域索引：PubMed、Europe PMC、arXiv 和任务相关的数据库；
- 长尾来源：机构知识库、学位论文知识库、图书馆目录、参考文献列表和引用网络；
- 中国大陆来源：China DOI、公开可访问的 CNKI/万方元数据、PDC、官方期刊/会议/出版商、学位机构、知识库；
- 繁体中文和地区来源：Airiti Library、TSSCI、台湾学位论文知识库、期刊网站、大学知识库、图书馆目录。

对于中文期刊/会议论文，优先使用 China DOI 和官方出版物记录；对于学位论文，优先使用学位授予机构和论文知识库；对于图书/ISBN，优先使用出版商和图书馆目录。来源失败是覆盖空白，不是证明该作品不存在的证据。记录失败并尝试同类回退。

### 广度和停止条件

- `broad`：执行每个适用通道；对每个关键语言/地区使用至少一个索引和一个权威或长尾来源；仅在新来源和空白查询不再产生新的高相关性作品时停止。
- `balanced`：执行核心加上适用的多语言/种子通道，然后一轮空白；当有效来源反复产生重复且结构性空白已覆盖时停止。
- `quick`：执行核心加上最相关的多语言或种子通道；返回首轮候选集，不声称覆盖详尽。

候选计数是呈现限制，不是发现停止条件。每轮记录实际查询、来源、来源失败、来源记录计数、唯一计数、合并、未解决冲突、未覆盖空白和具体的停止原因。

### 身份、去重和版本

- 强身份键是规范化后的 DOI、PMID、arXiv id、ISBN 或同等的精确标识符。
- 弱身份键组合 Unicode 规范化后的原始标题、年份、第一创建者/组织和容器。它仅支持聚类。
- 发现证据保留来源、URL、查询通道、原始来源标题、原因和观察到的事实。
- 匹配证据记录精确标识符一致或标题/创建者/年份/容器一致。

首先按强键合并明显的同一作品来源记录。没有强键时，按原文弱键聚类；永远不要在去重前翻译非拉丁文本。合并累积证据，永远不覆盖原始文献值。保持材料冲突分开。明确记录期刊/预印本、会议/期刊、版本、学位论文/文章和容器/直接作品关系，直到权威证据解决它们。

## 候选分层与审核

- `ready`：标识符或权威元数据可以支持语义清晰的类型化入库。
- `needs_curation`：来源可追溯且最安全的 Zotero 类型已知，但字段、冲突或创建者完整性仍需要后续整理；在最终结果中以 `needsCuration: true` 入库。
- `lead_only`：片段、纯标题或未解决的冲突，可能驱动另一次查询但不能入库。

不要因为作品是非英文的、缺少英文翻译或 DOI 或没有公开 PDF 就排除可追溯的作品。只有 `lead_only` 因身份/元数据不足而不可入库。

以可读批次呈现候选，不限制用户可选数量。每行包括：

- 候选 id、原始标题、替代标题、创建者、年份、容器、原始语言和分层；
- 标识符及 `resolved` 或 `identifier_not_found`；
- 发现和元数据来源角色、权威着陆 URL 和匹配依据；
- 文库重复/版本关系和材料冲突；
- 当时已知的 PDF 尝试/状态；
- 缺失字段、推荐理由以及是否可入库。

将 `lead_only` 标记为不可入库并说明它可以支持哪个下一个查询。在阶段 30，用户可以批准任意数量的可入库候选、请求聚焦扩展或取消。

## 阶段契约

对于每个阶段，首先运行初始门控并使用其返回的路径和命令。以下示例显示最小语义；`assets/runtime-action.schema.json` 是精确的字段和枚举契约。

### 阶段 10 — 检索计划

**目的：** 将用户意图和只读本地覆盖转化为可执行的检索简报并获得第一个用户决策。

**代理语义职责：** 路由模式、执行聚焦信息收集、检查本地覆盖、设计查询/来源通道、解释范围和停止条件并呈现计划。如果用户请求更改，修改并再次呈现。仅在明确批准后提交，或提交取消。

**运行时职责：** 验证计划结构、锁定其哈希或记录用户取消。它不设计查询或推断批准。

**门控命令：**

```bash
python "<absolute-skill-package>/scripts/gate_runtime.py" \
  --state "runtime/literature-search-ingest-gate.json" \
  --input "runtime/input.json"
```

**载荷路径：** 门控返回 `runtime/payloads/search-plan-decision.json`。

**最小载荷：**

```json
{
  "decision": "approve",
  "plan": {
    "search_mode": "guided",
    "objective": "查找隧道衬砌病害识别相关研究",
    "discipline_or_application": "土木基础设施检测",
    "scope": {
      "date_range": "2018-present",
      "language_hints": ["zh-CN", "en"],
      "literature_types": ["journalArticle", "thesis"],
      "regions": ["China"]
    },
    "local_coverage": {
      "summary": "文库涵盖通用视觉检测但不涵盖隧道衬砌。",
      "existing_identifiers": [],
      "reusable_seed_refs": [],
      "gaps": ["中文学位论文和工程应用"]
    },
    "seed_artifacts": [],
    "query_lanes": [
      {
        "lane": "core",
        "queries": ["隧道衬砌 病害 智能识别"],
        "rationale": "结合目标、病害和方法。"
      }
    ],
    "source_lanes": [
      {
        "source": "China DOI",
        "purpose": "主要中文期刊发现",
        "fallback_sources": ["Crossref"]
      }
    ],
    "inclusion_criteria": ["直接研究隧道衬砌病害"],
    "exclusion_criteria": ["无隧道场景的通用检测"],
    "batch_size": 20,
    "stop_conditions": ["适用来源不再产生新的相关作品"]
  }
}
```

取消使用：

```json
{ "decision": "cancel" }
```

运行时从运行器输入获取广度并提供固定的分层、材料冲突和三路线 PDF 策略。不要将它们重复为批准断言。

**提交/运行/变更命令：** 遵循所选的 `payload_variants` 条目，将决策写入 `payload_path`，执行门控 `submit_command`，然后重新运行初始门控。

**完成：** 存在已批准的计划哈希，或门控返回已取消的终止状态。

**禁止：** 在批准前不进行外部发现、文件下载、候选声明或 Zotero 变更。不要将修订作为批准提交。

**恢复：** 重新运行初始门控。仅修复 `search-plan-decision.json`；精确重放是幂等的，不同的重放会失败。

**下一步：** 批准后进入阶段 20；取消后终止。

### 阶段 20 — 发现轮次

**目的：** 执行已批准的检索计划或阶段 30 的空白请求，并维护一个累积的去重候选集。

**代理语义职责：** 运行实际的公开查询、记录来源失败、保留原始文本、去重同一作品记录、保持材料冲突分开、对候选分层并解释停止原因。

**运行时职责：** 绑定当前的 `discovery_round`、验证尝试/候选、派生稳定的强/弱身份和计数、将轮次增量合并到累积状态而不丢失早期候选/证据，并存储轮次载荷哈希和摘要。

**门控命令：** 运行初始门控；确认 `next_action: "submit_stage_payload"` 和返回的轮次。

**载荷路径：** `runtime/payloads/discovery-round-NNN.json`，由门控发布。

**最小载荷：**

```json
{
  "query_attempts": [
    {
      "lane": "core",
      "query": "隧道衬砌 病害 智能识别",
      "source": "China DOI",
      "status": "completed",
      "result_count": 1,
      "message": "检查了一条来源记录。"
    }
  ],
  "candidates": [
    {
      "tier": "ready",
      "title": "隧道衬砌病害智能识别研究",
      "alternate_titles": [],
      "creators_display": ["张三"],
      "year": "2024",
      "container": "隧道工程学报",
      "original_language": "zh-CN",
      "material_version": "journal_article",
      "identifiers": { "doi": "10.5555/tunnel.001" },
      "landing_url": "https://example.org/record/tunnel-001",
      "discovery_sources": [
        {
          "source": "China DOI",
          "url": "https://example.org/record/tunnel-001",
          "lane": "core",
          "reason": "该记录暴露了原始标题和年份。",
          "facts": ["original_title", "publication_year"]
        }
      ],
      "matching_notes": ["原始标题、创建者、年份和容器一致。"],
      "library_note": "未找到精确的本地重复。",
      "missing_fields": [],
      "recommendation_reason": "直接针对已批准的研究目标。"
    }
  ],
  "uncovered_gaps": [],
  "stop_reason": "all_applicable_lanes_completed"
}
```

`query_attempts[].status` 精确为 `completed`、`unavailable` 或 `error`；将来源失败上下文放在 `message` 中。候选分层精确为 `ready`、`needs_curation` 或 `lead_only`。当尝试和无结果停止原因是诚实的时，空的 `candidates` 数组是有效的。

每轮仅提交其新候选和有证据支持的更新。运行为新候选生成 id、合并增量并保留完整的累积集。仅在更新现有候选时使用可选的门控发布的 `candidate_id`；更新不能更改标题/年份/容器/材料版本身份或标识符。

**提交/运行/变更命令：** 执行返回的 `submit_command`，然后重新运行初始门控。

**完成：** 当前轮次有实际尝试、已接受的增量、运行时派生的累积身份/计数摘要、未覆盖空白和停止原因。

**禁止：** 不要变更 Zotero、丢弃先前的候选/证据、合并材料冲突、在去重前翻译或声称来源不可用证明不存在。

**恢复：** 重新运行门控并重新提交同一已发布的载荷。精确重试是幂等的；更改的重试会失败。门控状态而非代理字段提供轮次。

**下一步：** 阶段 30。

### 阶段 30 — 入库范围

**目的：** 对累积候选集获得第二个也是最终的用户决策。

**代理语义职责：** 呈现候选/排除表格并披露已批准的直接作品将被自动解析、探测、准备和入库。将响应解释为批准、聚焦空白请求或取消。

**运行时职责：** 对当前轮次验证 id、拒绝 `lead_only`、锁定已批准的 id、为扩展递增轮次或记录取消。

**门控命令：** 运行初始门控并确认 `next_action: "await_user_input"` 加上 `allowed_actions`。

**载荷路径：** `runtime/payloads/ingest-scope-decision-round-NNN.json`。

**最小载荷：**

```json
{
  "decision": "approve",
  "candidate_ids": ["doi:10.5555/tunnel.001"]
}
```

扩展使用：

```json
{
  "decision": "expand",
  "gaps": [
    {
      "description": "添加中文博士论文。",
      "lanes": ["multilingual", "gap"]
    }
  ]
}
```

取消为 `{ "decision": "cancel" }`。空白通道精确为 `core`、`multilingual`、`seed` 或 `gap`。运行时绑定当前轮次、派生排除的 id 和授权记录，并在扩展后创建下一轮。

**提交/运行/变更命令：** 执行返回的 `submit_command`，然后重新运行初始门控。

**完成：** 范围已锁定，对于批准，门控已准备好在 `runtime/` 下为每个已批准的候选原子性地准备一个阶段 40 单篇论文研究任务；创建了扩展轮次；或取消为终止状态。

**禁止：** 不要批准未知或 `lead_only` 的 id。不要将扩展变成单独的确认阶段。批准后不要再等待。

**恢复：** 重新运行门控。如果接受了扩展，使用新的轮次/路径并仅提交实际的新结果或有证据支持的更新；累积状态保留在运行时。如果接受了批准但门控报告 `runtime/` 不可写，以该阻塞因素停止。不要将任务规格、工作器结果或后续载荷重定向到 `/tmp`、主目录、缓存目录或任何其他外部位置。

**下一步：** 批准后进入阶段 40 委派研究和主代理审核；扩展后进入阶段 20；取消后终止。

### 阶段 40 — 委派单篇论文研究与主代理审核

**目的：** 在用户批准精确入库范围后，并行收集每篇已批准论文的元数据和公开 PDF 证据，然后让主代理审核这些研究并为每篇论文提交一个规范载荷。这是一个运行时阶段。工作器任务是一个原子性研究任务，不是一系列工作器可见的阶段。

**权限边界：** 主代理拥有准备、派遣、收集、修复、正式载荷编写、门控提交、确定性入库准备和所有后续 Zotero 变更。每个子代理仅拥有一个已批准候选的一个有界研究任务。工作器可以搜索、检查公开来源并写入其单个轻量级结果文件。它不能运行项目脚本、调用门控、提交载荷、验证或终结运行时状态、编写规范载荷、调用 Zotero、等待另一个工作器或在结果写入后继续。

**运行时职责：** 运行时锁定已批准的候选顺序、为每篇论文写入一个纯数据任务规格、一起暴露每个结果缺失的任务以进行并行启动、等待全结果屏障、验证主代理的正式元数据/PDF 审核、将已接受的审核投射为规范类型化入库载荷，并在所有已批准任务都有终止审核之前保持 Host 变更不可用。运行时不将工作器结果视为规范状态，也不要求工作器执行终结器。

**门控流程：** 阶段 30 批准后，重新运行初始门控并精确遵循以下三个动作：

1. `prepare_agent_batches` 写入每个单篇论文任务规格。
2. `delegate_agent_research` 在 `dispatch_plan.assignments` 中返回所有当前结果缺失的任务；在首次等待前启动所有这些任务。
3. `review_agent_result` 仅在每个任务都有结果文件后开始；主代理为返回的论文编写并提交正式审核，重新运行门控，并重复直到运行时准备所有入库载荷。

不要在单个工作器启动之间重新运行门控。不要使用 `paper-1 → 等待 → 门控 → paper-2` 循环。并行派遣轮次仅在该轮次返回的每个描述符都已启动且每个启动的工作器都达到终止结果后才完成。

#### 单篇论文任务契约

每个已准备的描述符仅包含：

```json
{
  "assignment_id": "paper-1",
  "worker_spec_path": "/absolute/runner/runtime/agent-batches/batch-001/spec.json",
  "status": "result_missing"
}
```

主代理仅读取规格以绑定任务并将其绝对路径替换到下方的静态工作器 prompt 中。有效的规格仅包含：

```json
{
  "assignment_id": "paper-1",
  "candidate": {
    "candidate_id": "paper-001",
    "title": "隧道衬砌病害智能识别研究"
  },
  "search_limits": {
    "metadata_queries": 3,
    "metadata_pages": 4,
    "pdf_queries": 4,
    "pdf_pages": 6
  },
  "result_path": "/absolute/runner/runtime/agent-batches/batch-001/result.json"
}
```

候选对象可能包含完整的已批准发现记录，但它仍然是工作器可以调查的唯一作品。检索限制是硬上限，不是必须耗尽的目标。在找到可靠的元数据和已验证的公开 PDF 后提前停止。任务不包含阶段名称、提交命令、终结器、Host 命令、收据路径、哈希契约或另一篇论文的指令。

#### 静态子代理委派 prompt

此 prompt 是唯一的工作器指令来源。主代理必须为每个任务逐字复制它，并仅将 `{{WORKER_SPEC_PATH}}` 替换为该任务的绝对 `worker_spec_path`。不要要求门控、运行器、运行时或工作流包装器生成、改述、扩展或重复该 prompt。不要在前面添加阶段计划或在后面附加命令。为每篇论文使用新的隔离子代理上下文，使不相关的对话、其他候选、门控输出和 Zotero 变更指令不被继承。

```text
You are handling exactly one literature-search-ingest research assignment.

Read the following assignment JSON file first:

{{WORKER_SPEC_PATH}}

Use only the candidate and search limits in that assignment. Do not inspect or
process any other candidate.

Perform a bounded search for reliable bibliographic metadata and, when
available, a legal publicly accessible PDF. Stop searching as soon as the
assignment's search limits are reached or sufficiently reliable information
has been found.

Write exactly one simple JSON result to the result_path declared in the
assignment file. Include only the bibliographic facts you found, the final PDF
URL when available, the source URLs you used, and concise notes about missing
or uncertain information.

After writing the result file, return its path and exit. If the assigned result
path cannot be written, return the same JSON object directly and exit.

Do not run any project script or runtime command.
Do not submit, import, validate, finalize, or mutate anything.
Do not write outside the assigned result path.
Do not wait for the main agent or for another worker.
Do not coordinate with another worker.
Do not continue searching after the bounded assignment is complete.
```

这些句子是刻意充分的。工作器接收任务规格作为数据，此 prompt 作为行为。本包中的参考可以指导主代理的审核并可以解释研究质量，但主代理不得将长参考包附加到工作器消息或暴露多步执行协议。

#### 并行启动和等待纪律

将每个 `dispatch_plan.assignments` 数组视为一个启动事务：

- 每个描述符创建一个子代理，每个子代理一个描述符；
- 在调用任何工作器的阻塞等待前提交每个任务；
- 永远不给一个工作器多个规格或要求它选择论文；
- 永远不在启动 `paper-2` 前等待 `paper-1`；
- 永远不要仅因为一个工作器提前完成就重新运行门控；
- 永远不要让早期结果触发主代理审核，而另一个返回的任务未启动或正在运行；
- 在所有启动的工作器终止后，重新运行初始门控一次；
- 如果门控返回新的结果缺失集，在再次等待前启动整个返回集。

报告工作器因无法写入指定路径而在 stdout 中报告结果 JSON 的，仍视为已正确终止。主代理可以将同一个简单对象写入任务声明的 `result_path`，前提是它不编造研究事实且不在 `runtime/` 外写入。如果工作器终止时没有可用的文件或 JSON 对象，主代理可以在门控将其返回为缺失时重新派遣该任务，或自行执行相同的有界研究。不要创建工作器内部的修复循环。

#### 有界研究期望

当存在可信标识符时，工作器优先按标识符搜索，然后在标识符缺失、错误或未解决时使用精确标题和创建者/年份查询。检索限制计算实际查询/检查的页面。没有结果的查询仍然计数。不要将整个预算用于重复近似相同的查询、跟随低价值聚合器或等待被阻塞的网站。优先使用权威和高信号来源：

1. DOI、出版商、知识库、会议、学位论文、标准或机构着陆页用于直接作品身份；
2. Crossref、DataCite、PubMed、arXiv、OpenAlex、Semantic Scholar、图书馆目录和同类文献索引用于佐证；
3. 公开搜索结果仅用于定位更好的直接来源或合法 PDF；
4. 片段和二级聚合作为线索，永远不作为材料冲突记录的唯一权威。

工作器必须保持已批准的直接作品固定。期刊扩展不能替代已批准的会议论文；书籍章节不是其容器书籍；翻译版本不自动是已批准的原始版本；知识库记录必须描述同一作品而非相近标题。当直接作品身份在限制内无法变得可靠时，工作器记录不确定性并退出，而不是扩大范围。

对于元数据，仅收集检查来源实际支持的事实：项目/作品类型、主要原始标题、可用时的完整创建者显示、年份/日期、容器、出版商或机构、卷/期/页码、版本、地点、语言、DOI/ISBN/PMID/arXiv、权威着陆 URL、摘要文本和有用的来源 URL。不要猜测缺失的创建者、在没有来源的情况下进行音译、将翻译标题用作原始主标题或仅从文章形状的网页推断期刊文章。

对于合法公开 PDF，按以下优先顺序搜索，并在找到已验证的同一作品 PDF 后停止：

1. 权威着陆页或直接机构记录；
2. 开放获取索引、学科知识库、机构知识库或作者手稿来源；
3. 使用精确标题、标识符和 `filetype:pdf` 变体的有界公开网络搜索。

PDF 仅在 URL 为公开 HTTP(S)、无需登录或机构凭据即可访问、提供 PDF 内容而非 HTML 着陆页且匹配已批准的直接作品时才可用。不要使用浏览器自动化、Zotero Connector、认证会话、机构代理访问、验证码绕过、盗版仓库或不同材料版本的 PDF。

#### 轻量级工作器结果

工作器写入一个扁平 JSON 对象。它是研究交接，不是正式模式提交。仅使用传达找到事实所需的字段；省略未知的可选事实，而不是制造空的嵌套结构。支持的词汇有意保持较小：

- 身份和状态：`candidate_id`、`status`、`item_type`、`title`；
- 文献事实：`creators`、`date`、`publication_title`、`book_title`、`publisher`、`place`、`volume`、`issue`、`pages`、`edition`、`university`、`conference_name`、`language`、`abstract_note`；
- 标识符和访问：`doi`、`isbn`、`pmid`、`arxiv`、`landing_url`、`pdf_url`；
- 来源和不确定性：`source_urls`、`notes`。

`status` 应为 `resolved`、`partial` 或 `unresolved`。`source_urls` 和 `notes` 应为简单字符串数组。`creators` 可以是按来源顺序的简单名称列表；主代理（而非工作器）将可靠名称转换为 Zotero 创建者对象。使用 `abstract_note` 而非 `abstract`，使交接术语指向 Zotero 合法的 `abstractNote` 项目字段，而不暗示原始结果已经是 `itemData`。

最小已解决示例：

```json
{
  "candidate_id": "paper-001",
  "status": "resolved",
  "item_type": "journalArticle",
  "title": "隧道衬砌病害智能识别研究",
  "creators": ["张三", "李四"],
  "date": "2024",
  "publication_title": "隧道工程学报",
  "doi": "10.5555/tunnel.001",
  "landing_url": "https://doi.org/10.5555/tunnel.001",
  "pdf_url": "https://repository.example.org/tunnel-001.pdf",
  "source_urls": [
    "https://doi.org/10.5555/tunnel.001",
    "https://repository.example.org/tunnel-001"
  ],
  "notes": ["知识库 PDF 与标题、创建者和年份匹配。"]
}
```

最小未解决示例：

```json
{
  "candidate_id": "paper-001",
  "status": "unresolved",
  "source_urls": ["https://example.org/ambiguous-record"],
  "notes": ["来源与已批准的材料版本冲突。"]
}
```

结果不需要哈希、清单、覆盖映射、路线对象、置信度分数、审计标志或深层嵌套证据。主代理可以检查来源 URL 并将有用事实转换为正式运行时契约。额外的说明放在简短注释中，而不是私有的迷你报告。

#### 主代理审核与修复

全结果屏障是调度屏障，不是接受屏障。当 `next_action` 变为 `review_agent_result` 时，主代理必须：

1. 读取返回任务的任务规格和 `raw_result_path`；
2. 验证结果属于该候选并区分可靠事实与猜测、片段、错误版本或无依据的声明；
3. 必要时检查来源 URL 并执行小的有界修复检索（如果工作器遗漏了决定性证据或返回矛盾事实）；
4. 决定已批准的直接作品是否元数据合格或诚实地为 `not_attempted`；
5. 对于合格的元数据，记录所有三个正式 PDF 路线结果，在较早的已验证 PDF 之后使用 `skipped_after_verified_pdf`；
6. 将一个模式有效的 `researchReviewPayload` 写入精确的门控发布的 `payload_path`；
7. 运行精确的 `submit_command`，然后重新运行初始门控。

主代理可以修正拼写、规范化 DOI 大小写/前缀、将原始作品类型映射到正确的 Zotero `itemType`、拆分已验证的人名、选择原文标题、丢弃不匹配的 PDF、添加其实际检查的来源的证据或将论文标记为未解决。它不能编造创建者、来源、标识符、摘要、PDF 验证或路线尝试来使载荷通过。

不要将正式载荷返回给工作器提交。不要要求工作器解释模式错误。如果正式审核验证失败，主代理重新运行门控、修复已发布的审核载荷并重新提交。这使语义修复对协调代理可见，而不是隐藏在长时间运行的工作器中。

#### 正式元数据审核

合格的正式审核保持直接作品文献契约：

```json
{
  "metadata": {
    "status": "qualified",
    "metadata": {
      "itemType": "journalArticle",
      "title": "隧道衬砌病害智能识别研究",
      "language": "zh-CN",
      "script": "Hans",
      "alternateTitles": [
        {
          "value": "Intelligent Recognition of Tunnel Lining Defects",
          "role": "translated",
          "language": "en",
          "script": "Latn"
        }
      ],
      "fields": {
        "date": "2024",
        "publicationTitle": "隧道工程学报",
        "abstractNote": "已由来源核验的摘要文本。"
      },
      "creatorCompleteness": "complete",
      "creators": [
        { "name": "张三", "creatorType": "author" },
        { "name": "李四", "creatorType": "author" }
      ],
      "identifiers": { "doi": "10.5555/tunnel.001" },
      "landingUrl": "https://doi.org/10.5555/tunnel.001"
    },
    "evidence": [
      {
        "source": "Publisher record",
        "role": "authoritative",
        "url": "https://doi.org/10.5555/tunnel.001",
        "facts": ["identifier", "original_title", "creators", "date"]
      }
    ],
    "corroborating_signals": [],
    "curation_notes": []
  },
  "pdf": {
    "attempts": {
      "authoritative_landing": {
        "source": "Publisher record",
        "query_or_url": "https://doi.org/10.5555/tunnel.001",
        "status": "not_found",
        "notes": "未暴露公开 PDF。"
      },
      "open_access": {
        "source": "Institutional repository",
        "query_or_url": "10.5555/tunnel.001",
        "status": "found",
        "notes": "公开知识库副本。",
        "pdf_url": "https://repository.example.org/tunnel-001.pdf",
        "content_type": "application/pdf",
        "identity_evidence": ["标题、创建者、DOI 和年份匹配。"]
      },
      "web_search": {
        "source": "Public web search",
        "query_or_url": "not needed after verified repository PDF",
        "status": "skipped_after_verified_pdf",
        "notes": "更高优先级的路线已产生已验证的 PDF。"
      }
    }
  }
}
```

`metadata.title` 是唯一的主标题字段。不要写 `metadata.fields.title`。`metadata.fields` 是封闭的规范 Zotero 字段映射：当选定的项目类型支持其语义角色时，使用合法名称如 `date`、`publicationTitle`、`bookTitle`、`publisher`、`place`、`volume`、`issue`、`pages`、`edition`、`university`、`conferenceName`、`language` 和 `abstractNote`。**`abstract` 不是有效的 itemData 字段；使用 `abstractNote`。** DOI、ISBN、PMID 和 arXiv 标识符放在 `metadata.identifiers` 中；不要将它们放在 `fields.DOI`、`fields.doi`、`fields.ISBN`、`fields.extra` 或虚构的别名中。

`creatorCompleteness` 精确为 `complete` 或 `incomplete`。`complete` 需要已验证的完整创建者列表。`incomplete` 需要 `creators: []`；永远不要发送可能覆盖更好的 Host 记录的部分替换列表。替代标题角色为 `translated`、`romanized` 或 `alternate`。证据角色为 `authoritative` 或 `secondary`。没有解析标识符时，严格标题路径需要至少两个独立的佐证信号和一个权威着陆来源。

如果直接作品身份、材料版本、权威元数据或工具访问仍然不足，仅提交元数据：

```json
{
  "metadata": {
    "status": "not_attempted",
    "reason": "identity_not_verified",
    "message": "有界研究未验证已批准的直接作品。",
    "evidence": []
  }
}
```

原因精确为 `identity_not_verified`、`material_conflict_unresolved`、`authoritative_metadata_unavailable` 或 `tool_unavailable`。当元数据为 `not_attempted` 时不要包含 `pdf`。未解决的审核是该已批准候选的有效终止结果，不会重新打开阶段 30。

#### 正式 PDF 审核

对于合格的元数据，`pdf.attempts` 精确包含键 `authoritative_landing`、`open_access` 和 `web_search`。按该优先顺序处理。在 PDF 被验证前，每个尝试的路线以 `found`、`not_found`、`restricted`、`unavailable`、`mismatch` 或 `error` 结束。在更高优先级路线被验证为 `found` 后，后续路线可以终止为 `skipped_after_verified_pdf`；这是唯一合法的跳过状态，防止在成功后浪费工作器或主代理时间。

`found` 路线需要 HTTP(S) `pdf_url`、以 `application/pdf` 开头的 `content_type` 和非空的 `identity_evidence`。主代理必须有合理依据认为 URL 是公开的、合法的、可达的且是同一直接作品。搜索结果、HTML 着陆页、登录/付费墙页面、不可访问的链接、盗版来源、补充文件、错误版本或类似标题的作品不是已找到的 PDF。如果所有三个路线都在没有已验证 PDF 的情况下终止，元数据入库仍然继续，运行时保留最佳的权威着陆 URL。

#### 确定性入库准备

主代理不手写最终的 Zotero 变更载荷。在所有正式审核被接受后，运行时为每个元数据合格的候选确定性地写入一个规范的 `runtime/payloads/ingest-paper-NNN.json`。生成的顶层仅包含 `paper` 和可选的 `collection`。`paper` 包含 `itemType`、项目兼容的 `fields`、结构化的 `creators`、`identifiers`、可选的 `landingUrl`/`pdfUrl` 和 `attachLandingUrlOnMissingPdf: true`。

运行时将 `metadata.title` 投射到 `paper.fields.title`，保持规范的 `abstractNote`，在类型化标识符对象中保留标识符，按路线优先级选择第一个已验证的 PDF，并对不可变的生成载荷进行哈希以供阶段 70 收据绑定。未知的文献类型使用 `document`，而不是猜测的 `journalArticle`。不要编辑、重命名、合并或批处理生成的入库载荷；如果投射被阻塞则重新运行门控。

**完成：** 每个已批准任务都有一个终止的主代理审核。每个元数据合格的候选有一个运行时生成的规范入库载荷；每个未解决的候选记录为 `not_attempted` 且没有变更载荷。只有此时门控才可以暴露阶段 70。

**禁止：** 不要暴露工作器可见的多阶段计划；在阶段 30 批准前委派；串行派遣任务；给一个工作器多篇论文；要求工作器运行门控、终结器、验证器、导入或 Zotero；接受原始工作器 JSON 作为规范元数据；在指定结果路径外写入；在修复时编造事实；使用 `abstract`；手动编辑生成的入库载荷；或在所有主代理审核被接受前开始 Host 变更。

**恢复：** 缺失的结果文件通过门控作为一个完整的结果缺失任务集返回。一起启动该集合。格式错误或不完整的研究由主代理在编写正式审核时修复；没有自动的原始工作器修复阶段、替换工作器终结器或哈希绑定的工作器清单。模式错误使当前审核保持待处理：重新运行门控、仅修复其发布的 `payload_path`、重新提交并重新运行门控。路径逃逸、已批准范围漂移、规范载荷篡改或冲突的重放会封闭失败。

**下一步：** 每篇已批准论文都有终止审核且运行时已准备所有合格的入库载荷后进入阶段 70；否则继续当前的全工作器屏障或主代理审核游标。

### 阶段 70 — 逐篇 Zotero 入库

**目的：** 主代理为每个已准备的候选精确执行一个类型化变更，并在任何后续变更变得 eligible 之前持久化一个候选/哈希绑定的 Host 收据。

**代理语义职责：** 仅主代理执行精确的门控命令、保持精确的 Host 响应而不包装或总结、分类致命的基础设施/批准失败并继续普通的每篇论文失败而不隐藏它们。子代理权限在各自写入其单个阶段 40 研究结果并退出时结束；没有子代理可以执行、排队、模拟或重试此变更。

**运行时职责：** 重新验证已准备的载荷哈希、将门控发布的候选/路径/哈希绑定到收据路径、拒绝错误路径、跨候选收据重用、更改的重放和载荷篡改、索引 Host 结果并仅在终止收据后推进。在当前收据已提交且主代理已重新运行门控之前不暴露下一个变更。

**门控命令：** 运行初始门控；当 `next_action` 为 `execute_ingest` 时，仅使用返回的字段。

**载荷路径：** 只读的规范 `ingest_payload_path`，位于 `runtime/payloads/` 下；主代理仅将返回的 `receipt_path` 写入 `runtime/host/` 下。不要使用 `runtime/stages/`、`runtime/receipts/` 或子代理批处理目录存放 Host 收据。

**最小载荷 — 精确 Host 响应：**

```json
{
  "result": {
    "ingest": {
      "status": "created",
      "item": {
        "id": 101,
        "key": "ITEM101",
        "libraryId": 1
      },
      "hasPdfAttachment": true
    }
  }
}
```

**提交/运行/变更命令：**

1. 主代理精确执行一个 `zotero-bridge mutation literature-ingest --input @...` 门控 `command`。
2. 将该命令的精确 JSON 响应（不变且无包装）写入门控发布的 `receipt_path`。
3. 执行该单个收据的门控 `submit_command`。
4. 重新运行初始门控，然后才获取下一个单个命令。

对于无法运行的 Host 命令，写入：

```json
{
  "failure": "host_unavailable",
  "message": "所需的 Zotero Host Bridge 变更无法启动。"
}
```

致命的 `failure` 值为 `host_unavailable`、`approval_denied` 和 `execution_blocked`；它们产生已取消的终止状态并停止后续变更。具有 `result.ingest.status: "failed"` 的普通论文特定 Host 响应被记录并继续处理。候选 id 和载荷哈希故意不在收据中，因为运行时已拥有该绑定。

**完成：** 每个已准备的候选具有 `created`、`existing` 或 `failed`，除非致命收据已将工作流移至已取消的终止状态。元数据拒绝的已批准候选保持 `not_attempted`。

**禁止：** 不要将阶段 70 委派给子代理；变更未批准的候选；并发运行多个 Host 命令；预创建多个收据文件；使用不同的载荷；使用 `papers`/`papers[]`；跨候选重用收据；将 `existing` 报告为已创建；或从 `pdfUrl` 推断附件成功。Host 收据中的 `hasPdfAttachment` 是权威的。

**恢复：** 精确的收据重放是幂等的。更改的重放、错误路径的收据、跨候选项目/收据重用、修改的入库载荷或尝试的并发 Host 变更会封闭失败。重新运行门控并使用当前发布的单命令契约。在致命 Host 失败时，立即停止后续变更并保留 `runtime/host/` 下的早期收据。

**下一步：** 另一个已准备候选的阶段 70；否则终止。

### 终止 — 已完成或已取消

门控返回 `next_action: "return_final_output"` 并附带：

- `kind: "literature_search_ingest"` 和 `status: "completed"`，或
- `kind: "literature_search_ingest_canceled"` 和 `status: "canceled"`。

运行时写入 `result/search-ledger.json` 并将验证后的业务对象作为 `final_output` 返回。精确输出该对象。不要重建它、添加 Markdown 围栏、日志、说明或第二个对象。

## 职责

### 必须由 LLM 完成

- 解释研究意图、路由模式、提出聚焦问题并设计检索简报。
- 选择查询/来源通道并执行合法的公开发现。
- 判断直接作品身份、材料版本、重复、相关性、候选分层、元数据权威性、原始出版语言、创建者完整性、PDF 身份和整理需求。
- 呈现两个用户决策并解释批准、扩展或取消。
- 阶段 30 批准后，在等待前启动每个返回的单篇论文任务，仅使用本文件中的静态工作器 prompt 和任务的规格路径。
- 审核原始工作器结果、必要时执行有界语义修复并作为主代理编写每个正式元数据/PDF 审核。
- 仅生成当前载荷模式请求的有证据支持的语义内容。
- 原样输出门控返回的最终业务 JSON。

### 必须由脚本、模式、运行器和 Host 完成

- 门控和阶段脚本准备纯数据单篇论文任务规格、一起暴露所有缺失任务、验证主代理审核载荷、从当前状态和决策派生动作、绑定发现轮次和候选、合并发现增量、派生 id/计数/策略、强制路线覆盖、检测重放和漂移、生成类型化载荷、绑定收据、写入紧凑账本并构建最终业务 JSON。
- `assets/runtime-action.schema.json` 定义动作字段、枚举、条件元数据规则和 PDF 尝试形状。
- `assets/output.schema.json` 验证已完成和已取消的最终业务输出。
- `zotero-bridge` 读取本地 Zotero/Synthesis 上下文并执行每个已批准的类型化变更。
- Host 验证项目类型字段、去重、在支持时写入原生 DOI、尽力创建附件并返回权威的变更/附件状态。
- 运行器验证最终信封并写入 `result/result.json`。

### 禁止

- 不要使用临时脚本进行查询策略、匹配、相关性、证据解释或元数据判断。
- 不要从记忆中绕过门控、修补状态或编辑运行时生成的载荷。
- 不要手写运行器拥有的 `result/result.json`。
- 不要编造来源、证据、标识符、创建者、版本、PDF 状态、项目引用或附件成功。
- 不要执行批量变更；每个候选有一个类型化载荷和一个收据。

## 失败、取消和恢复

- 用户取消仅在阶段 10 或阶段 30 使用 `{"decision":"cancel"}` 时合法。运行时提供稳定的取消原因和阶段特定消息。
- 无结果的发现轮次被诚实记录并进入阶段 30，用户可以请求聚焦扩展或取消。
- 发现期间的来源不可用直接记录在相关的 `query_attempt` 上，`status: "unavailable"` 或 `"error"` 并附带解释性 `message`；尝试同类回退。
- 范围批准后的元数据来源/工具失败变为每篇候选的 `{"status":"not_attempted","reason":"tool_unavailable","message":"...","evidence":[]}`；在可用时包含任何成功检查的来源证据。它不会重新打开用户范围。
- PDF 来源/工具失败变为路线状态 `unavailable` 或 `error`；所有三个路线键仍然是必需的，而已验证 PDF 之后的后续路线使用 `skipped_after_verified_pdf`。
- 普通的论文特定 Host 失败被提交并继续处理。
- Host 不可用、写入批准拒绝或阻止剩余变更的运行时条件作为带有 `failure` 和 `message` 的致命阶段 70 收据提交。保留已完成的收据并返回已取消的输出；永远不要返回 pending。
- 模式或阶段错误使当前阶段保持不变。重新运行门控并仅修复已发布的载荷。
- 输入漂移、损坏状态、修改的已接受证据、修改的入库载荷、错误的收据绑定和冲突的重放是阻塞因素。不要猜测进度或重建状态。
- 恢复时，运行初始门控、读取 `resume_packet`、读取返回的阶段引用并仅继续 `next_action`。

## 最终输出

### 紧凑检索账本

运行时写入 `result/search-ledger.json`，仅包含：

- 输入哈希或查询摘要、有效模式、广度和实际语言；
- 发现轮次摘要：尝试计数、不可用/错误计数、空白、唯一候选 id、去重计数和停止原因；
- 计划/范围决策摘要和已批准/排除的 id；
- 每篇候选的元数据、PDF、已准备载荷和 Host 收据的路径/哈希；
- 最终入库/PDF/整理状态和阻塞/取消摘要。

不要在账本中重复完整的证据载荷。JSON 门控状态仍然是执行的真实来源。

### 已完成 JSON

只有已批准的候选出现在 `outcomes` 中。每个条目有意保持较小：成功的 `created`/`existing` 条目包含标题、状态、数字项目 id、附件状态和整理标志；`failed`/`not_attempted` 条目仅包含标题和状态。详细的证据、路径、原因、标识符、链接和 Host 响应数据保留在紧凑账本和已接受的载荷中。

```json
{
  "kind": "literature_search_ingest",
  "status": "completed",
  "summary": {
    "discovered": 18,
    "selected": 2,
    "created": 1,
    "existing": 0,
    "failed": 0,
    "notAttempted": 1
  },
  "outcomes": [
    {
      "title": "隧道衬砌病害智能识别研究",
      "ingestStatus": "created",
      "itemRef": { "id": 101 },
      "pdfStatus": "attached",
      "needsCuration": true
    },
    {
      "title": "隧道衬砌检测方法研究",
      "ingestStatus": "not_attempted"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

运行时从状态派生六个摘要计数。其入库计数之和为 `selected`，且 `outcomes.length` 等于 `selected`。对于仍需元数据工作的 `created` 或 `existing` 记录，运行时设置 `needsCuration: true`；工作流 apply 钩子添加受治理的 `status:need-metadata-curation` 标签。`itemRef` 仅暴露工作流消费者所需的数字 `id`。将 `existing` 报告为已存在，永远不报告为新创建。

### 已取消 JSON

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "用户拒绝了入库范围。"
}
```

使用门控状态中的终止取消原因/消息。当取消发生在阶段 70 期间时，在紧凑账本中保留已完成的收据。

## 参考加载指南

默认使用本文件。仅读取当前门控返回的参考：

| 阶段或需求 | 读取 |
| --- | --- |
| 阶段 10 模式路由、引导式信息收集、本地覆盖、检索简报、查询/来源策略 | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| 阶段 20 发现轮次、多语言扩展、去重、分层、候选呈现 | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| 阶段 30 范围批准、扩展空白和取消 | [Search Planning And Discovery](references/search-planning-and-discovery.md) |
| 阶段 40 工作器元数据研究和主代理标识符/标题接受、直接作品角色、原文、创建者和 Zotero 字段 | [Metadata Resolution](references/metadata-resolution.md) |
| 阶段 40 有界公开 PDF 研究和主代理路线审核、可达性、身份、合法来源、状态和反例 | [PDF Probe](references/pdf-probe.md) |
| 阶段 40 结果收集/审核和阶段 70 类型化载荷、Host 收据、重试、账本、最终输出和恢复 | [Ingest, Output, And Recovery](references/ingest-output-recovery.md) |
| 终止完成或取消 | [Ingest, Output, And Recovery](references/ingest-output-recovery.md) |

所有四个参考深化协议。它们不替代本文件中的阶段命令、载荷、完成条件或输出形状。

## 执行示例

正常路径：

1. 运行初始门控。
2. 构建并获得阶段 10 的批准；提交 `approve_search_plan`。
3. 执行阶段 20 第 1 轮并提交其发现增量；运行时构建累积候选集。
4. 呈现阶段 30；提交已批准的可入库 id。
5. 运行 `prepare_agent_batches` 在 `runtime/` 下为每个已批准的候选原子性地创建一个纯数据任务规格。
6. 读取 `dispatch_plan.assignments` 并在同一调度轮次中，使用本文件中的静态 prompt 加上该描述符的 `worker_spec_path` 为每个描述符启动一个新的子代理。在首次等待前启动所有任务；工作器执行一个有界研究任务、写入一个扁平的 `result.json` 并在不运行脚本的情况下退出。
7. 等待每个已派遣的工作器完成。如果任何结果仍然缺失，仅在统一等待后重新运行门控、在一个恢复轮次中启动完整的结果缺失集并再次等待。
8. 在全结果屏障后，逐个跟随 `review_agent_result`。主代理读取并修复原始研究、编写正式元数据/PDF 审核、提交它并让运行时在所有审核被接受后生成规范入库载荷。
9. 仅作为主代理，执行一个阶段 70 变更、写入一个收据、提交它并在执行下一个变更前重新运行门控。
10. 当门控返回 `return_final_output` 时，原样输出其 `final_output` 对象。

扩展路径：用户在阶段 30 要求更多中文论文。提交 `{"decision":"expand","gaps":[...]}`、运行阶段 20 第 2 轮、仅提交新候选和有证据支持的更新，并让运行时保留第 1 轮候选，然后返回到同一个阶段 30 决策。

近似遗漏 — 过早发现：非空 `auto` 看起来足够，但阶段 10 未批准。仅使用只读本地上下文准备简报；不要发出外部搜索。

近似遗漏 — 身份变更：已批准的会议论文仅解析为后续的期刊文章。将会议候选提交为 `not_attempted`；不要替换它或请求第三次批准。

近似遗漏 — 缺失 PDF 路线：出版商和 OA 路线已尝试但网络搜索被遗漏且没有较早的已验证 PDF。主代理阶段 40 审核失败；添加实际的网络搜索结果而不是提前将 PDF 标记为缺失。如果 OA 路线已找到已验证的 PDF，将网络搜索标记为 `skipped_after_verified_pdf`。

近似遗漏 — 修改的入库载荷：生成的标题在变更前被编辑。门控返回 `blocked`；不要变更或手动更新哈希。
