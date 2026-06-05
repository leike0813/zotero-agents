#### 总体总结
本文的引文组织方式呈现清晰的技术演进脉络：首先用早期深度学习基础工作（ImageNet、ResNet、FCN、Faster R-CNN 等）铺出视觉任务建模的技术背景；然后把 Mask R-CNN 及其改进路线（FPN、Focal Loss、Mask Scoring、Path Aggregation 等）并置为当前实例分割的主流两阶段范式；最后借 FCOS 无锚框检测器、CondConv 条件卷积、动态滤波器网络以及 YOLACT、BlendMask、SOLO 等单阶段实例分割新方法，把 CondInst 的条件卷积实例感知路线明确定位为对 ROI 依赖的根本性替代方案。整体引文策略是先用背景文献确立问题空间，再用基线方法凸显 ROI 范式的局限，最后用 contemporaries 收束到本文的创新点。


#### 关键文献

- [4] Bolya, D., 2019: YOLACT: real-time instance segmentation (Baseline)

- [9] Chen, X., 2019: Tensormask: A foundation for dense object segmentation (Baseline)

- [14] He, K., 2017: Mask R-CNN (Baseline)

- [20] Jia, X., 2016: Dynamic filter networks (Historical)

- [37] Tian, Z., 2019: FCOS: Fully convolutional one-stage object detection (Component)

- [41] Yang, B., 2019: Condconv: Conditionally parameterized convolutions for efficient inference (Component)



#### 范围
- 章节: Introduction + Related Work + Methods + Experiments
- 行号: 11-164

#### 按功能归类


##### Tooling

- [1] A. Paszke et al., 2019
  - 标题: PyTorch: An imperative style, high-performance deep learning library
  - 关键词: framework, implementation, tooling
  - 总结: 原文使用该工具/框架实现了 CondInst 的训练与推理流程。



##### Background

