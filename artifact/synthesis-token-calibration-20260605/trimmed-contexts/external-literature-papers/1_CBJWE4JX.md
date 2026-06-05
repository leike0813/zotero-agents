# DETRs beat YOLOs on real-time object detection (2024)

- Paper ref: 1:CBJWE4JX
- Title: DETRs beat YOLOs on real-time object detection
- Year: 2024

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Bochkovskiy, A.; Wang, C.-Y.; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-2 | 2022 | Bogdoll, D.; Nitsche, M.; et al. | Anomaly detection in autonomous driving: A survey |
| ref-3 | 2022 | Cai, Y.; Zhou, Y.; et al. | Reversible column networks |
| ref-4 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-5 | 2022 | Chen, Q.; Chen, X.; et al. | Group detr: Fast training convergence with decoupled one-to-many label assignment |
| ref-6 | 2022 | Chen, Q.; Wang, J.; et al. | Group detr v2: Strong object detector with encoder-decoder pretraining |
| ref-7 | 2021 | Ding, X.; Zhang, X.; et al. | Repvgg: Making vgg-style convnets great again |
| ref-8 | 2021 | Gao, P.; Zheng, M.; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-9 | 2021 | Ge, Z.; Liu, S.; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-10 | 2022 | Glenn, J. | Yolov5 release v7.0 |
| ref-11 | 2023 | Glenn, J. | Yolov8 |
| ref-12 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-13 | 2019 | He, T.; Zhang, Z.; et al. | Bag of tricks for image classification with convolutional neural networks |
| ref-14 | 2021 | Huang, X.; Wang, X.; et al. | Pp-yolov2: A practical object detector |
| ref-15 | 2023 | Li, C.; Li, L.; et al. | Yolov6 v3.0: A ful-scale reloading |
| ref-16 | 2022 | Li, F.; Zhang, H.; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-17 | 2023 | Li, F.; Zeng, A.; et al. | Lite detr: An interleaved multi-scale encoder for efficient detr |
| ref-18 | 2022 | Lin, J.; Mao, X.; et al. | D2etr: Decoder-only detr with computationally efficient cross-scale attention |
| ref-19 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-20 | 2017 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-21 | 2018 | Liu, S.; Qi, L.; et al. | Path aggregation network for instance segmentation |
| ref-22 | 2021 | Liu, S.; Li, F.; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr |
| ref-23 | 2016 | Liu, W.; Anguelov, D.; et al. | Ssd: Single shot multibox detector |
| ref-24 | 2020 | Long, X.; Deng, K.; et al. | Pp-yolo: An effective and efficient implementation of object detector |
| ref-25 | 2021 | Meng, D.; Chen, X.; et al. | Conditional detr for fast training convergence |
| ref-26 | 2019 | Nawaratne, R.; Alahakoon, D.; et al. | Spatiotemporal anomaly detection using deep learning for real-time video surveillance |
| ref-27 | 2017 | Redmon, J.; Farhadi, A. | Yolo9000: Better, faster, stronger |
| ref-28 | 2018 | Redmon, J.; Farhadi, A. | Yolov3: An incremental improvement |
| ref-29 | 2016 | Redmon, J.; Divvala, S.; et al. | You only look once: Unified, real-time object detection |
| ref-30 | 2023 | Ren, T.; Yang, J.; et al. | A strong and reproducible object detector with only public datasets |
| ref-31 | 2021 | Roh, B.; Shin, J.; et al. | Sparse detr: Efficient end-to-end object detection with learnable sparsity |
| ref-32 | 2019 | Shao, S.; Li, Z.; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-33 | 2021 | Sun, P.; Zhang, R.; et al. | Sparse r-cnn: End-to-end object detection with learnable proposals |
| ref-34 | 2021 | Wang, C.-Y.; Bochkovskiy, A.; et al. | Scaled-yolov4: Scaling cross stage partial network |
| ref-35 | 2023 | Wang, C.-Y.; Bochkovskiy, A.; et al. | Yolov7: Trainable bag-of-freebies sets new state-of-the-art for real-time object detectors |
| ref-36 | 2022 | Wang, Y.; Zhang, X.; et al. | Anchor detr: Query design for transformer-based detector |
| ref-37 | 2022 | Xu, S.; Wang, X.; et al. | Pp-yoloe: An evolved version of yolo |
| ref-38 | 2022 | Yang, J.; Li, C.; et al. | Focal modulation networks |
| ref-39 | 2021 | Yao, Z.; Ai, J.; et al. | Efficient detr: Improving end-to-end object detector with dense prior |
| ref-40 | 2022 | Zeng, F.; Dong, B.; et al. | Motr: End-to-end multiple-object tracking with transformer |
| ref-41 | 2022 | Zhang, H.; Li, F.; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-42 | 2020 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-43 | 2023 | Zong, Z.; Song, G.; et al. | Detrs with collaborative hybrid assignments training |

## Citation Analysis Report

