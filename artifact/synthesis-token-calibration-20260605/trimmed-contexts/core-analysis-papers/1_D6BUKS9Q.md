# DETRs with Hybrid Matching (2023)

- Paper ref: 1:D6BUKS9Q
- Title: DETRs with Hybrid Matching
- Year: 2023

## Filtered Digest

#### TL;DR

本文提出了一种名为 H-DETR 的混合匹配（Hybrid Matching）方案，用于解决 DETR 系列方法中一对一集合匹配导致的正样本训练效率低下问题。该方案在训练阶段同时使用一对一匹配分支和一對多匹配分支，推理阶段仅保留一对一分支，从而在保持 DETR 端到端优势（无需 NMS）的同时显著提升训练效率。

实验表明，该方案在 2D 目标检测、3D 目标检测、多人姿态估计、全景分割和多目标跟踪等五项视觉任务上均取得一致提升，且在 COCO 检测任务上以 Swin-L 骨干网络达到 59.4% mAP，是当时 DETR 类方法中的最高精度。

#### 研究问题与贡献

- 研究问题：如何在保持 DETR 端到端检测能力（无需 NMS）的前提下，克服一对一匹配导致的正样本训练效率低下问题？

- 提出了一种简单而有效的混合匹配方案，将一对一匹配与一对多匹配相结合，在训练阶段引入额外的正样本查询。

- 设计了三种混合匹配变体：混合分支方案（Hybrid Branch）、混合轮次方案（Hybrid Epoch）和混合层方案（Hybrid Layer），其中混合分支方案在训练时间和精度之间取得了最佳平衡。

- 在多种 DETR 变体（Deformable-DETR、PETRv2、PETR、TransTrack）和多项视觉任务上验证了方案的泛化能力，均取得一致提升。

- 在 COCO 目标检测任务上以 Swin-L 骨干达到 59.4% mAP，超越了当时的 DINO-DETR 等领先方法。

#### 方法要点

- 混合分支方案：维护两组查询，分别进行一对一匹配和一对多匹配（将 ground truth 重复 K 次），联合优化两个分支的损失。

- 推理阶段仅保留一对一分支，无需 NMS，保持了 DETR 的端到端特性且无额外推理开销。

- 通过掩码多头自注意力机制实现两组查询并行处理，避免交互，训练时间仅增加约 7%。

- 混合轮次方案：前 ρ 轮使用一对多匹配，剩余 (1-ρ) 轮使用一对一匹配。

- 混合层方案：前 L₁ 层解码器使用一对多匹配，后 L₂ 层使用一对一匹配。

- 实验表明最佳参数设置为 K=6（每个 ground truth 重复 6 次），T=1500（一对多查询数）。

#### 关键结果

- COCO 2D 检测：H-Deformable-DETR (R50, 12 epochs) 从 47.0% 提升至 48.7% (+1.7%)。

- COCO 2D 检测：H-Deformable-DETR (Swin-L, 36 epochs) 达到 59.4% mAP，超过 DINO-DETR (58.5%)。

- nuScenes 3D 检测：H-PETRv2 从 50.68% 提升至 52.38% NDS (+1.7%)。

- COCO 姿态估计：H-PETR (Swin-L) 从 73.3% 提升至 74.9% AP (+1.6%)。

- MOT17 多目标跟踪：H-TransTrack 从 67.1% 提升至 68.7% MOTA (+1.6%)。

- COCO 全景分割：H-Mask-Deformable-DETR (R50, 12 epochs) 从 47.0% 提升至 48.5% PQ (+1.5%)。

- 消融实验表明混合分支方案在训练时间、推理速度和精度之间取得了最佳平衡。
