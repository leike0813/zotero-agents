# Panoptic-PolarNet: Proposal-free LiDAR Point Cloud Panoptic Segmentation (2021)

- Paper ref: 1:DDT5Q9QF
- Title: Panoptic-PolarNet: Proposal-free LiDAR Point Cloud Panoptic Segmentation
- Year: 2021

## Filtered Digest

#### TL;DR

本文提出 Panoptic-PolarNet，一种用于 LiDAR 点云的全景分割框架。该方法采用极坐标鸟瞰图（BEV）表示，在单个推理网络中同时学习语义分割和类别无关的实例聚类，仅需在语义分割网络基础上增加 0.1M 参数和 0.02s 推理时间。

实验表明，Panoptic-PolarNet 在 SemanticKITTI 测试集上达到 54.1% PQ，在 nuScenes 验证集上达到 67.7% PQ，均取得当时最优结果，且推理速度接近实时（11.6 FPS）。

#### 研究问题与贡献

- 研究问题：如何在 LiDAR 点云全景分割任务中，兼顾高精度与近实时推理速度，同时避免 proposal-based 方法中实例与语义预测的冲突问题？

- 提出一种 proposal-free 的 LiDAR 全景分割网络，在语义分割基础上高效聚类实例

- 设计早期融合策略，语义与实例头共享前三个解码层，减少冗余并提升 PQ

- 提出两种新型点云数据增强方法：实例增强和自对抗剪枝，可推广至其他 LiDAR 分割网络

- 引入可见性特征丰富体素表示

- 在 SemanticKITTI 和 nuScenes 数据集上取得当时最优性能，且保持近实时推理速度

#### 方法要点

- 极坐标 BEV 编码器：将原始点云投影到极坐标网格，使用简化 PointNet 提取特征，再经 max-pooling 生成固定尺寸表示

- 共享解码骨干：基于 U-Net 架构，语义与实例头共享前三个解码层，实现特征级早期融合

- 实例头设计：借鉴 Panoptic-DeepLab，预测中心热力图和偏移回归，通过最近中心聚类实现类别无关的实例分组

- 多数投票融合：从热力图 NMS 选取 top-k 中心，基于最小距离将前景像素分组，再通过语义概率多数投票分配类别标签

- 实例增强：包括实例过采样、全局增强（旋转/反射）和局部增强（微小平移/旋转），保持投影属性不变

- 自对抗剪枝：利用梯度方差识别最具影响力的点并剔除 top-1%，迫使网络学习更泛化的特征

- 可见性特征：在极坐标下高效计算每个体素的可见/遮挡状态，拼接到 BEV 编码器输出

#### 关键结果

- SemanticKITTI 测试集：Panoptic-PolarNet 达到 54.1% PQ（较最佳基线提升 1.4%），推理延迟 0.086s

- SemanticKITTI 验证集：Panoptic-PolarNet 达到 59.1% PQ，mIoU 64.5%

- nuScenes 验证集：Panoptic-PolarNet 达到 67.7% PQ（较组合基线提升 1.1%），推理延迟 0.099s

- 消融实验：共享解码层提升 0.7% PQ；实例过采样提升 2.8% PQ；可见性特征提升 1.6% PQ

- Oracle 测试：使用全部 GT 时 PQ 达 96.8%，表明离散化和投影误差较小；语义 GT 对结果影响最大（PQ 91.9%）

- Mini 版本（更小网格）仅需 0.057s 推理时间，PQ 仍达 52.6%（SemanticKITTI 测试集）
