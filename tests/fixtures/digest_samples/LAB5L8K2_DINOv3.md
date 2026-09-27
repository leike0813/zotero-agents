## TL;DR

本文介绍 DINOv3，一个自监督学习视觉基础模型的重大进展。通过精心数据准备、模型架构设计与优化策略，DINOv3 成功将模型规模扩展至 7B 参数，并在无需微调的情况下于广泛视觉任务中超越专用最先进模型。

核心创新包括：(1) 提出 Gram Anchoring 方法，有效解决长训练中密集特征图退化问题；(2) 采用 RoPE 位置编码与常数超参训练策略；(3) 通过单教师多学生蒸馏产生多尺度模型家族。DINOv3 在密集任务（分割、深度估计、3D 匹配）与全局任务（分类、检索）上均取得领先性能。

## 研究问题与贡献

- 研究问题：如何在无需人工标注的情况下，通过自监督学习训练出适用于多种视觉任务的通用基础模型，并解决大规模训练中的密集特征退化问题？

- 提出 Gram Anchoring 正则化方法，通过 Gram 矩阵约束解决长训练中 patch 级特征一致性的退化

- 构建 7B 参数自监督视觉模型，采用 RoPE 位置编码与常数超参训练策略

- 开发高效多学生并行蒸馏流程，将 7B 教师知识压缩至 ViT-S/B/L/H+ 与 ConvNeXt 多尺度模型

- 在密集任务与全局任务上均达到最先进性能，且无需微调骨干网络

- 验证 DINOv3 方法在卫星图像等跨领域的通用性

## 方法要点

- 数据策略：结合层次 k-means 聚类与检索式筛选，构建 LVD-1689M 平衡数据集，混合 ImageNet-1k 进行训练

- 模型架构：定制 ViT-7B（40 层，4096 维嵌入，patch size 16），采用轴向 RoPE 位置编码与 box jittering 增强分辨率鲁棒性

- 优化策略：摒弃余弦调度，采用常数学习率/权重衰减/EMA 动量训练 1M 步，支持无限期训练

- Gram Anchoring：在 1M 步后引入 refinement 阶段，使用早期模型作为 Gram teacher 约束 patch 特征相似性结构

- 高分辨率 Gram：利用 2 倍分辨率输入生成更平滑的 teacher 特征，进一步提升密集任务性能

- 高分辨率适配：512-768 混合分辨率训练 10k 步，支持高达 4K 分辨率推理

- 单教师多学生蒸馏：共享 teacher 推理计算，并行训练多个学生模型，最小化同步等待时间

## 关键结果

- 密集线性探测：ADE20k 分割 55.9 mIoU（超越 DINOv2 6.4 点），NYUv2 深度估计 0.309 RMSE

- 3D 对应估计：NAVI 几何对应 64.4% recall，SPair 语义对应 58.7% recall

- 无监督物体发现：VOC 2007 66.1 CorLoc，超越所有对比方法

- 视频分割跟踪：DAVIS-L 83.3 J&F，超越 DINOv2 6.7 点

- 目标检测：COCO 66.1 mAP（冻结骨干 + 100M 参数 Plain-DETR），超越全微调 EVA-02

- 语义分割：ADE20k 63.0 mIoU（冻结骨干 + Mask2Former），持平 ONE-PEACE

- 深度估计：5 个真实数据集上均达最先进，且骨干完全冻结

- 实例检索：Met 数据集 55.4 GAP，超越 DINOv2 10.8 点

- 跨领域：卫星图像树高估计与 GEO-Bench 12/15 任务最先进

## 局限与可复现性线索

- 训练计算成本高：ViT-7B 训练需 61,440 GPU 小时（H100），碳排放约 18 tCO2eq

- 模型尺寸大：7B 参数模型推理需要显著计算资源，需依赖蒸馏的小模型进行实际部署

- 代码与模型开源：论文提及代码发布，但未明确训练数据集的具体获取方式

- 高分辨率推理显存需求大：4K 分辨率推理需要充足 GPU 显存

## 分章节总结

### Abstract

- 自监督学习消除手动标注需求，支持大规模数据与模型扩展

