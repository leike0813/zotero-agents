## TL;DR

本文重新审视纯 ConvNet 的性能上限，通过将标准 ResNet 逐步"现代化"为接近 Vision Transformer 的设计，发现多个关键组件对性能差异的贡献。

由此提出的 ConvNeXt 家族完全由标准 ConvNet 模块构成，在 ImageNet 分类、COCO 目标检测和 ADE20K 语义分割任务上与 Swin Transformer 相当或更优，同时保持了 ConvNet 的简洁性和推理效率。

研究表明，Transformer 的许多架构选择都可以映射为 ConvNet 实现，且这些设计在 ConvNet 文献中早已单独存在但从未被集体采用；ConvNeXt 的成功挑战了"Transformer 必然优于 ConvNet"的普遍认知。


## 研究问题与贡献

- 研究问题：纯 ConvNet 在与 Vision Transformer 相同的训练条件下，其性能上限在哪里？哪些架构设计决策造成了两者之间的性能差异？


- 系统性地逐步骤"现代化" ResNet，识别出 stage compute ratio、patchify stem、depthwise convolution、inverted bottleneck、大卷积核、减少激活函数和归一化层等关键设计变更及其各自贡献。

- 提出 ConvNeXt 家族模型（T/S/B/L/XL），完全由标准 ConvNet 模块构建，在 ImageNet-1K 上达到 87.8% top-1 准确率。

- 在 COCO 检测和 ADE20K 分割任务上，ConvNeXt 在相当或更优的吞吐量下超越 Swin Transformer。

- ConvNeXt 在鲁棒性测试（ImageNet-A/R/Sketch/C）中也展现出优越的域泛化能力。


## 方法要点

- 采用多阶段设计并调整 stage compute ratio 为 1:1:3:1（大模型为 1:1:9:1），对齐 Swin Transformer 的计算分布。

- 使用 4×4 非重叠卷积作为 patchify stem 替代 ResNet 风格的 7×7 conv + max pool。

- 以 depthwise convolution 替代标准 3×3 分组卷积，分离空间混洗与通道混洗。

- 引入 inverted bottleneck（MLP 扩展比为 4），减少网络 FLOPs 的同时略微提升精度。

- 将 depthwise conv 位置上移并采用 7×7 大卷积核，获得全局感受野。

- 每块仅保留一个 GELU 激活函数和一层 LayerNorm，显著减少激活和归一化层数量。

- 使用独立的 2×2 stride-2 卷积进行下采样，并在分辨率变化处添加 LayerNorm 以稳定训练。


## 关键结果

- 仅改进训练技巧（300 epoch、AdamW、Mixup、Cutmix、RandAugment 等），ResNet-50 从 76.1% 提升至 78.8%，说明训练策略本身贡献了相当一部分性能差异。

- ConvNeXt-T 在 ImageNet-1K 上达到 82.1%，超越 Swin-T（81.3%）0.8 个百分点。

- ConvNeXt-XL 在 ImageNet-22K 预训练 + 384² 微调下达到 87.8% top-1 准确率。

- COCO Cascade Mask R-CNN 3× schedule 下，ConvNeXt-L 达到 54.8 APbox，超越 Swin-L（53.9 APbox）。

- ADE20K 分割中，ConvNeXt-XL 达到 54.0 mIoU，超越 Swin-L（53.5 mIoU）。

- A100 GPU 上 ConvNeXt 吞吐量比 Swin Transformer 最高快 49%。

- 等方型 ConvNeXt 与 ViT 对比显示 ConvNeXt 块设计同样适用于非层级架构。


## 局限与可复现性线索

- ConvNeXt 可能在某些需要交叉注意力模块的多模态学习任务中不如 Transformer 灵活。

- Transformer 在需要离散化、稀疏或结构化输出的任务中可能更具优势。

- 大规模模型和数据集带来碳排放增加等社会影响问题。

- 代码已开源：https://github.com/facebookresearch/ConvNeXt。

- 训练超参数详见附录 A，包括完整的 ImageNet-1K/22K 训练、微调与下游任务设置。


## 分章节总结

### Abstract

- Vision Transformer 出现后 ConvNet 被取代为 SOTA 图像分类模型，但层级 Transformer 实际重新引入了多种 ConvNet 先验。

- 本文探索纯 ConvNet 的性能上限，提出 ConvNeXt 家族，在多项任务上与 Transformer 相当或更优。



### 1. Introduction

- 回顾 2010 年代 ConvNet 的垄断地位以及 Vision Transformer（ViT）在 2020 年引发的架构变革。

- 层级 Transformer（如 Swin）通过局部窗口策略重新引入 ConvNet 归纳偏置，但其复杂性增加。

- 本文从 ResNet-50 出发，逐步"现代化"为接近 Swin Transformer 的设计，识别关键性能差异组件。

- 提出的 ConvNeXt 在 ImageNet、COCO、ADE20K 上与 Transformer 竞争，同时保持简洁性和效率。



### 2. Modernizing a ConvNet: a Roadmap

- 2.1 改进训练技巧使 ResNet-50 从 76.1% 提升至 78.8%，训练策略本身是重要性能因素。

- 2.2 调整 stage compute ratio 和 patchify stem 带来小幅增益。

- 2.3 使用 depthwise convolution 并扩展宽度至 80.5%。

- 2.4 Inverted bottleneck 在降低 FLOPs 的同时略微提升精度至 80.6%。

- 2.5 7×7 大卷积核在饱和点前持续带来增益至 80.6%。

- 2.6 微设计：GELU 替代 ReLU、减少激活函数（+0.7% 至 81.3%）、减少归一化层（至 81.4%）、LN 替代 BN（至 81.5%）、独立下采样层（至 82.0% 最终 ConvNeXt）。



### 3. Empirical Evaluations on ImageNet

- 构建 ConvNeXt-T/S/B/L/XL 变体，在 ImageNet-1K 和 ImageNet-22K 上评估。

- ConvNeXt-T 以 82.1% 超越 Swin-T 0.8%，ConvNeXt-XL 在 22K 预训练后达到 87.8%。

- 等方型 ConvNeXt 与 ViT 性能相当，验证块设计泛化性。



### 4. Empirical Evaluation on Downstream Tasks

- COCO 检测/分割：ConvNeXt 在 Cascade Mask R-CNN 下全面对标或超越 Swin，ConvNeXt-L 达 54.8 APbox。

- ADE20K 分割：ConvNeXt-XL 达 54.0 mIoU，超越 Swin-L 的 53.5。

- A100 上 ConvNeXt 吞吐量显著优于 Swin（最高 49%）。



### 5. Related Work

- 混合模型：ViT 前后均有结合卷积与自注意力的研究。

- 近期纯卷积方法：动态 depthwise conv、ConvMixer、GFNet 等展示了卷积替代 token 混洗的潜力。



### 6. Conclusions

- ConvNeXt 证明纯 ConvNet 可以在多个视觉任务上与层级 Transformer 竞争。

- 许多设计选择并非新颖，但之前从未被集体采用。

- 希望本研究挑战普遍观点，促使人们重新思考卷积在视觉中的重要性。