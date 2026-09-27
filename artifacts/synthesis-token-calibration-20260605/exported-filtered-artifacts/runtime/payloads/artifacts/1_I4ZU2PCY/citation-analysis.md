#### 总体总结
原文在引言与相关工作部分，先用通用目标检测的两阶段与单阶段范式铺出技术背景，再把行人检测领域的遮挡处理、NMS困境和可见区域利用等专门挑战并置讨论，最后借DETR与Deformable DETR的端到端集合预测路线把本文的方法动机明确出来：DETR的查询基础和二分匹配特性理论上适合行人检测，但在拥挤场景下表现反而不如Faster-RCNN，从而引出本文的DQRF解码器、V-Match和Fast-KM等改进。


#### 关键文献

- [4] Carion, N., 2020: End-to-end object detection with transformers (Historical)

- [43] Zhu, X., 2020: Deformable detr: Deformable transformers for end-to-end object detection (Historical)

- [30] Ren, S., 2015: Faster r-cnn: Towards real-time object detection with region proposal networks (Contrast)

- [31] Shao, S., 2018: Crowdhuman: A benchmark for detecting human in a crowd (Contrast)

- [5] Chi, C., 2020: Relational learning for joint head and human detection (Contrast)



#### 范围
- 章节: Introduction + Related Work
- 行号: 14-50

#### 按功能归类


##### Background

- [1] Hungarian algorithm
  - 标题: Hungarian algorithm
  - 关键词: KM algorithm, bipartite matching, training efficiency
  - 总结: 原文引用该工作指出DETR使用的标准KM算法具有立方时间复杂度，在CrowdHuman等密集数据集上成为训练瓶颈，从而为提出Fast-KM提供动机。

- [2] Bodla, N., 2017
  - 标题: Soft-nms–improving object detection with one line of code
  - 关键词: NMS variant, Soft-NMS, post-processing
  - 总结: 原文在DETR小节中引用该工作作为NMS变体的代表，论证后处理方法无法访问图像信息因而不能端到端优化，衬托DETR去除NMS的优势。

- [3] Cai, Z., 2019
  - 标题: Cascade r-cnn: High quality object detection and instance segmentation
  - 关键词: cascade, iterative refinement, two-stage
  - 总结: 原文在Related Work的通用目标检测部分引用该工作，将其归类为通过迭代预测提升检测精度的方法，作为该领域发展脉络的一部分。

- [7] Dai, J., 2017
  - 标题: Deformable convolutional networks
  - 关键词: DCN, deformable convolution, feature enhancement
  - 总结: 原文在Related Work中引用该工作，将其作为特征增强技术的代表，展示通用目标检测领域的技术进步脉络。

- [9] Duan, K., 2019
  - 标题: Centernet: Keypoint triplets for object detection
  - 关键词: CenterNet, anchor-free, keypoint
  - 总结: 原文在Related Work中引用该工作，将其归类为anchor-free检测方法，展示去除预定义anchor假设的技术趋势。

- [10] Ghiasi, G., 2019
  - 标题: Nas-fpn: Learning scalable feature pyramid architecture for object detection
  - 关键词: NAS-FPN, feature pyramid, architecture search
  - 总结: 原文在Related Work中引用该工作，将其作为特征金字塔网络的代表，说明特征增强是通用目标检测的重要技术方向。

- [13] He, K., 2017
  - 标题: Mask r-cnn
  - 关键词: Mask R-CNN, instance segmentation, extra supervision
  - 总结: 原文在Related Work中引用该工作，说明额外监督（如实例分割分支）可以提升检测框精度。

- [14] He, K., 2015
  - 标题: Spatial pyramid pooling in deep convolutional networks for visual recognition
  - 关键词: SPP, spatial pyramid, two-stage
  - 总结: 原文在Related Work中引用该工作，将其归类为两阶段检测器的架构改进，展示该方向的技术演进。

- [15] He, Y., 2018
  - 标题: Softer-nms: Rethinking bounding box regression for accurate object detection
  - 关键词: Softer-NMS, NMS variant, box regression
  - 总结: 原文在DETR小节中引用该工作作为NMS变体的代表，论证后处理方法的局限性。

