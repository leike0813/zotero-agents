# Literature Search Ingest

## 用途

从研究问题、论文线索或空白引导对话出发，执行多来源、多语言文献发现，让用户选择候选，并把确认文献逐篇写入 Zotero。

## 参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `query` | 空 | 主题、题名、identifier 或种子线索；空白 `auto` 进入引导模式。 |
| `searchMode` | `auto` | 自动、引导、主题扩展、种子扩展或定向入库。 |
| `searchBreadth` | `broad` | `broad`、`balanced`、`quick`，控制查询和来源覆盖。 |
| `languageHints` | `[]` | 用于扩展查询和地区来源的语言提示，不会过滤其他语言。 |
| `targetCollection` | 空 | 可选目标 Zotero collection。 |

## 执行边界

1. 先只读检查本地 Zotero/Synthesis，并由用户确认 search brief。
2. 并行使用 core、multilingual、seed、gap 查询思路，跨索引、出版来源、领域库、机构仓储、学位论文库和引文网络发现候选。
3. 先保留并去重来源命中，再按 `ready`、`needs_curation`、`lead_only` 分层。完整 identifier 与 PDF 不是进入候选表的前置条件。
4. 用户选择后才集中核验元数据和公开 PDF，并逐篇发送 typed ingest payload。

## 产出

- `result/search-ledger.json`：查询、来源、去重、分层、用户决策和入库回执的完整账本。
- 最终结果：`searchSummary` 与逐候选 `outcomes`。
- 新建条目固定加入 `status:need-markdown`、`status:need-analysis`、`status:need-deep-reading`；只有本次结果明确需要整理元数据或未取得 PDF 时，才分别加入 `status:need-metadata-curation`、`status:need-fulltext`。
- 复用已有条目时不会重新排入完整处理流程，只会根据本次明确结果补充 metadata/fulltext 待办。
- 这些内建状态的词表定义由插件启动初始化；Search workflow 只增删条目上的标签实例，不创建或修改词表定义。状态变更失败会作为部分成功警告返回，不回滚已入库条目。

## 依赖

- Skill-Runner interactive 后端
- 可联网搜索的模型
- Zotero Host Bridge 写权限
