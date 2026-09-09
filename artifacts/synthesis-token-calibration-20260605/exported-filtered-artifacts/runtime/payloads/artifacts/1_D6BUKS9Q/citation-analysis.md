#### 总体总结
本文在引言和相关工作中先用早期检测与注意力工作铺出技术背景，再把 DETR 开创的端到端检测路线与依赖 NMS 的传统检测范式并置比较，然后围绕 DETR 的后续改进（Deformable-DETR、DAB-DETR、Conditional DETR 等）和辅助查询方案（DN-DETR、DINO-DETR）展开讨论，最后借多种基线方法（PETRv2、PETR、TransTrack）把本文的混合匹配方案扩展到 3D 检测、姿态估计和跟踪等任务。


#### 关键文献

- [5] Nicolas Carion, 2020: End-toend object detection with transformers (Historical)

- [24] Feng Li, 2022: Dn-detr: Accelerate detr training by introducing query denoising (Contrast)

- [25] Feng Li, 2022: Mask dino: Towards a unified transformer-based framework for object detection and segmentation (Contrast)

- [63] Ashish Vaswani, 2017: Attention is all you need (Historical)

- [89] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection (Baseline)



#### 范围
- 章节: Introduction + Related Work + Our Approach + Experiment
- 行号: 12-221

#### 按功能归类


##### Background

- [1] Xuyang Bai, 2022
  - 标题: Transfusion: Robust lidar-camera fusion for 3d object detection with transformers
  - 关键词: lidar-camera融合, 3D检测, Transformer
  - 总结: 本文在介绍DETR方法扩展到3D目标检测任务时，引用该工作作为基于transformer的多模态3D检测路线的代表。

- [2] Guillem Braso, 2021
  - 标题: The ´ center of attention: Center-keypoint grouping via attention for multi-person pose estimation
  - 关键词: 注意力机制, 姿态估计, 关键点检测
  - 总结: 本文在列举DETR扩展至姿态估计任务的相关工作时引用了该方法。

- [4] Xipeng Cao, 2022
  - 标题: Cf-detr: Coarse-to-fine transformers for end-to-end object detection
  - 关键词: coarse-to-fine, Transformer检测器, DETR变体
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [7] Xin Chen, 2021
  - 标题: Transformer tracking
  - 关键词: Transformer, 多目标跟踪, spatio-temporal
  - 总结: 本文在列举DETR扩展至跟踪任务的相关工作时引用了该方法。

- [8] Bowen Cheng, 2021
  - 标题: Mask2former for video instance segmentation
  - 关键词: 视频实例分割, Mask2Former
  - 总结: 本文在列举DETR扩展至分割任务的相关工作时引用了该方法。

- [9] Bowen Cheng, 2021
  - 标题: Maskedattention mask transformer for universal image segmentation
  - 关键词: Mask Transformer, 通用分割, DETR变体
  - 总结: 本文在列举DETR扩展至分割任务的相关工作时引用了该方法。

- [11] Xiyang Dai, 2021
  - 标题: Dynamic detr: End-toend object detection with dynamic attention
  - 关键词: dynamic attention, DETR变体
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [13] Bin Dong, 2021
  - 标题: Solq: Segmenting objects by learning queries. NeurIPS
  - 关键词: 实例分割, 查询学习, DETR变体
  - 总结: 本文在列举DETR扩展至分割任务的相关工作时引用了该方法。

- [14] Yuxin Fang, 2021
  - 标题: Instances as queries
  - 关键词: 实例分割, query-based, DETR变体
  - 总结: 本文在列举DETR扩展至分割任务的相关工作时引用了该方法。

- [15] Peng Gao, 2021
  - 标题: Fast convergence of detr with spatially modulated co-attention
  - 关键词: co-attention, 训练收敛, DETR变体
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [16] Ziteng Gao, 2022
  - 标题: Adamixer: A fast-converging query-based object detector
  - 关键词: 快速收敛, query-based检测器
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [18] Brent A Griffin, 2021
  - 标题: Depth from camera motion and object detection
  - 关键词: 深度估计, 相机运动
  - 总结: 本文在列举DETR扩展至深度估计任务的相关工作时引用了该方法。

