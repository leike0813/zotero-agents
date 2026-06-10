# 删除 Topic 时清理关联 Relation Proposals

## Summary

Topic artifact 删除后，关联 topic relation proposals 不应继续出现在 topic graph 或 review 面板中。Soft delete 时相关 edge 和 review item 标记为 deleted；purge 后永久移除这些 relation proposal 状态。

## Goals

- 删除 topic artifact 时，关联 topic graph edges 和 review items 退出 active 展示。
- Purge deleted topic artifacts 时，关联 edges、review items 和 deleted topic graph node 永久移除。
- 保持 prospective proposals 作为 topic artifact metadata 的一部分，随 topic artifact 删除/清理。

## Non-Goals

- 不新增 relation proposal 后端存储。
- 不重做 topic graph UI。
- 不迁移历史已删除 topic 的残留数据。
