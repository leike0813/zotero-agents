## TL;DR

本文提出 CondInst，一种基于条件卷积的全新实例分割框架。与 Mask R-CNN 等依赖 ROI 操作的方法不同，CondInst 使用动态生成的实例感知网络，为每个实例动态生成掩码头部的卷积滤波器。

CondInst 具有两大优势：1) 完全卷积化，消除了 ROI 裁剪和特征对齐的需要；2) 掩码头部极为紧凑（仅 3 层卷积，每层 8 通道），推理速度显著提升。在 COCO 数据集上，CondInst 在精度和速度上均优于 Mask R-CNN 等多个主流方法。

## 研究问题与贡献

- 研究问题：如何在避免 ROI 操作的前提下，实现比 Mask R-CNN 更快且更准确的实例分割？

- 提出 CondInst 框架，首次以条件卷积方式解决实例分割问题

- 完全卷积化设计，消除 ROI 裁剪与特征对齐，生成高分辨率掩码

- 掩码头部滤波器动态生成，仅需 169 个参数，推理开销极低

- 在 COCO 上精度和速度均超越 Mask R-CNN，无需更长训练周期

## 方法要点

- 基于 FCOS 检测器构建，利用特征金字塔网络（FPN）进行多尺度预测

- 控制器子网络为每个实例动态生成掩码头部的滤波器参数

- 掩码头部仅包含 3 个 1×1 卷积层，每层 8 通道，共 169 个参数

- 特征图拼接相对坐标，提供strong的位置线索

- 掩码预测上采样 4 倍，获得 400×512 高分辨率输出

- 损失函数结合 FCOS 损失与 Dice 损失

## 关键结果

- ResNet-50 + 1× 调度：35.4% mask AP，49ms/图像，优于 Mask R-CNN（34.6%, 65ms）

- ResNet-50 + 3× 调度：37.8% mask AP

- ResNet-101 + 3× + 语义辅助：40.1% mask AP

- 掩码头部处理 100 个实例仅需

- 相对坐标对性能至关重要：移除后 AP 从 35.7% 降至 31.4%

- 上采样 factor=4 保留小物体细节，对小目标 AP 提升显著

## 局限与可复现性线索

- 代码已开源：https://git.io/AdelaiDet

- 使用 8 块 V100 GPU 训练 90K 次迭代

- 掩码分辨率受限于 COCO 标注质量，factor=4 与 factor=2 性能相近

- 仍保留边界框检测分支用于 NMS（概念上可完全消除）

## 分章节总结

### Abstract

- 提出 CondInst 框架，使用条件卷积替代 ROI 操作

- 掩码头部紧凑，推理速度快，精度优于 Mask R-CNN

### 1 Introduction

- 分析 ROI 方法的三大缺陷：无关内容过多、感受野需求大、需 resize 操作

- FCN 在实例分割中困难的根源：相似外观需要不同预测

- 提出实例感知 FCN 方案，动态生成滤波器参数

- CondInst 是首个在精度和速度上同时超越 Mask R-CNN 的新框架

### 1.1 Related Work

- 回顾条件卷积思想（Dynamic Filter Networks, CondConv）

- 对比现有实例分割方法：Mask R-CNN、InstanceFCN、YOLACT、BlendMask、AdaptIS 等

- 指出 CondInst 与 AdaptIS 的差异：直接编码到卷积滤波器而非 BN 系数，容量更强

### 2.1 Overall Architecture

- 基于 FCOS 构建，利用 FPN 特征金字塔

- 控制器为每个位置动态生成掩码头部滤波器

- 掩码分支输出 8 通道特征图，拼接相对坐标后输入掩码头部

- 掩码预测上采样 4 倍获得高分辨率输出

### 2.2 Network Outputs and Training Targets

- 分类头部预测类别概率

- 控制器头部预测掩码头部全部 169 个参数

- 边界框和 center-ness 头部与 FCOS 相同

- 边界框仅用于 NMS，不参与 ROI 操作

### 2.3 Loss Function

- 总损失 = FCOS 损失 + λ × 掩码 Dice 损失（λ=1）

- 使用 Dice 损失而非 focal loss，因为动态参数无法特殊初始化

- 正样本位置定义为中心区域内

### 2.4 Inference

- NMS 后保留 top 100 框计算掩码

- 100 个实例的掩码头部总耗时

- 掩码头部参数量 169 vs Mask R-CNN 2.3M

### 3 Experiments

- COCO 数据集评估，ResNet-50 预训练

- SGD 优化器，8 块 V100，90K 次迭代

- 数据增强：短边 [640,800] 随机缩放 + 左右翻转

### 3.2 Architectures of the Mask Head

- 深度为 1 时性能较弱（线性映射容量不足）

- 深度 2/3/4 性能相近，选择深度 3

- 宽度 4/8/16 性能相近，选择宽度 8

- 掩码头部极轻量：169 参数，4.5ms/100 实例

### 3.3 Design Choices of the Mask Branch

- C_mask 在 2-16 范围内性能稳定，选择 8

- 相对坐标至关重要：移除后 AP 下降 4.3%

- 绝对坐标提升有限，相对坐标提供平移不变线索

### 3.4 How Important to Upsample Mask Predictions?

- 无上采样时 AP 仅 34.4%（细节丢失严重）

- factor=2 提升至 35.8%，小物体 AP 提升 1.9%

- factor=4 性能相近（35.7%），但可产生更高分辨率掩码

### 3.5 CondInst without Bounding-box Detection

- 使用 mask-based NMS 可完全消除边界框检测

- 性能与 box-based NMS 持平（35.7% vs 35.7%）

### 3.6 Comparisons with State-of-the-art Methods

- ResNet-50 1×：35.4% AP，49ms，优于 Mask R-CNN（34.6%, 65ms）

- ResNet-50 3×：37.8% AP

- ResNet-101 3× + 语义辅助：40.1% AP

- 比 TensorMask 快约 8 倍，精度更高

- 大幅超越 YOLACT-700（40.1% vs 31.2%）

### 4 Conclusions

- CondInst 以条件卷积替代固定权重掩码头部

- 消除 ROI 操作，实现更快更简单的实例分割

- 有望成为 Mask R-CNN 的强有力替代方案