- [2] Bian, J.W., 2020
  - 标题: Unsupervised depth learning in challenging indoor video: Weak rectification to rescue. arXiv preprint arXiv:2006.02708
  - 关键词: 单目深度估计, computer vision, deep learning
  - 总结: 该工作被用来提供单目深度估计领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [3] Bian, J., 2019
  - 标题: Unsupervised scale-consistent depth and ego-motion learning from monocular video
  - 关键词: 尺度一致深度估计, computer vision, deep learning
  - 总结: 该工作被用来提供尺度一致深度估计领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [5] Boominathan, L., 2016
  - 标题: Crowdnet: A deep convolutional network for dense crowd counting
  - 关键词: 人群计数, computer vision, deep learning
  - 总结: 该工作被用来提供人群计数领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [8] Chen, L.C., 2017
  - 标题: Deeplab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs
  - 关键词: DeepLab, computer vision, deep learning
  - 总结: 该工作被用来提供DeepLab 语义分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [12] Fathi, A., 2017
  - 标题: Semantic instance segmentation via deep metric learning. arXiv: Comp. Res. Repository
  - 关键词: 深度度量学习实例分割, computer vision, deep learning
  - 总结: 该工作被用来提供深度度量学习实例分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [13] He, K., 2019
  - 标题: Rethinking imagenet pre-training
  - 关键词: ImageNet, computer vision, deep learning
  - 总结: 该工作被用来提供ImageNet 预训练重新思考领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [15] He, K., 2015
  - 标题: Spatial pyramid pooling in deep convolutional networks for visual recognition
  - 关键词: 空间金字塔池化, computer vision, deep learning
  - 总结: 该工作被用来提供空间金字塔池化领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [17] He, T., 2019
  - 标题: Knowledge adaptation for efficient semantic segmentation
  - 关键词: 知识蒸馏语义分割, computer vision, deep learning
  - 总结: 该工作被用来提供知识蒸馏语义分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [19] Ioffe, S., 2015
  - 标题: Batch normalization: Accelerating deep network training by reducing internal covariate shift. arXiv preprint arXiv:1502.03167
  - 关键词: 批归一化, computer vision, deep learning
  - 总结: 该工作被用来提供批归一化领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [21] Lin, T.Y., 2017
  - 标题: Feature pyramid networks for object detection
  - 关键词: 深度估计神经场, computer vision, deep learning
  - 总结: 该工作被用来提供深度估计神经场领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [22] Lin, T.Y., 2017
  - 标题: Focal loss for dense object detection
  - 关键词: 路径聚合网络, computer vision, deep learning
  - 总结: 该工作被用来提供路径聚合网络领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [24] Liu, F., 2016
  - 标题: Learning depth from single monocular images using deep convolutional neural fields
  - 关键词: 结构化知识蒸馏, computer vision, deep learning
  - 总结: 该工作被用来提供结构化知识蒸馏领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [25] Liu, S., 2018
  - 标题: Path aggregation network for instance segmentation
  - 关键词: 全卷积医学图像分割, computer vision, deep learning
  - 总结: 该工作被用来提供全卷积医学图像分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [26] Liu, Y., 2020
  - 标题: Structured knowledge distillation for dense prediction
  - 关键词: 空间嵌入聚类实例分割, computer vision, deep learning
  - 总结: 该工作被用来提供空间嵌入聚类实例分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [27] Long, J., 2015
  - 标题: Fully convolutional networks for semantic segmentation
  - 关键词: 全卷积网络语义分割, computer vision, deep learning
  - 总结: 该工作被用来提供全卷积网络语义分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [28] M. Abadi et al., 2016
  - 标题: TensorFlow: A system for large-scale machine learning
  - 关键词: 半卷积实例分割, computer vision, deep learning
  - 总结: 该工作被用来提供半卷积实例分割领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [29] Milletari, F., 2016
  - 标题: V-net: Fully convolutional neural networks for volumetric medical image segmentation
  - 关键词: FiLM, computer vision, deep learning
  - 总结: 该工作被用来提供FiLM 条件归一化领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [30] Neven, D., 2019
  - 标题: Instance segmentation by jointly optimizing spatial embeddings and clustering bandwidth
  - 关键词: Dice, computer vision, deep learning
  - 总结: 该工作被用来提供Dice 损失函数领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [32] Novotny, D., 2018
  - 标题: Semi-convolutional operators for instance segmentation
  - 关键词: 数据依赖特征聚合, computer vision, deep learning
  - 总结: 该工作被用来提供数据依赖特征聚合领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [36] Tian, Z., 2019
  - 标题: Decoders matter for semantic segmentation: Data-dependent decoding enables flexible feature aggregation
  - 关键词: 虚拟法线深度约束, computer vision, deep learning
  - 总结: 该工作被用来提供虚拟法线深度约束领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [38] Wang, X., 2019
  - 标题: SOLO: Segmenting objects by locations. arXiv: Comp. Res. Repository
  - 关键词: DiverseDepth, computer vision, deep learning
  - 总结: 该工作被用来提供DiverseDepth 深度预测领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [42] Yin, W., 2019
  - 标题: Enforcing geometric constraints of virtual normal for depth prediction
  - 关键词: CenterNet, computer vision, deep learning
  - 总结: 该工作被用来提供CenterNet 对象检测领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [43] Yin, W., 2020
  - 标题: Diversedepth: Affine-invariant depth prediction using diverse data. arXiv preprint arXiv:2002.00569
  - 关键词: 单目深度估计, computer vision, deep learning
  - 总结: 该工作被用来提供单目深度估计领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。

- [45] Zhou, X., 2019
  - 标题: Objects as points. arXiv: Comp. Res. Repository
  - 关键词: CenterNet, computer vision, deep learning
  - 总结: 该工作被用来提供CenterNet 无锚框检测领域的研究背景，帮助读者理解 CondInst 所处的技术环境与相关挑战。



##### Baseline

- [4] Bolya, D., 2019
  - 标题: YOLACT: real-time instance segmentation
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [6] Chen, H., 2020
  - 标题: Blendmask: Top-down meets bottom-up for instance segmentation
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [7] Chen, K., 2019
  - 标题: Hybrid task cascade for instance segmentation
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [9] Chen, X., 2019
  - 标题: Tensormask: A foundation for dense object segmentation
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [14] He, K., 2017
  - 标题: Mask R-CNN
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [18] Huang, Z., 2019
  - 标题: Mask scoring r-cnn
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [31] Newell, A., 2017
  - 标题: Associative embedding: End-to-end learning for joint detection and grouping
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [35] Sofiiuk, K., 2019
  - 标题: Adaptis: Adaptive instance selection network
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [39] Wu, Y., 2019
  - 标题: Detectron2. https:// github.com/facebookresearch/detectron2
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。

