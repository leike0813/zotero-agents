## TL;DR

本文提出了一种新的视觉 Transformer 模型——Swin Transformer，可作为计算机视觉的通用骨干网络。通过引入层次化 Transformer 架构和移位窗口（Shifted Windows）机制，Swin Transformer 实现了线性计算复杂度，并能灵活建模不同尺度的视觉特征。

实验表明，Swin Transformer 在 ImageNet-1K 图像分类（87.3% top-1 准确率）、COCO 目标检测（58.7 box AP 和 51.1 mask AP）以及 ADE20K 语义分割（53.5 mIoU）等任务上均超越了之前的最先进方法，证明了 Transformer 模型作为视觉骨干的巨大潜力。


## 研究问题与贡献

- 研究问题：如何克服 Transformer 从自然语言处理迁移到计算机视觉时面临的尺度变化和高分辨率像素计算复杂度挑战，使其成为视觉通用骨干网络？


- 提出层次化 Transformer 架构，通过 patch merging 逐层构建多尺度特征图

- 设计移位窗口自注意力机制，在保持线性计算复杂度的同时实现跨窗口连接

- 提出高效的批量计算方法，通过循环移位避免小窗口填充带来的计算开销

- 在图像分类、目标检测和语义分割任务上均取得最先进性能


## 方法要点

- 将输入图像划分为不重叠的 4×4 patch，通过线性嵌入层映射到任意维度

- 使用 patch merging 层逐层减少 token 数量，构建层次化特征表示（H/4, H/8, H/16, H/32）

- 在非重叠局部窗口内计算自注意力（W-MSA），使计算复杂度从 O((hw)²) 降至 O(hw)

- 在连续层之间交替使用规则窗口划分和移位窗口划分（SW-MSA），引入跨窗口连接

- 采用循环移位批量计算策略，保持窗口数量不变并通过掩码机制限制注意力计算范围

- 引入相对位置偏置，增强模型对空间关系的建模能力

- 设计几何序列离散化方法，将连续相对位置映射到离散值以减小偏置矩阵规模


## 关键结果

- ImageNet-1K 图像分类：Swin-B 达到 87.3% top-1 准确率，超越 DeiT-B 和 ResNet-152

- COCO 目标检测：Swin-L + Cascade Mask R-CNN 达到 58.7 box AP 和 51.1 mask AP，超越之前最优方法 +2.7 box AP 和 +2.6 mask AP

- ADE20K 语义分割：Swin-L + UperNet 达到 53.5 mIoU，超越之前最优方法 +3.2 mIoU

- 移位窗口方法相比滑动窗口方法具有更低的延迟，但建模能力相当

- 层次化设计和移位窗口方法对全 MLP 架构也有益


## 局限与可复现性线索

- 代码和模型已公开：https://github.com/microsoft/Swin-Transformer

- 实验基于 PyTorch 框架和 MMDetection/MMSegmentation 代码库

- 训练配置细节完整提供（学习率、优化器、数据增强策略等）

- 未明确讨论模型的失败案例或特定场景下的局限性


## 分章节总结

### Abstract

- 提出 Swin Transformer 作为计算机视觉通用骨干网络

- 通过移位窗口机制实现线性计算复杂度和跨窗口连接

- 在分类、检测、分割任务上均超越之前最先进方法



### Introduction

- CNN 长期主导计算机视觉，而 Transformer 在 NLP 领域取得成功

- Transformer 迁移到视觉面临两大挑战：视觉元素尺度变化大、图像像素分辨率高导致计算复杂度二次增长

- Swin Transformer 通过层次化设计和局部窗口自注意力解决这些问题

- 移位窗口方案在连续层之间建立跨窗口连接，同时保持高效硬件实现

- 在 ImageNet、COCO、ADE20K 上均取得最先进性能



### Related Work

- CNN 及其变体（VGG、ResNet、DenseNet 等）仍是视觉主流架构

- 自注意力层部分或完全替代空间卷积的尝试受限于内存访问开销

- ViT 直接将 Transformer 应用于图像块分类，但特征图分辨率单一且复杂度二次增长

- 本文工作与 ViT 及其改进方法不同，专注于构建通用视觉骨干而非仅分类任务



### Method - Overall Architecture

- 输入图像分割为 4×4 不重叠 patch，每个 patch 视为 token

- 通过 patch merging 层逐层合并相邻 patch，构建 4 个阶段的多尺度特征图

- Swin Transformer block 用基于移位窗口的 MSA 替换标准 MSA



### Method - Shifted Window based Self-Attention

- 窗口内自注意力使计算复杂度从 O((hw)²) 降至 O(hw)

- 移位窗口划分在连续层之间交替，引入跨窗口连接

- 循环移位批量计算避免小窗口填充带来的 2.25 倍计算增长

- 相对位置偏置增强空间关系建模，几何序列离散化减小参数规模



### Method - Dense Prediction & Complexity

- 层次化特征图可直接使用 FPN 或 U-Net 等密集预测技术

- 特征金字塔结构使不同尺度目标都能找到匹配的特征层

- 整体计算复杂度与图像大小呈线性关系



### Experiments - Image Classification

- ImageNet-1K 上 Swin-T/B/L 分别达到 81.3%/83.5%/86.3% top-1 准确率

- Swin-B 超越 DeiT-B 4.2%，Swin-L 超越 DeiT-L 1.4%

- 在 ImageNet-22K 预训练后，Swin-L 达到 87.3% top-1 准确率

- 移位窗口和几何序列离散化均带来性能提升



### Experiments - Object Detection

- COCO 数据集上评估，使用 Mask R-CNN 和 Cascade Mask R-CNN 框架

- Swin-L + Cascade Mask R-CNN 达到 58.7 box AP 和 51.1 mask AP

- 超越之前最优方法 DetectoRS 和 Copy-paste

- 层次化特征图和更大输入分辨率对检测性能至关重要



### Experiments - Semantic Segmentation

- ADE20K 数据集上使用 UperNet 进行语义分割

- Swin-L 达到 53.5 mIoU，超越之前最优方法 SETR +3.2 mIoU

- 层次化特征图和多尺度测试进一步提升性能