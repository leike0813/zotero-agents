#### 总体总结
在 Introduction 与 Related Works 中，原文先以 FCN [30] 为界说明深度语义分割长期被逐像素分类范式主导，再回溯 O2P [5]、SDS [20]、Normalized Cuts [36]、Selective Search [40] 等区域/分组式工作，证明 mask classification 并不是异质的新设定，而是曾经有效、后来被主流像素分类路线遮蔽的分割表达。随后，原文把 DeepLab、PSPNet、OCR/OCNet、CCNet、Non-local、Segmenter、SETR 等现代 per-pixel 方法归为在特征图上聚合上下文的改良路线，并与 Mask R-CNN、Panoptic Segmentation、CondInst、SOLOv2、MaX-DeepLab 等动态 mask/实例/全景分割路线并置。最后，原文借 DETR [4] 与 Transformer [41] 把 MaskFormer 的集合预测、Transformer decoder 和直接 mask prediction 组织成一条现代统一路线：不是只换 backbone，而是把语义级和实例级分割都重新表述为 class-mask set prediction。数据集引用则服务于论证的外部边界，说明该路线会在 ADE20K、COCO-Stuff、Cityscapes、Mapillary Vistas、COCO/ADE20K panoptic 等不同类别规模和任务粒度上接受检验。


#### 关键文献

- [30] Jonathan Long, 2015: Fully convolutional networks for semantic segmentation (Historical)

- [5] Joao Carreira, 2012: Semantic segmentation with second-order pooling (Historical)

- [20] Bharath Hariharan, 2014: Simultaneous detection and segmentation (Historical)

- [4] Nicolas Carion, 2020: End-to-end object detection with transformers (Component)

- [41] Ashish Vaswani, 2017: Attention is all you need (Component)

- [24] Alexander Kirillov, 2019: Panoptic segmentation (Dataset)

- [42] Huiyu Wang, 2021: MaX-DeepLab: End-to-end panoptic segmentation with mask transformers (Baseline)

- [55] Bolei Zhou, 2017: Scene parsing through ADE20K dataset (Dataset)



#### 范围
- 章节: Introduction + Related Works
- 行号: 11-35

#### 按功能归类


##### Historical

- [2] Pablo Arbeláez, 2014
  - 标题: Multiscale combinatorial grouping
  - 关键词: grouping, region proposal, mask classification
  - 总结: 该工作被原文用来回溯 mask classification 在语义分割中的早期区域生成背景，说明本文路线并非从逐像素分类自然延伸，而是重新激活区域/分组式思路。

- [5] Joao Carreira, 2012
  - 标题: Semantic segmentation with second-order pooling
  - 关键词: O2P, semantic segmentation, pre-FCN
  - 总结: 该工作被用作历史证据，支持作者的核心判断：mask classification 原本就能表达语义分割，只是后来被 FCN 式逐像素分类主流遮蔽。

- [6] Joao Carreira, 2011
  - 标题: CPMC: Automatic object segmentation using constrained parametric min-cuts
  - 关键词: CPMC, object segmentation, grouping
  - 总结: 该引用帮助原文搭建从早期区域生成到后续 mask classification 的技术谱系，用来说明区域级分割思想早于现代端到端模型。

- [13] Dorin Comaniciu, 1997
  - 标题: Robust Analysis of Feature Spaces: Color Image Segmentation
  - 关键词: feature space, image segmentation, early grouping
  - 总结: 该引用用于回溯区域划分式图像分割的早期传统，帮助原文把 mask classification 放进更长的分割技术谱系。

- [16] Jifeng Dai, 2015
  - 标题: Convolutional feature masking for joint object and stuff segmentation
  - 关键词: object and stuff, feature masking, region segmentation
  - 总结: 该引用说明早期方法已经尝试通过区域或 mask 处理 object 与 stuff，支撑作者关于 mask classification 适合统一分割任务的论证。

- [20] Bharath Hariharan, 2014
  - 标题: Simultaneous detection and segmentation
  - 关键词: SDS, instance segmentation, mask classification
  - 总结: 该工作是当前综述中的关键历史证据之一；原文借它说明 mask classification 不仅适合实例级分割，也曾能支撑语义分割强结果。

- [25] Scott Konishi, 2000
  - 标题: Statistical Cues for Domain Specific Image Segmentation with Performance Analysis
  - 关键词: Bayesian classifier, local statistics, per-pixel
  - 总结: 该文献被用来说明逐像素分类并非只来自深度学习时代，而是语义分割中更早就存在的一条方法传统。

