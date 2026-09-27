## TL;DR

本文提出 PolarNet，一种面向在线单帧 LiDAR 点云语义分割的新型极坐标鸟瞰图（Polar BEV）表示方法。传统 Cartesian BEV 在靠近传感器处点云密集、远处稀疏，造成网格单元间点数严重不均衡。PolarNet 通过极坐标网格量化点云，使点数在各网格间更均匀分布，并引入环卷积（ring convolution）使 CNN 能在极坐标网格上端到端处理。

实验在 SemanticKITTI、A2D2 和 Paris-Lille-3D 三个数据集上验证，PolarNet 相比最先进方法分别提升 2.1%、4.5% 和 3.7% 的 mIoU，同时仅使用其 1/3 的参数量和计算量（MACs），并保持近实时推理速度。


## 研究问题与贡献

- 研究问题：如何设计一种更适合 LiDAR 点云空间分布特性的输入表示，以在保持近实时推理的同时提升在线单帧语义分割的精度？


- 提出极坐标 BEV 表示，利用 LiDAR 扫描的环状结构更均衡地分配点云到网格单元

- 设计可学习的简化 PointNet 编码每个网格单元的特征，替代手工特征

- 开发环卷积算子，使 CNN 能端到端处理极坐标网格的环状连通性

- 在三个异构数据集上验证，显著超越现有方法且计算开销更低

- 系统比较了不同分割骨干网络在球面投影、Cartesian BEV 和 Polar BEV 下的表现


## 方法要点

- 极坐标 BEV 量化：以传感器为原点计算点的方位角和半径，按量化的方位角和半径分配点到网格

- 可学习网格特征：使用简化的 KNN-free PointNet（全连接层 + BN + ReLU + max-pooling）将每个网格中的点编码为固定长度向量

- 环卷积（Ring Convolution）：替换标准卷积核，使特征矩阵在方位角方向首尾相连，支持梯度跨边界传播

- Ring CNN：将环卷积集成到 2D CNN 骨干网络，使网络能在极坐标网格上直接训练和推理


## 关键结果

- SemanticKITTI 测试集：PolarNet mIoU 达 54.3%，超越 RangeNet++（52.2%）2.1 个百分点，参数量仅 14M（RangeNet++ 为 50M）

- A2D2 测试集：PolarNet mIoU 达 23.9%，是第二名 Unet w/Cartesian BEV（20.3%）的约 1.18 倍

- Paris-Lille-3D 测试集：PolarNet mIoU 达 43.7%，超越 DarkNet53（40.0%）3.7 个百分点

- 投影方法对比实验：Polar BEV 在所有骨干网络（SqueezeSeg、ResNet-FCN、DRN-DL、ResNet-DL）上均一致超越球面投影和 Cartesian BEV

- 消融实验：固定体积空间（FS）贡献最大单项提升（+2.8%），全部增强叠加后 mIoU 从 46.9% 升至 54.9%

- 距离分析：Polar BEV 在近距范围的优势最明显，与更均匀的点数分布一致


## 局限与可复现性线索

- 在极端稀有类别（如 'motorcyclist'，仅占训练点 0.004%）上性能仍很低

- A2D2 数据集整体 mIoU 仅 23%，说明多传感器异步拼接带来的异质性挑战极大

- 论文使用 PyTorch 实现，利用 torch_geometric 并行化网格内点池化，但未开源训练代码

- mIoU 随距离增加而下降，远距离点更稀疏、更难提取上下文信息


## 分章节总结

### Abstract

- 概述 LiDAR 在线语义分割面临的三大挑战：近实时延迟要求、点云长尾空间分布、细粒度类别增多

- 提出 PolarNet：极坐标 BEV 表示使点数在各网格间更均衡分布

- 在三个差异显著的真实城市场景数据集上大幅提升 mIoU



### 1. Introduction

- 指出 LiDAR 点云数据增长迅速但自动语义分割方案仍落后于数据规模

- 类比图像分割中的感受野设计，提出 LiDAR 点云中感知场的形状与大小同样重要

- 分析 Cartesian BEV 的近密远疏分布问题：近处网格点过密导致细节模糊，远处网格点过稀导致线索不足

- 提出用极坐标网格跟踪 LiDAR 的环状结构，并设计可学习特征替代手工 BEV 特征

- 在三个数据集上分别超越最先进方法 2.1%、4.5% 和 3.7% mIoU



### 2. Related Works

- 点云方法分为参数化（图卷积）和非参数化（PointNet 系列）两条路线

- LiDAR 表示方法包括前视图（深度图、球面投影）和 BEV；SqueezeSeg 系列使用球面投影 + CRF，RangeNet++ 替换为 Darknet + KNN 后处理

- 现有 BEV 方法（PIXOR、PointPillars）均使用 Cartesian 网格，未利用 LiDAR 的环状结构

- LiDAR 语义分割数据集稀少，仅有 SemanticKITTI、A2D2 和 Paris-Lille-3D

- 2D 分割网络从 FCN 演化出 DeepLab（空洞卷积）和 Unet（跳跃连接）两大成功范式



### 3. Approach

- 问题定义：给定带标注的 LiDAR 扫描集，学习分割模型 f(·;θ) 最小化预测与标注的差异

- BEV 分区：将 3D 点云压缩为 2D 俯视图，利用成熟的 2D CNN 加速分割

- Polar BEV：以方位角和半径量化点，使点数分布更均匀；99.3% 的极坐标网格单元内点共享同一标签（Cartesian 为 98.75%）

- 可学习特征：使用简化 PointNet + max-pooling 编码每个网格，避免手工特征

- 环卷积：使特征矩阵在方位角方向首尾连通，支持端到端极坐标处理



### 4. Experiments

- 三个数据集预处理：SemanticKITTI（单传感器全景）、A2D2（五传感器异步拼接）、Paris-Lille-3D（从聚合点云提取单帧）

- SemanticKITTI 上 PolarNet 以 14M 参数/135B MACs 达到 54.3% mIoU，超越 RangeNet++（50M/378B MACs）

- A2D2 上 PolarNet 在多个类别上 IoU 翻倍，但整体仍偏低（23.9%），反映数据集异构性挑战

- 投影方法对比：BEV 始终优于球面投影；Polar BEV 在各骨干网络上一致优于 Cartesian BEV

- 消融实验显示固定体积空间贡献最大（+2.8%），全部增强后 mIoU 达 54.9%

- 距离分析：Polar BEV 在近距范围优势最明显，与更均匀的点数分布一致



### 5. Conclusion

- Polar BEV 是一种通用且优越的 LiDAR 点云表示，适用于不同分割网络

- PolarNet 以更少参数和更低推理延迟在三个数据集上显著超越最先进方法