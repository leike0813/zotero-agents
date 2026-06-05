# Efficient DETR: improving end-to-end object detector with dense prior (2021)

- Paper ref: 1:VHBU3NI6
- Title: Efficient DETR: improving end-to-end object detector with dense prior
- Year: 2021

## Filtered Digest

#### TL;DR

本文针对 DETR 系列端到端目标检测器需要多层解码器级联结构（6 层 decoder）才能达到高性能的问题进行了深入研究。通过实验分析发现，对象容器（object containers，包括 object queries 和 reference points）的随机初始化是导致需要多次迭代优化的主要原因。作者提出 Efficient DETR，一个简单高效的端到端目标检测流程，通过利用密集检测先验（dense prior）来初始化对象容器，显著缩小了 1 层解码器与 6 层解码器结构之间的性能差距。实验表明，Efficient DETR 仅使用 3 层 encoder 和 1 层 decoder 的结构，在 MS COCO 数据集上达到了 44.2 AP 的竞争力性能，训练仅需 36 个 epoch（相比 DETR 的 500 epoch 快 10 倍以上），参数量更少（32M vs 40M）。在 CrowdHuman 拥挤场景数据集上也表现出强大的鲁棒性，以较大优势超越现有检测器。

#### 研究问题与贡献

- 核心问题 ：DETR 和 Deformable DETR 等端到端检测器为何需要 6 层 decoder 级联结构？移除这些层会导致性能严重下降的原因是什么？

- 关键发现 ：对象容器（object queries 和 reference points）的随机初始化是导致需要多次迭代优化的根本原因；decoder 层的重要性主要来自于每层的辅助 bipartite matching loss 提供的强监督信号

- 方法创新 ：提出 Efficient DETR，结合密集检测和稀疏集合检测的优势，使用 RPN 生成的密集先验（dense prior）来初始化对象容器，使 1 层 decoder 结构能够达到与 6 层结构相当的性能

- 实验贡献 ：在 COCO 上以 3-encoder 1-decoder 结构达到 44.2 AP，训练 36 epochs；在 CrowdHuman 上验证了方法在拥挤场景下的鲁棒性

#### 方法要点

- 对象容器概念 ：将 object queries（256 维抽象特征）和 reference points（2D 边界框中心预测）统一定义为对象容器，分别表示对象的特征信息和位置信息

- 密集先验初始化 ：通过 RPN 层在编码器特征上生成密集区域提议（region proposals），选取 Top-K（K=100）得分的 4 维提议作为 reference points，对应的 256 维编码器特征作为 object queries

- 双部分架构 ：Efficient DETR 包含密集部分（dense part）和稀疏部分（sparse part），两者共享相同的检测头；密集部分进行滑动窗口式的类别特定密集预测，稀疏部分使用 1 层 decoder 进行进一步优化

- 动态提议数量策略 ：训练初期使用较大数量（300）的提议确保覆盖所有前景，随训练进行线性减少至 100，提高训练稳定性

- 一对一标签分配 ：密集和稀疏部分均采用 Hungarian 算法进行一对一匹配，避免 NMS 后处理，同时在拥挤场景下保持高性能

#### 关键结果

- COCO 性能 ：Efficient DETR-R50 达到 44.2 AP（36 epochs），超越 Faster RCNN（40.2 AP）和大多数端到端检测器；增加 encoder 层数后达到 45.1 AP（6-encoder 1-decoder）

- 收敛速度 ：训练仅需 36 epochs，相比 DETR（500 epochs）快 10 倍以上，与 Deformable DETR（50 epochs）相比也更快

- 效率优势 ：参数量 32M，比大多数模型（40M）少 20%；仅需 100 个提议，而 Deformable DETR 需要 300 个，Sparse RCNN 需要 700 个

- 拥挤场景鲁棒性 ：在 CrowdHuman 上达到 90.75 AP50 和 48.98 mMR，超越 Deformable DETR（86.74 AP50，53.98 mMR）约 4 AP 和 5 mMR

- 消融实验 ：类别特定（class-specific）检测头优于类别无关（class-agnostic）；堆叠 decoder 层对 Efficient DETR 无明显提升，验证了 1 层 decoder 的充分性