- [16] Hu, H., 2018
  - 标题: Relation networks for object detection
  - 关键词: relation network, attention, proposal ranking
  - 总结: 原文在Related Work中引用该工作，说明长程注意力用于区分重复提案的思路，但仍涉及手工排序。

- [18] Huang, Z., 2019
  - 标题: Mask scoring r-cnn
  - 关键词: mask scoring, extra supervision, R-CNN
  - 总结: 原文在Related Work中引用该工作，将其归类为通过额外监督提升检测精度的方法。

- [19] Jiang, B., 2018
  - 标题: Acquisition of localization confidence for accurate object detection
  - 关键词: localization confidence, object detection, ECCV
  - 总结: 原文在Related Work中引用该工作，说明获取定位置信度对精确检测的贡献。

- [20] Li, B., 2018
  - 标题: Gradient harmonized single-stage detector
  - 关键词: GHM, single-stage, gradient harmonized
  - 总结: 原文在Related Work中引用该工作，将其归类为单阶段检测器，建立通用目标检测的分类框架。

- [21] Lin, T.-Y., 2017
  - 标题: Feature pyramid networks for object detection
  - 关键词: FPN, feature pyramid, multi-scale
  - 总结: 原文在Related Work中引用该工作，说明特征金字塔网络是增强多尺度特征表示的关键技术。

- [22] Lin, T.-Y., 2017
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, single-stage, dense detection
  - 总结: 原文在Related Work中引用该工作，将其归类为单阶段检测器，展示focal loss解决类别不平衡的思路。

- [34] Tian, Z., 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: FCOS, anchor-free, one-stage
  - 总结: 原文在Related Work中引用该工作，将其归类为anchor-free单阶段检测方法。

- [41] Zhou, X., 2019
  - 标题: Objects as points
  - 关键词: Objects as points, anchor-free, keypoint
  - 总结: 原文在Related Work中引用该工作，将其归类为anchor-free检测方法，展示去除预定义anchor假设的技术趋势。

- [42] Zhu, X., 2019
  - 标题: Deformable convnets v2: More deformable, better results
  - 关键词: DCN v2, deformable convolution, feature enhancement
  - 总结: 原文在Related Work中引用该工作，将其作为可变形卷积网络的改进版本，展示特征增强技术的演进。



##### Historical

- [4] Carion, N., 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, transformer, set prediction, end-to-end
  - 总结: 该工作是原文核心技术路线的起点，原文在Introduction和Related Work中多次引用它，说明其查询基础和二分匹配两个特性在行人检测上的潜在优势。

- [8] Dollar, P., 2011
  - 标题: Pedestrian detection: An evaluation of the state of the art
  - 关键词: pedestrian detection, survey, evaluation
  - 总结: 原文在Related Work中引用该综述工作，概括行人检测领域在过去十年的整体进展，为后续讨论拥挤场景挑战做铺垫。

- [11] Girshick, R., 2015
  - 标题: Fast r-cnn
  - 关键词: Fast R-CNN, two-stage, region proposal
  - 总结: 原文在Related Work中引用该工作，将其归类为两阶段检测器的代表，建立通用目标检测的分类框架。

- [12] Girshick, R., 2014
  - 标题: Rich feature hierarchies for accurate object detection and semantic segmentation
  - 关键词: R-CNN, two-stage, feature hierarchy
  - 总结: 原文在Related Work中引用该工作，作为两阶段检测器的开创性工作，建立深度学目标检测的历史脉络。

- [25] Liu, W., 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: SSD, single-shot, multibox
  - 总结: 原文在Related Work中引用该工作，作为单阶段检测器的代表，建立通用目标检测的技术分类。

- [29] Redmon, J., 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: YOLO, single-stage, real-time
  - 总结: 原文在Related Work中引用该工作，作为单阶段实时检测器的代表，建立通用目标检测的技术脉络。

- [38] Zhang, S., 2016
  - 标题: How far are we from solving pedestrian detection?
  - 关键词: pedestrian detection, progress, CVPR
  - 总结: 原文在Related Work中引用该工作，概括行人检测领域的进展和尚未解决的问题，为拥挤场景挑战做铺垫。

