# Design

## Relation Direction

Stage 50 的 relation proposal 一律从当前 synthesis topic 出发判断 target topic：

- `target_is_broader_topic_candidate`：target 比当前 topic 更宽，入库为 `target broader_than current`。
- `target_is_narrower_topic_candidate`：target 比当前 topic 更窄，入库为 `current broader_than target`。
- `related_topic_candidate`：相关但没有明确包含或交叉。
- `overlap_topic_candidate`：两个 topic 部分交叉且互不包含。
- `contrast_topic_candidate`：同一问题空间中的可比较替代路线或对立视角。

## Minimal Runtime Change

Runtime 继续只校验 enum、target 存在和 `source_paper_refs` 合法。方向语义主要由 schema enum、Stage 50 指令和 topic graph ingest 映射保证；不引入 ontology 推断。

## UI Impact

UI 主要依赖 topic graph edge。修正后的 edge 方向会让 hierarchy 显示自然对齐；本 change 不重做 UI。
