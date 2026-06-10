# 防止 Topic Synthesis 被库内样本分布带偏

## Summary

Topic synthesis split skill 在大主题场景下需要优先守住用户给出的 topic 语义边界。当前 Stage 40/50 指令过度依赖 `cross-paper-context.md` 和 DETR 小主题示例，容易把 `Computer Vision` 这类宏观 topic 收缩成库内样本密集的 DETR/Object Detection 子域。

## Goals

- 强化 Stage 40：topic definition 与 scope boundary 是语义边界真源，workset 只代表库内证据覆盖。
- 强化 Stage 50：relation proposal 判断必须基于当前 topic 的语义全集，而不是库内样本密集子域。
- 强化 Stage 60：库内证据偏置应体现在 coverage verdict、coverage caveats 和 collection suggestions。
- 调整示例，避免通用 split skill 继续把 DETR 小主题作为唯一写作范式。

## Non-Goals

- 不改 Stage 40 payload schema。
- 不让 gate 自动判断 topic scope 是否被收缩。
- 不新增 runtime 行为或 Host Bridge 能力。
