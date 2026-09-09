#### TL;DR

本文提出 Group DETR，一种简单高效的 DETR 训练方法，通过分组式一对多分配（group-wise one-to-many assignment）加速 DETR 训练收敛。核心思想是使用多组对象查询（object queries），在每组内进行一对一分派，同时独立进行解码器自注意力计算。该方法等价于同时训练多个参数共享的网络，引入更多监督信号从而改善 DETR 训练。推理过程与标准 DETR 完全相同，仅需一组查询且无需任何架构修改。在 COCO 数据集上的实验表明，Group DETR 显著加速训练收敛并提升多种 DETR 变体的性能：Conditional DETR-C5 在 12 epoch 训练下提升 5.0 mAP，在 50 epoch 下提升 2.1 mAP；DAB-DETR 提升 3.9 mAP；DN-DETR 提升 2.0 mAP。该方法还成功扩展到多视角 3D 目标检测（PETR 提升 3.0 NDS）和实例分割（Mask2Former 提升 1.2 mAP^m）。代码将开源。

#### 研究问题与贡献

- 研究问题 ：DETR 依赖一对一分派进行端到端检测训练，但训练收敛速度慢。虽然一对多分配在传统检测方法（如 Faster R-CNN、FCOS）中成功应用，但朴素的一对多分配无法直接用于 DETR 训练。如何有效应用一对多分配加速 DETR 训练是一个挑战性难题。

- 核心贡献 ：

- 提出 Group DETR 框架，通过分组式一对多分配机制实现更高效的 DETR 训练

- 引入分离自注意力（separate self-attention）设计，消除不同组查询间的相互干扰

- 从参数共享模型训练和查询数据增强两个角度解释方法有效性

- 在多种 DETR 变体、3D 检测和实例分割任务上验证方法的通用性和有效性

#### 方法要点

- 分组式一对多分配 ：采用 K 组对象查询机制，将 N 个查询分为主组和 (K-1) 个附加组，共 K 组查询。对每组查询独立进行一对一分派，使得每个 ground-truth 对象被分配给多个预测（每组一个），实现组间一对多、组内一对一的分配策略。

- 分离自注意力 ：每组查询独立进行自注意力计算 SA(Q₁), SA(Q₂), ..., SA(Qₖ)，仅收集同组内预测信息，避免跨组干扰，简化训练难度。

- 训练架构 ：解码器包含 K 个并行解码器，共享编码器和预测器参数，仅对象查询初始化不同。损失函数为 K 个损失的加权平均。

- 推理过程 ：与标准 DETR 完全相同，仅需一组查询，无需架构修改或 NMS 后处理。

- 等价解释 ：方法等价于同时训练 K 个参数共享的 DETR 模型，共享参数接收更多反向传播梯度，训练更充分；同时多组查询类似于数据增强，引入更多自动学习的查询增强样本。

#### 关键结果

- COCO 目标检测（12 epoch） ：

- Conditional DETR：32.6 → 37.6 mAP（+5.0）

- Conditional DETR-DC5：36.4 → 41.2 mAP（+4.8）

- DAB-DETR：35.2 → 39.1 mAP（+3.9）

- DAB-DETR-DC5：37.5 → 41.9 mAP（+4.4）

- DN-DETR：38.6 → 40.6 mAP（+2.0）

- DN-DETR-DC5：41.9 → 44.5 mAP（+2.6）

- DAB-Deformable-DETR：44.2 → 45.7 mAP（+1.5）

- DINO-4scale：49.4 → 50.1 mAP（+0.7）

- COCO 目标检测（50 epoch） ：

- Conditional DETR：40.9 → 43.4 mAP（+2.5）

- DAB-DETR：42.2 → 44.5 mAP（+2.3）

- DINO-4scale-Swin-Large：58.0 → 58.4 mAP（+0.4）

- 系统级结果（COCO test-dev，ViT-Huge） ：首次达到 64.5 mAP，优于其他使用更大编码器和更多预训练数据的方法

- 多视角 3D 检测（nuScenes） ：PETR NDS 42.0 → 45.0（+3.0），PETR v2 NDS 50.3 → 51.3（+1.0）

- 实例分割（COCO） ：Mask2Former 12 epoch 38.5 → 39.7 mAP^m（+1.2），50 epoch 43.7 → 44.0 mAP^m（+0.3）

- 训练效率 ：使用 FlashAttention 高效实现，内存开销仅增加 1.2-1.7GB，训练时间每 epoch 增加约 5 分钟
