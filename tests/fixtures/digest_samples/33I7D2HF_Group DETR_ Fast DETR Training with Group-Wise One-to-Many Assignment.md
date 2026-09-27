## TL;DR

本文提出 Group DETR，一种简单高效的 DETR 训练方法，通过分组式一对多分配（group-wise one-to-many assignment）加速 DETR 训练收敛。核心思想是使用多组对象查询（object queries），在每组内进行一对一分派，同时独立进行解码器自注意力计算。该方法等价于同时训练多个参数共享的网络，引入更多监督信号从而改善 DETR 训练。推理过程与标准 DETR 完全相同，仅需一组查询且无需任何架构修改。在 COCO 数据集上的实验表明，Group DETR 显著加速训练收敛并提升多种 DETR 变体的性能：Conditional DETR-C5 在 12 epoch 训练下提升 5.0 mAP，在 50 epoch 下提升 2.1 mAP；DAB-DETR 提升 3.9 mAP；DN-DETR 提升 2.0 mAP。该方法还成功扩展到多视角 3D 目标检测（PETR 提升 3.0 NDS）和实例分割（Mask2Former 提升 1.2 mAP^m）。代码将开源。

## 研究问题与贡献

- 研究问题 ：DETR 依赖一对一分派进行端到端检测训练，但训练收敛速度慢。虽然一对多分配在传统检测方法（如 Faster R-CNN、FCOS）中成功应用，但朴素的一对多分配无法直接用于 DETR 训练。如何有效应用一对多分配加速 DETR 训练是一个挑战性难题。

- 核心贡献 ：

- 提出 Group DETR 框架，通过分组式一对多分配机制实现更高效的 DETR 训练

- 引入分离自注意力（separate self-attention）设计，消除不同组查询间的相互干扰

- 从参数共享模型训练和查询数据增强两个角度解释方法有效性

- 在多种 DETR 变体、3D 检测和实例分割任务上验证方法的通用性和有效性

## 方法要点

- 分组式一对多分配 ：采用 K 组对象查询机制，将 N 个查询分为主组和 (K-1) 个附加组，共 K 组查询。对每组查询独立进行一对一分派，使得每个 ground-truth 对象被分配给多个预测（每组一个），实现组间一对多、组内一对一的分配策略。

- 分离自注意力 ：每组查询独立进行自注意力计算 SA(Q₁), SA(Q₂), ..., SA(Qₖ)，仅收集同组内预测信息，避免跨组干扰，简化训练难度。

- 训练架构 ：解码器包含 K 个并行解码器，共享编码器和预测器参数，仅对象查询初始化不同。损失函数为 K 个损失的加权平均。

- 推理过程 ：与标准 DETR 完全相同，仅需一组查询，无需架构修改或 NMS 后处理。

- 等价解释 ：方法等价于同时训练 K 个参数共享的 DETR 模型，共享参数接收更多反向传播梯度，训练更充分；同时多组查询类似于数据增强，引入更多自动学习的查询增强样本。

## 关键结果

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

## 局限与可复现性线索

- 局限性 ：

- 训练时需要更多解码器，增加计算成本（FLOPs）和显存占用，尽管通过 FlashAttention 优化后开销可控

- 组数 K 需要调参，实验表明 K=11 时性能稳定，但不同任务可能需要不同设置

- 与 DN-DETR 正交但非完全替代，两者结合可进一步提升 1.5 mAP，说明方法仍有互补空间

- 可复现性线索 ：

- 代码将开源：https://github.com/Atten4Vis/GroupDETR

- 默认组数 K=11，每组 300 个查询

- 训练设置与基线方法保持一致（学习率、优化器、预训练模型、初始化方法、数据增强）

- 使用 ResNet-50 骨干网络，COCO train2017 训练，COCO val2017 评估

- 并行解码器通过并行自注意力实现，可使用 FlashAttention 或 xformers 高效实现

## 分章节总结

### Abstract

论文概述 DETR 依赖一对一分派实现端到端检测但训练缓慢的问题。一对多分配在传统检测方法中成功但无法直接用于 DETR。Group DETR 通过分组式一对多分配解决这一挑战：使用多组对象查询、组内一对一分派、独立解码器自注意力。方法类似于数据增强与查询增强的结合，等价于同时训练参数共享网络。推理与标准 DETR 相同，仅需一组查询。实验证明方法显著加速收敛并提升多种 DETR 变体性能。

### 1. Introduction

介绍 DETR 架构由 CNN、Transformer 编码器和解码器组成，通过一对一分派和二分匹配实现端到端检测。现有加速方法分为两类：修改交叉注意力（如 Deformable DETR 稀疏采样、空间调制）和稳定一对一分派（如 DN-DETR 添加噪声）。本文从引入更多监督的角度研究分配机制，提出 Group DETR。方法采用 K 组查询，组内一对一、组间一对多，配合分离自注意力消除组间干扰。推理时仅需单组查询。方法等价于并行解码器训练，类似查询数据增强。实验表明方法在多种 DETR 变体上取得一致提升，Conditional DETR-C5 提升 5.0 mAP，且可扩展到 3D 检测和实例分割任务。

### 2. Background

详述 DETR 架构：编码器处理图像输出特征 X，解码器接收图像特征和对象查询 Q 输出嵌入和预测 Y。解码器每层包含查询自注意力、查询 - 特征交叉注意力、FFN。训练时采用一对一分派，通过二分匹配建立预测与 ground-truth 的对应关系，损失为匹配对的分类和回归损失组合。一对一分派与查询自注意力是无需 NMS 后处理的关键设计。对比一对多分配在非端到端检测（Faster R-CNN、FCOS）中的应用，这些方法通过多锚点或多像素分配引入更多监督，推理时需要 NMS 去重。

