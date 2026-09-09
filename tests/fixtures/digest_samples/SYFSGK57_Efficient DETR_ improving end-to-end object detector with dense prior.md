## TL;DR

本文针对 DETR 系列端到端目标检测器需要多层解码器级联结构（6 层 decoder）才能达到高性能的问题进行了深入研究。通过实验分析发现，对象容器（object containers，包括 object queries 和 reference points）的随机初始化是导致需要多次迭代优化的主要原因。作者提出 Efficient DETR，一个简单高效的端到端目标检测流程，通过利用密集检测先验（dense prior）来初始化对象容器，显著缩小了 1 层解码器与 6 层解码器结构之间的性能差距。实验表明，Efficient DETR 仅使用 3 层 encoder 和 1 层 decoder 的结构，在 MS COCO 数据集上达到了 44.2 AP 的竞争力性能，训练仅需 36 个 epoch（相比 DETR 的 500 epoch 快 10 倍以上），参数量更少（32M vs 40M）。在 CrowdHuman 拥挤场景数据集上也表现出强大的鲁棒性，以较大优势超越现有检测器。

## 研究问题与贡献

- 核心问题 ：DETR 和 Deformable DETR 等端到端检测器为何需要 6 层 decoder 级联结构？移除这些层会导致性能严重下降的原因是什么？

- 关键发现 ：对象容器（object queries 和 reference points）的随机初始化是导致需要多次迭代优化的根本原因；decoder 层的重要性主要来自于每层的辅助 bipartite matching loss 提供的强监督信号

- 方法创新 ：提出 Efficient DETR，结合密集检测和稀疏集合检测的优势，使用 RPN 生成的密集先验（dense prior）来初始化对象容器，使 1 层 decoder 结构能够达到与 6 层结构相当的性能

- 实验贡献 ：在 COCO 上以 3-encoder 1-decoder 结构达到 44.2 AP，训练 36 epochs；在 CrowdHuman 上验证了方法在拥挤场景下的鲁棒性

## 方法要点

- 对象容器概念 ：将 object queries（256 维抽象特征）和 reference points（2D 边界框中心预测）统一定义为对象容器，分别表示对象的特征信息和位置信息

- 密集先验初始化 ：通过 RPN 层在编码器特征上生成密集区域提议（region proposals），选取 Top-K（K=100）得分的 4 维提议作为 reference points，对应的 256 维编码器特征作为 object queries

- 双部分架构 ：Efficient DETR 包含密集部分（dense part）和稀疏部分（sparse part），两者共享相同的检测头；密集部分进行滑动窗口式的类别特定密集预测，稀疏部分使用 1 层 decoder 进行进一步优化

- 动态提议数量策略 ：训练初期使用较大数量（300）的提议确保覆盖所有前景，随训练进行线性减少至 100，提高训练稳定性

- 一对一标签分配 ：密集和稀疏部分均采用 Hungarian 算法进行一对一匹配，避免 NMS 后处理，同时在拥挤场景下保持高性能

## 关键结果

- COCO 性能 ：Efficient DETR-R50 达到 44.2 AP（36 epochs），超越 Faster RCNN（40.2 AP）和大多数端到端检测器；增加 encoder 层数后达到 45.1 AP（6-encoder 1-decoder）

- 收敛速度 ：训练仅需 36 epochs，相比 DETR（500 epochs）快 10 倍以上，与 Deformable DETR（50 epochs）相比也更快

- 效率优势 ：参数量 32M，比大多数模型（40M）少 20%；仅需 100 个提议，而 Deformable DETR 需要 300 个，Sparse RCNN 需要 700 个

- 拥挤场景鲁棒性 ：在 CrowdHuman 上达到 90.75 AP50 和 48.98 mMR，超越 Deformable DETR（86.74 AP50，53.98 mMR）约 4 AP 和 5 mMR

- 消融实验 ：类别特定（class-specific）检测头优于类别无关（class-agnostic）；堆叠 decoder 层对 Efficient DETR 无明显提升，验证了 1 层 decoder 的充分性

## 局限与可复现性线索

- 小目标检测 ：虽然通过多尺度特征改进了小目标检测性能（APs 达到 28.4），但相比大目标（APL 56.6）仍有差距

- 提议数量敏感性 ：虽然对提议数量不敏感（100 到 1000 仅 0.2 AP 差异），但训练初期需要足够多的提议（300）来保证稳定性

