# import-notes

为单个父条目导入 `literature-analysis` 三类结构化 note 产物：

- digest markdown
- references json
- citation analysis json

references 与 citation analysis 会在进入待导入候选前完成结构校验。

如果 digest markdown 中包含 `zs:representative-image:v1` 标记块，导入界面会自动解析同目录代表图；用户也可以手动选择或清除代表图。代表图导入失败不会阻塞 digest note 导入。