- [44] Ying, H., 2019
  - 标题: Embedmask: Embedding coupling for one-stage instance segmentation. arXiv preprint arXiv:1912.01954
  - 关键词: baseline comparison, instance segmentation, performance benchmark
  - 总结: 该工作在实验部分被用作主要对比基线，原文通过与它的定量比较（AP、推理速度等）来证明 CondInst 的优越性。



##### Historical

- [10] Dai, J., 2016
  - 标题: Instance-sensitive fully convolutional networks
  - 关键词: historical lineage, 实例敏感全卷积网络, technical foundation
  - 总结: 该工作被用来追溯实例敏感全卷积网络的技术发展起点，为 CondInst 的方法创新提供历史参照。

- [20] Jia, X., 2016
  - 标题: Dynamic filter networks
  - 关键词: historical lineage, 动态滤波器网络, technical foundation
  - 总结: 该工作被用来追溯动态滤波器网络的技术发展起点，为 CondInst 的方法创新提供历史参照。



##### Dataset

- [11] Deng, J., 2009
  - 标题: Imagenet: A large-scale hierarchical image database
  - 关键词: dataset, experimental setup, benchmark
  - 总结: 该工作提供的数据集或预训练权重被用于 CondInst 的训练与评估实验。

- [23] Lin, T.Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: dataset, experimental setup, benchmark
  - 总结: 该工作提供的数据集或预训练权重被用于 CondInst 的训练与评估实验。

- [33] Perez, E., 2018
  - 标题: Film: Visual reasoning with a general conditioning layer
  - 关键词: dataset, experimental setup, benchmark
  - 总结: 该工作提供的数据集或预训练权重被用于 CondInst 的训练与评估实验。



##### Component

- [16] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: core component, ResNet, architecture
  - 总结: 该工作提供的ResNet 骨干网络是 CondInst 架构的关键组成部分，原文在其基础上进行了扩展或改进。

- [34] Ren, S., 2015
  - 标题: Faster R-CNN: Towards real-time object detection with region proposal networks
  - 关键词: core component, FPN, architecture
  - 总结: 该工作提供的FPN 特征金字塔是 CondInst 架构的关键组成部分，原文在其基础上进行了扩展或改进。

- [37] Tian, Z., 2019
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: core component, FCOS, architecture
  - 总结: 该工作提供的FCOS 单阶段检测器是 CondInst 架构的关键组成部分，原文在其基础上进行了扩展或改进。

- [40] Xie, E., 2020
  - 标题: PolarMask: Single shot instance segmentation with polar representation
  - 关键词: core component, Detectron2, architecture
  - 总结: 该工作提供的Detectron2 框架是 CondInst 架构的关键组成部分，原文在其基础上进行了扩展或改进。

- [41] Yang, B., 2019
  - 标题: Condconv: Conditionally parameterized convolutions for efficient inference
  - 关键词: core component, 条件卷积/CondConv, architecture
  - 总结: 该工作提供的条件卷积/CondConv是 CondInst 架构的关键组成部分，原文在其基础上进行了扩展或改进。





#### 时间线分析

##### 早期
早期工作奠定了深度学习视觉任务的基础建模思想，包括 ImageNet 大规模数据集、ResNet 残差骨干网络、Faster R-CNN 两阶段检测框架、FCN 全卷积语义分割、空间金字塔池化等核心技术。这些工作为后续实例分割方法提供了基础架构与训练范式。


- [1] A. Paszke et al., 2019: PyTorch: An imperative style, high-performance deep learning library

- [11] Deng, J., 2009: Imagenet: A large-scale hierarchical image database

- [15] He, K., 2015: Spatial pyramid pooling in deep convolutional networks for visual recognition

- [16] He, K., 2016: Deep residual learning for image recognition

- [19] Ioffe, S., 2015: Batch normalization: Accelerating deep network training by reducing internal covariate shift. arXiv preprint arXiv:1502.03167

- [23] Lin, T.Y., 2014: Microsoft coco: Common objects in context

- [25] Liu, S., 2018: Path aggregation network for instance segmentation

- [27] Long, J., 2015: Fully convolutional networks for semantic segmentation

