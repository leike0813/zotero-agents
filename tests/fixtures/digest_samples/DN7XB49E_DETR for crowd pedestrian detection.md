## TL;DR

本文研究了DETR（Detection Transformer）在拥挤行人检测任务上的表现，发现其在CrowdHuman数据集上效果远不如Faster-RCNN，主要原因是稀疏查询与密集行人分布的冲突、注意力场不规范以及二分匹配效率低下。

为此，本文提出了PED（Pedestrian End-to-end Detector），包含密集查询模块（DQ）、规范注意力场模块（RF）、基于可见区域的集合监督（V-Match）以及快速KM算法（Fast-KM），在CrowdHuman和CityPersons数据集上取得了优于DETR和Faster-RCNN的效果，并与最先进方法相当。

## 研究问题与贡献

- 研究问题：如何改进DETR架构以使其在拥挤行人检测任务上达到甚至超越传统检测器的性能？

- 深入分析了DETR在行人检测任务上表现不佳的根本原因

- 提出了DQRF解码器，包含密集查询（DQ）和规范注意力场（RF）模块，显著提升DETR在行人检测上的性能

- 设计了Fast-KM算法，实现高达10倍的二分匹配加速

- 提出了基于可见区域的集合监督V-Match和可见区域感知数据增强策略

## 方法要点

- DQ（密集查询）模块：基于预测框重叠度定义查询间距离，将自注意力复杂度从O(Nq²)降至O(Nq)，支持更密集的查询设置

- RF（规范注意力场）模块：利用中间层预测框生成均匀分布的注意力采样点，避免注意力场混乱或过窄

- V-Match：在前T-L层使用可见框监督，最后L层使用完整框监督，使查询聚焦于行人可见部分

- Fast-KM：利用GT倾向于匹配附近预测框的先验，加速KM二分匹配算法

- 改进的裁剪增强：保留每个行人至少80%的可见区域面积，避免遮挡行人被裁剪掉

## 关键结果

- 在CrowdHuman数据集上，PED达到AP 90.08，MR-2 44.37，优于Deformable DETR（AP 86.74，MR-2 53.98）和Faster-RCNN（AP 85.0，MR-2 50.4）

- 在CityPersons重度遮挡子集上，PED达到MR-2 47.70，优于CSP（49.3）和ALFNet（51.9）

- RF模块（3层）带来AP +1.46，MR-2 -6.99的显著提升

- V-Match（L=2）带来AP +0.93，MR-2 -5.91的稳定提升

- 密集查询（1000查询+5层DQ）带来AP +2.19，MR-2 -6.69的提升

- Fast-KM实现高达10倍的训练加速，使DETR在拥挤数据集上的训练更加实际

## 局限与可复现性线索

- 代码将在GitHub上公开（https://github.com/Hatmm/PED-DETR-for-Pedestrian-Detection）

- 实验基于Deformable DETR with Iterative Bounding Box Refinement实现

- 模型训练使用8块Tesla V-100 GPU

- 未详细讨论方法在非行人检测任务上的泛化能力

## 分章节总结

### Abstract

- 指出拥挤行人检测的两大挑战：anchor到行人的启发式映射冲突、NMS与高度重叠行人的冲突

- 发现DETR在CrowdHuman上的结果与COCO上相反，表现远不如Faster-RCNN

- 识别了DETR表现差的动机并提出新解码器

- 设计了利用行人可见部分的机制和更快的二分匹配算法

### 1. Introduction

- 行人检测面临两大挑战：特征到实例的映射、重复预测去除

- 现有方法主要关注使用更独特的身体部位或引入更多信号区分重复提案

- DETR具有查询基础和二分匹配两个特性，理论上适合行人检测

- 但实验表明DETR和Deformable DETR在CrowdHuman上远逊于Faster-RCNN

- 分析发现稀疏均匀查询和弱注意力场是Deformable DETR表现差的原因

- 提出DQRF解码器、V-Match可见区域监督和Fast-KM加速算法

### 2. Related Work

- 通用目标检测分为两阶段和单阶段方法，FPN和DCN增强特征表示

- 行人检测在拥挤场景中仍具挑战性，OR-CNN、MGAN等方法处理遮挡问题

- AdaptiveNMS等方法动态调整NMS阈值应对拥挤场景

- DETR利用transformer架构实现端到端集合预测，但在拥挤行人场景效果不佳

### 3. Revisit DETR

- DETR基于transformer架构，通过二分匹配为每个GT分配唯一查询

- 解码器通过交叉注意力和自注意力迭代更新查询集合

- 多注意力模块MSA和MCA的公式化表达

- 原始DETR和Deformable DETR在MCA设计上的差异：注意力场范围和权重计算方式

- 每层解码器的查询集合通过两个MLP投影为分类和框回归，使用KM算法进行二分匹配

### 4. Method

- 4.1: 对比DETR和Faster-RCNN在CrowdHuman上的表现，分析Deformable DETR性能下降原因

- 4.2: 密集查询模块DQ，解决稀疏查询与密集行人分布的冲突，基于GIOU定义查询距离

- 4.3: 规范注意力场RF，利用中间层预测框生成R×R均匀采样点，避免注意力混乱

- 4.4: V-Match可见区域监督，前T-L层监督可见框，后L层监督完整框

- 4.5: Fast-KM加速二分匹配，改进裁剪增强保留80%可见区域

### 5. Experiments

- 在CrowdHuman和CityPersons两个基准数据集上评估

- 使用AP和MR-2两个标准评估指标

- 消融实验验证RF、V-Match、DQ和裁剪增强的有效性

- 最终结果：PED在CrowdHuman上AP 90.08，CityPersons重度遮挡子集MR-2 47.70

- 与PBM等最先进方法相比具有竞争力

### 6. Conclusion

- 提出DQRF解码器缓解DETR在行人检测上的缺陷

- 提出更快的二分匹配算法和可见框标注利用方法

- 希望PED能作为端到端行人检测的新基线