#### 总体总结
原文在引言与相关工作中先用YOLOv1和早期单阶段检测器奠定实时检测的技术起点，再将DETR作为消除NMS的端到端替代方案引入，同时指出其计算成本高的局限。随后从加速收敛（多尺度特征、去噪训练、迭代精炼）、降低计算成本（稀疏查询、高效编码器）和优化查询初始化（条件化、锚框化）三个方向系统综述了DETR变体的演进路线，并将YOLO系列从v1到v8的发展作为对比基线。最终将DINO定位为当前最先进的DETR基线，为RT-DETR的超越目标明确定位。


#### 关键文献

- [4] Carion, N., 2020: End-to-end object detection with transformers (Historical)

- [42] Zhu, X., 2020: Deformable detr: Deformable transformers for end-to-end object detection (Baseline)

- [41] Zhang, H., 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection (Baseline)

- [29] Redmon, J., 2016: You only look once: Unified, real-time object detection (Historical)



#### 范围
- 章节: Introduction + Related Work
- 行号: 13-38

#### 按功能归类


##### Uncategorized

- [1] Bochkovskiy, A., 2020
  - 标题: Yolov4: Optimal speed and accuracy of object detection
  - 关键词: YOLO, real-time detection, NMS dependency
  - 总结: 该工作被作为代表性YOLO检测器之一，用来支撑原文关于主流实时检测器依赖NMS的论点，与多个其他YOLO变体并列引用。

- [2] Bogdoll, D., 2022
  - 标题: Anomaly detection in autonomous driving: A survey
  - 关键词: autonomous driving, application, survey
  - 总结: 该工作被用作实时目标检测在自动驾驶领域的应用示例，帮助原文快速建立研究背景和应用价值。

- [5] Chen, Q., 2022
  - 标题: Group detr: Fast training convergence with decoupled one-to-many label assignment
  - 关键词: Group DETR, training convergence, label assignment
  - 总结: 该工作被用来丰富DETR变体的技术综述，展示后续研究者从标签分配角度加速DETR训练的努力。

- [9] Ge, Z., 2021
  - 标题: Yolox: Exceeding yolo series in 2021
  - 关键词: YOLOX, anchor-free, real-time detection
  - 总结: 该工作被作为anchor-free YOLO的代表之一，用来支撑原文对YOLO两大分类（anchor-based与anchor-free）的论述。

- [10] Glenn, J., 2022
  - 标题: Yolov5 release v7.0
  - 关键词: YOLOv5, anchor-based, NMS analysis, speed benchmark
  - 总结: 该工作被用作NMS影响分析和端到端速度基准测试中的anchor-based检测器代表，为原文建立实验分析基础。

- [11] Glenn, J., 2023
  - 标题: Yolov8
  - 关键词: YOLOv8, anchor-free, NMS analysis, speed benchmark
  - 总结: 该工作被用作NMS影响分析的主要实验对象，原文通过它直观展示了NMS超参数对执行时间和检测精度的影响。

- [14] Huang, X., 2021
  - 标题: Pp-yolov2: A practical object detector
  - 关键词: PP-YOLOv2, real-time detection, YOLO family
  - 总结: 该工作被作为实用型YOLO检测器的代表之一，用来充实原文对YOLO系列发展演进的综述。

- [15] Li, C., 2023
  - 标题: Yolov6 v3.0: A ful-scale reloading
  - 关键词: YOLOv6, anchor-free, speed benchmark
  - 总结: 该工作被作为anchor-free YOLO的又一代表，在原文的端到端速度基准中与YOLOv5/v7等并列比较。

- [16] Li, F., 2022
  - 标题: Dn-detr: Accelerate detr training by introducing query denoising
  - 关键词: DN-DETR, denoising training, convergence
  - 总结: 该工作被用来展示DETR研究者从去噪训练角度解决训练收敛难问题的努力，丰富原文对DETR改进路线的综述。

- [17] Li, F., 2023
  - 标题: Lite detr: An interleaved multi-scale encoder for efficient detr
  - 关键词: Lite DETR, efficient encoder, computational cost
  - 总结: 该工作被用来充实原文对DETR计算成本降低方向的综述，展示研究者对编码器效率优化的尝试。

- [22] Liu, S., 2021
  - 标题: Dab-detr: Dynamic anchor boxes are better queries for detr
  - 关键词: DAB-DETR, dynamic anchor, iterative refinement
  - 总结: 该工作被用来展示DETR研究者通过动态锚框和迭代精炼提升性能的路线，属于DETR变体技术谱系的综述组成部分。

- [24] Long, X., 2020
  - 标题: Pp-yolo: An effective and efficient implementation of object detector
  - 关键词: PP-YOLO, real-time detection, YOLO family
  - 总结: 该工作被作为有效且高效的YOLO实现代表之一，用来充实原文对YOLO系列发展的综述。

- [25] Meng, D., 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: Conditional DETR, query optimization, convergence
  - 总结: 该工作被用来展示DETR研究者通过条件化查询降低优化难度的路线，属于DETR变体综述的一部分。

