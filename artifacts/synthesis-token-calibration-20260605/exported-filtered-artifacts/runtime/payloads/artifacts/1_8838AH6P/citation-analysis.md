#### 总体总结
本节先用早期目标检测与视觉 Transformer 工作铺出技术背景，再把 DETR 系列方法与 YOLO 系列实时检测器并置比较，最后借几篇关键文献（DETR、ViT、ViTDet、Deformable DETR、Group DETR）把 LW-DETR 的方法路线明确出来，并与同期工作 RT-DETR 形成对比。


#### 关键文献

- [4] Carion, N., 2020: Endto-end object detection with transformers (Historical)

- [6] Chen, Q., 2023: Group detr: Fast detr training with group-wise one-to-many assignment (Uncategorized)

- [7] Chen, Q., 2022: Group detr v2: Strong object detector with encoder-decoder pretraining. arXiv preprint arXiv:2211.03594 (Uncategorized)

- [8] Chen, W., 2021: A simple single-scale vision transformer for object localization and instance segmentation. arXiv preprint arXiv:2112.09747 (Uncategorized)

- [17] Dosovitskiy, A., 2020: An image is worth 16x16 words: Transformers for image recognition at scale. arXiv preprint arXiv:2010.11929 (Historical)

- [45] Lv, W., 2023: Detrs beat yolos on real-time object detection. arXiv preprint arXiv:2304.08069 (Uncategorized)



#### 范围
- 章节: Introduction + Related Work
- 行号: 9-45

#### 按功能归类


##### Historical

- [4] Carion, N., 2020
  - 标题: Endto-end object detection with transformers
  - 关键词: end-to-end detection, bipartite matching, set prediction, transformer decoder
  - 总结: This is the original DETR paper that introduced end-to-end object detection using transformers with bipartite matching. LW-DETR cites it as the foundational work that开启了 the DETR variant research line, and uses it to frame the central question: can DETR-based approaches compete with YOLO-style CNN detectors in real-time scenarios?

- [17] Dosovitskiy, A., 2020
  - 标题: An image is worth 16x16 words: Transformers for image recognition at scale. arXiv preprint arXiv:2010.11929
  - 关键词: patch-based vision transformer, image classification, self-attention, transfer learning
  - 总结: The foundational ViT paper is the backbone of LW-DETR's encoder. The authors use a plain ViT encoder and cite this work both when describing their architecture and when discussing ViT applications to detection. This is a core technical dependency.

- [24] Hosang, J., 2017
  - 标题: Learning non-maximum suppression
  - 关键词: non-maximum suppression, post-processing, duplicate removal, detection pipeline
  - 总结: NMS is cited as one of the hand-crafted components that DETR eliminates. This supports the narrative that DETR provides a cleaner, end-to-end detection pipeline.

- [50] Redmon, J., 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: single-stage detection, real-time detection, YOLO original, unified detection
  - 总结: The original YOLO paper is cited as the starting point of the YOLO series. Used to establish how far CNN-based real-time detection has come and set the bar for what LW-DETR must beat.

- [51] Ren, S., 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks. Advances in neural information processing systems 28
  - 关键词: region proposal network, two-stage detection, anchor generation, CNN detection
  - 总结: Faster R-CNN is cited as representing the traditional two-stage detection paradigm with hand-crafted components (RPN, anchors) that DETR replaces with a cleaner end-to-end approach.



##### Uncategorized

- [5] Chang, J., 2023
  - 标题: Detrdistill: A universal knowledge distillation framework for detr-families
  - 关键词: knowledge distillation, DETR compression, teacher-student, model acceleration
  - 总结: Referenced as part of the landscape of DETR efficiency improvement methods. The authors mention distillation as a potential future enhancement but position their work as focusing on a simple baseline first, rather than combining many optimization techniques.

