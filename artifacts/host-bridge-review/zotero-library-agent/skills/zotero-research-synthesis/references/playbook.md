# 研究综合 Playbook

## Synthesis 模型选择

按问题选择派生模型：

| 模型 | 用于 | 不要推断 |
| --- | --- | --- |
| Topic 列表/成员资格 | Topic 发现与论文成员资格 | 成员资格证明了对每个子问题的认可或相关性 |
| Topic context/report/review 输入 | 对一个已识别 topic 的不同读取视图 | 单一视图包含完整源记录 |
| Graph 概览/切片 | 全局摘要或有界邻域 | 来自连通性的因果性 |
| 布局/指标/查询簇 | 坐标、计算指标或 topic 范围聚类 | 来自排名或邻近度的学术背书 |
| 外部参考文献/库内论文排名 | 候选优先级 | 文献搜索的完整性 |
| Library/reference index | 派生的索引记录 | 当前书目的写入状态 |
| Resolver | 来自 tags、collections、refs 与组合规则的论文范围 | 超出返回有界集的身份 |
| Artifact manifest/读取/导出 | 发现、内容访问与文件交付 | 从本地文件存在推断 Zotero 中的持久化 |
| 直接论文研究 bundle | 对一个或多个稳定 Zotero item 引用的可移植交付 | 缺失的来源或分析 artifact 已生成或修复 |
| 直接 Topic research bundle | 当前 Topic 报告加上全局去重的关联 digests | 该 Topic 成员关系、报告新鲜度或缺失 digests 已被重新计算 |
| Attention queue | 排序的审阅候选 | 补救它们的权限 |
| 概念/schema | 类型化语义定义 | 原始 Zotero 元数据搜索 |

在解读前解析所选 topic、paper refs、graph 范围、resolver selectors、artifact 身份或 schema。记录 model 身份与分页完成情况，使另一任务可以复现源边界。

## 来源与新鲜度纪律

在关联来源前说明研究问题与收录规则。对每个结论区分：

- 直接书目或源事实；
- 记录的 notes 或 annotations；
- 插件派生的 topic、graph、index、resolver 或 artifact 事实；
- workflow 产生的解读；
- 你自己的比较或推断；
- 分歧与缺失证据。

当答案依赖新鲜度时，检查当前 cache 与 index 状态。过期的派生视图仍可作为其记录状态的证据，但不能作为最新库状态的证据。通过其实时属主命令确认当前选择、attachments、permissions、Products 及任何请求的写入。

保留冲突来源，而非将其平均成虚假共识。解释 gap 是指"在声明源边界内未找到"、"派生索引中未表示"还是"源素材不可用"。

## Workflow 与 maintenance 边界

当期望的 synthesis 需要其声明的可复用行为、provider 执行或多 artifact 输出时使用 workflow。描述需求，验证源选择与 workflow 选项，独立验证 provider profile，并且只在受支持的模式下提交。保留 `workflowRunId`、相关 `skillRunId`、交互、终态与预期输出 identity。

Topic 创建与更新有不同的身份要求：从显式新 seed 创建；只更新已识别的当前 topic。在检查所请求的 topic 报告、topic ID、artifact 或 Product 之前，workflow 终态只是中间证据。

Maintenance 操作是独立的契约：

- reference-sidecar 刷新更新其自身源 basis 并返回 operation receipt；
- citation-graph 更新消费已提交作用域与预期引用基础；
- graph metric 刷新修复持久化的复杂 metrics；
- 缓存失效只影响其声明的受支持范围；
- 本地驻留 index refresh 不是 Synthesis index operation。

在 maintenance 前运行诊断。保留每个 operation ID、approval、前状态、后状态、成功/失败 ref、可重试性与 basis 哈希。若 `stateChange` 或 handle 消耗不确定，在再次尝试前查询该 operation 的持久 receipt。

## 有序 synthesis 生命周期

对于完整的有界 research bundle，保持各阶段证据独立：

1. 获取预期文献范围，并保留成功的实时 item refs 加来源信息。
2. 为成功或显式选定的父 items 产出 literature-analysis artifacts；让逐论文失败保持可见。
3. 为已提交的论文作用域刷新 reference sidecar，并保留其 `reference_basis_hash` 与结果分区。
4. 用该预期 basis 哈希更新引文图。不匹配时检查 sidecar 状态，并决定是否需要新的刷新。
5. 通过匹配的 workflow 创建或更新 topic 合成，并验证其 topic 身份与报告。
6. 导出研究 bundle，识别目标 Product 或 artifact 资源，下载它，并验证文件元数据或摘要。

仅当当前证据已满足其前置条件时，每个阶段才可跳过。从第一个缺失的稳定 receipt 或 artifact 恢复；绝不要仅因后续导出失败就重跑较早的 mutation 或 maintenance。

