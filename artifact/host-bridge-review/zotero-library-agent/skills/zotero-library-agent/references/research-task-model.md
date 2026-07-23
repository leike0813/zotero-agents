# 研究任务模型

## 适用范围

本参考负责跨越五个有边界研究领域的决策，并假定协调器合同已加载。它用于选择任务所有者、汇合任务结果、选择工作流所有权、保留可移植证据以及恢复多阶段请求。精确 CLI binding 仍归随附 CLI Skill 所有，无人值守监管则归托管 Librarian facet 所有。

## 路由决策

| 请求结果 | 主要 Skill | 必须解析的输入 | 完成证据 |
| --- | --- | --- | --- |
| 识别当前 selection、搜索条目、检查笔记或附件，或依据当前文献库状态回答 | `zotero-library-query` | 问题、实时 scope、新鲜度、结果上限 | 稳定对象 ref、locator、完整分页及基于来源的答案 |
| 发现文献、评估候选项、导入已批准记录、处理重复项或准备来源 | `zotero-literature-acquisition` | 纳入规则、目标 library/collection、候选 provenance、写权限 | 候选理由或已验证的获取条目/附件状态 |
| 摘要、提取、比较或解释一篇或多篇论文 | `zotero-literature-analysis` | 已解析条目/附件、分析视角、可用来源层级 | 带来源定位的发现与已声明报告 artifact |
| 将来源与问题、topic、claim、graph、gap 或研究 bundle 建立联系 | `zotero-research-synthesis` | 明确来源边界、Synthesis 模型、预期交付物 | 可追溯关系、分歧/gap 报告或已验证工作流输出 |
| 修正或整理元数据、标签、分类、笔记、链接、文件或 readiness | `zotero-library-curation` | 实时目标、当前与期望状态、变更权限 | 已批准变更 receipt 加变更后实时读取 |

按请求结果路由，而不是按首个可能有用的命令路由。“查找论文并比较其方法”是先获取后分析；“哪些所选论文缺少 PDF？”是查询，“获取这些 PDF”则增加获取；“解释该 topic 并将结果保存为笔记”是先综合后策展。周期性监控请求不属于 Generic 任务：回答其中有边界的问题后，把调度交给托管 facet。

路由下游操作前先解析“这篇论文”“这些笔记”或“所选分类”等指示性语言。所选对象是笔记或附件时，保留其自身身份；仅对要求父条目的合同派生顶层父条目。

## 任务组合

若一个 Skill 的完成条件可直接满足请求，就只使用该 Skill。只有一项任务的已验证输出是另一项任务的声明输入时才进行组合。开始序列前，说明：

1. 每项任务的所有者与有界结果；
2. 跨越每个边界的稳定身份与证据；
3. 哪些阶段只读，哪些阶段引入新的权限决策；
4. 证明每个阶段完成的 artifact 或实时状态证据；
5. 后续阶段失败时的首个安全恢复点。

典型组合包括 acquisition → analysis → synthesis、query → curation → query verification，以及用户单独请求回写时的 analysis → curation。不得把各阶段合并成不透明的“research workflow”，从而隐藏选择标准、失败条目、approval 或中间证据。

handoff 时保留稳定 Zotero ref、topic/Product ID、workflow 或 operation handle、来源 locator、artifact role、机制返回的 checksum 及诊断。当新鲜度重要、handle 已过期、前置任务不完整，或下一步可修改 Zotero 时，重新读取实时数据。下游任务可将输入缩小到前置任务成功条目，但必须报告被排除或失败对象。

## 工作流执行所有权

只有工作流实时描述与预期结果匹配，且声明所需执行模式时才使用该工作流。工作流发现用于识别候选项；requirements 与 validation 决定当前 selection 和选项是否可接受。

对于 Zotero 托管执行：

1. 描述工作流及其 selection/options 合同；
2. 只归一该合同要求的 selection 身份；
3. 校验工作流输入；
4. 单独描述并校验 backend provider profile；
5. 确认 provider 兼容性，并通过工作流汇合点提交；
6. 保留 `workflowRunId` 并检查该确切 run，直至有界任务取得结果或需要交互；
7. 将预期 Product、artifact 及已变更 Zotero 对象与 run 终态分开检查。

active/recent 列表仅用于发现。使用返回的 `skillRunId` 定位 reply 或 connect；检查 permission，但不得假装 CLI 能决定它。通知是生命周期提示，不是 transcript 或授权。提交结果不确定时，创建另一个 run 前先搜索当前/近期匹配 run。

当工作流声明支持，且当前 Agent 将履行每份已下载请求合同时，选择 Agent 自主执行。除非实时合同明确声明，否则该模式不能携带 Zotero 托管工作流选项或 backend provider profile。

