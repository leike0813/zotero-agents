#### 总体总结
本文在引言与相关工作中组织引文的方式呈现出清晰的三层叙述结构：首先用 FCN、Mask R-CNN、DETR 和 Transformer 等早期基础性工作铺出三大分割任务各自的技术起点，再将语义分割的上下文建模（DeepLab、PSPNet、Non-local 等）、实例分割的动态掩码生成（SOLOv2、CondInst 等）和全景分割的组合式架构（UPSNet、PFPN、MaX-DeepLab 等）并置展示，说明各任务在专用路线上已高度成熟，最后借 MaskFormer、K-Net 等近期通用架构先驱的局限性，引出本文 Mask2Former 的核心论点：单一架构可以在所有分割任务上超越专用方案。


#### 关键文献

- [5] Nicolas Carion, 2020: End-to-end object detection with transformers (Component)

- [14] Bowen Cheng, 2021: Schwing, and Alexander Kirillov (Component)

- [24] Kaiming He, 2017: Mask R-CNN (Component)

- [37] Jonathan Long, 2015: Fully convolutional networks for semantic segmentation (Component)

- [62] Wenwei Zhang, 2021: K-net: Towards unified image segmentation (Component)



#### 范围
- 章节: Introduction + Related Work
- 行号: 13-37

#### 按功能归类


##### Background

- [3] Daniel Bolya, 2019
  - 标题: YOLACT++: Better real-time instance segmentation
  - 关键词: instance segmentation, dynamic kernels, specialized architecture
  - 总结: 原文在相关工作中将其作为实例分割专用方法线的代表引用，用来衬托本文通用架构的优势。

- [4] Zhaowei Cai, 2018
  - 标题: Cascade R-CNN: Delving into high quality object detection
  - 关键词: cascade R-CNN, object detection, bounding box
  - 总结: 原文引用它来展示实例分割架构中提升边框检测精度的技术路线。

- [7] Liang-Chieh Chen, 2018
  - 标题: DeepLab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs
  - 关键词: DeepLab, semantic segmentation, atrous convolution, context
  - 总结: 原文在相关工作中引用 DeepLab 系列来说明语义分割中上下文建模的技术路线。

- [8] Liang-Chieh Chen, 2017
  - 标题: Rethinking atrous convolution for semantic image segmentation
  - 关键词: atrous convolution, DeepLab v3, semantic segmentation
  - 总结: 原文将其作为语义分割上下文模块技术线的一部分引用。

- [10] Liang-Chieh Chen, 2018
  - 标题: Encoder-decoder with atrous separable convolution for semantic image segmentation
  - 关键词: DeepLab v3+, encoder-decoder, semantic segmentation
  - 总结: 原文将其作为 FCN 专用架构家族中的代表性工作引用，展示语义分割方法的技术多样性。

- [11] Bowen Cheng, 2020
  - 标题: Panoptic-DeepLab: A simple, strong, and fast baseline for bottom-up panoptic segmentation
  - 关键词: Panoptic-DeepLab, panoptic segmentation, bottom-up
  - 总结: 原文将其作为全景分割中组合专用架构方案的代表之一引用。

- [21] Jun Fu, 2019
  - 标题: Dual attention network for scene segmentation
  - 关键词: dual attention, scene segmentation, attention
  - 总结: 原文将其作为语义分割中自注意力改进方法线的一部分引用。

- [26] Zilong Huang, 2019
  - 标题: CCNet: Criss-cross attention for semantic segmentation
  - 关键词: CCNet, criss-cross attention, semantic segmentation
  - 总结: 原文将其作为语义分割中注意力改进方法线的一部分引用。

- [27] Alexander Kirillov, 2019
  - 标题: Panoptic feature pyramid networks
  - 关键词: PFPN, panoptic FPN, unified
  - 总结: 原文将其作为全景分割中组合方案的代表之一引用。