## 派生模型决策记录

当多个 Synthesis model 都可能回答该问题时，使用决定记录：

```text
research_question:
selected_model:
alternative_models_considered:
selection_reason:
source_scope:
model_identity_or_schema:
freshness_status:
paging_or_slice_boundary:
excluded_interpretations:
follow_on_read:
```

可区分选择的示例：

- 用 topic 成员资格确立论文集，然后为叙事合成使用 topic 报告；
- 对有界邻域选择 graph slice，对计算的结构属性选择 metrics，对学术解读选择 source reads；
- 当论文集合由组合的 tags、collections 与 refs 定义而非现有 topic 时，选择 resolver；
- 内容选择重要时，先选 artifact manifest 再 artifact read，读取后再导出；
- 仅将 attention 队列用于排列审查候选优先级，然后在提议维护前诊断拥有模型。

对于论文 artifact，manifest 边界是四项集合 `digest + references + citation_analysis + literature_score`。保留每一行的 `available`、`missing` 或 `error` 状态。`literature_score` 解码/schema 失败是不可用证据，必须通过无效快照与诊断与缺失保持可区分。当请求 manifest 或过滤导出而未指定 `artifact_types` 时，预期全部四项；过滤时记录显式子集，以免部分读取被误认为完整的论文覆盖。

紧凑的 `literature_quality` 快照足以用于选择与证据角色校准。当分数缺失或无效时，其中性先验为 `0.5`；可用分数使用 host 计算的置信度调整先验。在下游工作中保留该快照与 payload 哈希，而不是重新评估论文的内在质量。继续独立评估相关性与证据适配度：强分数不能将外部、未知或不相关的论文移入 topic 的核心上下文，不能绕过 Research Bundle 的相关性阈值，也不能在无证据角色决策的情况下证明排除已确认的手稿来源是合理的。

仅当被拒绝的备选方案确实合理且本会改变解释时才记录它们。这样既保持决策可审计，又不把每次简单读取变成规划 artifact。

## Maintenance 前置条件与 receipts

| 维护操作 | 所需前置条件证据 | 要保留的回执字段 | 要检查的事后条件 |
| --- | --- | --- | --- |
| Reference-sidecar 刷新 | 显式论文范围与当前 sidecar 诊断 | Operation ID、成功/失败 refs、可重试性、basis hash | Sidecar 状态与逐论文结果 |
| Citation-graph 更新 | 已提交作用域与兼容的预期引用基础 | Operation ID、作用域、basis 对比、结果分区 | Graph 状态与所请求的 slice/overview |
| Graph metric 刷新 | 既有 graph 状态与缺失/过期 metric 诊断 | operation ID、metric 范围、approval、失败 | 请求的已持久化 metrics |
| 受支持的缓存失效 | 具名缓存范围与陈旧状态无法安全读取的原因 | Operation ID、失效范围、状态变更 | 对所属 model 的新鲜读取 |
| Topic 创建/更新 workflow | 创建用的新 seed 或更新用的既有 topic 身份 | workflow run、交互、终态 | Topic 身份、成员关系、报告 |

保守解读 receipts：

- `stateChange: applied` 表示声明的 operation 改变了状态，而非每个下游模型或导出现已完成；
- 部分成功只确立成功的分区，并将失败引用留在新鲜度敏感主张之外；
- 不确定的 handle 消耗要求在重试前查询 receipt；
- 终态 workflow receipt 仍需要检查承诺的 topic、Product、报告或 artifact；
- 基础不匹配是诊断边界，不是省略预期基础的许可。

若 operation 报告无变更，区分“已为最新”与“范围为空”和“请求被拒绝”。只有前者能在无其他动作的情况下满足时效性前提。

## 导出证据矩阵

| 导出路径 | 传输前的身份 | 字节级证据 | 允许的持久性论断 |
| --- | --- | --- | --- |
| Product asset 下载 | Product ID 与所选 asset | 返回的文件名/媒体类型、大小、提供时的校验和 | 该 Product asset 的本地验证副本 |
| Synthesis artifact 导出 | Artifact manifest 条目与请求的格式/过滤 | 导出 handle 加已验证字节 | 指名 artifact 的本地导出 |
| Workflow 输出文件 | workflow run 与输出/artifact 映射 | 输出 schema 加文件校验和/大小 | 产生的 workflow artifact |
| Zotero attachment 交付 | 实时父级与 attachment ref | 已签发的 file handle 加已验证字节 | 既有 attachment 的读取副本 |
| 将导出的结果附加到 Zotero | 源 Product/artifact、已上传文件 handle、目标父级 | 源与上传校验和加实时子级 ref | 仅在实时确认后持久化 Zotero 附件 |
| 直接 paper bundle | 有序的已解析 Zotero item refs 与聚合作用域 | 本地 manifest/inventory，或远程 file handle 后接已验证下载 | 含可用源、元数据与分析 artifacts 的可移植本地副本 |
| 直接 Topic bundle | 有序的稳定 Topic ID、当前 report 与规范的关联论文引用 | 本地 manifest 加去重 digest 路由，或远程文件 handle 加验证过的下载 | 当前 report 与可用 digest 的可移植本地副本 |