## Agent 自主 handoff

以显式 selection 或声明的无 selection 形式准备一次 handoff。保留 `agentRunId`、全部 `agentRequestId`、bundle 路径、checksum、lease 事实和输出合同位置。

对每个请求：

1. 在本地检查 handoff bundle；
2. 读取请求输入及其自身输出合同；
3. 执行有边界的语义工作，不虚构结果文件或 namespace；
4. 严格按声明组装结果目录或 ZIP；
5. 按该请求合同运行本地结果校验；
6. 保留已校验的请求到结果映射，直至所有必要请求均已就绪。

本地检查与校验属于结构预检。它们不联系 Zotero、不续租、不消费 run handle、不判断语义质量，也不授权回写。除非实时 apply 合同明确允许，不得仅因一个请求完成就应用部分映射。

使用原始 `agentRunId` 应用完整映射。Zotero 在 approval 或消费 handle 前预检全部结果。一旦执行开始，将该 handle 视为一次性。响应为失败、混合或不确定时，读取 apply-status receipt；preflight rejection、已应用请求、失败请求、状态变化、消费和恢复均以该 receipt 为权威。不得通过 Zotero 托管 run 命令检查此 handoff。

## 证据、文件与 Product

每个最终结果都使用 `zotero-library-task.result.v1`：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Compared three current abstracts within the requested scope.",
  "evidence": [{
    "kind": "zotero-item",
    "ref": { "libraryId": 1, "key": "ABCD1234" },
    "locator": "abstract",
    "description": "Source for one comparison row."
  }],
  "artifacts": [{
    "path": "comparison.md",
    "role": "report",
    "mediaType": "text/markdown"
  }]
}
```

`completed` 需要有界结果及其完成证据。`canceled` 标识缺少决策、权限、输入或可解析身份。`failed` 记录已尝试但无法安全完成的路径。diagnostics 保留稳定 code 与可操作上下文。

内联 evidence 用于来源身份、locator、workflow/operation handle、approval 结果或带 checksum 的交付事实。artifact 指向任务生成文件；其路径只是 locator，不是持久身份或 Zotero 状态证明。不得创建第二个 evidence envelope。排除 token、authorization header、cookie、完整私有 transcript 及无关附件内容。

区分本地路径、bridge 签发的 `fileId`、Dashboard Product ID、工作流 artifact 与 Zotero 附件。终态 run 不代表 Product 存在；Product 不代表附件存在；已下载 artifact 不证明已回写。使用返回的 checksum 与大小验证传输字节，通过所属 Zotero 对象验证持久状态。

## 多阶段研究生命周期

完整的文献到综合请求可包含以下证据相互独立的阶段：

1. 搜索与 ingest：校验候选边界和 provider profile，随后保留 provenance 及成功 ingest 的条目 ref。
2. 文献分析：只对成功或明确选择的父条目运行；逐篇记录 digest、references、citation analysis 与失败。
3. Reference-sidecar refresh：提交成功论文 scope，保留 operation ID、终态 receipt、basis hash、成功 ref 与失败 ref。
4. Citation-graph update：使用已提交 scope 和预期 basis hash 启动单独获批 operation；保留其自身 receipt。
5. Topic synthesis：对新 seed 选择创建，对已识别 topic 选择更新；随后验证 topic ID 和请求报告，而不只验证 run 终态。
6. Research-bundle export：验证预期 Product，下载所选 asset，并保留文件元数据或 digest。

每项 approval 只属于相应阶段。sidecar 完成不等于 graph 完成；graph 完成不等于 topic 完成；topic 完成不构成 export 证据。从首个缺少稳定完成证据的阶段恢复，不重放更早的变更阶段。

## 恢复与易错边界

- 搜索命中、标题、引文或缓存索引行在实时 Zotero 读取确认身份前都只是候选项。
- 有界搜索为空可以是完整答案；未完成分页或被截断的搜索不能证明不存在。
- failed 或 canceled 任务是该阶段的终态边界。下游工作只能基于明确有效的成功对象继续。
- 报告可以完成，但请求写入仍未获批。返回报告 artifact，并将待执行 mutation 标记为 `canceled`，不得声称全部完成。
- 工作流完成但缺少预期 artifact 或 Product 时，保留 run 证据并报告缺失交付物。
- 文件 handle 过期时，从所属附件、Product 或 artifact 重新获取访问，不得猜测路径。
- scope 变化会改变候选项或结论时，请求新决策；不得静默扩大任务。
- 用户请求持续监管时，不得用重复轮询模拟常驻。将持续监管路由到托管 facet。
