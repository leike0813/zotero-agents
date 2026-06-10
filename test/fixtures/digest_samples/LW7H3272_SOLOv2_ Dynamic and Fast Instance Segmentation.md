## TL;DR

SOLOv2 提出了一种动态、快速的实例分割框架，将掩码生成解耦为掩码核预测和掩码特征学习两个独立模块，完全不需要边界框检测。同时提出 Matrix NMS 算法，用并行矩阵运算一次性完成掩码去重，处理 500 个掩码不到 1 毫秒。

在 COCO test-dev 上，ResNet-50-FPN 的 SOLOv2 达到 38.8% mask AP（18 FPS），轻量版达到 37.1% AP（31.3 FPS），ResNet-DCN-101-FPN 达到 41.7% AP。此外，直接从掩码导出的边界框在目标检测任务上达到 44.9% AP，全景分割达到 42.1 PQ，均优于同类无框方法。

## 研究问题与贡献

- 研究问题：如何在不依赖边界框检测和缓慢串行 NMS 的前提下，实现高精度、低延迟的实例分割？

- 提出动态掩码核方案：将掩码生成解耦为条件核预测和统一特征学习，显著降低计算和内存开销

- 设计统一高分辨率掩码特征表示，通过特征金字塔融合实现精细边界预测

- 提出 Matrix NMS 算法：用并行矩阵运算替代递归式 NMS，

- 验证了无框方案在目标检测和全景分割任务上的泛化能力

## 方法要点

- 掩码核分支：4 层 conv + CoordConv 归一化坐标输入，在 S×S 网格上预测位置条件核权重

- 统一掩码特征分支：融合 FPN P2-P5 特征，通过 3×3 conv、GroupNorm、ReLU 和 2× 双线性上采样合并到 1/4 尺度

- 归一化坐标输入到最深 FPN 层（1/32 尺度），提供精确位置信息以增强位置敏感性

- 训练损失 = Focal Loss（分类）+ λ × Dice Loss（掩码）

- 推理流程：骨干网络 → FPN → 置信度 0.1 筛选 → 动态卷积 → sigmoid 0.5 二值化 → Matrix NMS

- Matrix NMS 基于 Soft-NMS 思想，用线性或高斯衰减函数通过矩阵最大/最小运算一次性计算所有衰减因子

## 关键结果

- ResNet-50-FPN：38.8% mask AP，18 FPS；ResNet-101-FPN：39.7% mask AP；ResNet-DCN-101-FPN：41.7% mask AP

- 轻量版 SOLOv2-512：37.1% AP，31.3 FPS；SOLOv2-448：34.0% AP，46.5 FPS

- 比 SOLO 提升 1.9% AP 且快 33%；比 YOLACT 最佳模型高约 10% AP

- Mask byproduct 直接转边界框：44.9% AP（无需任何框监督训练）

- LVIS 数据集：ResNet-101-FPN 达到 26.8% AP，比 Mask R-CNN 高约 1% AP

- 全景分割：42.1 PQ，优于其他无框方法

- Matrix NMS 比传统 NMS 快 9 倍，精度提升 0.3% AP（36.6 vs 36.3）

- 显式坐标输入带来 1.5% AP 提升；统一掩码特征比独立特征高 0.5% AP

## 局限与可复现性线索

- 论文提及代码在 https://git.io/AdelaiDet 可用

- 未开源完整训练代码和预训练模型（论文发表时）

- 消融实验仅在 COCO val2017 上进行，缺少跨数据集验证

- 轻量版减少了预测头卷积层数和输入尺寸，可能影响小目标检测

- 对比的实时方法仅涉及 YOLACT，未与其他实时方案（如 SoloX 等）比较

## 分章节总结

### Abstract

- 提出 SOLOv2：基于 SOLO 的位置分割思想，通过动态掩码表示和 Matrix NMS 实现高效实例分割

- 掩码生成解耦为核预测和特征学习，无需边界框检测