- [29] Alexander Kirillov, 2017
  - 标题: InstanceCut: from edges to instances with multicut
  - 关键词: InstanceCut, multicut, instance
  - 总结: 原文将其作为全景分割中实例生成方法线的参考引用。

- [31] Yanwei Li, 2021
  - 标题: Fully convolutional networks for panoptic segmentation with point-based supervision
  - 关键词: FCN panoptic, fully convolutional
  - 总结: 原文将其作为全景分割方法家族中的一员引用。

- [45] Robin Strudel, 2021
  - 标题: Segmenter: Transformer for semantic segmentation
  - 关键词: Segmenter, transformer, semantic segmentation
  - 总结: 原文将其作为专用 Transformer 语义分割架构的代表之一引用。

- [47] Mingxing Tan, 2020
  - 标题: Efficientdet: Scalable and efficient object detection
  - 关键词: EfficientDet, object detection, efficient
  - 总结: 原文将其作为持续发展的专用架构之一引用。

- [49] Zhi Tian, 2020
  - 标题: Conditional convolutions for instance segmentation
  - 关键词: CondInst, conditional conv, instance segmentation
  - 总结: 原文将其作为实例分割中动态核方法的代表之一引用。

- [52] Huiyu Wang, 2021
  - 标题: MaX-DeepLab: End-to-end panoptic segmentation with mask transformers
  - 关键词: MaX-DeepLab, mask transformer, panoptic
  - 总结: 原文将其作为全景分割中 Transformer 方案的参考引用。

- [55] Xiaolong Wang, 2018
  - 标题: Non-local neural networks
  - 关键词: non-local, self-attention, context
  - 总结: 原文将其作为视觉中自注意力/上下文建模方法的早期代表引用。

- [56] Xinlong Wang, 2020
  - 标题: SOLOv2: Dynamic and fast instance segmentation
  - 关键词: SOLOv2, instance segmentation, dynamic
  - 总结: 原文将其作为实例分割中动态方法的代表之一引用。

- [60] Yuwen Xiong, 2019
  - 标题: Upsnet: A unified panoptic segmentation network
  - 关键词: UPSNet, unified panoptic
  - 总结: 原文将其作为全景分割中组合架构方案的代表之一引用。

- [61] Yuhui Yuan, 2021
  - 标题: OCNet: Object context for semantic segmentation
  - 关键词: OCNet, object context, semantic segmentation
  - 总结: 原文将其作为语义分割中上下文改进方法线的一部分引用。

- [63] Hengshuang Zhao, 2017
  - 标题: Pyramid scene parsing network
  - 关键词: PSPNet, pyramid, semantic segmentation
  - 总结: 原文将其作为语义分割中上下文建模方法线的代表之一引用。

- [64] Sixiao Zheng, 2021
  - 标题: Rethinking semantic segmentation from a sequence-to-sequence perspective with transformers
  - 关键词: SETR, seq2seq, semantic segmentation, transformer
  - 总结: 原文将其作为语义分割中 Transformer 序列方法线的参考引用。



##### Component

- [5] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, set prediction, end-to-end, transformer
  - 总结: 原文将 DETR 作为通用分割架构的技术基石，Mask2Former 的集合预测目标直接继承自 DETR 的端到端思想。

- [14] Bowen Cheng, 2021
  - 标题: Schwing, and Alexander Kirillov
  - 关键词: MaskFormer, mask classification, universal architecture, baseline
  - 总结: 原文把 MaskFormer 作为 Mask2Former 的元架构来源和直接对比基线，既肯定其在语义和全景分割上的成功，也指出其在实例分割和训练效率上的不足。

- [24] Kaiming He, 2017
  - 标题: Mask R-CNN
  - 关键词: Mask R-CNN, instance segmentation, mask classification, pioneering
  - 总结: 原文将其定位为实例分割'掩码分类'范式的开创者，并说明其通过检测框生成掩码的技术路线与本文集合预测方法的区别。

