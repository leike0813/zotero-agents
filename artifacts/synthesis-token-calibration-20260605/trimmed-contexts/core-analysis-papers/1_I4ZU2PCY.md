# DETR for crowd pedestrian detection (2021)

- Paper ref: 1:I4ZU2PCY
- Title: DETR for crowd pedestrian detection
- Year: 2021

## Filtered Digest

#### TL;DR

本文研究了DETR（Detection Transformer）在拥挤行人检测任务上的表现，发现其在CrowdHuman数据集上效果远不如Faster-RCNN，主要原因是稀疏查询与密集行人分布的冲突、注意力场不规范以及二分匹配效率低下。

为此，本文提出了PED（Pedestrian End-to-end Detector），包含密集查询模块（DQ）、规范注意力场模块（RF）、基于可见区域的集合监督（V-Match）以及快速KM算法（Fast-KM），在CrowdHuman和CityPersons数据集上取得了优于DETR和Faster-RCNN的效果，并与最先进方法相当。

#### 研究问题与贡献

- 研究问题：如何改进DETR架构以使其在拥挤行人检测任务上达到甚至超越传统检测器的性能？

- 深入分析了DETR在行人检测任务上表现不佳的根本原因

- 提出了DQRF解码器，包含密集查询（DQ）和规范注意力场（RF）模块，显著提升DETR在行人检测上的性能

- 设计了Fast-KM算法，实现高达10倍的二分匹配加速

- 提出了基于可见区域的集合监督V-Match和可见区域感知数据增强策略

#### 方法要点

- DQ（密集查询）模块：基于预测框重叠度定义查询间距离，将自注意力复杂度从O(Nq²)降至O(Nq)，支持更密集的查询设置

- RF（规范注意力场）模块：利用中间层预测框生成均匀分布的注意力采样点，避免注意力场混乱或过窄

- V-Match：在前T-L层使用可见框监督，最后L层使用完整框监督，使查询聚焦于行人可见部分

- Fast-KM：利用GT倾向于匹配附近预测框的先验，加速KM二分匹配算法

- 改进的裁剪增强：保留每个行人至少80%的可见区域面积，避免遮挡行人被裁剪掉

#### 关键结果

- 在CrowdHuman数据集上，PED达到AP 90.08，MR-2 44.37，优于Deformable DETR（AP 86.74，MR-2 53.98）和Faster-RCNN（AP 85.0，MR-2 50.4）

- 在CityPersons重度遮挡子集上，PED达到MR-2 47.70，优于CSP（49.3）和ALFNet（51.9）

- RF模块（3层）带来AP +1.46，MR-2 -6.99的显著提升

- V-Match（L=2）带来AP +0.93，MR-2 -5.91的稳定提升

- 密集查询（1000查询+5层DQ）带来AP +2.19，MR-2 -6.69的提升

- Fast-KM实现高达10倍的训练加速，使DETR在拥挤数据集上的训练更加实际
