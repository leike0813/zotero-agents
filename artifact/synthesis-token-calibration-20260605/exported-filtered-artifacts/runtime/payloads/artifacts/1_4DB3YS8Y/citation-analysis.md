#### 总体总结
SOLOv2 的引文网络围绕三条主要研究线索展开：（1）实例分割方法谱系，从自顶向下的 Mask R-CNN 路线到自底向上的聚类路线，再到 SOLO 的直接分割路线，展示了从框依赖到纯像素级分类的范式演进；（2）动态卷积与自适应特征调制，从 STN、动态滤波器到可变形卷积，再到 CondInst 的并发工作，构成了 SOLOv2 动态核设计的理论支撑；（3）NMS 加速改进，从 Soft-NMS 的衰减思想到 Fast NMS 的并行化尝试，最终催生了 Matrix NMS 的设计。关键参考文献包括 SOLO [1] 作为方法起点、YOLACT [2] 作为速度-精度对比基线、Mask R-CNN [4] 作为经典方法参照、Soft-NMS [21] 作为 Matrix NMS 的核心动机、CondInst [20] 作为并发对比。引文时间跨度从 2014 年的 COCO 数据集到 2020 年的多项并发工作，呈现出从基础架构到专用优化的清晰演进轨迹。


#### 关键文献

- [1] Xinlong Wang, 2020: SOLO: Segmenting objects by locations (Component)

- [2] Daniel Bolya, 2019: YOLACT: Real-time instance segmentation (Baseline)

- [4] Kaiming He, 2017: Girshick (Background)

- [18] Jifeng Dai, 2017: Deformable convolutional networks (Component)

- [21] Zhi Tian, 2020: Conditional convolutions for instance segmentation (Contrast)

- [22] Navaneeth Bodla, 2017: Soft-NMS: improving object detection with one line of code (Component)



#### 范围
- 章节: Introduction + Related Work + Method + Experiments
- 行号: 13-190

#### 按功能归类


##### Component

- [1] Xinlong Wang, 2020
  - 标题: SOLO: Segmenting objects by locations
  - 关键词: direct method, location-based segmentation, predecessor
  - 总结: 原文将 SOLO 作为方法起点，通过动态核+统一特征+Matrix NMS 消除其掩码表示低效、分辨率不足和 NMS 慢的瓶颈。

- [8] Hao Chen, 2020
  - 标题: BlendMask: Top-down meets bottom-up for instance segmentation
  - 关键词: top-down meets bottom-up, BlendMask, concurrent work context
  - 总结: 该工作被用来定位动态卷积在实例分割中的应用背景。

- [11] Zhi Tian, 2019
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: anchor-free, one-stage, FCOS
  - 总结: 该工作被用来说明无框检测器的兴起为纯实例分割提供了新的基础。

- [18] Jifeng Dai, 2017
  - 标题: Deformable convolutional networks
  - 关键词: deformable convolution, dynamic sampling, DCN backbone
  - 总结: 该工作既作为动态卷积的技术背景，也作为 SOLOv2 最佳模型的骨干组件。

- [22] Navaneeth Bodla, 2017
  - 标题: Soft-NMS: improving object detection with one line of code
  - 关键词: soft NMS, score decay, sequential
  - 总结: Soft-NMS 是 Matrix NMS 的核心动机，原文从其衰减思想出发，设计了可并行的矩阵运算替代方案。

- [26] Rosanne Liu, 2018
  - 标题: An intriguing failing of convolutional neural networks and the coordconv solution
  - 关键词: coordinate channels, position awareness, CoordConv
  - 总结: 该工作被用来支撑 SOLOv2 在核分支和特征分支中加入显式坐标输入的设计决策。

- [27] Alexander Kirillov, 2019
  - 标题: Panoptic feature pyramid networks
  - 关键词: panoptic FPN, feature fusion, semantic segmentation
  - 总结: 该工作既为 SOLOv2 统一掩码特征分支提供架构参考，也在全景分割结果中作为主要基线。

- [28] Yuxin Wu, 2018
  - 标题: Group normalization
  - 关键词: group norm, normalization
  - 总结: 该工作被用来支撑 SOLOv2 掩码特征分支的归一化设计选择。

- [29] Tsung-Yi Lin, 2017
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, classification loss, dense detection
  - 总结: 该工作被直接用作 SOLOv2 训练时的分类损失函数。



##### Baseline

- [2] Daniel Bolya, 2019
  - 标题: YOLACT: Real-time instance segmentation
  - 关键词: real-time instance segmentation, anchor-based, comparison baseline
  - 总结: 原文将 YOLACT 作为主要速度-精度对比基线，强调 SOLOv2 在更简单的架构下显著超越其性能。



##### Background

- [3] Yi Li, 2017
  - 标题: Fully convolutional instance-aware semantic segmentation
  - 关键词: top-down, instance-aware, FCIS
  - 总结: 该工作被用来展示自顶向下方法的技术路线，作为方法分类综述的一部分。

- [4] Kaiming He, 2017
  - 标题: Girshick
  - 关键词: top-down, two-stage, Mask R-CNN, comparison baseline
  - 总结: Mask R-CNN 是原文在实验表格中最主要的对比对象之一，用来展示 SOLOv2 在大目标上的优势。