- [6] Chen, Q., 2023
  - 标题: Group detr: Fast detr training with group-wise one-to-many assignment
  - 关键词: group-wise assignment, one-to-many matching, training acceleration, convergence improvement
  - 总结: Group DETR introduces group-wise one-to-many assignment to speed up DETR training. LW-DETR later adopts this training strategy, making it an important methodological reference for their training pipeline design.

- [7] Chen, Q., 2022
  - 标题: Group detr v2: Strong object detector with encoder-decoder pretraining. arXiv preprint arXiv:2211.03594
  - 关键词: encoder-decoder pretraining, two-stage training, representation learning, detector initialization
  - 总结: Group DETR v2's encoder-decoder pretraining strategy is explicitly adopted by LW-DETR as one of their key training techniques. This is a direct methodological dependency, not just background context.

- [8] Chen, W., 2021
  - 标题: A simple single-scale vision transformer for object localization and instance segmentation. arXiv preprint arXiv:2112.09747
  - 关键词: single-scale ViT, interleaved attention, window attention, detection backbone
  - 总结: ViTDet demonstrates that a plain single-scale ViT can be effective for detection using interleaved window and global attention. LW-DETR directly follows this design philosophy and extends it with window-major ordering for memory efficiency.

- [9] Chen, X., 2022
  - 标题: D $^ 3$ etr: Decoder distillation for detection transformer. arXiv preprint arXiv:2211.09768
  - 关键词: decoder distillation, DETR acceleration, knowledge transfer, model compression
  - 总结: Referenced as part of the survey of DETR efficiency methods. The authors acknowledge distillation approaches exist but position their work as taking a different route - building a strong simple baseline rather than compressing existing models.

- [11] Chen, X., 2022
  - 标题: Conditional detr v2: Efficient detection transformer with box queries. arXiv preprint arXiv:2207.08914
  - 关键词: box queries, conditional attention, query initialization, convergence acceleration
  - 总结: Conditional DETR v2 improves DETR with box queries. Cited as part of the broader DETR improvement literature survey, showing the authors' awareness of the design space but not directly adopted.

- [12] Chen, Y., 2023
  - 标题: Yolo-ms: Rethinking multi-scale representation learning for real-time object detection. arXiv preprint arXiv:2308.05480
  - 关键词: multi-scale learning, real-time YOLO, lightweight detection, COCO benchmark
  - 总结: YOLO-MS is included in the experimental comparison baselines. LW-DETR positions their method as outperforming this and other real-time detectors.

- [16] Ding, X., 2021
  - 标题: Repvgg: Making vgg-style convnets great again
  - 关键词: reparameterization, structural re-design, inference-time fusion, CNN architecture
  - 总结: RepVGG is cited as an example of architecture design innovations in CNN detectors. The authors use it to contrast with their transformer-based approach - while CNNs have many architectural tricks, transformers for real-time detection remain underexplored.

- [18] Feng, D., 2020
  - 标题: Deep multi-modal object detection and semantic segmentation for autonomous driving: Datasets, methods, and challenges. IEEE Transactions on Intelligent Transportation Systems 22(3), 1341–1360
  - 关键词: autonomous driving, multi-modal fusion, detection datasets, real-time perception
  - 总结: Used to support the motivational claim that real-time object detection has wide real-world applications, specifically in autonomous driving contexts.

- [19] Gao, Z., 2022
  - 标题: Adamixer: A fast-converging query-based object detector
  - 关键词: query-based detection, mixer mechanism, fast convergence, bipartite matching
  - 总结: Referenced as part of the DETR variant landscape. Shows awareness of query design improvements but not directly adopted in LW-DETR.

- [20] Ge, Z., 2021
  - 标题: Yolox: Exceeding yolo series in 2021. arXiv preprint arXiv:2107.08430
  - 关键词: anchor-free detection, decoupled head, YOLO improvement, simOTA
  - 总结: YOLOX represents the state-of-the-art in CNN-based real-time detection. LW-DETR cites it to establish the competitive baseline that their transformer approach must surpass.

