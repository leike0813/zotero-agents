# Design

## Instruction-Only Fix

本 change 只修改 `skills_src/topic-synthesis/contracts/stage-guidance.yaml` 和 generated skill 指令。它不新增字段，也不让 runtime 承担语义质量判断。

## Boundary Rule

Stage 40 必须先读取 prepare handoff 中的 `topic_definition` / `scope_boundary`，再读取 cross-paper context。输出应把当前库内文献视作 evidence coverage，而不是 topic identity。

对于宏观 topic，如果 workset 只覆盖某个子域：

- taxonomy 仍应站在 topic 的宏观结构上组织。
- 有证据的节点可以挂 `source_paper_refs`。
- 缺证据的宏观方向应进入 gaps / coverage caveats / collection suggestions。

## Relation Rule

Stage 50 relation 判断以当前 topic 的语义全集为准。例如当前 topic 是 `Computer Vision` 时，`Object Detection` 是 narrower target；不能因为 workset 偏向 DETR 检测而把 `Object Detection` 判成 broader target。