- [5] Shu Liu, 2018
  - 标题: Path aggregation network for instance segmentation
  - 关键词: top-down, path aggregation, PANet
  - 总结: 该工作被列为自顶向下方法谱系中的一环。

- [6] Zhaojin Huang, 2019
  - 标题: Mask scoring R-CNN
  - 关键词: top-down, mask scoring
  - 总结: 该工作被用来展示自顶向下方法的改进路线。

- [7] Xinlei Chen, 2019
  - 标题: TensorMask: A foundation for dense object segmentation
  - 关键词: top-down, dense segmentation, TensorMask
  - 总结: 该工作被列为密集物体分割的代表方法。

- [9] Rufeng Zhang, 2020
  - 标题: Mask encoding for single shot instance segmentation
  - 关键词: top-down, mask encoding
  - 总结: 该工作被列为自顶向下方法谱系中的一环。

- [10] Enze Xie, 2020
  - 标题: PolarMask: Single shot instance segmentation with polar representation
  - 关键词: anchor-free, polar representation
  - 总结: 该工作被用来展示基于无框检测器的实例分割路线。

- [12] Alejandro Newell, 2017
  - 标题: Associative embedding: End-to-end learning for joint detection and grouping
  - 关键词: bottom-up, associative embedding, grouping
  - 总结: 该工作被用来展示自底向上的标签-聚类方法路线。

- [13] Bert De Brabandere, 2017
  - 标题: Semantic instance segmentation with a discriminative loss function
  - 关键词: bottom-up, discriminative loss, clustering
  - 总结: 该工作被用来展示基于像素嵌入聚类的自底向上路线。

- [14] Shu Liu, 2017
  - 标题: Sequential grouping networks for instance segmentation
  - 关键词: bottom-up, sequential grouping
  - 总结: 该工作被用来补充自底向上方法的技术谱系。

- [15] Naiyu Gao, 2019
  - 标题: SSAP: Single-shot instance segmentation with affinity pyramid
  - 关键词: bottom-up, affinity pyramid, SSAP
  - 总结: 该工作在实例分割和全景分割两处都被用作对比方法。

- [16] Max Jaderberg, 2015
  - 标题: Spatial transformer networks
  - 关键词: spatial transformer, adaptive transformation, dynamic scheme
  - 总结: 该工作被用来追溯将动态自适应方案引入卷积网络的思想来源。

- [17] Xu Jia, 2016
  - 标题: Dynamic filter networks
  - 关键词: dynamic filter, sample-specific convolution
  - 总结: 该工作被用来展示动态卷积的思想来源。

- [19] Linjie Yang, 2018
  - 标题: Katsaggelos
  - 关键词: video object segmentation, conditional batch norm, network modulation
  - 总结: 该工作被用来说明条件归一化在实例级特征调制中的应用。

- [20] Konstantin Sofiiuk, 2019
  - 标题: AdaptIS: Adaptive instance selection network
  - 关键词: adaptive instance selection, conditional features, scale-and-shift
  - 总结: 该工作被用来展示与 SOLOv2 不同的条件特征调制路线。

- [23] Songtao Liu, 2019
  - 标题: Adaptive NMS: Refining pedestrian detection in a crowd
  - 关键词: adaptive threshold, pedestrian detection
  - 总结: 该工作被用来说明 NMS 阈值自适应化的研究方向。

- [24] Yihui He, 2019
  - 标题: Bounding box regression with uncertainty for accurate object detection
  - 关键词: uncertainty, KL-divergence, NMS refinement
  - 总结: 该工作被用来展示 NMS 过程中坐标精化的研究方向。

- [25] Lile Cai, 2019
  - 标题: Sabry Aly, and Vijay Chandrasekhar
  - 关键词: maxpool NMS, acceleration
  - 总结: 该工作被列为 NMS 加速方案的代表。

- [30] Liang-Chieh Chen, 2018
  - 标题: Masklab: Instance segmentation by refining object detection with semantic and direction features
  - 关键词: top-down, MaskLab, comparison
  - 总结: 该工作被列为实验对比中的自顶向下方法。

- [31] Yuqing Wang, 2020
  - 标题: Centermask: single shot instance segmentation with point representation
  - 关键词: anchor-free, point representation, CenterMask
  - 总结: 该工作被列为无框实例分割方法谱系中的一环。

- [34] Md Amirul Islam, 2020
  - 标题: B
  - 关键词: position information, CNN encoding, zero-padding
  - 总结: 该工作被用来支撑显式坐标输入带来 1.5% AP 提升的论断。

- [35] Yanwei Li, 2019
  - 标题: Attentionguided unified network for panoptic segmentation
  - 关键词: panoptic segmentation, AUNet
  - 总结: 该工作被列为全景分割对比中的自顶向下方法。

- [36] Yuwen Xiong, 2019
  - 标题: UPSNet: A unified panoptic segmentation network
  - 关键词: unified panoptic, UPSNet
  - 总结: 该工作被列为全景分割对比中的代表性方法。