### 3.1 Algorithm

分析朴素一对多分配失败原因：模型被训练为每个 ground-truth 输出多个预测，缺乏评分机制区分单一预测和重复预测。Group DETR 采用多组查询机制，N 个查询分为主组和 (K-1) 个附加组，共 K 组。每组独立进行二分匹配，组内竞争而非全局竞争。分离自注意力仅收集同组信息，避免跨组干扰。训练架构包含 K 个并行解码器，参数共享，损失为 K 个损失的加权平均。推理时仅需单组查询，流程与标准 DETR 相同。算法 1 给出伪代码。

### 3.2 Analysis

从两个角度解释方法有效性：（1）参数共享模型视角：等价于同时训练 K 个 DETR 模型，共享编码器、解码器和预测器参数，仅查询初始化不同，共享参数接收更多梯度，训练更充分。同时观察到分配更稳定（Figure 5），推测因网络改进带来更可靠预测。（2）查询增强视角：额外 (K-1) 组查询可视为主组的增强，Figure 3 显示预测同一对象的参考点空间位置接近，类似数据增强。Figure 4 表明不同组查询性能相近（±0.1 mAP）。额外监督从更多查询反向传播到编码器，Table 1 验证编码器训练也得到改善。计算复杂度方面，并行解码器可通过并行自注意力高效实现，使用 FlashAttention 后内存开销仅增加 1.2-1.7GB，训练时间每 epoch 增加约 5 分钟。与 DN-DETR 对比：DN-DETR 通过添加噪声生成额外查询，每组查询数等于 ground-truth 数，无 no-object 查询；Group DETR 自动学习 N 个查询（如 300），包含 ground-truth 和 no-object。DN-DETR 自注意力主要用于收集其他对象预测信息，Group DETR 同时收集重复预测和其他对象信息。两者正交，结合可提升 1.5 mAP（Figure 8）。

### 4.1 Object Detection

实验设置研究多种 DETR 变体：基础基线（Conditional DETR、DAB-DETR、DN-DETR）和强基线（DAB-Deformable-DETR、DINO）。使用 ResNet-50 骨干，COCO train2017 训练，val2017 评估。12 epoch 结果（Table 3）：Group DETR 在密集注意力基线上取得一致提升，Conditional DETR 提升 5.0 mAP，DAB-DETR 提升 3.9 mAP，DN-DETR 提升 2.0 mAP；在可变形注意力基线上，DAB-Deformable-DETR 提升 1.5 mAP，DINO 提升 0.7 mAP。50 epoch 结果（Table 4）：Group DETR 仍保持显著优势，Conditional DETR 提升 2.5 mAP，DAB-DETR 提升 2.3 mAP，DINO-4scale-Swin-Large 达到 58.4 mAP（+0.4）。系统级结果（COCO test-dev，ViT-Huge）：首次达到 64.5 mAP，优于其他方法。Table 2 对比训练时间，证明性能提升非来自训练时间增加。

### 4.2 More Applications

扩展到多视角 3D 检测和实例分割。3D 检测（Table 5，nuScenes）：PETR NDS 42.0 → 45.0（+3.0），mAP 37.4 → 38.8（+1.4）；PETR v2 NDS 50.3 → 51.3（+1.0），mAP 40.7 → 41.9（+1.2）。使用 VoVNetV2 骨干，800×320 图像，24 epoch 训练。实例分割（Table 6，COCO）：Mask2Former 12 epoch 38.5 → 39.7 mAP^m（+1.2），50 epoch 43.7 → 44.0 mAP^m（+0.3）。使用 ResNet-50 骨干，遵循 Mask2Former 设置。

### 4.3 Ablation Study

使用 Conditional DETR 为基线，ResNet-50 骨干，12 epoch 训练，COCO val2017 评估。研究分组式一对多分配和分离自注意力的效果（Table 7）：（a）基线一对一分派 32.6 mAP；（b）朴素一对多分配仅 8.4 mAP（失败）；（c）分组一对多无分离自注意力 34.8 mAP（+2.2）；（d）完整方法 37.6 mAP（+5.0），分离自注意力贡献 2.8 mAP。组数影响（Figure 9）：性能随组数增加而提升，K=11 时稳定，故默认采用 K=11。

### 5. Related Works

加速 DETR 训练的两条主线：（1）修改交叉注意力：Deformable DETR 动态选择高信息量位置，Conditional DETR 计算空间注意力软选择，SMCA 使用高斯权重空间调制。（2）稳定一对一分派：DN-DETR 通过添加噪声生成去噪查询稳定分配，DINO 通过对比去噪训练生成正负噪声查询。本文从引入更多监督角度研究分配机制。一对多分配在深度检测器中广泛应用（Faster R-CNN、FCOS 等）。对比并发工作：H-DETR 采用混合分配（一组一对一、一组一对多），额外解码器推理需 NMS；DETA 直接使用一对多分配并引入 NMS。Group DETR 保持端到端检测且推理无需 NMS。

### 6. Conclusion

总结 Group DETR 关键点：分组式一对多分配和并行自注意力。成功源于引入更多对象查询组作为主组补充，从而引入更多监督。分组分配机制确保组内预测竞争，分离自注意力简化训练。无需 NMS 后处理，推理与标准 DETR 相同且不依赖分组设计。方法简单、易实现、通用性强。