- DINOv3 通过数据准备、设计优化与 Gram Anchoring 实现重大突破

- 产生通用视觉基础模型，无需微调即超越专用最先进方法

### 1 Introduction

- 基础模型成为计算机视觉核心组件，自监督学习是训练此类模型的强大方法

- DINOv2 展示了 SSL 的优势，但扩展至更大规模时出现密集特征退化问题

- DINOv3 三大目标：跨任务/领域通用模型、改善密集特征、发布即用模型家族

- 核心贡献概述：数据扩展（LVD-1689M）、7B 模型架构、Gram Anchoring、多学生蒸馏

### 2 Related Work

- 自监督学习脉络：从早期 patch 预测任务到对比学习、聚类、JEPA 架构

- 视觉基础模型发展：从 AlexNet/ResNet 到 ViT，从监督到弱监督（CLIP）再到自监督（DINOv2）

- 密集 Transformer 特征：局部 SSL 损失、寄存器 token、蒸馏聚合方法（AM-RADIO、PE）

- Gram Anchoring 受风格转移中 Gram 矩阵一致性启发，使用早期 SSL 模型作为 teacher

### 3 Training at Scale Without Supervision

- 数据策略：17B 原始图像池，层次 k-means 筛选 1,689M，检索式补充，混合 ImageNet-1k

- 模型架构：ViT-7B（6.7B 参数，40 层，4096 维，patch 16），RoPE 位置编码

- 优化：常数超参训练 1M 步，线性 warmup，batch size 4096，256 GPU

- 损失函数：DINO + iBOT + DKoleo，独立 layer norm 稳定训练

### 4 Gram Anchoring

- 问题发现：长训练中密集任务性能下降，patch 级特征一致性丧失

- Gram Loss：约束学生与 teacher 的 patch 特征 Gram 矩阵（成对点积）

- Refinement 阶段：1M 步后启动，每 10k 步更新 Gram teacher

- 高分辨率 Gram：2 倍分辨率输入 + 双三次下采样，生成更平滑 teacher 特征

- 效果：密集任务性能快速恢复，相似性图保持清晰

### 5 Post-Training

- 分辨率扩展：512-768 混合分辨率训练 10k 步，支持高达 4K 推理

- 模型蒸馏：7B 教师蒸馏至 ViT-S/S+/B/L/H+ 与 ConvNeXt-T/S/B/L

- 多学生并行蒸馏：共享 teacher 推理，按学生迭代时间分配 GPU

- 文本对齐：采用 LiT 范式训练文本编码器，对齐 CLS 与 patch 特征

### 6 Results

- 密集特征质量：PCA 可视化显示更清晰、噪声更少的特征图

- 线性探测：分割、深度估计显著超越所有对比方法

- 3D 对应、物体发现、视频跟踪均达最先进

- 全局任务：分类、检索性能强劲，首次 SSL 模型媲美弱监督方法

- 复杂系统：目标检测、语义分割、深度估计、3D 理解均达 SotA

### 7 Evaluating the Full Family of DINOv3 Models

- ViT 家族：S/S+/B/L/H+ 覆盖不同计算预算，密集任务一致超越竞品

- ConvNeXt 家族：T/S/B/L 高效卷积模型，适合资源受限场景与量化部署

- 文本对齐模型（dino.txt）：密集对齐任务表现优异，全局任务有竞争力

### 8 DINOv3 on Geospatial Data

- 卫星图像领域验证：SAT-493M 数据集训练

- 树高估计：SatLidar1M 与 Open-Canopy 最先进

- GEO-Bench：12/15 分类、分割、检测任务最先进

- 通用 SSL 可匹敌卫星专用方法，域特定预训练在度量任务中有优势

### 9 Environmental Impact

- ViT-7B 训练：61,440 GPU 小时，47 MWh，18 tCO2eq

- 项目总估算：9M GPU 小时，约 2600 tCO2eq

### 10 Conclusion

- DINOv3 代表自监督学习重大进展，消除手动标注依赖

- Gram Anchoring 解决密集特征退化，后处理策略增强灵活性

- DINOv3 模型家族提供跨资源约束与部署场景的通用解决方案