- [21] Hatamizadeh, A., 2023
  - 标题: Fastervit: Fast vision transformers with hierarchical attention. arXiv preprint arXiv:2306.06189
  - 关键词: hierarchical attention, fast vision transformer, multi-scale ViT, efficient transformer
  - 总结: FasterViT represents the hierarchical ViT approach that LW-DETR contrasts with. The authors choose a plain ViT with interleaved attention (following ViTDet) rather than hierarchical designs.

- [23] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: residual learning, CNN backbone, image recognition, deep networks
  - 总结: ResNet is cited to demonstrate that LW-DETR's approach generalizes beyond ViT to convolutional encoders. This supports the claim that their method is not limited to one encoder type.

- [25] Hu, Y., 2023
  - 标题: Planning-oriented autonomous driving
  - 关键词: autonomous driving, planning, real-time perception, end-to-end driving
  - 总结: Used to support the motivational claim about wide real-world applications of real-time detection, specifically in the autonomous driving domain.

- [27] Jia, D., 2023
  - 标题: Detrs with hybrid matching
  - 关键词: hybrid matching, self-training, denoising, DETR improvement
  - 总结: DINO represents an important DETR variant with hybrid matching. Cited as part of the comprehensive DETR variant survey.

- [29] Jocher, G., 2023
  - 标题: Ultralytics yolov8 (2023), https://github. com/ultralytics/ultralytics
  - 关键词: YOLO series, real-time detection, COCO benchmark, industry-standard detector
  - 总结: YOLOv8 is one of the main CNN-based baselines that LW-DETR compares against. It appears in the main performance figure (Figure 1) and throughout the experimental section. This is a key comparison reference.

- [30] Karaoguz, H., 2019
  - 标题: Object detection approach for robot grasp detection
  - 关键词: robotic grasping, real-time perception, grasp detection, robotics application
  - 总结: Used to support the motivational claim about wide real-world applications, specifically in robotic manipulation contexts.

- [31] Li, B., 2019
  - 标题: Gs3d: An efficient 3d object detection framework for autonomous driving
  - 关键词: 3D detection, autonomous driving, LiDAR perception, efficient detection
  - 总结: Used to support the motivational claim about wide real-world applications of real-time detection in autonomous driving.

- [32] Li, C., 2023
  - 标题: Yolov6 v3. 0: A full-scale reloading. arXiv preprint arXiv:2301.05586
  - 关键词: YOLOv6, real-time detection, industrial application, COCO benchmark
  - 总结: YOLOv6 v3 is listed among the CNN-based real-time detectors that represent the competitive landscape LW-DETR aims to surpass.

- [33] Li, C., 2022
  - 标题: Yolov6: A single-stage object detection framework for industrial applications. arXiv preprint arXiv:2209.02976
  - 关键词: YOLOv6, single-stage detection, industrial detection, convolutional projector
  - 总结: YOLOv6 serves dual purpose: its convolutional projector design is adapted in LW-DETR to connect the ViT encoder with the DETR decoder, and it is also a comparison baseline. The architecture design influence makes it noteworthy.

- [34] Li, F., 2023
  - 标题: Lite detr: An interleaved multi-scale encoder for efficient detr
  - 关键词: interleaved encoder, multi-scale DETR, efficient detection, lightweight transformer
  - 总结: Lite DETR explores efficient DETR with interleaved multi-scale encoding. Cited as related work on efficient DETR design, though LW-DETR takes a different approach using plain ViT.

- [35] Li, F., 2022
  - 标题: Dn-detr: Accelerate detr training by introducing query denoising
  - 关键词: query denoising, training acceleration, bipartite matching, convergence improvement
  - 总结: DN-DETR introduces query denoising to accelerate DETR training. Cited as part of the training technique improvement literature.

