## TL;DR

本文提出 Mask R-CNN，一个概念简单、灵活且通用的目标实例分割框架。该方法在 Faster R-CNN 基础上增加一个并行的掩码预测分支，能够高效检测图像中的目标并同时为每个实例生成高质量的分割掩码。

Mask R-CNN 引入了 RoIAlign 层来解决 RoIPool 中的空间量化错位问题，并通过解耦掩码与类别预测（每类独立的二值掩码）显著提升了实例分割性能。该方法在 COCO 数据集的所有三项挑战中均取得最优结果。

该框架易于泛化到其他任务，如人体姿态估计。通过将关键点视为独热二值掩码，Mask R-CNN 在 COCO 关键点检测任务上超越了 2016 年竞赛冠军，同时保持 5 fps 的推理速度。


## 研究问题与贡献

- 研究问题：如何开发一个兼具高效性、灵活性和高精度的实例分割框架，使其能够同时完成目标检测和像素级实例分割？


- 提出 Mask R-CNN 框架：在 Faster R-CNN 基础上增加并行的掩码预测分支

- 提出 RoIAlign 层：消除 RoIPool 的量化错位，实现像素级空间对齐

- 解耦掩码与类别预测：每类独立二值掩码（sigmoid）优于多类竞争掩码（softmax）

- 在 COCO 实例分割、目标检测和人体关键点检测三项挑战中均取得最优结果

- 展示框架的泛化能力：可扩展至 Cityscapes 数据集和人体姿态估计任务


## 方法要点

- 两阶段流程：第一阶段 RPN 生成候选框，第二阶段并行预测类别、边界框和掩码

- RoIAlign：使用双线性插值计算精确特征值，避免量化导致的空间错位

- 掩码表示：使用 FCN 从每个 RoI 预测 m×m 掩码，保持显式空间布局

- 多任务损失：L = L_cls + L_box + L_mask，每类独立二值交叉熵

- 骨干网络：支持 ResNet/ResNeXt-C4 和 FPN 架构，FPN 带来显著精度提升


## 关键结果

- COCO test-dev 实例分割：ResNet-101-FPN 达到 35.7 mask AP，ResNeXt-101-FPN 达到 37.1 mask AP

- COCO test-dev 目标检测：ResNet-101-FPN 达到 38.2 box AP，ResNeXt-101-FPN 达到 39.8 box AP

- COCO test-dev 关键点检测：ResNet-50-FPN 达到 63.1 keypoint AP，超越 2016 竞赛冠军

- RoIAlign 相比 RoIPool 提升约 3 点 mask AP，在 AP75 上提升约 5 点

- 解耦掩码预测（sigmoid）相比多类竞争（softmax）提升 5.5 点 mask AP

- FCN 掩码分支相比 MLP 提升 2.1 点 mask AP

- Cityscapes 数据集：仅使用 fine 标注达到 26.2 AP，使用 COCO 预训练达到 32.0 AP

- 推理速度：ResNet-101-FPN 约 195ms/帧（约 5 fps），训练约 32-44 小时（8 GPU）


## 局限与可复现性线索

- 代码已开源：https://github.com/facebookresearch/Detectron

- 训练使用 8 GPU 同步实现，COCO trainval35k 训练约 32-44 小时

- 推理时仅在 top 100 检测框上计算掩码，增加约 20% 开销

- C4 变体推理较慢（约 400ms），不推荐实际使用

- Cityscapes 小样本类别（truck、bus、train）存在域偏移问题


## 分章节总结

### Abstract

- 概述 Mask R-CNN 框架：扩展 Faster R-CNN 添加并行掩码预测分支，简单高效，5 fps 推理，在 COCO 三项挑战中取得最优结果



### Introduction

- 回顾 Fast/Faster R-CNN 和 FCN 等强大基线系统，提出开发实例分割使能框架的目标

- Mask R-CNN 扩展 Faster R-CNN，为每个 RoI 并行预测分割掩码，使用 RoIAlign 解决空间错位