- [30] Jonathan Long, 2015
  - 标题: Fully convolutional networks for semantic segmentation
  - 关键词: FCN, per-pixel classification, semantic segmentation
  - 总结: 该工作是原文论证的关键历史转折点；作者用 FCN 标定逐像素分类成为主导范式的起点，并以此引出本文对该范式的挑战。

- [36] Jianbo Shi, 2000
  - 标题: Normalized Cuts and Image Segmentation
  - 关键词: normalized cuts, graph segmentation, grouping
  - 总结: 该引用用于说明图划分和 grouping 思想是 mask classification 的重要前史，帮助原文把本文路线与更早的区域分割传统相连。

- [40] Jasper RR Uijlings, 2013
  - 标题: Selective search for object recognition
  - 关键词: selective search, object proposal, grouping
  - 总结: 该引用帮助原文说明区域候选和 grouping 传统与 mask classification 有联系，支撑其从区域整体而非像素独立分类理解分割的论证。



##### Dataset

- [3] Holger Caesar, 2018
  - 标题: COCO-Stuff: Thing and stuff classes in context
  - 关键词: COCO-Stuff, semantic segmentation, dataset
  - 总结: 该文献在当前范围中作为实验基准来源出现，原文用它支撑 MaskFormer 在多类别 semantic segmentation 数据集上的评测覆盖。

- [15] Marius Cordts, 2016
  - 标题: The Cityscapes dataset for semantic urban scene understanding
  - 关键词: Cityscapes, urban scenes, dataset
  - 总结: 该工作作为语义分割评测基准被引用，原文借它说明实验覆盖类别数较少但标准化程度高的城市街景数据集。

- [18] Mark Everingham, 2015
  - 标题: The PASCAL visual object classes challenge: A retrospective
  - 关键词: PASCAL VOC, benchmark, segmentation
  - 总结: 该引用主要承担背景性基准说明，帮助原文交代 semantic segmentation 领域长期使用的评测与任务脉络。

- [24] Alexander Kirillov, 2019
  - 标题: Panoptic segmentation
  - 关键词: panoptic segmentation, COCO, evaluation
  - 总结: 该工作用于定义并支撑全景分割评测语境，原文借它把 MaskFormer 的适用范围从语义分割扩展到同时包含 things/stuff 的 panoptic 设置。

- [28] Tsung-Yi Lin, 2014
  - 标题: Microsoft COCO: Common objects in context
  - 关键词: COCO, panoptic segmentation, dataset
  - 总结: 该工作作为 COCO 数据集来源出现，支撑原文对 MaskFormer 在实例级/全景级任务上的实验验证。

- [34] Gerhard Neuhold, 2017
  - 标题: The mapillary vistas dataset for semantic understanding of street scenes
  - 关键词: Mapillary Vistas, street scenes, dataset
  - 总结: 该文献作为数据集来源出现，原文用它证明 MaskFormer 不只在 ADE20K/COCO 类数据上验证，也覆盖高分辨率街景语义理解。

- [55] Bolei Zhou, 2017
  - 标题: Scene parsing through ADE20K dataset
  - 关键词: ADE20K, scene parsing, dataset
  - 总结: 该工作是当前论文最重要的数据集来源之一；原文用它支撑 150 类、847 类和 panoptic 设置中的大类别数评测，从而验证 mask classification 的可扩展性。



##### Component

- [4] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, set prediction, transformer decoder
  - 总结: 该工作是当前综述范围的关键连接点；原文借 DETR 的集合预测机制解释 MaskFormer 的训练/匹配思想，同时用 DETR 作为 box-based 复杂基线来凸显直接预测 masks 的简化。

- [41] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, decoder, attention
  - 总结: 该工作被原文用于支撑 MaskFormer 中 Transformer decoder 的架构来源，同时也标记 attention/Transformer 已成为分割模型聚合全局信息的重要组件。



##### Baseline

- [7] Liang-Chieh Chen, 2018
  - 标题: DeepLab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs
  - 关键词: DeepLab, ASPP, per-pixel classification
  - 总结: 该工作被原文归入 per-pixel classification 主流基线，用来界定 MaskFormer 要替代的 dominant paradigm。

- [8] Liang-Chieh Chen, 2017
  - 标题: Rethinking atrous convolution for semantic image segmentation
  - 关键词: atrous convolution, semantic segmentation, context
  - 总结: 该文献作为逐像素范式下的代表性改良出现，原文借它说明已有方法主要优化像素级分类模型内部的上下文建模。

- [9] Liang-Chieh Chen, 2018
  - 标题: Encoder-decoder with atrous separable convolution for semantic image segmentation
  - 关键词: DeepLabV3+, encoder-decoder, semantic segmentation
  - 总结: 该工作被原文用来铺设当前强语义分割基线背景，说明 MaskFormer 不是只和早期方法比较，而是挑战成熟 per-pixel 架构。

