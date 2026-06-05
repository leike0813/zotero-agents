# Panoptic SegFormer: delving deeper into panoptic segmentation with transformers (2022)

- Paper ref: 1:RPRBE2QN
- Title: Panoptic SegFormer: delving deeper into panoptic segmentation with transformers
- Year: 2022

## Filtered Digest

#### TL;DR

本文面向全景分割任务提出 Panoptic SegFormer，核心目标是在 transformer 框架下同时提升 things 与 stuff 的分割质量，并缓解 DETR 类方法在全景分割中训练慢、空间分辨率受限、对 things/stuff 采用同一查询机制而导致的表示干扰等问题。

方法由 backbone、基于 deformable attention 的 transformer encoder、location decoder 与 mask decoder 组成。encoder 处理多尺度特征，location decoder 为 thing queries 注入位置线索，mask decoder 接收 thing 与 stuff queries 并预测类别与 mask。

论文的三个关键设计是：深监督 mask decoder、query decoupling strategy、mask-wise merging inference。深监督让中间层 attention maps 直接受 mask 监督，加快注意力聚焦；查询解耦把 thing queries 与 stuff queries 分开分配；mask-wise merging 在后处理时同时考虑分类概率和 mask 质量来解决重叠冲突。

实验显示，Panoptic SegFormer 在 COCO val 上用 ResNet-50 达到 49.6% PQ，相比 DETR 基线提升 6.2 PQ，且训练 epoch 从 325 降到 24；在 COCO test-dev 上，Swin-L 版本达到 56.2% PQ，PVTv2-B5 版本达到 55.8% PQ。

消融实验把增益拆解到 mask-wise merging、deformable attention、mask decoder 和 query decoupling：从 DETR 的 43.4% PQ 逐步提升到 49.6% PQ，同时推理速度达到 7.8 FPS。query decoupling 尤其提升 stuff 质量，mask-wise merging 在多种模型上均改善 Mask PQ 与 Boundary PQ。

论文也报告 ADE20K、instance segmentation 与 COCO-C robustness 结果，说明该框架不只是针对单一 COCO val 设置调参。局限是依赖 deformable attention，速度仍偏慢，对更大空间尺度特征和小目标处理仍不理想。

#### 研究问题与贡献

- 研究问题：如何设计一个 transformer-based panoptic segmentation 框架，使其既能高效处理多尺度高分辨率特征，又能避免 things 与 stuff 在统一 query set 中相互干扰，并在不引入复杂手工流程的前提下提升全景分割质量？

- 提出 Panoptic SegFormer，将 deformable attention encoder、location decoder、deeply-supervised mask decoder 组合成一个面向全景分割的 transformer 框架。

- 提出 query decoupling strategy：thing queries 通过 bipartite matching 处理可数实例，stuff queries 通过 class-fixed assign 处理不可数区域，从查询层面降低任务间干扰。

- 提出深监督 mask decoder，用每层 attention maps 生成 masks 并接受监督，使注意力模块更早聚焦语义区域，减少训练轮次并提升 mask 质量。

- 提出 mask-wise merging inference，用分类置信度和 mask 质量共同计算 mask score，再按 mask 级别解决重叠，替代常见 pixel-wise argmax 后处理。

- 在 COCO、ADE20K、COCO-C 和 instance segmentation 设置下给出系统实验，证明该框架在精度、训练效率、推理速度和鲁棒性上均有可观收益。

#### 方法要点

- Encoder 使用 deformable attention 处理来自 backbone 的 C3、C4、C5 多尺度特征，避免标准 self-attention 在高分辨率特征上的二次复杂度瓶颈。

- Location decoder 只作用于 thing queries，用检测损失监督其学习位置线索；推理时辅助 MLP head 可丢弃，位置线索由 query 表示保留。

- Query decoupling 把 N_th 个 thing queries 与 N_st 个 stuff queries 分离：things 采用 Hungarian/bipartite matching，stuff 采用类别固定分配，但两类 query 最终仍进入统一 mask decoder 并输出同一格式结果。

- Mask decoder 从每层 decoder attention maps 中分裂并重塑多尺度 attention maps，统一上采样后拼接，再用极轻量 1x1/FC head 预测 binary masks。

- Deep supervision 对每个 mask decoder 层的 attention-derived masks 施加监督，使 attention 模块在早期层就学习关注 ground-truth mask 区域。

- Loss function 将 things loss 与 stuff loss 分离加权：things loss 包含 detection、classification 与 segmentation；stuff loss 主要包含每层 classification 与 segmentation。

- Mask-wise merging 先计算 s_i = p_i^alpha × mask_quality_i^beta，再按 score 排序填充未占用像素，并过滤低置信度或保留区域过小的 masks。

#### 关键结果

- COCO val：Panoptic SegFormer R50 单尺度输入、24 epochs 达到 49.6% PQ，超过 DETR R50 的 43.4% PQ 和 MaskFormer R50 的 46.5% PQ。

- COCO test-dev：Swin-L backbone 版本达到 56.2% PQ，PVTv2-B5 版本达到 55.8% PQ；相较 MaskFormer Swin-L 的 53.3% PQ 有明显提升。

- ADE20K val：R50 版本达到 36.4% PQ，高于 MaskFormer R50 的 34.7% PQ 和 MaskFormer R101 的 35.7% PQ。

- 消融表明，从 DETR baseline 43.4% PQ 加入 mask-wise merging 到 44.7%，再加入 multi-scale deformable attention 到 47.3%，加入 mask decoder 到 48.5%，最终加入 query decoupling 到 49.6%。

- 训练效率显著提升：相比 DETR 325 epochs，Panoptic SegFormer R50 在 24 epochs 达到更高 PQ；在 12 epochs 下也已有 48.0% PQ。

- Query decoupling 将 COCO val 上 PQst 从 joint matching 的 39.5 提升到 42.4，同时 APseg 从 37.7 提升到 39.5。

- COCO-C robustness：同 backbone 下 Panoptic SegFormer 的 corrupted mean 优于 Panoptic FCN、D-DETR-MS 与 MaskFormer，Swin-L 版本在 COCO-C 上相对 MaskFormer 的优势比 clean data 更大。
