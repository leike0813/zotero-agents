## TL;DR

本文针对 DETR 在目标检测中的两个核心瓶颈提出 Deformable DETR：一是收敛很慢，二是难以高效使用高分辨率特征，因此小目标检测表现受限。作者认为根因在于 Transformer attention 处理图像特征图时会在所有像素位置上做近乎全局的密集注意力，初始化时注意力接近均匀分布，既带来二次复杂度，也让模型需要很长训练过程才能学会聚焦到稀疏关键位置。

Deformable DETR 的核心是 deformable attention / multi-scale deformable attention：每个 query 不再遍历整张特征图，而是围绕参考点预测少量采样偏移和注意力权重，只聚合固定数量的关键采样点。该机制把 deformable convolution 的稀疏空间采样与 Transformer 的关系建模结合起来，并能自然扩展到多尺度特征图，从而不依赖 FPN 也能在不同尺度之间交换信息。

在 DETR 架构中，作者用 multi-scale deformable attention 替换 encoder 中处理图像特征图的 attention，并替换 decoder 中从图像特征抽取信息的 cross-attention；decoder 内 object query 之间的 self-attention 保持不变。检测头还被设计为相对于 reference point 预测边界框偏移，以降低优化难度并加强 decoder attention 与预测框之间的联系。

实验显示，Deformable DETR 在 COCO 上用 50 个 epoch 达到 43.8 AP，高于 500 epoch DETR 的 42.0 AP，且小目标 AP 从 DETR 的 20.5 提升到 26.4。加入 iterative bounding box refinement 后达到 45.4 AP，再加入 two-stage 方案达到 46.2 AP；训练 GPU hours 约 325-340，显著低于 DETR 的 2000 和 DETR-DC5 的 7000。

论文的价值在于把端到端集合预测检测器从“概念优雅但训练昂贵”的 DETR 推向更实用的形态；其主要证据来自 COCO 检测实验、deformable attention 设计消融、多尺度输入/多尺度注意力/K 值/FPN 对比以及 state-of-the-art 比较。需要注意的是，方法依赖自定义 attention 算子和较细的初始化、学习率、query 数量设置；附录给出复杂度、特征构造、框预测、两阶段与可视化细节，有助于复现但也说明实现细节对训练稳定性较重要。

## 研究问题与贡献

- 研究问题：如何在保留 DETR 端到端集合预测优势的同时，解决其训练收敛慢、处理高分辨率图像特征代价高、以及小目标检测性能不足的问题？

- 提出 deformable attention，将每个 query 的注意力限制在围绕 reference point 的少量可学习采样点上，避免在整张特征图上做密集 attention。

- 提出 multi-scale deformable attention，使 attention 可以直接聚合多尺度特征图信息，并在不使用 FPN 的情况下进行跨尺度信息交换。

- 将该模块嵌入 DETR：替换 encoder 中图像特征 attention 和 decoder 中 cross-attention，同时保留 object query self-attention，形成快速收敛的 Deformable DETR。

- 设计与 reference point 绑定的边界框偏移预测，并进一步探索 iterative bounding box refinement 和 two-stage Deformable DETR。

- 在 COCO 上验证 50 epoch Deformable DETR 可超过 500 epoch DETR，并在小目标、训练成本和高分辨率特征处理上显著改善。

## 方法要点

- 单尺度 deformable attention 对每个 query 预测 M 个 head、每个 head K 个采样点的 offset 和 attention weight；当 K 远小于 HW 时，attention 不再随所有像素位置展开。

- multi-scale deformable attention 把采样点扩展到 L 个特征层，对每个 query 在每个尺度采样 K 个点，并用归一化坐标和尺度映射函数在不同 feature level 上定位。

- 复杂度从标准 attention 在图像特征上的二次空间增长转为近似线性或与空间分辨率弱相关；在 encoder 中复杂度与 HW 线性相关，在 decoder cross-attention 中与 HW 无关而与 N、K、C 相关。

