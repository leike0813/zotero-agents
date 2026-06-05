# SOLOv2: Dynamic and Fast Instance Segmentation (2020)

- Paper ref: 1:4DB3YS8Y
- Title: SOLOv2: Dynamic and Fast Instance Segmentation
- Year: 2020

## Filtered Digest

#### TL;DR

SOLOv2 提出了一种动态、快速的实例分割框架，将掩码生成解耦为掩码核预测和掩码特征学习两个独立模块，完全不需要边界框检测。同时提出 Matrix NMS 算法，用并行矩阵运算一次性完成掩码去重，处理 500 个掩码不到 1 毫秒。

在 COCO test-dev 上，ResNet-50-FPN 的 SOLOv2 达到 38.8% mask AP（18 FPS），轻量版达到 37.1% AP（31.3 FPS），ResNet-DCN-101-FPN 达到 41.7% AP。此外，直接从掩码导出的边界框在目标检测任务上达到 44.9% AP，全景分割达到 42.1 PQ，均优于同类无框方法。

#### 研究问题与贡献

- 研究问题：如何在不依赖边界框检测和缓慢串行 NMS 的前提下，实现高精度、低延迟的实例分割？

- 提出动态掩码核方案：将掩码生成解耦为条件核预测和统一特征学习，显著降低计算和内存开销

- 设计统一高分辨率掩码特征表示，通过特征金字塔融合实现精细边界预测

- 提出 Matrix NMS 算法：用并行矩阵运算替代递归式 NMS，

- 验证了无框方案在目标检测和全景分割任务上的泛化能力

#### 方法要点

- 掩码核分支：4 层 conv + CoordConv 归一化坐标输入，在 S×S 网格上预测位置条件核权重

- 统一掩码特征分支：融合 FPN P2-P5 特征，通过 3×3 conv、GroupNorm、ReLU 和 2× 双线性上采样合并到 1/4 尺度

- 归一化坐标输入到最深 FPN 层（1/32 尺度），提供精确位置信息以增强位置敏感性

- 训练损失 = Focal Loss（分类）+ λ × Dice Loss（掩码）

- 推理流程：骨干网络 → FPN → 置信度 0.1 筛选 → 动态卷积 → sigmoid 0.5 二值化 → Matrix NMS

- Matrix NMS 基于 Soft-NMS 思想，用线性或高斯衰减函数通过矩阵最大/最小运算一次性计算所有衰减因子

#### 关键结果

- ResNet-50-FPN：38.8% mask AP，18 FPS；ResNet-101-FPN：39.7% mask AP；ResNet-DCN-101-FPN：41.7% mask AP

- 轻量版 SOLOv2-512：37.1% AP，31.3 FPS；SOLOv2-448：34.0% AP，46.5 FPS

- 比 SOLO 提升 1.9% AP 且快 33%；比 YOLACT 最佳模型高约 10% AP

- Mask byproduct 直接转边界框：44.9% AP（无需任何框监督训练）

- LVIS 数据集：ResNet-101-FPN 达到 26.8% AP，比 Mask R-CNN 高约 1% AP

- 全景分割：42.1 PQ，优于其他无框方法

- Matrix NMS 比传统 NMS 快 9 倍，精度提升 0.3% AP（36.6 vs 36.3）

- 显式坐标输入带来 1.5% AP 提升；统一掩码特征比独立特征高 0.5% AP