- [29] Milletari, F., 2016: V-net: Fully convolutional neural networks for volumetric medical image segmentation

- [30] Neven, D., 2019: Instance segmentation by jointly optimizing spatial embeddings and clustering bandwidth

- [33] Perez, E., 2018: Film: Visual reasoning with a general conditioning layer




##### 中期
中期工作将深度学习推向更成熟的检测与分割路线，以 Mask R-CNN 为代表的两阶段实例分割框架成为主流基准，同时 FPN 特征金字塔、Focal Loss 密集检测、DeepLab 语义分割、路径聚合网络等进一步丰富了多尺度特征表达与密集预测能力。


- [8] Chen, L.C., 2017: Deeplab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs

- [13] He, K., 2019: Rethinking imagenet pre-training

- [14] He, K., 2017: Mask R-CNN

- [17] He, T., 2019: Knowledge adaptation for efficient semantic segmentation

- [18] Huang, Z., 2019: Mask scoring r-cnn

- [21] Lin, T.Y., 2017: Feature pyramid networks for object detection

- [22] Lin, T.Y., 2017: Focal loss for dense object detection

- [24] Liu, F., 2016: Learning depth from single monocular images using deep convolutional neural fields

- [26] Liu, Y., 2020: Structured knowledge distillation for dense prediction

- [28] M. Abadi et al., 2016: TensorFlow: A system for large-scale machine learning

- [34] Ren, S., 2015: Faster R-CNN: Towards real-time object detection with region proposal networks

- [35] Sofiiuk, K., 2019: Adaptis: Adaptive instance selection network

- [37] Tian, Z., 2019: FCOS: Fully convolutional one-stage object detection




##### 近期
近期工作直接收束到 CondInst 所处的方法脉络：一方面 YOLACT、BlendMask、SOLO、PolarMask、EmbedMask 等单阶段实例分割方法尝试解耦 ROI 检测与掩码预测；另一方面 FCOS 无锚框检测器、CondConv 条件卷积、动态滤波器网络为 CondInst 的动态实例感知掩码头提供了直接技术基础。TensorMask、AdaptIS 等工作则探索了密集分割与条件归一化的替代路线。


- [2] Bian, J.W., 2020: Unsupervised depth learning in challenging indoor video: Weak rectification to rescue. arXiv preprint arXiv:2006.02708

- [3] Bian, J., 2019: Unsupervised scale-consistent depth and ego-motion learning from monocular video

- [4] Bolya, D., 2019: YOLACT: real-time instance segmentation

- [5] Boominathan, L., 2016: Crowdnet: A deep convolutional network for dense crowd counting

- [6] Chen, H., 2020: Blendmask: Top-down meets bottom-up for instance segmentation

- [7] Chen, K., 2019: Hybrid task cascade for instance segmentation

- [9] Chen, X., 2019: Tensormask: A foundation for dense object segmentation

- [10] Dai, J., 2016: Instance-sensitive fully convolutional networks

- [12] Fathi, A., 2017: Semantic instance segmentation via deep metric learning. arXiv: Comp. Res. Repository

- [20] Jia, X., 2016: Dynamic filter networks

- [31] Newell, A., 2017: Associative embedding: End-to-end learning for joint detection and grouping

- [32] Novotny, D., 2018: Semi-convolutional operators for instance segmentation

- [36] Tian, Z., 2019: Decoders matter for semantic segmentation: Data-dependent decoding enables flexible feature aggregation

- [38] Wang, X., 2019: SOLO: Segmenting objects by locations. arXiv: Comp. Res. Repository

- [39] Wu, Y., 2019: Detectron2. https:// github.com/facebookresearch/detectron2

- [40] Xie, E., 2020: PolarMask: Single shot instance segmentation with polar representation

- [41] Yang, B., 2019: Condconv: Conditionally parameterized convolutions for efficient inference

- [42] Yin, W., 2019: Enforcing geometric constraints of virtual normal for depth prediction

- [43] Yin, W., 2020: Diversedepth: Affine-invariant depth prediction using diverse data. arXiv preprint arXiv:2002.00569

- [44] Ying, H., 2019: Embedmask: Embedding coupling for one-stage instance segmentation. arXiv preprint arXiv:1912.01954

- [45] Zhou, X., 2019: Objects as points. arXiv: Comp. Res. Repository