导出 manifest 或文件路径证明发现，而非成功投递。已验证的本地文件证明投递，而非 Zotero attachment。若最终 bundle 含多个资源，清点每个 role 与校验和，并说明哪些资源被有意排除。

### 直接研究包流程

论文范围从 1 到 100 个显式 item selectors 中选择，Topic 范围从 1 到 20 个稳定 Topic IDs 中选择。Host 最多解析 500 篇不同论文，最多物化 5000 个文件或 2 GiB。将有界拒绝视为范围决定：收窄请求或显式拆分它；不要静默截断、省略 Topic，或在声称一个聚合结果的同时创建多个捆绑包。

对于论文交付，检查 manifest 路由 `papers/<libraryId>/<itemKey>/`。预期 `metadata.json`、Markdown 源文件（可用时连同保留的树内图片），否则为 `source.pdf`，以及摘要、参考文献、引文分析与文献评分的状态。Markdown 优先意味着存在的 Markdown 源文件会在该论文目录中抑制 PDF 副本。缺失的源文件或分析 artifact 仍是以其论文 ref 标记的警告；不要替换为其他论文或启动分析。

对于 Topic 交付，在其 Topic 目录下验证每个所请求的报告，并检查 `papers_by_ref`。即使多个 Topics 引用同一篇论文，相关摘要也只在规范 Zotero ref 路由下存储一次。仅当导出报告副本的参考文献标记结构与其记录的源论文顺序匹配时，才向其添加导航。若校验失败，保持报告不变，使用生成的源 index，并报告导航回退警告。绝不重写已存储的 Topic artifact。

本地投递要求目标为空或不存在，并在 `manifest.json`、`index.md`、selector 清单与声明文件可读后完成。远程投递返回短效 `fileId`；运行提供的下载命令，存在时验证大小与校验和，然后解压 ZIP 并检查同一 manifest。不得暴露内部暂存路径。若物化失败，任何部分目标都不是有效结果。若 handle 过期，对未改变的已验证 selector 集重复导出；若 selector 或 Topic 状态改变，重试前重新确立范围。

## 恢复与接近命中

- 在来源证据支持更强主张前，graph edge、cluster 或 ranking 只是计算出的关系。
- 空的 topic/index/resolver 结果本身不构成 maintenance 的理由；先检查范围与状态。
- 部分 sidecar receipt 将失败引用排除在依赖刷新引用的 graph 主张之外。
- basis 不匹配需要新的状态决策，而非绕过比较。
- 论文范围 graph 更新可能需要现有 graph；刻意的库范围有不同的影响与 approval 边界。
- 若 workflow 需要用户交互，保留其确切的 run/skill handle 并请求决定，而非更换 workflows。
- 若终止 run 缺少其报告、topic、Product 或 artifact，返回缺失输出失败并附 run 证据。
- 若用户要求将解释持久化到 Zotero，展示拟议的 note、tag、relation 或文件，并以新 authority 路由到 curation。
- 持续的 topic 刷新或 queue 监视属于托管 facet，不属于此有界任务。
## 端到端决策轨迹

这些 trace 演示如何选择 synthesis 基础、将计算结构从学术证据中分离，并独立验证 maintenance 与导出阶段。

### Trace 1：解读引文图而不夸大它

用户表述：

> 关于这两个研究方向之间的关系，graph 显示了什么？

解读：

- 用户指派生 citation graph。
- Graph 边与聚类可支撑结构性观察。
- 学术共识、影响力、因果性与概念相似性需要 graph 拓扑之外的源证据。

准备：

1. 解析确切的 graph 或 topic 范围。
2. 记录 graph 新鲜度与分页完成。
3. 解析相关源 items。
- 4. 检查边类型、方向、出处与任何指标定义。
5. 当请求的解读超出结构时，阅读源论断。

受支持的答案层级：

- 直接 graph 事实：存在哪些节点与边。
- 计算观察：声明算法下的 clustering、centrality 或 path。
- 有源依据的解释：被引论文主张什么。
- Agent 推断：把它们联系起来的合格解释。

禁止：

- 称共引具有因果影响力；
- 将 cluster 成员关系称作学术共识；
- 将缺失 edge 视为没有学术关系；
- 隐藏过期的 graph 状态。