- [20] Junjie Huang, 2022
  - 标题: Bevdet4d: Exploit temporal cues in multi-camera 3d object detection
  - 关键词: BEV, 3D检测, 时序线索
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [21] Junjie Huang, 2021
  - 标题: Bevdet: High-performance multi-camera 3d object detection in bird-eye-view
  - 关键词: BEV, 3D检测, 多相机
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [22] Aishwarya Kamath, 2021
  - 标题: Mdetrmodulated detection for end-to-end multi-modal understanding
  - 关键词: 多模态检测, MDETR
  - 总结: 本文在列举DETR扩展至多模态任务的相关工作时引用了该方法。

- [23] Youngwan Lee, 2020
  - 标题: Centermask: Real-time anchor-free instance segmentation
  - 关键词: anchor-free, 实例分割
  - 总结: 本文在讨论实例分割相关背景时引用了该方法。

- [26] Ke Li, 2021
  - 标题: Pose recognition with cascade transformers
  - 关键词: 姿态估计, 级联Transformer
  - 总结: 本文在列举DETR扩展至姿态估计任务的相关工作时引用了该方法。

- [27] Yanghao Li, 2021
  - 标题: Improved multiscale vision transformers for classification and detection
  - 关键词: 多尺度Transformer, 分类检测
  - 总结: 本文在使用Swin-L骨干网络的实验中引用了该改进工作。

- [28] Yanjie Li, 2021
  - 标题: Tokenpose: Learning keypoint tokens for human pose estimation
  - 关键词: keypoint token, 姿态估计
  - 总结: 本文在列举DETR扩展至姿态估计任务的相关工作时引用了该方法。

- [29] Zhenyu Li, 2022
  - 标题: Depthformer: Exploiting long-range correlation and local information for accurate monocular depth estimation
  - 关键词: 深度估计, 长程相关性, Transformer
  - 总结: 本文在列举DETR扩展至深度估计任务的相关工作时引用了该方法。

- [30] Zhiqi Li, 2022
  - 标题: Bevformer: Learning bird’s-eye-view representation from multi-camera images via spatiotemporal transformers
  - 关键词: BEV, 多相机, spatio-temporal
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [31] Zhiqi Li, 2022
  - 标题: Panoptic segformer: Delving deeper into panoptic segmentation with transformers
  - 关键词: 全景分割, Transformer
  - 总结: 本文在列举DETR扩展至全景分割任务的相关工作时引用了该方法。

- [32] Zhenyu Li, 2022
  - 标题: Binsformer: Revisiting adaptive bins for monocular depth estimation
  - 关键词: 深度估计, adaptive bins
  - 总结: 本文在列举DETR扩展相关任务时引用了该方法。

- [33] Tingting Liang, 2022
  - 标题: Cbnet: A composite backbone network architecture for object detection. TIP
  - 关键词: 复合骨干, 目标检测
  - 总结: 本文在系统级比较中引用了该方法作为非DETR类领先方法的代表。

- [34] Tingting Liang, 2022
  - 标题: Bevfusion: A simple and robust lidar-camera fusion framework
  - 关键词: BEV融合, lidar-camera, 3D检测
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [43] Zhuang Liu, 2022
  - 标题: A convnet for the 2020s
  - 关键词: ConvNeXt, 现代CNN
  - 总结: 本文在系统级比较中引用了该方法作为非DETR类领先方法的代表。

- [44] Zhijian Liu, 2022
  - 标题: Bevfusion: Multitask multi-sensor fusion with unified bird’s-eye view representation
  - 关键词: BEV融合, 多传感器
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [45] Ze Liu, 2021
  - 标题: Group-free 3d object detection via transformers
  - 关键词: group-free, 3D检测, Transformer
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [46] Shangbang Long, 2022
  - 标题: Towards endto-end unified scene text detection and layout analysis
  - 关键词: 文本检测, 布局分析
  - 总结: 本文在列举DETR扩展至文本检测任务的相关工作时引用了该方法。

- [47] Qian Lou, 2022
  - 标题: Lite-mdetr: A lightweight multimodal detector
  - 关键词: 轻量MDETR, 多模态检测
  - 总结: 本文在列举DETR扩展至多模态任务的相关工作时引用了该方法。

- [48] Weian Mao, 2021
  - 标题: Tfpose: Direct human pose estimation with transformers
  - 关键词: 姿态估计, Transformer
  - 总结: 本文在列举DETR扩展至姿态估计任务的相关工作时引用了该方法。

- [49] Tim Meinhardt, 2022
  - 标题: Trackformer: Multi-object tracking with transformers
  - 关键词: 多目标跟踪, TrackFormer
  - 总结: 本文在列举DETR扩展至跟踪任务的相关工作时引用了该方法。