- 实现细节 ：使用 ImageNet 预训练 ResNet-50 骨干网络，多尺度特征从 C3 到 C6；变形注意力设置 M=8 和 K=4；优化器为 Adam，基础学习率 0.0001，β1=0.9，β2=0.999，权重衰减 0.0001

- 损失函数 ：分类使用 focal loss（λ_cls=2），定位使用 L1 loss（λ_L1=5）和 generalized IoU loss（λ_giou=2）

- 训练策略 ：36 epochs，第 24 epoch 时学习率衰减为原来的 0.1 倍；提议数量从 300 线性减少到 100

## 分章节总结

### 1. Introduction（引言）

本章介绍了目标检测的背景和端到端检测器的发展。现代检测器（如 Faster RCNN、RetinaNet 等）通常生成密集 anchors 并使用 NMS 后处理，无法实现真正的端到端检测。DETR 首次提出基于 encoder-decoder transformer 和 bipartite matching 的端到端框架，但存在训练收敛慢（需要 500 epochs）和小目标检测性能低的问题。Deformable DETR 通过局部空间注意力和多尺度特征解决了这两个问题，但仍保持 6-encoder 6-decoder 的级联结构。作者假设这种级联结构是 DETR 系列达到高精度的关键，并通过实验发现 decoder 层的辅助损失贡献最大，而对象容器的随机初始化导致需要多层迭代。基于此，提出 Efficient DETR，使用密集先验初始化对象容器，实现 3-encoder 1-decoder 的高效结构。

### 2. Related Work（相关工作）

#### 2.1 One-stage and Two-stage Detectors（单阶段和两阶段检测器）

主流检测器基于 anchor boxes 或 anchor points。单阶段检测器（YOLO、SSD、RetinaNet、FCOS）直接预测类别和 anchor 偏移，采用一对多标签分配，需要 NMS 去除冗余。两阶段检测器（Faster RCNN、Mask RCNN）先通过 RPN 生成前景提议，再使用 ROIPool/ROIAlign 提取特征并优化提议，通常性能优于单阶段检测器。

#### 2.2 End-to-end Detectors（端到端检测器）

DETR 基于 encoder-decoder transformer 架构，使用 6 层 encoder 提取上下文信息，6 层 decoder 迭代更新 100 个 object queries，通过 bipartite matching loss 直接输出集合预测。但 DETR 训练慢且不擅长小目标检测。Deformable DETR 使用多尺度特征和可变形注意力模块，将收敛速度从 500 epochs 提升到 50 epochs。Sparse RCNN 提出纯稀疏框架，使用可学习提议和 6 层动态实例交互头，收敛速度 36 epochs。其他工作如 TSP、SMCA 等也研究了 DETR 的收敛问题。

### 3. Exploring DETR（探索 DETR）

#### 3.1 Revisit DETR（重新审视 DETR）

通过实验分析 encoder 和 decoder 的作用。表 1 显示 DETR 对 decoder 层数更敏感：移除 2 层 decoder 导致 9.3 AP 下降，而移除 2 层 encoder 仅下降 1.7 AP。decoder 更重要的原因是每层的辅助 bipartite matching loss 提供了强监督信号。移除辅助损失后，encoder 和 decoder 行为趋于一致。表 2 进一步显示 decoder 层数从 6 层减少到 1 层会导致 10.3 AP 的巨大下降。作者假设 object queries 的随机初始化没有提供良好的初始状态，是需要 6 层迭代的原因。

#### 3.2 Impact of initialization of object containers（对象容器初始化的影响）

Object queries 是 256 维抽象张量难以分析，但 Deformable DETR 提出的 reference points（2D 张量，表示框中心预测）可作为 object queries 在 2D 空间的投影。可视化显示，训练收敛后 reference points 从初始的均匀分布逐渐聚集到前景中心，类似于 anchor points 的作用。实验比较了不同初始化方式（learnable、grid、center、border、dense/RPN）在 1-decoder 和 6-decoder 结构下的性能。表 3 显示，在 1-decoder 结构中不同初始化差异巨大（dense 初始化 39.0 AP vs center 初始化 21.0 AP），而 6-decoder 结构能缩小这些差距。使用 RPN 生成的密集先验初始化 reference points 能显著提升 1-decoder 结构性能。进一步同时初始化 object queries（使用对应的 256 维编码器特征）可再提升 3 AP（表 4），验证了对象容器初始状态与非级联结构性能的高度相关性。

