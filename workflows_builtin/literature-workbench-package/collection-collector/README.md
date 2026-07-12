# Collection 文献收集器

## 这个 Workflow 做什么？

根据你描述的 collection 含义、研究主题或文献范围，从同一 Zotero 文献库中筛选已经存在的相关文献，并加入指定的现有 collection。

筛选会综合文献元数据、标签和已有 Synthesis Topic 的来源文献。它只整理库内已有文献，不会搜索网络或新增文献。

## 前置准备

- 当前 Zotero 库中需要有一个作为目标的 collection
- 需要能够清楚描述该 collection 的研究主题、边界或排除范围

已有 Synthesis Topic 可提供额外证据，但不是必需条件；Topic 上下文不可用时，workflow 会退化为根据元数据和标签筛选，并记录诊断信息。

## 怎么输入？

无需选中 Zotero 条目。从 Dashboard 直接运行此 workflow，并填写：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `collection` | string | — | 必填；从当前库中按路径选择一个已存在的目标 collection，不能留空或自行输入 |
| `collectionScope` | string | — | 必填；该 collection 表达的含义、研究主题或文献边界 |

## 执行方式

全自动执行，不包含中间确认：

1. 分页读取目标 collection 所在库中的顶层常规文献，并排除已经在目标 collection 中的条目。
2. 合并元数据/标签词项匹配与相关 Synthesis Topic 的来源文献，形成候选集。
3. 最多对 250 篇候选文献分批进行语义相关性评估，每批最多 20 篇。
4. 仅保留相关度不低于 `0.65` 的文献，并为每项记录证据和理由。
5. Apply 阶段再次检查 collection 的当前成员，只将仍未收录的合格条目加入 collection。

没有匹配文献时会成功返回空结果，不会写入任何条目。运行期间如其他操作已将某些候选加入 collection，Apply 会重新去重，因此可以安全重试。

## 需要多长时间？

取决于所在库的规模、候选文献数量、可用 Topic 上下文和后端响应速度。可在运行面板中查看实际进度与结果。

## 产出什么？

将通过验证的既有 Zotero 文献加入目标 collection，并生成可审计的运行结果。其中包含：

- 选中文献的 Zotero 引用、标题和语义相关度
- 使用的证据类型（元数据、标签或 Topic）
- 匹配的 Topic、纳入理由与限制说明
- 候选筛选和缺失上下文的诊断信息

该 workflow 不会联网搜索、导入新文献、修改标签、创建 collection，也不会创建或修改 Synthesis Topic 或图谱。

## 参数说明

除 `collection` 和 `collectionScope` 外，无其他用户可配置参数。相关度阈值、候选评估上限和 Topic 选择均由 workflow 固定管理。

## 模型建议

建议使用能够结合元数据、标签和 Topic 上下文进行语义相关性判断的模型，并具备可靠的工具调用能力。

## 依赖

- **后端**：Skill-Runner
- **Skill**：`collection-collector`
- **Host Bridge**：需要读取 Zotero 与 Synthesis 上下文，并在 Apply 阶段写入目标 collection 的权限

## 相关 Workflow

- [Literature Search Ingest](../literature-search-ingest/README.md) — 先搜索并将新文献入库
- [Literature Analysis](../literature-analysis/README.md) — 为库内文献生成摘要和引文分析
- [导出文献包](../export-literature-bundle/README.md) — 迁移完整 Zotero 条目，而非整理当前库中的 collection