- [50] Depu Meng, 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: conditional DETR, 快速收敛
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [52] Ishan Misra, 2021
  - 标题: An endto-end transformer model for 3d object detection
  - 关键词: 3D检测, 端到端Transformer
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [55] Zobeir Raisi, 2021
  - 标题: Transformer-based text detection in the wild
  - 关键词: 文本检测, Transformer
  - 总结: 本文在列举DETR扩展至文本检测任务的相关工作时引用了该方法。

- [56] Zobeir Raisi, 2022
  - 标题: Arbitrary shape text detection using transformers
  - 关键词: 文本检测, 任意形状
  - 总结: 本文在列举DETR扩展至文本检测任务的相关工作时引用了该方法。

- [58] Byungseok Roh, 2021
  - 标题: Sparse detr: Efficient end-to-end object detection with learnable sparsity
  - 关键词: 稀疏DETR, 高效检测
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [60] Lucas Stoffl, 2021
  - 标题: End-toend trainable multi-instance pose estimation with transformers
  - 关键词: 多实例, 姿态估计
  - 总结: 本文在列举DETR扩展至姿态估计任务的相关工作时引用了该方法。

- [64] Huiyu Wang, 2021
  - 标题: Max-deeplab: End-to-end panoptic segmentation with mask transformers
  - 关键词: 全景分割, Mask Transformer
  - 总结: 本文在列举DETR扩展至全景分割任务的相关工作时引用了该方法。

- [66] Wen Wang, 2022
  - 标题: Towards data-efficient detection transformers
  - 关键词: 数据高效, 检测Transformer
  - 总结: 本文在Related Work中将其作为需要NMS的方法与本文避免NMS的方案进行对比。

- [67] Yue Wang, 2022
  - 标题: Detr3d: 3d object detection from multi-view images via 3d-to-2d queries
  - 关键词: 3D检测, 3D-to-2D查询, 多视角
  - 总结: 本文在列举DETR扩展至3D检测任务的相关工作时引用了该方法。

- [68] Yingming Wang, 2021
  - 标题: Anchor detr: Query design for transformer-based detector
  - 关键词: anchor DETR, 查询设计
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [69] Jiannan Wu, 2022
  - 标题: Language as queries for referring video object segmentation
  - 关键词: 视频分割, 语言查询
  - 总结: 本文在列举DETR扩展至视频实例分割任务的相关工作时引用了该方法。

- [70] Junfeng Wu, 2021
  - 标题: Seqformer: a frustratingly simple model for video instance segmentation
  - 关键词: 视频实例分割, 简单模型
  - 总结: 本文在列举DETR扩展至视频实例分割任务的相关工作时引用了该方法。

- [71] Yifan Xu, 2021
  - 标题: Line segment detection using transformers without edges
  - 关键词: 线段检测, Transformer
  - 总结: 本文在列举DETR扩展至线段检测任务的相关工作时引用了该方法。

- [72] Bin Yan, 2021
  - 标题: Learning spatio-temporal transformer for visual tracking
  - 关键词: 视觉跟踪, spatio-temporal
  - 总结: 本文在列举DETR扩展至跟踪任务的相关工作时引用了该方法。

- [73] Chenglin Yang, 2022
  - 标题: Moat: Alternating mobile convolution and attention brings strong vision models
  - 关键词: MOAT, 移动卷积, 注意力
  - 总结: 本文在系统级比较中引用了该方法作为非DETR类领先方法的代表。

- [74] Zhao Yang, 2022
  - 标题: Lavt: Language-aware vision transformer for referring image segmentation
  - 关键词: 语言感知, 视觉Transformer, 分割
  - 总结: 本文在列举DETR扩展相关任务时引用了该方法。

- [75] Qihang Yu, 2022
  - 标题: Cmt-deeplab: Clustering mask transformers for panoptic segmentation
  - 关键词: 全景分割, 聚类Transformer
  - 总结: 本文在列举DETR扩展至全景分割任务的相关工作时引用了该方法。

- [76] Qihang Yu, 2022
  - 标题: Cmt-deeplab: Clustering mask transformers for panoptic segmentation
  - 关键词: 全景分割, 聚类Transformer
  - 总结: 本文在列举DETR扩展至全景分割任务的相关工作时引用了该方法。

- [77] Qihang Yu, 2022
  - 标题: k-means mask transformer
  - 关键词: 实例分割, k-means, Mask Transformer
  - 总结: 本文在列举DETR扩展至分割任务的相关工作时引用了该方法。