- [43] Zhu, X., 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: deformable DETR, transformer, end-to-end
  - 总结: 该工作是原文核心技术路线的直接起点，原文在Introduction和Related Work中多次引用它，说明其稀疏注意力机制在行人检测上的局限性，为提出DQRF提供动机。



##### Contrast

- [5] Chi, C., 2020
  - 标题: Relational learning for joint head and human detection
  - 关键词: head detection, visible region, relational learning
  - 总结: 原文在Introduction和Related Work中引用该工作，将其归类为利用人体特殊部位（头部/可见区域）提升检测性能的现有方法。

- [6] Chi, C., 2020
  - 标题: Pedhunter: Occlusion robust pedestrian detector in crowded scenes
  - 关键词: occlusion, PedHunter, matching strategy
  - 总结: 原文在Related Work中引用该工作，说明其通过更严格的重叠策略减少匹配歧义，与本文关注的匹配问题相关。

- [17] Huang, X., 2020
  - 标题: Nms by representative region: Towards crowded pedestrian detection by proposal pairing
  - 关键词: adaptive NMS, crowd density, NMS threshold
  - 总结: 原文在Introduction和Related Work中引用该工作，说明其通过预测人群密度动态调整NMS阈值，部分解决拥挤场景的NMS困境。

- [23] Lin, T.-Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, dataset, common objects
  - 总结: 原文在Introduction中引用该工作，指出DETR在COCO上表现良好但在CrowdHuman上结果相反，突出拥挤行人检测的特殊挑战。

- [24] Liu, S., 2019
  - 标题: Adaptive nms: Refining pedestrian detection in a crowd
  - 关键词: adaptive NMS, crowd, pedestrian detection
  - 总结: 原文在Introduction和Related Work中引用该工作，说明其通过预测人群密度动态调整NMS阈值，是解决NMS困境的代表性方法。

- [27] Liu, W., 2019
  - 标题: High-level semantic feature detection: A new perspective for pedestrian detection
  - 关键词: semantic feature, pedestrian detection, anchor-free
  - 总结: 原文在Related Work中引用该工作，说明anchor-free方法在行人检测上的适配，但仍保留NMS。

- [28] Pang, Y., 2019
  - 标题: Mask-guided attention network for occluded pedestrian detection
  - 关键词: MGAN, mask-guided, occluded pedestrian
  - 总结: 原文在Introduction和Related Work中引用该工作，说明其通过掩码引导注意力网络处理遮挡行人，将不可见部分视为噪声并降权。

- [30] Ren, S., 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, baseline, region proposal
  - 总结: 原文在Introduction中多次引用该工作，将其作为DETR和行人检测工作的标准基线，对比表明DETR在CrowdHuman上表现不如Faster-RCNN。

- [31] Shao, S., 2018
  - 标题: Crowdhuman: A benchmark for detecting human in a crowd
  - 关键词: CrowdHuman, dataset, crowd
  - 总结: 原文在Introduction中引用该工作，说明CrowdHuman数据集包含大量高度重叠的行人，是验证DETR性能的关键基准。

- [33] Stewart, R., 2016
  - 标题: End-to-end people detection in crowded scenes
  - 关键词: sequence generation, people detection, crowded
  - 总结: 原文在Related Work中引用该工作，批评其将提案预测视为序列生成的方法对于检测任务来说是不必要的属性。

- [37] Xu, Z., 2020
  - 标题: Beta r-cnn: Looking into pedestrian detection from another perspective
  - 关键词: Beta R-CNN, pedestrian detection, NeurIPS
  - 总结: 原文在Related Work中引用该工作，说明anchor-free方法在行人检测上的适配，但仍保留NMS。

- [39] Zhang, S., 2017
  - 标题: Citypersons: A diverse dataset for pedestrian detection
  - 关键词: CityPersons, dataset, diverse
  - 总结: 原文在Related Work和Introduction中引用该工作，说明CityPersons是行人检测的重要基准数据集之一。

- [40] Zhang, S., 2018
  - 标题: Occlusion-aware r-cnn: detecting pedestrians in a crowd
  - 关键词: OR-CNN, occlusion-aware, pedestrian
  - 总结: 原文在Introduction和Related Work中引用该工作，说明其通过遮挡感知R-CNN处理拥挤场景中的行人检测，将不可见部分视为噪声并降权。
