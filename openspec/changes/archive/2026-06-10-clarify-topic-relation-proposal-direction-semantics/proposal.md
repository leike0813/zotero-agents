# 明确 Topic Relation Proposal 的方向语义

## Summary

Topic synthesis split skill 的 Stage 50 relation proposal 需要使用方向明确的 relation type。当前 `broader_topic_candidate` 没有说明 target 与当前 synthesis topic 的方向关系，导致 `Computer Vision` 与 `Object Detection` 这类包含关系可能被写反；`overlap_topic_candidate` 也缺少“互不包含”的边界说明，容易把下位 topic 误判为 overlap。

## Goals

- 将 Stage 50 relation type 改为 current-state、方向明确的 enum。
- 明确 existing/prospective proposal 都以“当前 synthesis topic -> target topic”为判断视角。
- 保持 topic graph 的 `broader_than` 边含义：`source_topic_id broader_than target_topic_id`。
- 让 runtime、apply/topic graph ingest、generated `SKILL.md` 和测试使用同一方向合同。

## Non-Goals

- 不新增 topic graph 基础关系模型。
- 不新增后端存储或 proposal store。
- 不让 gate 自动判断 broader/narrower 语义正确性。
- 不重做 topic details UI 或 graph layout。
