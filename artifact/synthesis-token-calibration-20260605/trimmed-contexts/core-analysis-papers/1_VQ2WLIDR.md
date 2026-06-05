# Mask DINO: towards a unified transformer-based framework for object detection and segmentation (2023)

- Paper ref: 1:VQ2WLIDR
- Title: Mask DINO: towards a unified transformer-based framework for object detection and segmentation
- Year: 2023

## Filtered Digest

#### TL;DR

本文提出了 Mask DINO，一个统一的物体检测和分割框架。Mask DINO 通过添加掩码预测分支扩展了 DINO（DETR with Improved Denoising Anchor Boxes），支持所有图像分割任务（实例、全景和语义分割）。它利用 DINO 的查询嵌入与高分辨率像素嵌入图进行点积运算，预测一组二元掩码。

Mask DINO 概念简单、高效且可扩展，能够从联合大规模检测和分割数据集中受益。实验表明，Mask DINO 在 ResNet-50 和 SwinL 主干网络上均显著优于所有现有专用分割方法。在 COCO 数据集上，Mask DINO 实现了 54.5 AP 的实例分割、59.4 PQ 的全景分割和 60.8 mIoU 的语义分割，是十亿参数以下模型中的最佳结果。

#### 研究问题与贡献

- 研究问题：如何在 Transformer 模型中开发一个统一的架构来同时处理物体检测和图像分割任务，使两者能够相互促进？

- 提出了 Mask DINO，一个基于 Transformer 的统一框架，通过在 DINO 中添加掩码预测分支，同时支持物体检测和所有分割任务。

- 证明了检测和分割可以通过共享架构设计和训练方法相互促进，特别是检测能够显著提升分割任务的性能，甚至包括背景"stuff"类别。

- 展示了通过统一框架，分割可以从大规模检测数据集的预训练中受益，在 Objects365 上预训练后，所有分割任务均取得十亿参数以下模型的最佳结果。

#### 方法要点

- 在 DINO 的 Transformer 解码器中添加并行的掩码预测分支，利用内容查询嵌入与高分辨率像素嵌入图进行点积预测掩码。

- 提出统一增强的查询选择：利用编码器稠密先验，通过预测排名靠前的 token 的掩码来初始化掩码查询作为锚点。

- 提出掩码增强的锚框初始化：利用早期阶段掩码预测比框预测更准确的特点，从预测的掩码导出更好的锚框初始化。

- 提出统一的掩码去噪训练：将框视为掩码的噪声版本，训练模型根据给定的框预测掩码作为去噪任务。

- 采用混合二分匹配：在匹配代价中同时考虑分类、框和掩码损失，鼓励更准确和一致的匹配结果。

#### 关键结果

- 使用 ResNet-50 主干训练 50 epoch，Mask DINO 超越 Mask2Former +2.6 AP（实例分割）、+1.1 PQ（全景分割）、+1.5 mIoU（语义分割）。

- 使用 SwinL 主干并在 Objects365 上预训练，Mask DINO 实现 54.5 AP（COCO 实例分割）、59.4 PQ（COCO 全景分割）、60.8 mIoU（ADE20K 语义分割），均为十亿参数以下模型最佳。

- 检测性能超越 DINO +0.8 AP，同时保持更高的推理速度（14.8 FPS vs Mask2Former 8.2 FPS）。

- 掩码增强的锚框初始化带来 +1.2 AP 检测性能提升，验证了任务协作的有效性。
