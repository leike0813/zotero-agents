#### TL;DR

本文针对 DETR 在目标检测中的两个核心瓶颈提出 Deformable DETR：一是收敛很慢，二是难以高效使用高分辨率特征，因此小目标检测表现受限。作者认为根因在于 Transformer attention 处理图像特征图时会在所有像素位置上做近乎全局的密集注意力，初始化时注意力接近均匀分布，既带来二次复杂度，也让模型需要很长训练过程才能学会聚焦到稀疏关键位置。

Deformable DETR 的核心是 deformable attention / multi-scale deformable attention：每个 query 不再遍历整张特征图，而是围绕参考点预测少量采样偏移和注意力权重，只聚合固定数量的关键采样点。该机制把 deformable convolution 的稀疏空间采样与 Transformer 的关系建模结合起来，并能自然扩展到多尺度特征图，从而不依赖 FPN 也能在不同尺度之间交换信息。

在 DETR 架构中，作者用 multi-scale deformable attention 替换 encoder 中处理图像特征图的 attention，并替换 decoder 中从图像特征抽取信息的 cross-attention；decoder 内 object query 之间的 self-attention 保持不变。检测头还被设计为相对于 reference point 预测边界框偏移，以降低优化难度并加强 decoder attention 与预测框之间的联系。

实验显示，Deformable DETR 在 COCO 上用 50 个 epoch 达到 43.8 AP，高于 500 epoch DETR 的 42.0 AP，且小目标 AP 从 DETR 的 20.5 提升到 26.4。加入 iterative bounding box refinement 后达到 45.4 AP，再加入 two-stage 方案达到 46.2 AP；训练 GPU hours 约 325-340，显著低于 DETR 的 2000 和 DETR-DC5 的 7000。

论文的价值在于把端到端集合预测检测器从“概念优雅但训练昂贵”的 DETR 推向更实用的形态；其主要证据来自 COCO 检测实验、deformable attention 设计消融、多尺度输入/多尺度注意力/K 值/FPN 对比以及 state-of-the-art 比较。需要注意的是，方法依赖自定义 attention 算子和较细的初始化、学习率、query 数量设置；附录给出复杂度、特征构造、框预测、两阶段与可视化细节，有助于复现但也说明实现细节对训练稳定性较重要。

#### 研究问题与贡献

- 研究问题：如何在保留 DETR 端到端集合预测优势的同时，解决其训练收敛慢、处理高分辨率图像特征代价高、以及小目标检测性能不足的问题？

- 提出 deformable attention，将每个 query 的注意力限制在围绕 reference point 的少量可学习采样点上，避免在整张特征图上做密集 attention。

- 提出 multi-scale deformable attention，使 attention 可以直接聚合多尺度特征图信息，并在不使用 FPN 的情况下进行跨尺度信息交换。

- 将该模块嵌入 DETR：替换 encoder 中图像特征 attention 和 decoder 中 cross-attention，同时保留 object query self-attention，形成快速收敛的 Deformable DETR。

- 设计与 reference point 绑定的边界框偏移预测，并进一步探索 iterative bounding box refinement 和 two-stage Deformable DETR。

- 在 COCO 上验证 50 epoch Deformable DETR 可超过 500 epoch DETR，并在小目标、训练成本和高分辨率特征处理上显著改善。

#### 方法要点

- 单尺度 deformable attention 对每个 query 预测 M 个 head、每个 head K 个采样点的 offset 和 attention weight；当 K 远小于 HW 时，attention 不再随所有像素位置展开。

- multi-scale deformable attention 把采样点扩展到 L 个特征层，对每个 query 在每个尺度采样 K 个点，并用归一化坐标和尺度映射函数在不同 feature level 上定位。

- 复杂度从标准 attention 在图像特征上的二次空间增长转为近似线性或与空间分辨率弱相关；在 encoder 中复杂度与 HW 线性相关，在 decoder cross-attention 中与 HW 无关而与 N、K、C 相关。

- encoder 输入为 ResNet C3-C5 经 1x1 convolution 得到的多尺度特征，加上 C5 后的 stride-2 3x3 convolution 生成最低分辨率 C6；所有特征通道为 C=256，并加入 level embedding。

- decoder 只把 cross-attention 替换为 multi-scale deformable attention；每个 object query 的 reference point 由 query embedding 线性投影后经过 sigmoid 得到。

- 边界框预测被参数化为相对于 reference point 的归一化偏移，减少从无位置信息 query 直接回归框坐标的优化难度。

- iterative bounding box refinement 让每个 decoder layer 基于上一层预测框继续细化，且不同 decoder layer 的 prediction head 不共享参数。

- two-stage variant 先用 encoder-only Deformable DETR 在每个像素位置产生 proposal，再把 top scoring proposals 输入 decoder 进行二阶段 refinement，不需要 NMS。

#### 关键结果

- 在 COCO 2017 val 上，50 epoch Deformable DETR 达到 43.8 AP，高于 500 epoch DETR 的 42.0 AP，也明显高于 50 epoch DETR-DC5+ 的 36.2 AP。

- 小目标检测是主要受益点之一：DETR 的 APs 为 20.5，Deformable DETR 为 26.4；two-stage Deformable DETR 进一步达到 28.8。

- iterative bounding box refinement 将 Deformable DETR 从 43.8 AP 提升到 45.4 AP；two-stage 机制进一步提升到 46.2 AP。

- 训练成本显著下降：DETR 500 epoch 约 2000 GPU hours，DETR-DC5 约 7000 GPU hours，而 Deformable DETR 50 epoch 约 325 GPU hours，two-stage 约 340 GPU hours。

- 速度上，Deformable DETR 推理为 19 FPS，快于 DETR-DC5 的 12 FPS，但仍慢于 Faster R-CNN + FPN 的 26 FPS；作者将残余差距归因于 deformable attention 的非规则内存访问。

- 消融显示多尺度输入带来约 1.7 AP 提升，尤其小目标 AP 提升约 2.9；增加采样点 K 带来约 0.9 AP；multi-scale deformable attention 的跨尺度信息交换再带来约 1.5 AP。

- 在 COCO test-dev 上，使用 refinement 和 two-stage 后，ResNet-50 版本达到 46.9 AP，ResNet-101 达到 48.7 AP，ResNeXt-101 达到 49.0 AP，ResNeXt-101+DCN 达到 50.1 AP；加入 test-time augmentation 后达到 52.3 AP。
