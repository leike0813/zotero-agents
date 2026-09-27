# Literature Metadata Curator

## 这个 Workflow 做什么？

为一个选中的 Zotero 父条目自动查询、修正和补全文献元数据。它适合处理标题大小写不规范、作者缺失、期刊/卷期页码不完整、DOI/ISBN 已有但条目字段不全，以及明显误设的文献类型等情况。

## 前置准备

无硬性前置条件。条目如果已有 DOI、ISBN，或 URL 中包含 DOI、arXiv、PubMed 标识符，workflow 会优先使用 Zotero Host API 的只读元数据检索能力；没有可靠标识符时，需要后端 agent 具备联网搜索能力。

## 怎么输入？

- **选中一个文献单元**：可以选中 exactly one parent item，或选中该父条目下的一个或多个附件；selection planner 会按父条目归并为一个工作单元
- **不处理跨父条目批量任务**：一次运行应只产生一个父条目工作单元，附件选择只用于确定归属，不会作为元数据更新目标
- **已有字段会作为上下文**：标题、DOI、ISBN、作者、item type 和已有书目信息都会传入检索逻辑；运行时身份由 Host 持有的 portable ref 绑定，不进入 skill 输入

## 执行方式

全自动，无需用户确认候选。

执行时有三种进入方式：

1. **本地 fast path（默认）**：如果条目有 DOI、ISBN，或 URL 可确定性解析出 DOI、arXiv、PubMed 标识符，先通过 `runtime.hostApi.metadata.translateIdentifier` 调用受控的 Zotero `Translate.Search` 只读 facade。候选标识符匹配且包含有价值书目信息时，直接通过 `applyResult` 写回。
2. **强制 Agent 搜索**：启用“跳过标识符快速模式”后，不执行上述本地检索，直接运行 `literature-metadata-search` skill。标识符仍会作为 Agent 的检索线索。
3. **SkillRunner fallback**：未启用该选项，但没有可靠标识符、本地检索无结果、translator 失败、候选不可信或标识符不匹配时，也会运行 `literature-metadata-search` skill 做轻量联网元数据检索。

所有路径使用同一个 canonical result 和同一个 apply handler。

## 产出什么？

workflow 会更新父条目的书目信息：

- 标题、DOI、ISBN、ISSN、URL、摘要、日期、语言、library catalog
- 期刊/会议/图书/学位论文/报告相关字段，如期刊名、卷期页码、出版社、会议名、学校、报告类型等
- creators（作者、机构作者等）
- 高置信证据支持时的 `itemType`（例如期刊论文改为学位论文）

对于中文及其他非拉丁文字文献，workflow 会区分原文题名、翻译/罗马化题名和载体名称。翻译与罗马化形式只用于匹配，不会覆盖权威原文题名或作者；无法核实完整原文作者名单时会保留条目现有作者，同时仍可应用日期、identifier、卷期页码、机构、载体等语言中立字段。

workflow 不会修改：

- 附件、笔记、collection、related items，以及除 `status:need-metadata-curation` 外的标签
- PDF 文件或网页快照

无稳定标识符时，只有候选能证明与原条目是同一直接作品、至少两项独立书目信号吻合且有权威落地页佐证，workflow 才会覆盖已有标题或变更类型。章节、论文集章节和期刊论文的标题不会被其图书、论文集或期刊总标题替换；容器信息会写入相应的容器字段。低置信、多候选冲突或只找到疑似结果时，workflow 会跳过写回，不会用猜测结果覆盖条目。

成功写回或确认当前元数据无需修改后，workflow 会移除条目上的 `status:need-metadata-curation` 实例。未解决、跳过或失败时保留该标签；状态清理失败会作为部分成功警告返回，不会回滚已经核实的元数据。workflow 不创建或修改该标签的受控词表定义，也不会添加后续流程状态。

## 参数说明

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| 跳过标识符快速模式 | 关闭 | 跳过 Zotero 标识符检索，直接运行 `literature-metadata-search`。 |

如果条目已有 DOI、ISBN 等标识符，但默认执行未能获取正确元数据，可尝试开启该选项，强制进入 Agent 联网搜索流程。该选项不会降低候选匹配和证据要求。

## 模型建议

🟡 有 DOI、ISBN 或受支持 URL 标识符、未跳过 fast path 且命中时不依赖后端模型。

🔴 启用跳过选项或回退到 `literature-metadata-search` 时，建议使用具备联网搜索能力的模型。任务本身是轻量检索与证据核对，不需要长程写作能力，但需要严格区分同名、预印本/正式版、论文/学位论文和不同版本。

## 依赖

- **后端**：Skill-Runner（用于本地检索未命中后的 fallback）
- **Skill**：`literature-metadata-search`
- **Zotero Host API**：`metadata.translateIdentifier`（受控只读 fast path）
- **Apply Handler**：`handlers.parent.updateMetadata`

## 相关 Workflow

- [Literature Search Ingest](../literature-search-ingest/README.md) — 搜索新文献并入库
- [Literature Analysis](../literature-analysis/README.md) — 基于 PDF/Markdown 生成摘要和引文分析
- [Tag Regulator](../tag-regulator/README.md) — 在元数据较完整后规范化标签