- [36] Li, Y., 2022
  - 标题: Exploring plain vision transformer backbones for object detection
  - 关键词: plain ViT, detection backbone, vision transformer transfer, feature extraction
  - 总结: This work studies plain ViT backbones for object detection, supporting LW-DETR's choice to use a plain ViT encoder rather than hierarchical variants. Methodologically relevant to their design choices.

- [37] Li, Y., 2021
  - 标题: Benchmarking detection transfer learning with vision transformers. arXiv preprint arXiv:2111.11429
  - 关键词: ViT transfer learning, detection benchmark, pre-trained features, backbone evaluation
  - 总结: Supports the argument that pre-trained ViT features transfer well to detection tasks, justifying LW-DETR's use of pre-trained ViT encoders.

- [38] Lin, T.Y., 2017
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, class imbalance, dense detection, RetinaNet
  - 总结: Focal loss is cited as a well-known loss function improvement in the detection literature. Also referenced in context of potential future improvements.

- [39] Lin, T.Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO benchmark, object detection dataset, mAP evaluation, standard benchmark
  - 总结: COCO is the standard evaluation benchmark. Cited when describing where the experimental comparisons take place.

- [40] Lin, Y., 2023
  - 标题: Detr doesn’t need multiscale or locality design. arXiv preprint arXiv:2308.01904
  - 关键词: single-scale DETR, no locality, simplified architecture, DETR analysis
  - 总结: This work shows DETR doesn't need multiscale or locality design, supporting LW-DETR's choice to use a plain single-scale ViT encoder.

- [41] Liu, S., 2022
  - 标题: Dab-detr: Dynamic anchor boxes are better queries for detr. arXiv preprint arXiv:2201.12329
  - 关键词: dynamic anchor boxes, query design, spatial priors, DETR queries
  - 总结: DAB-DETR introduces dynamic anchor boxes as queries for DETR. Cited in the interleaved attention context and as part of the query design literature.

- [42] Liu, S., 2023
  - 标题: Detection transformer with stable matching. arXiv preprint arXiv:2304.04742
  - 关键词: stable matching, bipartite matching, training stability, DETR convergence
  - 总结: Addresses stable matching in DETR training. Cited as part of the training technique improvement survey.

- [43] Liu, Z., 2021
  - 标题: Swin transformer: Hierarchical vision transformer using shifted windows
  - 关键词: shifted windows, hierarchical ViT, multi-scale features, vision transformer
  - 总结: Swin Transformer represents the hierarchical ViT approach. LW-DETR contrasts their plain ViT + interleaved attention approach with hierarchical designs like Swin.

- [45] Lv, W., 2023
  - 标题: Detrs beat yolos on real-time object detection. arXiv preprint arXiv:2304.08069
  - 关键词: real-time DETR, concurrent work, CNN backbone, PaddlePaddle
  - 总结: RT-DETR is the key concurrent work that LW-DETR directly acknowledges as parallel research. Both aim to build real-time DETR detectors, but RT-DETR focuses on CNN backbones while LW-DETR explores ViT backbones. This is essential context for positioning LW-DETR's novelty.

- [46] Lyu, C., 2022
  - 标题: Rtmdet: An empirical study of designing real-time object detectors. arXiv preprint arXiv:2212.07784
  - 关键词: real-time detection, empirical study, COCO benchmark, design principles
  - 总结: RTMDet is one of the main CNN-based baselines that LW-DETR compares against. It appears in the main performance figure and represents an empirically-optimized CNN detector.

- [47] Meng, D., 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: conditional queries, fast convergence, content-position query, DETR improvement
  - 总结: Conditional DETR introduces conditional spatial and content queries for faster convergence. Cited as part of the DETR improvement literature.

- [48] Ouyang-Zhang, J., 2022
  - 标题: Nms strikes back. arXiv preprint arXiv:2212.06137
  - 关键词: NMS improvement, post-processing, detection pipeline, matching
  - 总结: Referenced in the context of NMS post-processing - both as a component DETR removes and as something that adds latency to CNN-based baselines in timing comparisons.

