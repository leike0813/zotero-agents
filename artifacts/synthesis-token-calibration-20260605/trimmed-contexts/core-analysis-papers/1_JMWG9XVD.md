# An end-to-end transformer model for 3D object detection (2021)

- Paper ref: 1:JMWG9XVD
- Title: An end-to-end transformer model for 3D object detection
- Year: 2021

## Filtered Digest

#### TL;DR

本文提出3DETR，一种基于Transformer的端到端3D点云目标检测模型。与现有需要大量3D专用归纳偏置的方法不同，3DETR仅需对标准Transformer进行最小修改，使用非参数查询和Fourier位置编码即可达到与专用3D架构相竞争的性能。

在ScanNetV2和SUN RGB-D两个室内3D检测基准上，3DETR分别达到65.0% AP和59.0% AP，超越优化后的VoteNet基线9.5% AP50。该模型还具有推理时的灵活性，可根据计算预算调整解码器深度和查询数量而无需重新训练。


#### 研究问题与贡献

- 研究问题：能否在不依赖手工设计3D归纳偏置的情况下，使用Transformer学习3D目标检测器？


- 提出3DETR，首个端到端Transformer 3D检测模型，无需ConvNet骨干网络

- 证明非参数查询和Fourier位置编码对3D检测性能至关重要

- 展示模型在推理时可自适应调整解码器深度和查询数量

- 在ScanNetV2和SUN RGB-D上超越VoteNet基线


#### 方法要点

- 使用标准Transformer编码器直接处理点云，无3D专用修改

- 采用非参数查询嵌入，从随机采样的种子点计算Fourier位置编码

- 并行解码器策略，在每层解码器后预测边界框

- 使用二分图匹配和匈牙利算法进行集合预测，避免NMS

- 3DETR-m变体通过掩码自注意力引入局部特征聚合的归纳偏置


#### 关键结果

- ScanNetV2上达到65.0% AP，超越VoteNet基线9.5% AP50

- SUN RGB-D上达到59.0% AP

- 解码器层数对性能影响大于编码器层数

- 推理时减少解码器层数仍保持与从头训练相当的性能

- 推理时调整查询数量可在性能和运行时间之间权衡

- 3DETR-m通过局部注意力掩码进一步提升性能