- encoder 输入为 ResNet C3-C5 经 1x1 convolution 得到的多尺度特征，加上 C5 后的 stride-2 3x3 convolution 生成最低分辨率 C6；所有特征通道为 C=256，并加入 level embedding。

- decoder 只把 cross-attention 替换为 multi-scale deformable attention；每个 object query 的 reference point 由 query embedding 线性投影后经过 sigmoid 得到。

- 边界框预测被参数化为相对于 reference point 的归一化偏移，减少从无位置信息 query 直接回归框坐标的优化难度。

- iterative bounding box refinement 让每个 decoder layer 基于上一层预测框继续细化，且不同 decoder layer 的 prediction head 不共享参数。

- two-stage variant 先用 encoder-only Deformable DETR 在每个像素位置产生 proposal，再把 top scoring proposals 输入 decoder 进行二阶段 refinement，不需要 NMS。

## 关键结果

- 在 COCO 2017 val 上，50 epoch Deformable DETR 达到 43.8 AP，高于 500 epoch DETR 的 42.0 AP，也明显高于 50 epoch DETR-DC5+ 的 36.2 AP。

- 小目标检测是主要受益点之一：DETR 的 APs 为 20.5，Deformable DETR 为 26.4；two-stage Deformable DETR 进一步达到 28.8。

- iterative bounding box refinement 将 Deformable DETR 从 43.8 AP 提升到 45.4 AP；two-stage 机制进一步提升到 46.2 AP。

- 训练成本显著下降：DETR 500 epoch 约 2000 GPU hours，DETR-DC5 约 7000 GPU hours，而 Deformable DETR 50 epoch 约 325 GPU hours，two-stage 约 340 GPU hours。

- 速度上，Deformable DETR 推理为 19 FPS，快于 DETR-DC5 的 12 FPS，但仍慢于 Faster R-CNN + FPN 的 26 FPS；作者将残余差距归因于 deformable attention 的非规则内存访问。

- 消融显示多尺度输入带来约 1.7 AP 提升，尤其小目标 AP 提升约 2.9；增加采样点 K 带来约 0.9 AP；multi-scale deformable attention 的跨尺度信息交换再带来约 1.5 AP。

- 在 COCO test-dev 上，使用 refinement 和 two-stage 后，ResNet-50 版本达到 46.9 AP，ResNet-101 达到 48.7 AP，ResNeXt-101 达到 49.0 AP，ResNeXt-101+DCN 达到 50.1 AP；加入 test-time augmentation 后达到 52.3 AP。

## 局限与可复现性线索

- 论文主要在 COCO 目标检测上验证，泛化到其它视觉任务、长尾小目标场景或非自然图像检测任务仍需要额外证据。

- 方法依赖多尺度 deformable attention 的实现，虽然理论 FLOPs 接近传统方案，但推理仍比 Faster R-CNN + FPN 慢约 25%，实现中的非规则内存访问是潜在工程瓶颈。

- OCR/文本抽取中公式有噪声，复现时应以原始论文或官方代码中的公式实现为准；不过核心超参数在文中较明确：默认 M=8、K=4、C=256、300 object queries、50 epoch、40 epoch 处学习率衰减。

- 训练策略并非只改 attention：还使用 Focal Loss、300 object queries、特定学习率缩放、reference point 初始化和采样偏移初始化，因此与 DETR 的公平比较需要同时注意这些设置。

- 代码已在论文中声明发布于 GitHub，这有利于复现；附录进一步给出复杂度推导、多尺度特征构造、box 相对 reference point 预测、iterative refinement、two-stage proposals 和 attention 可视化细节。

## 分章节总结

### ABSTRACT

- 摘要直接指出 DETR 去除了许多手工检测组件但存在收敛慢和空间分辨率受限的问题。

- 本文提出只关注 reference 周围少量采样点的 Deformable DETR，在 COCO 上用少得多的 epoch 达到更好性能，尤其改善小目标检测。

### 1 INTRODUCTION

- 引言把现代检测器的 anchor、target assignment、NMS 等手工组件与 DETR 的端到端集合预测形成对比，强调 DETR 的简洁性和吸引力。

