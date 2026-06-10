## TL;DR

本文提出3DETR，一种基于Transformer的端到端3D点云目标检测模型。与现有需要大量3D专用归纳偏置的方法不同，3DETR仅需对标准Transformer进行最小修改，使用非参数查询和Fourier位置编码即可达到与专用3D架构相竞争的性能。

在ScanNetV2和SUN RGB-D两个室内3D检测基准上，3DETR分别达到65.0% AP和59.0% AP，超越优化后的VoteNet基线9.5% AP50。该模型还具有推理时的灵活性，可根据计算预算调整解码器深度和查询数量而无需重新训练。


## 研究问题与贡献

- 研究问题：能否在不依赖手工设计3D归纳偏置的情况下，使用Transformer学习3D目标检测器？


- 提出3DETR，首个端到端Transformer 3D检测模型，无需ConvNet骨干网络

- 证明非参数查询和Fourier位置编码对3D检测性能至关重要

- 展示模型在推理时可自适应调整解码器深度和查询数量

- 在ScanNetV2和SUN RGB-D上超越VoteNet基线


## 方法要点

- 使用标准Transformer编码器直接处理点云，无3D专用修改

- 采用非参数查询嵌入，从随机采样的种子点计算Fourier位置编码

- 并行解码器策略，在每层解码器后预测边界框

- 使用二分图匹配和匈牙利算法进行集合预测，避免NMS

- 3DETR-m变体通过掩码自注意力引入局部特征聚合的归纳偏置


## 关键结果

- ScanNetV2上达到65.0% AP，超越VoteNet基线9.5% AP50

- SUN RGB-D上达到59.0% AP

- 解码器层数对性能影响大于编码器层数

- 推理时减少解码器层数仍保持与从头训练相当的性能

- 推理时调整查询数量可在性能和运行时间之间权衡

- 3DETR-m通过局部注意力掩码进一步提升性能


## 局限与可复现性线索

- 模型仅使用XYZ坐标，未利用颜色信息

- 未开源训练代码

- 实验仅限于室内场景数据集


## 分章节总结

### Abstract

- 提出3DETR，端到端Transformer 3D点云目标检测模型

- 仅需最小修改标准Transformer，使用非参数查询和Fourier位置编码

- 在ScanNetV2上超越VoteNet基线9.5%



### 1. Introduction

- 3D点云具有无序、稀疏、不规则特性，传统方法需要大量手工设计偏置

- VoteNet使用PointNet++编码器和专用3D操作，需要多年调优

- DETR在2D检测中成功，启发将Transformer用于3D检测

- 3DETR用标准Transformer替换PointNet++编码器，用并行解码器替换VoteNet解码器

- 关键设计：非参数查询嵌入和Fourier位置编码



### 2. Related Work

- 回顾基于网格、点云、图、连续卷积的3D架构

- 回顾3D目标检测方法：两阶段（PointRCNN、PV-RCNN）和单阶段（VoteNet）

- 回顾Transformer在视觉领域的应用，指出3DETR与DETR的区别：无ConvNet骨干、从头训练、非参数查询



### 3. Approach

- 编码器：标准Transformer自注意力，无位置编码（输入已含XYZ坐标）

- 解码器：并行解码，使用B个查询嵌入预测B个边界框

- 非参数查询：从输入点中随机采样，通过Fourier位置编码和MLP投影

- 3DETR-m：通过掩码自注意力引入局部聚合偏置，使用半径[0.16, 0.64, 1.44]

- 边界框参数化：位置（中心偏移）、尺寸、方向（12bin量化）、语义类别

- 损失函数：二分图匹配成本（GIoU+中心距离+语义成本），加权组合5项损失



### 4. Experiments

- ScanNetV2：65.0% AP，超越VoteNet 9.5% AP50

- SUN RGB-D：59.0% AP

- 3DETR-m进一步提升性能

- 集合损失函数可迁移到VoteNet架构

- 3DETR也可用于3D形状分类任务



### 5. Analysis

- 解码器层数对性能影响大于编码器（6层解码器+3层编码器 vs 3层解码器+6层编码器）

- 推理时可减少解码器层数，性能与从头训练相当或更好

- 推理时可调整查询数量，在性能和运行时间之间权衡

- 128查询训练的模型在推理时适应性最好



### 6. Conclusion

- 3DETR是灵活的端到端Transformer 3D检测框架

- 非参数查询和Fourier编码对性能关键

- 结合VoteNet（可变预测数）和DETR（可变解码器层数）的灵活性