- [37] Bowen Cheng, 2020
  - 标题: Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation
  - 关键词: panoptic deeplab, bottom-up panoptic
  - 总结: 该工作被列为全景分割对比中的强力自底向下基线。



##### Contrast

- [21] Zhi Tian, 2020
  - 标题: Conditional convolutions for instance segmentation
  - 关键词: conditional convolution, concurrent work, relative vs absolute position
  - 总结: 该工作被用来突出 SOLOv2 用全局绝对位置编码的独特优势，对比 CondInst 需要对每个实例单独编码位置。



##### Dataset

- [32] Tsung-Yi Lin, 2014
  - 标题: Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollár, and C
  - 关键词: COCO, benchmark dataset, evaluation
  - 总结: COCO 是原文所有主要实验的基准数据集。

- [33] Agrim Gupta, 2019
  - 标题: LVIS: A dataset for large vocabulary instance segmentation
  - 关键词: LVIS, long-tail, large vocabulary
  - 总结: 该工作被用来评估 SOLOv2 在更具挑战性的大规模词汇数据集上的泛化能力。





#### 时间线分析

##### 早期
早期基础工作（2014-2017）：奠定实例分割两大技术路线（自顶向下与自底向上），并建立 COCO 基准数据集。此阶段确立了 Mask R-CNN 等两阶段检测+分割范式，以及基于像素嵌入聚类的自底向上方法。


- [3] Yi Li, 2017: Fully convolutional instance-aware semantic segmentation

- [4] Kaiming He, 2017: Girshick

- [5] Shu Liu, 2018: Path aggregation network for instance segmentation

- [6] Zhaojin Huang, 2019: Mask scoring R-CNN

- [7] Xinlei Chen, 2019: TensorMask: A foundation for dense object segmentation

- [12] Alejandro Newell, 2017: Associative embedding: End-to-end learning for joint detection and grouping

- [13] Bert De Brabandere, 2017: Semantic instance segmentation with a discriminative loss function

- [14] Shu Liu, 2017: Sequential grouping networks for instance segmentation

- [16] Max Jaderberg, 2015: Spatial transformer networks

- [17] Xu Jia, 2016: Dynamic filter networks

- [18] Jifeng Dai, 2017: Deformable convolutional networks

- [29] Tsung-Yi Lin, 2017: Focal loss for dense object detection

- [32] Tsung-Yi Lin, 2014: Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollár, and C




##### 中期
中期发展阶段（2018-2019）：实例分割方法快速演进，包括路径聚合、掩码评分、密集分割、实时分割等多样化方向。NMS 改进工作集中于此时期（Soft-NMS、Adaptive NMS、Fast NMS 等）。无框检测器（FCOS）和大规模数据集（LVIS）开始出现。


- [2] Daniel Bolya, 2019: YOLACT: Real-time instance segmentation

- [8] Hao Chen, 2020: BlendMask: Top-down meets bottom-up for instance segmentation

- [9] Rufeng Zhang, 2020: Mask encoding for single shot instance segmentation

- [15] Naiyu Gao, 2019: SSAP: Single-shot instance segmentation with affinity pyramid

- [19] Linjie Yang, 2018: Katsaggelos

- [20] Konstantin Sofiiuk, 2019: AdaptIS: Adaptive instance selection network

- [22] Navaneeth Bodla, 2017: Soft-NMS: improving object detection with one line of code

- [23] Songtao Liu, 2019: Adaptive NMS: Refining pedestrian detection in a crowd

- [24] Yihui He, 2019: Bounding box regression with uncertainty for accurate object detection

- [25] Lile Cai, 2019: Sabry Aly, and Vijay Chandrasekhar

- [26] Rosanne Liu, 2018: An intriguing failing of convolutional neural networks and the coordconv solution

- [27] Alexander Kirillov, 2019: Panoptic feature pyramid networks

- [28] Yuxin Wu, 2018: Group normalization

- [30] Liang-Chieh Chen, 2018: Masklab: Instance segmentation by refining object detection with semantic and direction features

- [31] Yuqing Wang, 2020: Centermask: single shot instance segmentation with point representation

- [33] Agrim Gupta, 2019: LVIS: A dataset for large vocabulary instance segmentation

- [34] Md Amirul Islam, 2020: B

- [35] Yanwei Li, 2019: Attentionguided unified network for panoptic segmentation

- [36] Yuwen Xiong, 2019: UPSNet: A unified panoptic segmentation network




##### 近期
近期前沿工作（2020）：直接实例分割方法（SOLO）和并发工作（CondInst）出现，标志着无框、无聚类的纯像素级分类范式成熟。BlendMask、MEInst、PolarMask 等方法进一步探索了顶-底融合和极坐标表示。


- [1] Xinlong Wang, 2020: SOLO: Segmenting objects by locations

- [10] Enze Xie, 2020: PolarMask: Single shot instance segmentation with polar representation

- [11] Zhi Tian, 2019: FCOS: Fully convolutional one-stage object detection

- [21] Zhi Tian, 2020: Conditional convolutions for instance segmentation

- [37] Bowen Cheng, 2020: Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation
