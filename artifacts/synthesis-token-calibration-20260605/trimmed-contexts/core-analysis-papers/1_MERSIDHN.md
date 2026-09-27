# D-FINE: Redefine Regression Task in DETRs as Fine-grained Distribution Refinement (2024)

- Paper ref: 1:MERSIDHN
- Title: D-FINE: Redefine Regression Task in DETRs as Fine-grained Distribution Refinement
- Year: 2024

## Filtered Digest

#### TL;DR

D-FINE 是一种高性能实时目标检测器，通过将 DETR 模型中的边界框回归任务从预测固定坐标重新定义为迭代细化概率分布，显著提升了定位精度。该方法包含两大核心组件：细粒度分布细化（FDR）和全局最优定位自蒸馏（GO-LSD）。

FDR 将边界框预测转化为对各边缘的概率分布进行残差式迭代优化，配合非均匀加权函数实现更精细的定位调整。GO-LSD 则将深层网络的精炼分布知识通过自蒸馏迁移到浅层，在几乎不增加训练成本的前提下加速收敛。

在 COCO 数据集上，D-FINE-L/X 分别达到 54.0%/55.8% AP，速度为 124/78 FPS（T4 GPU）。经 Objects365 预训练后，D-FINE-X 达到 59.3% AP，超越所有现有实时检测器。该方法还可无缝集成到各类 DETR 架构中，带来最高 5.3% AP 的提升。

#### 研究问题与贡献

- 研究问题：如何在保持实时性的前提下，解决传统边界框回归中固定坐标预测无法建模定位不确定性、优化困难的问题，以及如何以较低训练成本实现高效的定位知识蒸馏？

- 提出细粒度分布细化（FDR）：将边界框回归从固定坐标预测转化为概率分布的迭代残差优化，提供细粒度的中间表征，在锚点无关的端到端框架中实现更精准的定位

- 提出全局最优定位自蒸馏（GO-LSD）：将最终层的精炼分布知识蒸馏到浅层，通过解耦蒸馏焦点损失（DDF Loss）对匹配和未匹配预测分别加权，几乎不增加训练开销

- 对实时 DETR 架构进行轻量级优化（移除投影层、引入目标门控层、替换 GELAN 编码器、非均匀采样等），在降低 13% 延迟和 17% GFLOPs 的同时不损失精度

- 在 COCO 和 Objects365 数据集上取得 SOTA 性能，且方法可泛化到多种 DETR 架构（Deformable-DETR、DAB-DETR、DN-DETR、DINO），提升幅度 2.0%-5.3% AP

#### 方法要点

- FDR 使用四层分布（top/bottom/left/right）分别建模每个边界的定位不确定性，每层解码器通过残差式 logit 更新逐步细化分布

- 非均匀加权函数 W(n) 由超参数 a 和 c 控制曲率和上界，在预测接近真实值时允许更精细的微调，在偏差较大时允许大幅修正

- 提出细粒度定位（FGL）损失，结合 IoU 加权和交叉熵，鼓励低不确定性的分布更加集中

- GO-LSD 聚合所有层的匈牙利匹配索引形成全局联合集，确保最佳定位候选都能受益于蒸馏

- DDF 损失对高 IoU 但低置信度的预测进行解耦加权，平衡匹配和未匹配样本的蒸馏贡献

- 目标门控层替代解码器残差连接，使查询能在不同层间动态切换对不同目标的关注

#### 关键结果

- COCO val2017 上 D-FINE-L 达到 54.0% AP（31M 参数，91 GFLOPs，8.07ms），D-FINE-X 达到 55.8% AP（62M 参数，202 GFLOPs，12.89ms）

- Objects365 预训练后 D-FINE-X 达到 59.3% AP，超越 YOLOv10-X（54.9% AP）和 RT-DETR-R101（56.2% AP），且仅需 21 轮预训练

- 集成到 DAB-DETR 时取得最大提升 +5.3% AP（44.2% → 49.5%），集成到 DINO 时提升 +2.6% AP（49.0% → 51.6%）

- 轻量级模型 D-FINE-S 达到 48.5% AP（10.2M 参数，25.2 GFLOPs，3.49ms），预训练后提升至 50.7% AP

- 消融实验表明：FDR 单独贡献 +0.5% AP，GO-LSD 再贡献 +0.5% AP；最优超参数为 a=0.5, c=0.25, N=32, T=5

- GO-LSD 相比传统 Logit Mimicking 和 Feature Imitation 不仅精度最高（54.5% AP vs 52.6%/52.9%），训练开销仅增加 6%
