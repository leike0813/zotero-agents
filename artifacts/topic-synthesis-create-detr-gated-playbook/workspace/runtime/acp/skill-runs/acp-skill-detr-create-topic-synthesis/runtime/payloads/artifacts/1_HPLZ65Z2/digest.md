#### TL;DR

本文提出 DINO（DETR with Improved deNoising anchOr boxes），一种最先进的端到端目标检测器。DINO 通过三种核心技术改进现有 DETR 模型：（1）对比式去噪训练（Contrastive Denoising），同时添加同一真值的正负样本以抑制重复预测；（2）混合查询选择（Mixed Query Selection），仅从编码器输出中选择位置查询而保持内容查询可学习；（3）向前看两次（Look Forward Twice）方案，利用后续层的梯度信息优化相邻层的框预测参数。在 COCO 数据集上，DINO 使用 ResNet-50 骨干网络在 12 个 epoch 内达到 49.4AP，24 个 epoch 达到 51.3AP，相比之前最佳的 DN-DETR 分别提升 +6.0AP 和 +2.7AP。使用 SwinL 骨干网络并在 Objects365 上预训练后，DINO 在 COCO val2017 和 test-dev 上分别达到 63.2AP 和 63.3AP，成为首个在 COCO 排行榜上超越传统检测器的端到端 Transformer 检测器，同时模型参数量仅为 SwinV2-G 的 1/15，预训练数据量远少于 Florence。

#### 研究问题与贡献

- 核心问题 ：现有 DETR 类模型存在训练收敛慢、查询语义不明确的问题，且在性能和效率上仍落后于改进后的经典检测器（如 DyHead、HTC++）

- 问题根源 ：（1）DETR 类模型性能仍低于高度优化的经典检测器（最佳 DETR 模型在 COCO 上不到 50AP）；（2）DETR 类模型的可扩展性研究不足，缺乏大规模骨干网络和数据集下的性能验证

- 主要贡献 ：

- 提出三种新技术：对比去噪训练、混合查询选择、向前看两次方案

- 通过大量消融实验验证各设计选择的有效性

- 在 COCO 上实现 SOTA 性能，首次在端到端 Transformer 检测器上超越传统检测器

- 展示优异的扩展性：模型更小、预训练数据更少但性能更好

#### 方法要点

- 对比去噪训练（Contrastive Denoising, CDN） ：

- 为每个真值框生成两个噪声版本：小噪声（

- 混合查询选择（Mixed Query Selection） ：

- 从编码器最后一层选择 top-K 特征作为位置查询（锚框初始化）

- 内容查询保持可学习参数，不直接用编码器特征初始化

- 避免初步内容特征的歧义性，鼓励第一层解码器专注于空间先验

- 相比纯查询选择提升 +0.5AP（46.5→47.0）

- 向前看两次（Look Forward Twice） ：

- 传统"向前看一次"方案在层间更新时阻断梯度传播

- 本方法让第 i 层参数同时受第 i 层和第 i+1 层损失影响

- 利用后续层的改进框信息校正相邻早期层的预测

- 同时优化初始框质量和预测偏移量

- 模型架构 ：基于 DN-DETR、DAB-DETR 和 Deformable DETR，包含骨干网络、多层 Transformer 编码器/解码器、多个预测头；采用可变形注意力机制和动态锚框公式化

#### 关键结果

- ResNet-50 设置（12 epochs） ：

- DINO-4scale：49.0AP（+5.6 vs DN-DETR），小目标 +7.2AP

- DINO-5scale：49.4AP（+6.0 vs DN-DETR），小目标 +7.5AP

- 推理速度 24 FPS（4scale）/ 10 FPS（5scale）

- ResNet-50 设置（24 epochs） ：

- DINO-4scale：50.4AP（+1.8 vs DN-DETR 50 epochs）

- DINO-5scale：51.3AP（+2.7 vs DN-DETR 50 epochs）

- SwinL + Objects365 预训练 ：

- COCO val2017：63.2AP（无 TTA）/ 63.3AP（有 TTA）

- COCO test-dev：63.2AP（无 TTA）/ 63.3AP（有 TTA）

- 模型参数量 218M（SwinV2-G 的 1/15）

- 骨干预训练数据 14M（Florence 的 1/60）

- 检测预训练数据 1.7M（Florence 的 1/5）

- 消融实验 ：

- 基础 DN-DETR：43.4AP → 优化后：44.9AP → + 纯查询选择：46.5AP

- + 混合查询选择：47.0AP → + 向前看两次：47.4AP → + 对比去噪：47.9AP
