# literature-digest matching metadata upgrade proposal

## 背景

`literature-digest` 当前以子模块形式维护，本期不直接修改其代码。为满足 `redesign-synthesis-persistence-for-performance` 中的 discovery v1 设计，需要在上游子模块升级时为 digest 结果增加一份轻量 matching metadata。

## 建议输出合同

在 digest 成功结果中增加一个 run workspace sidecar，例如：

```json
{
  "schema": "literature_matching_metadata.v1",
  "key_terms": ["..."],
  "methods": ["..."],
  "problems": ["..."],
  "datasets": ["..."],
  "exclude_terms": ["..."]
}
```

字段约束：

- `key_terms`：最能代表论文主题的短语，最多 12 个。
- `methods`：模型、算法、机制、技术路线，最多 8 个。
- `problems`：研究任务、问题、挑战或目标，最多 8 个。
- `datasets`：数据集、benchmark、语料或资源，最多 8 个。
- `exclude_terms`：容易误召回但不应匹配的方向，最多 6 个。

## apply 侧约定

- 插件 apply 侧负责校验字段、截断数组、规范化字符串，并写入 `synt_literature_matching_metadata`。
- 该 metadata 只用于 Index / Discovery 的 BM25 候选生成，不是正文阅读真源，也不替代 digest artifact。
- 不要求 agent 生成 `bm25_text`；插件可以组合 title、normalized title、Zotero tags 与上述字段构建检索文档。
- `metadata_hash` 是变更检测辅助字段，不作为 literature identity。

## 子模块升级建议

后续升级 `literature-digest` 子模块时，应同步增加：

- sidecar schema：`literature_matching_metadata.v1`。
- 最终 result bundle 字段：`literature_matching_metadata_path`。
- gate / final validation 文档：声明该 sidecar 是成功 digest 的公开可消费产物。
- 回归测试：成功 digest 输出中包含 sidecar；字段超限或类型错误时被校验拒绝。
