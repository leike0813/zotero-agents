# Sparse DETR: efficient end-to-end object detection with learnable sparsity (2022)

- Paper ref: 1:29IBKEUR
- Title: Sparse DETR: efficient end-to-end object detection with learnable sparsity
- Year: 2022

## Filtered Digest

#### TL;DR

本文提出 Sparse DETR，一种高效的端到端目标检测器，通过可学习的稀疏性策略显著降低计算成本。核心思想是观察到在 DETR 类检测器中，解码器实际引用的编码器 token 仅占约 45%，且仅更新这些被引用的 token 几乎不会导致性能下降。基于此，作者提出两种 token 选择标准：Objectness Score (OS) 和 Decoder cross-Attention Map (DAM)，其中 DAM 通过预测解码器交叉注意力图来选择最相关的编码器 token。实验表明，Sparse DETR 仅使用 10% 的编码器 token 即可超越 Deformable DETR 基线，同时将整体计算成本降低 38%，FPS 提升 42%。此外，本文还提出编码器辅助损失，仅对选中的稀疏 token 应用匈牙利损失，这不仅稳定了训练过程，还允许堆叠更多编码器层（从 6 层增加到 12 层）而不会导致梯度消失问题。在 COCO 2017 验证集上，使用 Swin-T 骨干网络的 Sparse DETR 达到 48.2 AP（10% 保留率）至 49.2 AP（40% 保留率），优于所有对比基线方法。

#### 研究问题与贡献

- 研究问题 ：DETR 类端到端检测器在使用多尺度特征时面临严重的计算瓶颈，Deformable DETR 虽然通过可变形注意力降低了复杂度，但编码器 token 数量增加约 20 倍，导致推理速度甚至低于原始 DETR。如何在保持或提升检测性能的同时，显著降低编码器计算成本？

- 主要贡献 1 ：提出编码器 token 稀疏化方法，通过选择性更新少量编码器 token 来降低注意力计算复杂度，使在相同计算预算下堆叠更多编码器层成为可能。

- 主要贡献 2 ：提出两种新颖的稀疏化标准——Objectness Score (OS) 和 Decoder cross-Attention Map (DAM)，其中 DAM 标准使模型仅用 10% token 即可保持检测性能。

- 主要贡献 3 ：提出编码器辅助损失，仅对选中的 token 应用额外的匈牙利检测损失，不仅稳定训练，还显著提升性能，且仅增加少量训练时间。

#### 方法要点

- 编码器 token 稀疏化框架 ：定义一个评分网络 g: ℝ^d → ℝ 来测量每个 token 的显著性，选择 top-ρ% 的 token 作为显著区域 Ω_s^ρ，仅对这些 token 进行编码器层的更新计算，未选中的 token 直接传递但其值仍可被选中 token 作为 key 引用。

- Objectness Score (OS) ：在骨干特征图上添加额外的检测头和匈牙利损失，选择分类分数最高的 top-ρ% encoder token 作为显著 token 集。这种方法有效但次优，因为选择的 token 未明确考虑解码器需求。

- Decoder cross-Attention Map (DAM) ：提出评分网络预测二值化的解码器交叉注意力图作为伪真值，通过最小化 BCE 损失训练。DAM 通过聚合所有解码器对象查询与编码器输出的交叉注意力生成，直接反映解码器最关注的编码器 token。

- 编码器辅助损失 ：在稀疏化的编码器 token 上应用辅助检测头和匈牙利损失，缓解深层编码器的梯度消失问题，使堆叠 12 层编码器成为可能。

- Top-k 解码器查询选择 ：使用辅助检测头从编码器输出中选择 top-k token 作为解码器对象查询，替代可学习查询，实验证明这优于传统方法。

#### 关键结果

- COCO val2017 性能 ：使用 ResNet-50 骨干网络，Sparse DETR 在 30% 以上保留率时超越所有基线（包括 Faster-RCNN-FPN、DETR、Deformable DETR、PnP-DETR）；使用 Swin-T 骨干网络，仅 10% 保留率即超越所有基线，达到 48.2 AP。

- 计算效率 ：相比 Deformable DETR，Sparse DETR（10% 保留率）将编码器块计算成本降低约 82%，整体计算成本降低 38%，FPS 从 19.1 提升至 27.1（提升 42%）。

- DAM vs OS ：DAM 标准在所有保留率下均优于 OS 标准，且在 50% 保留率时几乎追上非稀疏基线。相关性分析显示 DAM 选择的 token 与解码器引用的 token 重叠度更高。

- 编码器辅助损失效果 ：无辅助损失时，超过 9 层编码器训练失败；有辅助损失时，12 层编码器可达到 50.1 AP（Swin-T），且梯度范数分析证实辅助损失有效缓解梯度消失。

- 动态稀疏化鲁棒性 ：训练时使用固定稀疏率（30%），推理时可动态调整保留率（10%-50%）而性能下降有限，优于 PnP-DETR 需要动态比率训练的复杂技巧。