- [49] Paul, S.K., 2021
  - 标题: Object detection and pose estimation from rgb and depth data for real-time, adaptive robotic grasping
  - 关键词: RGB-D detection, robotic grasping, real-time robotics, pose estimation
  - 总结: Used to support the motivational claim about wide real-world applications of real-time detection in robotic grasping scenarios.

- [53] Roh, B., 2021
  - 标题: Sparse detr: Efficient end-to-end object detection with learnable sparsity. arXiv preprint arXiv:2111.14330
  - 关键词: sparse attention, learnable sparsity, efficient DETR, computation reduction
  - 总结: Sparse DETR reduces computational cost through learnable sparsity. Cited as part of the efficiency improvement literature for DETR.

- [54] Shao, S., 2019
  - 标题: Objects365: A large-scale, high-quality dataset for object detection
  - 关键词: large-scale detection, pretraining dataset, transfer learning, 365 categories
  - 总结: Objects365 is the pretraining dataset used for fair comparison. All models (LW-DETR and baselines) are pretrained on this dataset. Important for experimental methodology.

- [56] Tian, Z., 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: anchor-free detection, fully convolutional, one-stage detection, centerness
  - 总结: FCOS represents the anchor-free CNN detection paradigm. Cited to show the breadth of CNN detection innovations that LW-DETR's transformer approach must compete with.

- [58] Wang, C., 2023
  - 标题: Gold-yolo: Efficient object detector via gather-and-distribute mechanism. arXiv preprint arXiv:2309.11331
  - 关键词: gather-and-distribute, multi-scale fusion, real-time YOLO, efficient detection
  - 总结: Gold-YOLO is included in the experimental comparison baselines. LW-DETR positions their method as outperforming this efficient CNN-based detector.





#### 时间线分析

##### 早期
早期工作主要奠定了目标检测的基础建模思想与任务定义，包括 YOLO 开创的实时检测范式、Faster R-CNN 提出的两阶段检测框架，以及 ImageNet 等大规模数据集的构建。这些工作为后续检测器发展奠定了基础。


- [19] Gao, Z., 2022: Adamixer: A fast-converging query-based object detector

- [27] Jia, D., 2023: Detrs with hybrid matching

- [32] Li, C., 2023: Yolov6 v3. 0: A full-scale reloading. arXiv preprint arXiv:2301.05586

- [48] Ouyang-Zhang, J., 2022: Nms strikes back. arXiv preprint arXiv:2212.06137

- [54] Shao, S., 2019: Objects365: A large-scale, high-quality dataset for object detection




##### 中期
中期工作把检测思想推向更成熟的路线，包括 YOLOv4/v6/v7/v8 等持续改进的实时检测器、DETR 及其变体（Deformable DETR、DAB-DETR、DINO、Group DETR 等）开创的端到端检测范式，以及 ViT、Swin Transformer 等视觉 Transformer 骨干网络的发展。这一时期还出现了 RTMDet、Gold-YOLO 等结合 CNN 与高效设计的检测器。


- [4] Carion, N., 2020: Endto-end object detection with transformers

- [5] Chang, J., 2023: Detrdistill: A universal knowledge distillation framework for detr-families

- [6] Chen, Q., 2023: Group detr: Fast detr training with group-wise one-to-many assignment

- [7] Chen, Q., 2022: Group detr v2: Strong object detector with encoder-decoder pretraining. arXiv preprint arXiv:2211.03594

- [8] Chen, W., 2021: A simple single-scale vision transformer for object localization and instance segmentation. arXiv preprint arXiv:2112.09747

- [9] Chen, X., 2022: D $^ 3$ etr: Decoder distillation for detection transformer. arXiv preprint arXiv:2211.09768

- [11] Chen, X., 2022: Conditional detr v2: Efficient detection transformer with box queries. arXiv preprint arXiv:2207.08914