- [78] Xiaodong Yu, 2021
  - 标题: Soit: Segmenting objects with instance-aware transformers
  - 关键词: 实例分割, Transformer
  - 总结: 本文在列举DETR扩展至分割任务的相关工作时引用了该方法。

- [80] Fangao Zeng, 2021
  - 标题: Motr: End-to-end multiple-object tracking with transformer
  - 关键词: 端到端跟踪, MOTR
  - 总结: 本文在列举DETR扩展至跟踪任务的相关工作时引用了该方法。

- [81] Gongjie Zhang, 2022
  - 标题: Accelerating DETR convergence via semantic-aligned matching
  - 关键词: 语义对齐, 训练收敛
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [83] Jianfeng Zhang, 2021
  - 标题: Direct multi-view multi-person 3d pose estimation. NeurIPS
  - 关键词: 3D姿态估计, 多视角
  - 总结: 本文在列举DETR扩展至3D姿态估计任务的相关工作时引用了该方法。

- [85] Xiang Zhang, 2022
  - 标题: Text spotting transformers
  - 关键词: 文本识别, Transformer
  - 总结: 本文在列举DETR扩展至文本检测任务的相关工作时引用了该方法。

- [86] Moju Zhao, 2021
  - 标题: Trtr: Visual tracking with transformer
  - 关键词: 视觉跟踪, Transformer
  - 总结: 本文在列举DETR扩展至跟踪任务的相关工作时引用了该方法。



##### Historical

- [5] Nicolas Carion, 2020
  - 标题: End-toend object detection with transformers
  - 关键词: DETR, 端到端检测, Transformer, one-to-one matching
  - 总结: 本文将DETR引用为开创性工作，是整个DETR系列方法的起点，本文的hybrid matching方案直接针对DETR的one-to-one匹配的局限性进行改进。

- [17] Ross Girshick, 2015
  - 标题: Fast r-cnn
  - 关键词: 两阶段检测, R-CNN系列
  - 总结: 本文在回顾目标检测方法发展时引用了该方法，作为DETR之前依赖NMS等手工组件的检测路线的代表。

- [35] Tsung-Yi Lin, 2017
  - 标题: Focal loss for dense object detection
  - 关键词: Focal Loss, 密集检测, one-to-many
  - 总结: 本文在讨论one-to-many标签分配策略的发展时引用了该方法。

- [38] Wei Liu, 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: 单阶段检测, SSD, anchor-based
  - 总结: 本文在回顾目标检测方法发展时引用了该方法，作为DETR之前依赖anchor的检测路线的代表。

- [53] Alexander Neubeck, 2006
  - 标题: Efficient nonmaximum suppression
  - 关键词: NMS, 非极大值抑制
  - 总结: 本文在强调DETR端到端方法无需NMS的优势时引用了该经典NMS实现。

- [57] Shaoqing Ren, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks. NeurIPS
  - 关键词: RPN, 两阶段检测, anchor-based
  - 总结: 本文在讨论标签分配策略的发展时引用了该方法。

- [62] Zhi Tian, 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: FCOS, 全卷积, one-to-many
  - 总结: 本文在讨论one-to-many标签分配策略时引用了该方法。

- [63] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, 自注意力, 开创性工作
  - 总结: 本文将Attention is All You Need引用为Transformer架构的奠基性工作，是DETR系列方法的核心技术来源。

- [79] Yuhui Yuan, 2020
  - 标题: Objectcontextual representations for semantic segmentation
  - 关键词: 语义分割, 对象上下文
  - 总结: 本文在作者列表中引用了该工作（Yuhui Yuan为本文共同作者），作为分割领域相关背景。



##### Contrast

- [6] Qiang Chen, 2022
  - 标题: Group detr: Fast training convergence with decoupled one-to-many label assignment
  - 关键词: one-to-many, 训练加速, 标签分配
  - 总结: 本文在讨论one-to-many匹配相关工作时引用了该方法。

- [24] Feng Li, 2022
  - 标题: Dn-detr: Accelerate detr training by introducing query denoising
  - 关键词: query denoising, 训练加速, DETR变体
  - 总结: 本文将DN-DETR与本文方案进行对比，指出两者都引入辅助查询但目标不同：DN-DETR解决匈牙利匹配不稳定性，本文解决正样本训练不足。

- [25] Feng Li, 2022
  - 标题: Mask dino: Towards a unified transformer-based framework for object detection and segmentation
  - 关键词: DINO, query denoising, 统一框架
  - 总结: 本文将DINO-DETR与本文方案进行对比，指出两者都引入辅助查询但目标不同，并在实验比较中展示了本文方法的优势。

