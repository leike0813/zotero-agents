# End-to-end object detection with transformers (2020)

- Paper ref: 1:EIMSDEU3
- Title: End-to-end object detection with transformers
- Year: 2020

## Filtered Digest

#### TL;DR

本文提出了一种名为DETR（DEtection TRansformer）的全新目标检测框架，将目标检测视为直接集合预测问题。该方法使用Transformer编码器-解码器架构和二分图匹配损失，消除了NMS、锚框等传统检测器中手工设计的组件。

在COCO数据集上，DETR取得了与高度优化的Faster R-CNN相当的检测精度，且在大型目标上表现更优。该架构还可自然扩展到全景分割任务，显著优于现有竞争方法。

#### 研究问题与贡献

- 研究问题：能否设计一个端到端的目标检测框架，直接输出预测集合，而不需要NMS、锚框等手工组件？

- 提出DETR模型，首次将Transformer成功应用于目标检测，实现端到端直接集合预测

- 设计了基于二分图匹配和匈牙利算法的集合损失函数，确保预测与真实目标的一一对应

- 在COCO数据集上验证了与Faster R-CNN相当的性能，且在大型目标上显著更优

- 将DETR扩展到全景分割任务，以统一方式处理things和stuff类别，取得领先结果

#### 方法要点

- 使用CNN骨干网络提取2D特征，经1x1卷积降维后展平为序列，加入位置编码送入Transformer编码器

- Transformer解码器以少量可学习的目标查询（object queries）作为输入，并行解码所有目标

- 集合损失函数：先用匈牙利算法找到预测与真实目标的最优二分匹配，再计算匹配对的分类和边界框损失

- 边界框损失结合L1损失和尺度不变的GIoU损失，兼顾定位精度和尺度鲁棒性

- 在解码器每层输出后应用辅助损失，加速训练并帮助模型输出正确数量的目标

- 全景分割扩展：在解码器输出上添加掩码头，通过多头注意力生成热图，再经FPN结构提升分辨率

#### 关键结果

- DETR（ResNet-50，41M参数）在COCO val上达到42.0 AP，与Faster R-CNN-FPN持平

- DETR在大型目标上比Faster R-CNN-FPN高7.8 AP（61.1 vs 52.0），但在小型目标上低5.5 AP

- DETR-DC5-R101达到44.9 AP，优于Faster R-CNN-R101-FPN+的44.0 AP

- 消融实验表明：编码器全局自注意力对大型目标检测至关重要（去除后AP下降6.0）；多解码器层逐层提升性能（+8.2 AP）

- DETR天然不需要NMS：最后解码器层的自注意力机制能抑制重复预测，NMS反而会降低最终AP

- 全景分割：DETR-DC5-R101在COCO val上达到45.6 PQ，优于UPSNet和PanopticFPN等现有方法

- DETR对未见实例数量表现出良好的泛化能力（训练集最多13只长颈鹿，能检测24只以上）