- [12] Chen, Y., 2023: Yolo-ms: Rethinking multi-scale representation learning for real-time object detection. arXiv preprint arXiv:2308.05480

- [16] Ding, X., 2021: Repvgg: Making vgg-style convnets great again

- [17] Dosovitskiy, A., 2020: An image is worth 16x16 words: Transformers for image recognition at scale. arXiv preprint arXiv:2010.11929

- [18] Feng, D., 2020: Deep multi-modal object detection and semantic segmentation for autonomous driving: Datasets, methods, and challenges. IEEE Transactions on Intelligent Transportation Systems 22(3), 1341–1360

- [20] Ge, Z., 2021: Yolox: Exceeding yolo series in 2021. arXiv preprint arXiv:2107.08430

- [21] Hatamizadeh, A., 2023: Fastervit: Fast vision transformers with hierarchical attention. arXiv preprint arXiv:2306.06189

- [23] He, K., 2016: Deep residual learning for image recognition

- [24] Hosang, J., 2017: Learning non-maximum suppression

- [25] Hu, Y., 2023: Planning-oriented autonomous driving

- [29] Jocher, G., 2023: Ultralytics yolov8 (2023), https://github. com/ultralytics/ultralytics

- [30] Karaoguz, H., 2019: Object detection approach for robot grasp detection

- [31] Li, B., 2019: Gs3d: An efficient 3d object detection framework for autonomous driving

- [33] Li, C., 2022: Yolov6: A single-stage object detection framework for industrial applications. arXiv preprint arXiv:2209.02976

- [34] Li, F., 2023: Lite detr: An interleaved multi-scale encoder for efficient detr

- [35] Li, F., 2022: Dn-detr: Accelerate detr training by introducing query denoising

- [36] Li, Y., 2022: Exploring plain vision transformer backbones for object detection

- [37] Li, Y., 2021: Benchmarking detection transfer learning with vision transformers. arXiv preprint arXiv:2111.11429

- [38] Lin, T.Y., 2017: Focal loss for dense object detection

- [39] Lin, T.Y., 2014: Microsoft coco: Common objects in context

- [40] Lin, Y., 2023: Detr doesn’t need multiscale or locality design. arXiv preprint arXiv:2308.01904

- [41] Liu, S., 2022: Dab-detr: Dynamic anchor boxes are better queries for detr. arXiv preprint arXiv:2201.12329

- [42] Liu, S., 2023: Detection transformer with stable matching. arXiv preprint arXiv:2304.04742

- [43] Liu, Z., 2021: Swin transformer: Hierarchical vision transformer using shifted windows

- [46] Lyu, C., 2022: Rtmdet: An empirical study of designing real-time object detectors. arXiv preprint arXiv:2212.07784

- [47] Meng, D., 2021: Conditional detr for fast training convergence

- [50] Redmon, J., 2016: You only look once: Unified, real-time object detection

- [51] Ren, S., 2015: Faster r-cnn: Towards real-time object detection with region proposal networks. Advances in neural information processing systems 28

- [53] Roh, B., 2021: Sparse detr: Efficient end-to-end object detection with learnable sparsity. arXiv preprint arXiv:2111.14330

- [56] Tian, Z., 2019: Fcos: Fully convolutional one-stage object detection

- [58] Wang, C., 2023: Gold-yolo: Efficient object detector via gather-and-distribute mechanism. arXiv preprint arXiv:2309.11331




##### 近期
近期工作则更直接地收束到本文所处的方法脉络，包括与 LW-DETR 并行的 RT-DETR、YOLO-MS、Gold-YOLO 等最新实时检测器。这些工作与 LW-DETR 形成直接对比，共同推动实时检测领域向前发展。


- [45] Lv, W., 2023: Detrs beat yolos on real-time object detection. arXiv preprint arXiv:2304.08069

- [49] Paul, S.K., 2021: Object detection and pose estimation from rgb and depth data for real-time, adaptive robotic grasping