- [25] Kaiming He, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, backbone, feature extractor
  - 总结: 原文在描述 Mask2Former 元架构的骨干组件时引用 ResNet 作为常用特征提取器。

- [28] Alexander Kirillov, 2019
  - 标题: Panoptic segmentation
  - 关键词: panoptic segmentation, task definition, unification
  - 总结: 原文引用它来定义全景分割的概念和评估框架，支撑其关于'全景分割不能保证跨任务泛化'的论点。

- [33] Tsung-Yi Lin, 2017
  - 标题: Feature pyramid networks for object detection
  - 关键词: FPN, feature pyramid, object detection
  - 总结: 原文在相关工作中引用 FPN 来说明多尺度特征表示的通用技术，并指出其在不同任务中的效果差异。

- [36] Ze Liu, 2021
  - 标题: Swin transformer: Hierarchical vision transformer using shifted windows
  - 关键词: Swin Transformer, hierarchical, backbone
  - 总结: 原文引用 Swin Transformer 作为现代视觉骨干网络的代表，说明其在专用架构中的关键作用。

- [37] Jonathan Long, 2015
  - 标题: Fully convolutional networks for semantic segmentation
  - 关键词: FCN, fully convolutional, semantic segmentation, pioneering
  - 总结: 原文将 FCN 定位为语义分割的基线方法，用来说明 per-pixel 分类技术路线的起源和局限。

- [51] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: transformer, self-attention, foundational
  - 总结: 原文将 Transformer 原始论文作为 Mask2Former 解码器设计的基础技术来源引用。

- [62] Wenwei Zhang, 2021
  - 标题: K-net: Towards unified image segmentation
  - 关键词: K-Net, unified segmentation, set prediction, universal
  - 总结: 原文将 K-Net 作为通用分割架构的先驱之一引用，展示集合预测思想向实例分割的扩展，同时指出其仍不及专用架构。



##### Contrast

- [6] Kai Chen, 2019
  - 标题: Hybrid task cascade for instance segmentation
  - 关键词: HTC++, specialized SOTA, instance segmentation, comparison
  - 总结: 原文将其作为专用架构性能优势的参照物，用来凸显通用架构需要追赶的性能标杆，同时作为 Mask2Former 最终超越的对象。

- [20] Yuxin Fang, 2021
  - 标题: Instances as queries
  - 关键词: instances as queries, specialized, recent trend
  - 总结: 原文引用它来说明专用架构仍在持续发展的现象，用来支撑'为什么通用架构尚未取代专用架构'的论述。

- [39] Shihua Huang Zhichao Lu, 2021
  - 标题: Fapn: Feature-aligned pyramid network for dense image prediction
  - 关键词: FaPN, feature-aligned, semantic segmentation
  - 总结: 原文用 FaPN 在语义分割上优于 BiFPN 的实验结果来论证技术专用化的问题。



##### Dataset

- [16] Marius Cordts, 2016
  - 标题: The Cityscapes dataset for semantic urban scene understanding
  - 关键词: Cityscapes, urban scene, dataset
  - 总结: 原文将 Cityscapes 列为 Mask2Former 的四大评估数据集之一。

- [35] Tsung-Yi Lin, 2014
  - 标题: Microsoft COCO: Common objects in context
  - 关键词: COCO, dataset, benchmark
  - 总结: 原文将 COCO 列为 Mask2Former 全景、实例和语义分割三大任务的核心评估数据集。

- [42] Gerhard Neuhold, 2017
  - 标题: The mapillary vistas dataset for semantic understanding of street scenes
  - 关键词: Mapillary Vistas, street scene, dataset
  - 总结: 原文将 Mapillary Vistas 列为 Mask2Former 的四大评估数据集之一。

- [65] Bolei Zhou, 2017
  - 标题: Scene parsing through ADE20K dataset
  - 关键词: ADE20K, dataset, semantic benchmark
  - 总结: 原文将 ADE20K 列为 Mask2Former 语义分割任务的核心评估数据集。
