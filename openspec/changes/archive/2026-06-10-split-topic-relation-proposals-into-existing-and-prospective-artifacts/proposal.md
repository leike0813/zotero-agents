# 精简 Topic Relation Proposals：现有关系入图，预备关系随 Topic Artifact 存储

## Summary

Topic synthesis split skill 的关系提议需要区分两类目标：指向库中已有 topic 的关系提议可以进入 topic graph；指向未来可能创建 topic 的预备关系只作为当前 topic artifact 的 metadata 保存，并随 `synthesis list-topics` 返回给后续 synthesis 读取。

## Goals

- Stage 50 payload 拆分为 `existing_topic_relation_proposals` 与 `prospective_topic_relation_proposals`。
- prospective proposal 只保留 `target_topic_seed` 与 `relation_type`。
- existing proposal 只针对已有 topic，并继续由 apply 写入 topic graph。
- prospective proposal 随 topic artifact 持久化，不新增全局后端 store。
- `list-topics` 与 `get-topic-context` 返回 topic metadata 中的 prospective proposals。

## Non-Goals

- 不新增 topic details 用户面板。
- 不把 prospective proposal 写入 topic graph edge/review。
- 不为 prospective proposal 单独建模 source；所属 topic artifact 即 source。