### 4. Efficient DETR（高效 DETR）

详细描述了 Efficient DETR 的架构设计。整体包含密集部分和稀疏部分，共享检测头。骨干网络遵循 Deformable DETR 设计，从 ResNet 提取 C3-C5 特征并通过卷积生成 4 尺度特征图（256 通道）。密集部分在编码器特征上进行类别特定密集预测，为每个 anchor 预测 91 个类别得分和 4 个偏移量。稀疏部分通过 objectness 得分（取最大类别得分）选取 Top-K 提议作为 reference points（4 维框），对应的 256 维编码器特征作为 object queries。这种初始化合理，因为：1）位置编码已编码到提议特征中；2）密集部分与稀疏部分任务相似，可作为稀疏部分的初始状态。解码器通过交叉注意力模块解决特征不对齐问题。训练策略上，提议数量从 300 线性减少到 100，确保训练稳定性。损失函数与 DETR/Deformable DETR 相同，使用 focal loss、L1 loss 和 GIoU loss，采用 Hungarian 算法进行一对一匹配。

### 5. Experiments（实验）

#### 5.1 Experiment Settings（实验设置）

在 MS COCO benchmark 上训练（train2017）和评估（val2017），使用 ImageNet 预训练 ResNet-50 骨干网络。变形注意力设置 M=8、K=4。训练 36 epochs，第 24 epoch 学习率衰减 0.1 倍。损失权重λ_cls=2、λ_L1=5、λ_giou=2。优化器为 Adam，基础学习率 0.0001，β1=0.9，β2=0.999，权重衰减 0.0001。

#### 5.2 Main Result（主要结果）

表 5 展示了与主流检测器的对比。Efficient DETR-R50 达到 44.2 AP（36 epochs），超越 Faster RCNN（40.2 AP）和大多数端到端检测器，且 FLOPs 和参数量更少。相比 Deformable DETR，以更简单结构（3-encoder 1-decoder vs 6-encoder 6-decoder）和更少训练轮次（36 vs 50）取得 0.4 AP 提升。与 Sparse RCNN 相比仅低 0.3 AP，但参数量少 20%（32M vs 40M），且仅需 100 个提议（Sparse RCNN 需 700 个）。增加 encoder 层数后（6-encoder 1-decoder）达到 45.1 AP 的 state-of-the-art 性能。

#### 5.3 Ablation Study（消融实验）

检测头设计：表 6 显示类别特定（class-specific）检测头优于类别无关（class-agnostic）（43.8 AP vs 43.0 AP），假设类别特定为密集部分提供更多监督，增强编码器特征中的类别信息。共享检测头不影响性能。提议数量：表 8 显示增加提议数量从 100 到 1000 仅提升 0.2 AP，说明方法对提议数量不敏感。线性减少策略能缩小不同提议数量模型的性能差距。标签分配：表 9 显示一对多分配导致性能下降（1-to-10 仅 35.6 AP），且需要更多提议来覆盖重复预测。Encoder/Decoder 数量：表 5 显示增加 3 层 encoder 提升 0.9 AP，但表 7 显示堆叠 decoder 层无明显提升，甚至性能下降，验证了 1 层 decoder 的充分性。

#### 5.4 Evaluation on CrowdHuman（CrowdHuman 评估）

表 10 展示了在 CrowdHuman 拥挤场景数据集上的结果。Efficient DETR 以 100 个提议达到 90.75 AP50 和 48.98 mMR，超越 Deformable DETR（86.74 AP50，53.98 mMR）约 4 AP 和 5 mMR。密集部分使模型能覆盖拥挤场景中的几乎所有前景，一对一标签分配使模型以少量提议实现高性能。更多提议（400）会导致 mMR 上升，说明密集部分在拥挤场景下的鲁棒性。

### 6. Conclusion（结论）

总结了对 DETR 组件的探索工作。通过分析对象容器，揭示了 reference points 作为 object queries 的 anchor points 的作用。指出对象容器的随机初始化是现代端到端检测器需要多次迭代才能达到高精度的主要原因。利用基于 anchor 方法中的密集先验，提出了简单高效的 Efficient DETR 流程，结合密集检测和集合检测的特点，以快速收敛速度实现高性能。希望工作能启发更多简单高效的目标检测器设计。