- 作者将 DETR 的两大问题归因于 Transformer 处理图像特征图的方式：attention 初始化接近均匀，需要长训练才能聚焦；encoder self-attention 对高分辨率特征有二次复杂度。

- deformable convolution 被用作灵感来源，因为它在图像域以稀疏空间采样高效关注关键位置，但缺少 DETR 所需要的关系建模能力。

- 本文提出的 deformable attention 将稀疏采样与 Transformer attention 结合，并进一步扩展到多尺度特征聚合。

### 2 RELATED WORK

- 相关工作首先梳理 efficient attention：固定稀疏模式、数据依赖稀疏 attention、低秩/核化 approximation 三类路线。

- 作者指出图像域 efficient attention 多局限于固定局部窗口等第一类方案，虽然理论 FLOPs 降低，但由于内存访问模式往往实际速度较慢。

- 论文把 deformable convolution、dynamic convolution 等卷积变体解释为可被看作 self-attention 的机制，并强调 deformable convolution 在视觉识别中高效但关系建模不足。

- 多尺度特征表示部分回顾 FPN、PANet、NAS-FPN、Auto-FPN、BiFPN 等结构，随后引出本文的主张：multi-scale deformable attention 可以不借助这些金字塔结构而直接聚合多尺度特征。

### 3 REVISITING TRANSFORMERS AND DETR

- 本节先重述 multi-head attention 公式与复杂度，指出当图像像素作为 query/key 时，注意力复杂度由 O(Nq Nk C) 项主导。

- 作者分析 Transformer attention 初始化时 query-key 相容性近似随机，attention weight 接近 1/Nk，造成图像大特征图上的梯度不明确和长收敛过程。

- DETR 架构被拆成 CNN backbone、Transformer encoder-decoder、object queries、FFN bbox branch、linear classification branch 与 Hungarian set loss。

- DETR 的 encoder self-attention 对 HxW 特征图有 O(H^2 W^2 C) 复杂度；decoder cross-attention 随 HW 线性增长，object query self-attention 因 N 较小而可接受。

- 本节为后续方法建立明确靶点：小目标性能差来自难以使用高分辨率特征，训练慢来自图像特征 attention 从均匀关注到稀疏关注的学习过程。

### 4 METHOD

- 方法总览是用 deformable attention 解决图像特征 attention 的全局密集搜索问题，并构建高效、快速收敛的端到端检测器。

- 该章节分为核心 deformable Transformer 设计和两个附加变体：iterative bounding box refinement 与 two-stage Deformable DETR。

### 4.1 DEFORMABLE TRANSFORMERS FOR END-TO-END OBJECT DETECTION

- deformable attention 对每个 query 的 reference point 周围预测 K 个采样点，并通过 attention weights 聚合这些点的特征；offset 和 weight 都由 query feature 的线性投影产生。

- multi-scale deformable attention 将采样扩展到 L 个 feature levels，每个 level 采样 K 个点，attention weights 在 L*K 个采样点上归一化。

- 该模块在特殊条件下可退化为 deformable convolution，也可被看作加入可学习预过滤机制的 Transformer attention；如果采样点遍历所有位置，则退回标准 Transformer attention。

- encoder 使用 C3-C5 和额外 C6 多尺度特征，不使用 FPN；每个像素以自身为 reference point，并加入可学习的 scale-level embedding。

- decoder 只替换 cross-attention，因为它的 key 来自图像特征；object queries 之间的 self-attention 保持标准 Transformer 形式。

- 检测头相对于 reference point 预测 box offset，使 attention 的空间参考与最终框预测更一致，从而降低训练难度。

### 4.2 ADDITIONAL IMPROVEMENTS AND VARIANTS FOR DEFORMABLE DETR

- iterative bounding box refinement 让每个 decoder layer 基于上一层预测进一步修正框，是对 Deformable DETR 快速收敛特性的直接利用。

- two-stage 版本把 encoder 输出的每个多尺度像素作为 proposal 生成位置，先产生高召回候选，再将 top proposals 输入 decoder。

