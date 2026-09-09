# Rethinking detection based table structure recognition for visually rich document images (2025)

- Paper ref: 1:VI9JURUB
- Title: Rethinking detection based table structure recognition for visually rich document images
- Year: 2025

## Filtered Digest

#### TL;DR

本文重新审视了基于目标检测的表格结构识别（TSR）方法。作者指出，许多 detection-based TSR 模型在 COCO/mAP 等检测指标上表现不错，却在 cell-level 或 structure-only TEDS 上落后，核心原因不是单一网络能力不足，而是问题定义、检测器机制、评价指标和特征建模目标之间存在错配。

论文把现有 TSR 路线分成 image-to-sequence、graph-based 和 detection-based 三类，并重点分析 detection-based 方法。作者认为，若只检测行列或不建模 header / projected row header，会丢失复杂表格结构；而 PubTables1M 的六类定义虽然信息充分，却会出现 Row 与 Column Header / Projected Row Header 共享框的多标签检测问题，对 Cascade R-CNN 这类两阶段检测器尤其不友好。

为验证分析，作者以 Cascade R-CNN 为基础提出 TSRDet：将 PubTables1M 式多标签定义改写为单标签训练定义，引入 pseudo class 处理 Row 与 Column Header 共享框的情况；调大 RPN proposal 数量并按 TSR 数据集中极端长宽比调整 anchor aspect ratios；同时结合 deformable convolution 与 Spatial Attention Module，以同时改善局部特征和长程依赖建模。

实验覆盖 SciTSR、FinTabNet、PubTables1M，并在 PubTabNet validation set 上做跨数据集对比。TSRDet 在 structure-only TEDS 上达到 SciTSR 98.41%、FinTabNet 99.05%、PubTables1M 98.55%，在 FinTabNet 上优于若干非检测式模型；但 PubTabNet 跨数据集结果为 96.58%，说明域差异仍然重要。

消融实验支持论文的核心论点：单独使用 deformable convolution 能显著提高 mAP，却可能降低 TEDS；aspect ratio tuning 只带来较小 mAP 提升，却显著改善 TEDS；single-label formulation、Spatial Attention 与 deformable convolution 配合后，才同时改善结构识别质量与检测表现。

论文的主要价值在于把 detection-based TSR 的瓶颈拆成可操作的设计原则：检测目标要完整、问题定义要匹配检测器能力、评价不能只依赖 IoU/mAP、表格组件需要长程依赖而不只是局部边界拟合。局限也很明确：方法仍依赖矩形检测框和外部 OCR/PDF 解析，更适合规整文档表格，对旋转、扭曲或视觉形态异常的表格仍可能失败。

#### 研究问题与贡献

- 研究问题：如何解释 detection-based TSR 模型在检测指标和结构识别指标之间的性能落差，并在不放弃两阶段检测器框架的前提下，通过问题定义、proposal 生成和特征建模改造提升结构级 TEDS 表现？

- 系统分析 detection-based TSR 的性能障碍，包括不完整或不匹配的问题 formulation、COCO/mAP 与 TEDS 的评价错配、两阶段/transformer-based 检测器在多标签任务上的能力差异，以及局部特征与长程依赖的平衡问题。

- 提出面向 Cascade R-CNN 的单标签化 TSR formulation：保留 Table、Column、Row、Spanning Cell、Projected Row Header、Column Header 的结构信息，同时通过删除重叠 Row 和引入 pseudo class 避免训练阶段的多标签同框问题。

- 针对 TSR 目标数量多、长宽比分布极端的特点调整 RPN，包括增加 proposals 数量，并把 anchor aspect ratios 扩展到覆盖 FinTabNet 中常见的长条形表格组件。

- 设计 Spatial Attention Module，并与 deformable convolution 结合，使模型既能改善局部边界特征，又能捕获跨表格区域分散分布的行、列、header 等组件的长程依赖。

- 在多个公开数据集与多组消融实验中验证上述分析，展示 TSRDet 在结构级 TEDS 上达到或接近 state-of-the-art，同时揭示 mAP 改善并不必然带来 TSR 结构质量改善。

#### 方法要点

- 问题 formulation：训练阶段把 PubTables1M 的同框多标签定义改写为单标签检测集合；Projected Row Header 样本保留为其专门类别，Row 与 Column Header 重叠时用 pseudo class 代替，测试阶段再复制预测结果恢复原始六类评估定义。

- RPN 调参：针对 TSR 中每张图目标数量更多、组件长宽比更极端的特点，提高 pre/post NMS proposal 数量，并将 aspect ratios 设为 [0.0125, 0.025, 0.0625, 0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16, 40, 80]。

- 指标分析：用 COCO mAP 与 TEDS 的定义差异说明，IoU 更高的检测框可能只是更贴合标注中的空白区域，不一定提升结构树编辑距离，甚至可能丢失表格结构所需的最小覆盖区域。

- 特征建模：deformable convolution 主要提升局部采样和边界适配，但表格组件常跨多个稀疏区域分布，因此需要 Spatial Attention Module 建立长程依赖。

- Spatial Attention Module：采用多分支大核卷积思路，使用 7x1/1x7、11x1/1x11、21x1/1x21 等空间可分离卷积和 depthwise separable convolution 控制参数量，并插入 ResNet backbone 的后几个 residual block。

- 实验协议：使用 SciTSR、FinTabNet、PubTables1M 训练/测试，并在 PubTabNet validation set 上评估跨数据集泛化；同时报告 structure-only TEDS 和 detection mAP，避免单指标结论。

#### 关键结果

- structure-only TEDS：TSRDet 在 SciTSR、FinTabNet、PubTables1M 上分别达到 98.41%、99.05%、98.55%，明显高于 Cascade R-CNN baseline 的 79.09%、87.49%、83.78%。

- FinTabNet 对比非检测式方法：TSRDet 的 all structure-only TEDS 为 99.05%，高于 EDD、TableFormer、TableMaster、VAST、MTL-TabNet、TSRFormer-DQ-DETR 等表中对比方法。

- PubTabNet validation 跨数据集测试：用 PubTables1M 训练的 TSRDet 在 PubTabNet validation 上取得 96.58% all structure-only TEDS，具有竞争力但低于部分专门在 PubTabNet 训练的模型。

- 消融实验显示，aspect ratio tuning 将 Cascade R-CNN 在 FinTabNet 上的 all TEDS 从 87.49% 提升到 90.23%，而 mAP 仅从 95.23% 提升到 95.54%，说明结构指标对 proposal 形状更敏感。

- 单独使用 deformable convolution 的 Ablation 1 mAP 从 95.23% 提升到 97.22%，但 all TEDS 从 87.49% 降至 84.35%，直接支持 detection metric 与 TSR metric 不一致的论点。

- 完整 TSRDet 在消融表中达到 99.05% all TEDS 和 97.50% mAP；Spatial Attention 与 deformable convolution 配合后，比仅做部分改造的模型更稳定地提升结构识别质量。
