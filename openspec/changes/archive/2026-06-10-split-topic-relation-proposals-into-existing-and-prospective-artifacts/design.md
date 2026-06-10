# Design

## Proposal Channels

`stage_50_kg_enrichment` 使用两个关系 proposal 字段：

- `existing_topic_relation_proposals[]`：指向 `synthesis list-topics` 返回的已有 `topic_id`。
- `prospective_topic_relation_proposals[]`：指向未来 topic seed，只包含 `target_topic_seed` 与 `relation_type`。

Runtime 将两类 proposal 写入不同 sidecars。Host apply 只把 existing sidecar 送入 topic graph；prospective sidecar 写入 current topic metadata。

## Artifact Metadata

`current/metadata.json` 增加 `prospective_topic_relation_proposals`。这是轻量 metadata，不需要读完整 structured artifact。`list-topics` 为 materialized topics 读取 current metadata 并把该字段放入每个 topic row。

## Topic Graph

Topic graph relation ingestion 只接受已有 target topic id。缺少或未知 target topic id 时返回 diagnostic，不创建 placeholder node。这样 existing sidecar 的语义保持为“可立即应用的库内关系提议”。

## Skill Instruction

Stage 50 指令保持 current-state only。它说明如何读取 concept candidate context 与 `list-topics`，以及如何填写两个当前字段，不描述历史字段或迁移背景。
