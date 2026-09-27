# DN-DETR: accelerate DETR training by introducing query DeNoising (2022)

- Paper ref: 1:NXLIGKF5
- Title: DN-DETR: accelerate DETR training by introducing query DeNoising
- Year: 2022

## Filtered Digest

#### TL;DR

本文提出了一种新颖的去噪训练方法（DN-DETR），用于加速DETR（DEtection TRansformer）的训练。研究发现DETR收敛缓慢的根本原因是二分图匹配的不稳定性导致优化目标在训练早期不一致。

该方法通过向Transformer解码器输入带噪声的ground-truth边界框，并训练模型重建原始框，有效降低了二分图匹配难度，实现了更快的收敛。该方法通用性强，可轻松集成到任何DETR类方法中。

实验表明，DN-DETR在相同设置下相比基线DAB-DETR提升了+1.9 AP，在ResNet-50骨干网络下取得了DETR类方法中的最佳结果（12 epoch达43.4 AP，50 epoch达48.6 AP）。在相同设置下，仅需50%的训练轮次即可达到相当性能。

#### 研究问题与贡献

- 研究问题：DETR类方法训练收敛缓慢的根本原因是什么？如何通过引入去噪原理来加速DETR训练并同时提升检测性能？

- 设计了一种新颖的训练方法来加速DETR训练，不仅加速收敛，还显著提升了训练结果——在12 epoch设置下取得了所有检测算法中的最佳表现

- 从全新视角分析了DETR收敛缓慢的原因，设计了衡量二分图匹配不稳定性的指标，验证了去噪方法能有效降低不稳定性

- 通过一系列消融实验分析了去噪训练中不同组件（噪声、标签嵌入、注意力掩码）的有效性

#### 方法要点

- 将解码器查询显式建模为4D锚框坐标(x, y, w, h)，分为匹配部分（可学习锚框）和去噪部分（带噪声的GT框）

- 去噪任务绕过二分图匹配，直接以重建原始GT框为目标，提供更稳定的优化方向

- 引入注意力掩码防止信息泄漏：匹配部分不能看到去噪部分，不同去噪组之间互相不可见

- 使用标签嵌入支持标签去噪，对ground-truth标签执行随机翻转增强

- 采用多种噪声策略：中心偏移（center shifting）和框缩放（box scaling），控制噪声尺度

- 使用多个去噪组（默认5组）以最大化去噪学习的效用

- 去噪仅在训练阶段使用，推理时移除去噪部分，不增加任何推理开销

#### 关键结果

- 在ResNet-50单尺度设置下，相比DAB-DETR基线提升+1.9 AP（44.1 vs 42.2）

- 在12 epoch设置下，DN-DETR-DC5-R50达到41.7 AP，超越DAB-DETR的38.0 AP（+3.7 AP）

- DN-Deformable-DETR在12 epoch下达到43.4 AP（ResNet-50），超过Faster R-CNN 108 epoch的44.0 AP（仅差0.6 AP但快9倍）

- 多尺度设置下，DN-Deformable-DETR达到48.6 AP（ResNet-50, 50 epoch），为该设置下最佳结果

- 消融实验显示注意力掩码至关重要：无掩码时性能严重退化至24.0 AP

- 增加去噪组数可提升性能，但收益递减：5组相比1组在R50上提升0.7 AP

- 二分图匹配不稳定性（IS）指标验证：DN-DETR有效降低了匹配不稳定性
