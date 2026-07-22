# 文献库维护

使用常驻本地索引作为重复文献库检查的第一遍。在报告或执行操作之前通过 Host Bridge 确认当前事实。

## 索引

- `refresh` 通过 `zotero-bridge library snapshot` 分页并原子更新 SQLite。
- `search` 搜索标题、作者、标识符、标签、collection 和出版物字段。
- `item` 按 key 或数字 id 返回一条索引记录。
- `stats` 报告活跃、已删除、标签、collection 和 workflow catalog 计数。

## Workflow 状态分诊

每日 workflow 状态分诊报告携带 `status:need-*` 标签的条目，并建议拥有每个待处理 artifact 的 workflow。它不推断状态、更改标签或写入 Zotero。

## 卫生检查

每周卫生检查报告重复的 DOI/标题候选项、可疑的乱码标题、过多的标签计数、孤立条目、空 collection 和异常条目类型。它提议操作并将 mutation 保持在用户 approval 之后。

## 关注队列

关注队列将 `zotero-bridge synthesis insight attention-queue` 与本地索引元数据结合，对高优先级阅读、元数据补全和分析任务进行排序。

定时任务默认为只读，除非经审查的任务合约明确要求 approval 门控的维护操作。