- [19] Jun Fu, 2019
  - 标题: Dual attention network for scene segmentation
  - 关键词: dual attention, scene segmentation, context aggregation
  - 总结: 该文献被用来说明逐像素分类路线中的 attention/context 模块改良方向，从而衬托本文转向 mask classification 的不同切入点。

- [21] Kaiming He, 2017
  - 标题: Mask R-CNN
  - 关键词: Mask R-CNN, instance segmentation, dynamic predictions
  - 总结: 该工作用于界定实例分割中的主流 mask-based 范式，原文借它说明动态输出需求使 per-pixel static outputs 不自然。

- [23] Zilong Huang, 2019
  - 标题: CCNet: Criss-cross attention for semantic segmentation
  - 关键词: CCNet, attention, context aggregation
  - 总结: 该引用属于逐像素路线的上下文聚合代表，原文用它说明主流改进集中在特征图上的 long-range context，而不是输出表示范式。

- [37] Robin Strudel, 2021
  - 标题: Segmenter: Transformer for semantic segmentation
  - 关键词: Segmenter, transformer, semantic segmentation
  - 总结: 该文献用于避免把本文贡献简化为“使用 Transformer”；原文通过它说明 Transformer 已进入语义分割，MaskFormer 的区别在于 mask classification 输出范式。

- [39] Zhi Tian, 2020
  - 标题: Conditional convolutions for instance segmentation
  - 关键词: CondInst, instance segmentation, dynamic convolution
  - 总结: 该工作作为实例分割路线代表，原文借它说明 mask classification 在实例级任务中已很自然，但语义级任务仍被逐像素范式主导。

- [42] Huiyu Wang, 2021
  - 标题: MaX-DeepLab: End-to-end panoptic segmentation with mask transformers
  - 关键词: MaX-DeepLab, mask transformer, panoptic segmentation
  - 总结: 该工作被用来定位 MaskFormer 与最新 mask transformer/panoptic segmentation 路线的关系，原文借它说明本文将与强近期方法竞争。

- [43] Xiaolong Wang, 2018
  - 标题: Non-local neural networks
  - 关键词: non-local, long-range context, attention
  - 总结: 该文献被用作逐像素路线中上下文建模改良的代表，原文通过它说明主流路线仍保留像素级分类输出。

- [44] Xinlong Wang, 2020
  - 标题: SOLOv2: Dynamic and fast instance segmentation
  - 关键词: SOLOv2, instance segmentation, dynamic masks
  - 总结: 该引用支持原文对实例分割领域的概括：动态数量预测使 mask classification 成为自然选择，而本文要把这种范式推广回语义分割。

- [51] Yuhui Yuan, 2021
  - 标题: OCNet: Object context for semantic segmentation
  - 关键词: object context, OCRNet, per-pixel
  - 总结: 该文献用于界定强逐像素语义分割基线，原文借它说明已有方法主要在特征聚合上改进，而非改变输出表示。

- [52] Hengshuang Zhao, 2017
  - 标题: Pyramid scene parsing network
  - 关键词: PSPNet, pyramid pooling, semantic segmentation
  - 总结: 该工作被原文用于代表成熟 per-pixel segmentation 范式，帮助说明 MaskFormer 的挑战对象是强上下文聚合模型而不是弱基线。

- [53] Sixiao Zheng, 2021
  - 标题: Rethinking semantic segmentation from a sequence-to-sequence perspective with transformers
  - 关键词: sequence-to-sequence, transformer, semantic segmentation
  - 总结: 该文献与本文同处重新表述语义分割问题的近期背景中；原文借它说明领域已出现 Transformer/序列化趋势，但 MaskFormer强调 mask classification。



##### Background

- [17] Alexey Dosovitskiy, 2021
  - 标题: An image is worth 16x16 words: Transformers for image recognition at scale
  - 关键词: vision transformer, backbone, semantic segmentation
  - 总结: 该文献用于说明 per-pixel 语义分割模型的 backbone 正从 CNN 扩展到 Transformer，衬托 MaskFormer 的创新不只是使用 Transformer，而是改变输出范式。

- [29] Ze Liu, 2021
  - 标题: Swin transformer: Hierarchical vision transformer using shifted windows
  - 关键词: Swin Transformer, backbone, ADE20K
  - 总结: 该引用用于说明 MaskFormer 可与强 Transformer backbone 结合；原文借它解释最佳结果的 backbone 条件，而非把全部贡献归于新范式。