- Matrix NMS 用并行矩阵运算一次性完成 NMS，精度优于已有方案

- 轻量版 31.3 FPS / 37.1% AP；目标检测 byproduct 达 44.9% AP

### 1 Introduction

- 指出边界框定位粗糙不自然，实例分割应在像素级定位物体

- 现有方法大多从边界框视角处理实例分割，纯实例分割方案研究不足

- SOLO 将实例分割转化为两个像素级分类任务，但存在掩码表示低效、分辨率不足和 NMS 慢三个瓶颈

- SOLOv2 提出动态方案：核学习 + 特征学习分离，统一高分辨率掩码特征

- Matrix NMS 解决串行递归操作导致的延迟问题

- Res-50-FPN：38.8% AP @ 18 FPS；轻量版：37.1% AP @ 31.3 FPS；边界框 byproduct：44.9% AP

### 1.1 Related Work

- 实例分割三类方法：自顶向下（先检测后分割）、自底向上（标签后聚类）、直接方法（SOLO）

- 与 YOLACT 对比：SOLOv2 不需要锚框、归一化或边界框检测，训练和推理更简单，性能高约 6% AP

- 动态卷积相关工作：STN、动态滤波器、可变形卷积等，SOLOv2 用绝对位置区分实例，与 CondInst 的相对位置不同

- NMS 改进工作：Soft-NMS、Adaptive NMS、Fast NMS 等；Matrix NMS 同时解决硬移除和串行操作问题

### 2 Our Method: SOLOv2

- 核心思想：将图像划分为 S×S 网格，物体中心落入的网格对应其二值掩码

- 原始 SOLO 直接预测 S² 通道张量 M，计算和内存效率低

- SOLOv2 分别学习掩码核 G 和掩码特征 F，仅对有效网格动态执行卷积

- 掩码核分支：4×conv + 3×3 conv，CoordConv 归一化坐标输入，跨 FPN 层权重共享

- 统一掩码特征：融合 P2-P5 到 1/4 尺度，最深 FPN 层输入归一化坐标

- 损失函数：Focal Loss + λ × Dice Loss；推理：0.1 置信度筛选 → 动态卷积 → 0.5 二值化 → Matrix NMS

### 2.2 Matrix NMS

- 动机：Soft-NMS 递归式分数衰减无法并行化

- 核心思路：从被抑制掩码 m_j 的视角考虑，计算所有更高分预测 m_i 对其的惩罚

- 衰减因子：decay_j = min(f(iou_i,j) / f(iou_.,i))，通过列最大/最小运算一次性计算

- 支持线性 f(iou)=1-iou 和高斯 f(iou)=exp(-iou²/σ) 两种衰减函数

- 全部操作用矩阵运算一次性完成，无需递归；500 个掩码

- 训练配置：SGD，8 GPU 同步，batch size 16，36 epochs，初始 LR 0.01，scale jitter [640, 800]

- COCO test-dev：ResNet-101 达 39.7% AP，优于已有方法；大目标优势明显（+5.0 AP_L vs Mask R-CNN）

- LVIS 数据集：使用数据重采样策略，ResNet-101 达 26.8% AP，大目标 +6.7% AP_L 提升

- 消融：1×1 conv 与 3×3 conv 等效；256 输入通道足够；显式坐标 +1.5% AP；统一特征 +0.5% AP；3× schedule +3.0% AP

- 轻量版：SOLOv2-448（46.5 FPS / 34.0% AP）和 SOLOv2-512（31.3 FPS / 37.1% AP）

- 目标检测 byproduct：44.9% AP（ResNet-DCN-101），超越多数专用检测器

- 全景分割：42.1 PQ，优于其他无框方法

### 4 Conclusion

- SOLOv2 从三方面改进：动态卷积核、统一掩码生成、Matrix NMS

- 在 COCO 和 LVIS 上证明了速度和精度优势

- 无需修改即可用于全景分割，有望成为实例识别的强基线