- 解耦掩码与类别预测：每类独立二值掩码，不依赖类别间竞争

- 无额外优化下超越 COCO 2016 竞赛冠军，同时擅长目标检测任务

- 展示框架泛化性：通过关键点视为独热掩码，扩展到人体姿态估计



### Related Work

- R-CNN 系列：从 R-CNN 到 Fast R-CNN 到 Faster R-CNN 的演进，RPN 学习注意力机制

- 实例分割方法：基于分割提议的方法（DeepMask 等）先分割后识别，速度慢；FCIS 同时预测但重叠实例有系统误差

- 基于语义分割的方法：先像素分类再切分实例，与 Mask R-CNN 的实例优先策略相反



### Mask R-CNN

- 两阶段流程：RPN 生成候选框，第二阶段并行预测类别、边界框偏移和二元掩码

- 多任务损失定义：L_mask 仅对正样本 RoI 和真实类别 k 的掩码计算

- 掩码表示：使用 FCN 预测 m×m 掩码，保持显式空间布局，参数量少于 MLP

- RoIAlign：避免量化，使用双线性插值计算精确特征值，对像素级任务至关重要

- 骨干网络：ResNet/ResNeXt-C4 和 FPN，FPN 带来精度和速度双重提升



### Implementation Details

- 训练：IoU≥0.5 为正样本，图像短边 800 像素，8 GPU 训练 160k 次迭代

- RPN 锚框：5 尺度 3 长宽比，RPN 单独训练不共享特征（除非特别说明）

- 推理：C4 骨干 300 个提议，FPN 1000 个提议，NMS 后在 top 100 框上计算掩码

- 掩码输出缩放到 RoI 大小，阈值 0.5 二值化



### Experiments: Instance Segmentation

- 主结果：Mask R-CNN 所有变体超越 MNC 和 FCIS 等先前最优方法

- 消融实验：更深网络、FPN、ResNeXt 带来预期增益；sigmoid 解耦提升 5.5 点；RoIAlign 提升约 3 点；FCN 优于 MLP 2.1 点

- 边界框检测：Mask R-CNN 也超越先前最优，RoIAlign 和多任务训练各自贡献增益

- 推理时间：ResNet-101-FPN 约 195ms/帧，训练 32-44 小时（8 GPU）



### Mask R-CNN for Human Pose Estimation

- 将关键点建模为独热掩码，最小修改即可扩展到姿态估计

- 关键点头：8 层 3×3 512-d conv + deconv + 2× 双线性上采样，输出 56×56

- ResNet-50-FPN 达到 62.7 keypoint AP，超越 2016 竞赛冠军；添加掩码分支提升到 63.1

- 多任务学习：添加掩码分支提升关键点 AP，但添加关键点分支略微降低框/掩码 AP

- RoIAlign 对关键点检测提升 4.4 点 AP，对齐对像素级定位至关重要



### Appendix A: Experiments on Cityscapes

- Cityscapes 数据集：8 类实例分割，2975 张 fine 训练图像，2048×1024 分辨率

- 仅用 fine 标注达到 26.2 AP，比先前最优（DIN）提升 30% 以上

- 使用 COCO 预训练达到 32.0 AP，提升近 6 点

- person 和 car 类别的类内重叠是核心难点，Mask R-CNN 在这两类上提升显著

- truck、bus、train 等小样本类别存在域偏移问题



### Appendix B: Enhanced Results on COCO

- 逐步改进：更新基线→端到端训练→ImageNet-5k 预训练→训练时增强→更深模型→Non-local→测试时增强

- 最终单模型结果：41.8 mask AP 和 47.3 box AP（ResNeXt-152-FPN-NL + 测试时增强）

- 关键点检测增强：数据蒸馏提升到 69.1 APkp，测试时增强到 70.4 APkp

- COCO 2017 竞赛前三名均基于 Mask R-CNN 框架扩展