- [37] Shilong Liu, 2022
  - 标题: Dab-detr: Dynamic anchor boxes are better queries for detr
  - 关键词: dynamic anchor, 查询设计, DETR变体
  - 总结: 本文在回顾DETR后续改进工作时引用了该方法。

- [65] Jianfeng Wang, 2021
  - 标题: End-to-end object detection with fully convolutional network
  - 关键词: 全卷积检测, one-to-many分配
  - 总结: 本文在讨论one-to-many分配策略时引用了POTO工作。

- [82] Hao Zhang, 2022
  - 标题: Dino: Detr with improved denoising anchor boxes for end-to-end object detection
  - 关键词: DINO, 去噪锚框, 端到端检测
  - 总结: 本文将DINO-DETR与本文方案进行对比，指出两者都引入辅助查询但目标不同，并在系统级实验中H-Deformable-DETR以59.4% mAP超越了DINO-DETR的58.5%。

- [84] Shifeng Zhang, 2020
  - 标题: Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection
  - 关键词: ATSS, 自适应选择, one-to-many
  - 总结: 本文在讨论标签分配策略时引用了该方法。

- [88] Benjin Zhu, 2020
  - 标题: Autoassign: Differentiable label assignment for dense object detection
  - 关键词: AutoAssign, 可微分分配, 密集检测
  - 总结: 本文在讨论标签分配策略的发展时引用了该方法。



##### Component

- [12] Tri Dao, 2022
  - 标题: Fu, Stefano Ermon, Atri Rudra, and Christopher Re. FlashAttention: Fast and memory-efficient ´ exact attention with IO-awareness
  - 关键词: FlashAttention, 高效注意力, 显存优化
  - 总结: 本文在讨论如何通过优化注意力实现来降低混合匹配方案的GPU显存开销时引用了该方法。

- [41] Ze Liu, 2022
  - 标题: Swin transformer v2: Scaling up capacity and resolution
  - 关键词: SwinV2, 序列注意力, 显存优化
  - 总结: 本文在讨论如何通过优化注意力实现来降低混合匹配方案的GPU显存开销时引用了该方法。

- [42] Ze Liu, 2021
  - 标题: Swin transformer: Hierarchical vision transformer using shifted windows
  - 关键词: Swin Transformer, 分层视觉, 骨干网络
  - 总结: 本文在实验中使用Swin-L作为骨干网络，并在系统级比较中引用了该工作。

- [54] Kemal Oksuz, 2021
  - 标题: One metric to measure them all: Localisation recall precision (lrp) for evaluating visual detection tasks. TPAMI
  - 关键词: oLRP, 评估指标, 定位精度
  - 总结: 本文在实验分析中使用oLRP指标来评估混合匹配对定位误差和假阴性率的改善效果。



##### Baseline

- [39] Yingfei Liu, 2022
  - 标题: Petr: Position embedding transformation for multi-view 3d object detection
  - 关键词: 位置嵌入, 3D检测, 多视角
  - 总结: 本文将PETR作为3D姿态估计任务的基线方法，并在实验中验证了混合匹配对其的提升效果。

- [40] Yingfei Liu, 2022
  - 标题: Petrv2: A unified framework for 3d perception from multi-camera images
  - 关键词: 3D感知, 多相机, 统一框架
  - 总结: 本文将PETRv2作为3D目标检测任务的基线方法，实验中H-PETRv2在其基础上取得了显著的性能提升。

- [59] Dahu Shi, 2022
  - 标题: End-to-end multi-person pose estimation with transformers
  - 关键词: 姿态估计, Transformer, 多人
  - 总结: 本文将PETR作为多人姿态估计任务的基线方法，实验中H-PETR在其基础上取得了+1.6% AP的提升。

- [61] Peize Sun, 2020
  - 标题: Transtrack: Multiple object tracking with transformer
  - 关键词: 多目标跟踪, Transformer
  - 总结: 本文将TransTrack作为多目标跟踪任务的基线方法，实验中H-TransTrack在其基础上取得了+1.6% MOTA的提升。

- [89] Xizhou Zhu, 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, 多尺度可变形注意力, 端到端检测
  - 总结: 本文将Deformable-DETR作为主要的基线方法，实验中H-Deformable-DETR在其基础上取得了+1.7% mAP的提升，并达到了59.4%的SOTA精度。