已完成结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Reported the verified citation-graph relationship and separated it from source-grounded interpretation; no causal or consensus claim was inferred from topology alone.",
  "evidence": [
    {
      "kind": "synthesis-graph",
      "ref": {
        "topicId": "topic-1",
        "graphVersion": "current"
      },
      "description": "The bounded derived model used for structural observations."
    }
  ]
}
```

### Trace 2：诊断、刷新并合成一个过期 topic

用户表述：

> 此 topic 已过期。刷新它并告诉我什么变了。

必需边界：

- 确切 topic 身份；
- 源范围；
- 哪个模型已过期；
- 维护操作；
- synthesis 比较；
- 当前 maintenance authority。

诊断：

1. 读取 topic 状态与源范围。
2. 检查相关 index/graph/sidecar 状态。
3. 识别精确的过期模型与基础。
4. 说明刷新能否改变 topic 内容、graph 状态，或只改变 index。

授权：

- 显示已诊断的维护提议。
- 只为该 operation 获取当前 authority。
- 不要把用户 "stale" 的观察当作每条 maintenance 命令的许可。

执行：

1. 启动已批准的 maintenance operation。
2. 保留 operation ID 与前状态。
3. 检查终态 receipt 与已提交的 basis。
4. 重新读取受影响的模型。
5. 重新运行有界的 synthesis 读取。
6. 比较受支持的写前/写后事实。

失败分支：

- 维护 receipt 报告 sidecar 刷新成功。
- Topic 报告尚未重新计算。

结果决策：

- 不要声称 topic 已刷新。
- 保留 sidecar receipt。
- 对整体请求的 topic 刷新返回 `failed` 并解释缺失阶段。

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "The approved sidecar refresh completed, but the requested topic report was not recomputed or verified, so no current topic-change synthesis is claimed.",
  "evidence": [
    {
      "kind": "operation-receipt",
      "ref": {
        "operationId": "operation-1"
      },
      "description": "Completed sidecar maintenance only."
    }
  ],
  "diagnostics": [
    {
      "code": "topic_output_not_refreshed",
      "message": "A separate topic workflow or read is required before reporting topic changes."
    }
  ]
}
```

### Trace 3：合成并导出研究 bundle

用户表述：

> 把这些论文综合成缺口图并导出 bundle。

可见阶段：

1. 解析并验证来源。
- 2. 构建 gap 合成。
3. 验证缺口图 artifact。
4. 生产或定位所声明的 Product/export。
5. 下载并验证所选资产。

Synthesis 决策：

- 修复研究问题与语料库。
- 区分证据缺席与受支持 gap。
- 保留矛盾发现。
- 说明源深度不对称。

导出决策：

- 识别请求的格式。
- 检查期望的 Product 身份。
- 按角色与媒体类型选择 asset。
- 获取当前投递 handle。
- 验证本地校验和与字节数。

接近命中：

- 本地 gap-map artifact 不是导出的 bundle。
- Product 记录不是已下载的 asset。
- 终态导出 workflow 不是校验和验证。
- 缺失论文不能被静默转换为研究缺口。

已完成结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Synthesized the verified source set into a gap map, preserved evidence limitations, and downloaded the requested export asset with verified bytes.",
  "artifacts": [
    {
      "path": "/workspace/exports/research-gap-bundle.zip",
      "role": "research-bundle",
      "mediaType": "application/zip"
    }
  ],
  "evidence": [
    {
      "kind": "product",
      "ref": {
        "productId": "product-1",
        "assetRole": "research-bundle"
      },
      "description": "The inspected Product asset that issued the verified download."
    }
  ]
}
```

恢复：

- 若导出在 synthesis 后失败，保留 synthesis artifact。
- 从 Product/asset 检查继续。
- 除非其证据无效，否则不要重跑 maintenance 或 synthesis。

## Synthesis 会话与决策模式

模型选择问题：

> Topic report 回答出现了哪些主题与主张；citation graph 回答结构关系。哪个问题应驱动此 synthesis？

时效性披露：

> 源 items 是最新的，但 graph 报告了较旧的 basis。我现在可以基于源文本作答，或准备单独的 graph maintenance 提案。

Gap 披露：

> 此来源集未就 X 报告证据。因为两份相关全文不可用，我将此标记为覆盖 gap 而非研究 gap。

Maintenance 披露：

> 刷新 sidecar 与更新 citation graph 是带各自回执的独立操作。我不会把其中一个当作另一个的完成。

导出披露：

> synthesis artifact 已完成。导出仍是独立的 Product/asset 交付步骤，且只会在所选字节验证后完成。

synthesis 决策记录应保留：

- 研究问题；
- 已包含与已排除的来源 refs；
- 来源证据深度；
- 模型 identity 与状态；
- 声明与定位符映射；
- 分歧；
- 缺失覆盖；
- workflow 与 maintenance 阶段；
- Products 与 artifacts；
- 结果状态与诊断。

不要把决策记录当作提交、维护、持久化、附加或应用结果的权限。