- [26] Nawaratne, R., 2019
  - 标题: Spatiotemporal anomaly detection using deep learning for real-time video surveillance
  - 关键词: video surveillance, anomaly detection, application
  - 总结: 该工作被用作实时目标检测应用场景的又一个示例，与自动驾驶等并列说明该研究的广泛应用价值。

- [27] Redmon, J., 2017
  - 标题: Yolo9000: Better, faster, stronger
  - 关键词: YOLO9000, anchor-based, YOLO evolution
  - 总结: 该工作被作为YOLO发展历程中的早期anchor-based变体，用来充实原文对YOLO技术路线的分类综述。

- [28] Redmon, J., 2018
  - 标题: Yolov3: An incremental improvement
  - 关键词: YOLOv3, incremental improvement, YOLO family
  - 总结: 该工作被作为YOLO渐进改进路线中的一个节点，用来支撑原文对YOLO系列演进的综述。

- [31] Roh, B., 2021
  - 标题: Sparse detr: Efficient end-to-end object detection with learnable sparsity
  - 关键词: Sparse DETR, learnable sparsity, computational cost
  - 总结: 该工作被用来充实原文对DETR计算成本降低方向的综述，展示研究者通过稀疏查询更新提升效率的尝试。

- [33] Sun, P., 2021
  - 标题: Sparse r-cnn: End-to-end object detection with learnable proposals
  - 关键词: Sparse R-CNN, learnable proposals, end-to-end
  - 总结: 该工作被用来丰富原文对端到端检测器多样化方案的综述，说明除了DETR外还有其他end-to-end路线。

- [34] Wang, C.-Y., 2021
  - 标题: Scaled-yolov4: Scaling cross stage partial network
  - 关键词: Scaled-YOLOv4, scaling, CSP network
  - 总结: 该工作被作为YOLO缩放策略的代表，用来充实原文对YOLO家族anchor-based分支的综述。

- [35] Wang, C.-Y., 2023
  - 标题: Yolov7: Trainable bag-of-freebies sets new state-of-the-art for real-time object detectors
  - 关键词: YOLOv7, bag-of-freebies, real-time detection, speed benchmark
  - 总结: 该工作被作为先进YOLO检测器的代表之一，在原文的端到端速度基准中与RT-DETR进行对比。

- [36] Wang, Y., 2022
  - 标题: Anchor detr: Query design for transformer-based detector
  - 关键词: Anchor DETR, anchor-based query, optimization
  - 总结: 该工作被用来展示DETR研究者通过锚框化查询设计降低优化难度的路线，属于DETR变体综述的一部分。

- [37] Xu, S., 2022
  - 标题: Pp-yoloe: An evolved version of yolo
  - 关键词: PP-YOLOE, evolved YOLO, speed benchmark
  - 总结: 该工作被作为YOLO演进版的代表之一，在原文的端到端速度基准中与RT-DETR进行对比。

- [39] Yao, Z., 2021
  - 标题: Efficient detr: Improving end-to-end object detector with dense prior
  - 关键词: Efficient DETR, dense prior, efficiency
  - 总结: 该工作被用来充实原文对DETR计算成本降低方向的综述，展示研究者通过密集先验设计提升效率的尝试。



##### Historical

- [4] Carion, N., 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, end-to-end, Transformer, NMS-free
  - 总结: 该工作被用来追溯端到端检测器的技术起点，同时指出其计算成本高的局限性，为RT-DETR的改进动机提供依据。

- [29] Redmon, J., 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: YOLO, first real-time detector, one-stage
  - 总结: 该工作被用来追溯实时检测的起点，说明YOLOv1开创了真正的实时目标检测，为后续YOLO系列发展奠定基础。



##### Baseline

- [23] Liu, W., 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: SSD, single-stage detector, baseline
  - 总结: 该工作被用作背景衬托，说明YOLO已经超越了其他单阶段检测器成为实时检测的代名词。

- [41] Zhang, H., 2022
  - 标题: Dino: Detr with improved denoising anchor boxes for end-to-end object detection
  - 关键词: DINO, state-of-the-art DETR, denoising anchor, baseline
  - 总结: 该工作被作为当前最先进的DETR变体，原文在实验中直接与之对比，用2.2% AP和21倍速度的差距来展示RT-DETR的显著优势。

- [42] Zhu, X., 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, multi-scale, deformable attention, baseline
  - 总结: 该工作被作为DETR从研究原型走向实用化的关键转折点，原文指出它虽引入多尺度特征但编码器计算成本仍然过高，这正是RT-DETR要解决的问题。



##### Dataset

- [32] Shao, S., 2019
  - 标题: Objects365: A large-scale, high-quality dataset for object detection
  - 关键词: Objects365, pre-training dataset, large-scale
  - 总结: 该工作被作为预训练数据集的来源，原文用它来说明RT-DETR在更大规模数据上训练后的性能提升空间。