- 为避免把所有像素直接作为 decoder object queries 导致 self-attention 二次复杂度爆炸，proposal 生成阶段采用 encoder-only 设计。

### 5 EXPERIMENT

- 实验基于 COCO 2017，train set 训练，val/test-dev 评估；消融默认使用 ImageNet 预训练 ResNet-50。

- 默认设置包括 M=8、K=4、C=256、50 epoch 训练、40 epoch 学习率衰减、Adam 优化器、base LR 2e-4、weight decay 1e-4。

- 相比 DETR，作者还使用 Focal Loss、300 object queries，并对 reference point 和 sampling offset 相关线性投影学习率乘 0.1。

### 5.1 COMPARISON WITH DETR

- Deformable DETR 在 50 epoch 下达到 43.8 AP，超过 500 epoch DETR 的 42.0 AP，说明核心收益并非来自更长训练。

- 与 DETR-DC5 相比，Deformable DETR 的 AP、训练成本和推理速度更均衡；DETR-DC5 的大内存访问开销使其 12 FPS，而 Deformable DETR 为 19 FPS。

- iterative refinement 和 two-stage variant 逐步把 AP 提升到 45.4 和 46.2，同时保持 50 epoch 训练量。

### 5.2 ABLATION STUDY ON DEFORMABLE ATTENTION

- 多尺度输入本身能提高检测性能，特别是小目标；K 从 1 增大到 4 继续提高 AP。

- 真正的 multi-scale deformable attention 使不同尺度之间能够交换信息，带来额外 AP 提升。

- 当已经使用 multi-scale deformable attention 时，额外加入 FPN 或 BiFPN 没有明显收益，支持作者“不依赖特征金字塔也可聚合多尺度信息”的论点。

- 当不使用 multi-scale attention 且 K=1 时，模块接近 deformable convolution，精度明显低于完整设计。

### 5.3 COMPARISON WITH STATE-OF-THE-ART METHODS

- 在 test-dev 比较中，带 refinement 和 two-stage 的 Deformable DETR 随 backbone 增强持续提升：ResNet-50 为 46.9 AP，ResNet-101 为 48.7 AP，ResNeXt-101 为 49.0 AP。

- 使用 ResNeXt-101+DCN 达到 50.1 AP，配合 test-time augmentation 达到 52.3 AP，显示该端到端框架可接近当时强检测器的水平。

### 6 CONCLUSION

- 结论强调 Deformable DETR 是高效且快速收敛的端到端目标检测器。

- 作者认为核心贡献是适用于图像特征图的 multi-scale deformable attention，并希望它为端到端目标检测的后续变体打开空间。

### A.1 COMPLEXITY FOR DEFORMABLE ATTENTION

- 附录推导 deformable attention 的复杂度，默认 M=8、K

- 最终复杂度可近似为 O(2 Nq C^2 + min(HW C^2, Nq K C^2))，支撑正文关于线性/低空间复杂度的论证。

### A.2-A.4 IMPLEMENTATION DETAILS

- 多尺度特征由 ResNet C3-C5 加 C6 构成，C6 由最终 C5 stage 上的 stride-2 3x3 convolution 生成；不使用 FPN。

- box prediction 使用 sigmoid 和 inverse sigmoid 将 reference point 与预测偏移组合为归一化坐标。

- iterative refinement 中第 d 层 decoder 只对当前层预测偏移反传梯度，并阻断经过上一层预测框 inverse sigmoid 的梯度，以稳定训练。

- two-stage 模式中第一阶段检测头对每个 encoder 像素预测前景分数和框，top scoring boxes 被作为 decoder 的 region proposals。

### A.5-A.7 VISUALIZATION AND NOTATIONS

- 梯度可视化显示 Deformable DETR 用目标边界点决定框坐标，同时也关注物体内部像素来预测类别。

- multi-scale deformable attention 可视化显示 encoder 已能分离实例，decoder 相比 DETR 更关注完整前景实例而不仅是极值点。

- 符号表总结了 head、level、query、key、feature map、attention weight、sampling offset、reference point 等变量，便于复核公式实现。