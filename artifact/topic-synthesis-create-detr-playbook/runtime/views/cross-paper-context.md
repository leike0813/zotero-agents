# DETR Cross-Paper Context

本上下文只使用 `runtime/views/selected-paper-set.json` 中的 5 篇论文。

DETR 原始论文把目标检测重写为集合预测问题，用 object queries、Transformer encoder-decoder 和 Hungarian matching 移除手工 anchor 与 NMS。其代价是训练收敛慢、多尺度和小目标性能压力明显。

Deformable DETR 用稀疏采样的 deformable attention 降低全局注意力成本，并把多尺度特征纳入查询更新，是解决收敛和尺度问题的关键结构改造。

Conditional DETR 把查询分解为内容和空间条件，强化 object query 的定位含义，代表以 query design 改善收敛速度的路线。

DINO 将 denoising training、anchor/query 改造和更强训练策略组合起来，代表 DETR 系列从概念验证走向高性能检测器的训练机制演进。

实时 DETR 论文把 DETR 系列放到 YOLO 速度/精度语境下比较，说明该路线的评价焦点已经从是否端到端，转向延迟、部署效率和实时 benchmark 上的竞争力。
