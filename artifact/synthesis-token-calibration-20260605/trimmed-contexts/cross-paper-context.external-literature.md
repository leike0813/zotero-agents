# Cross-Paper Context Calibration - External Literature



This calibration view keeps per-paper metadata, compact references, and citation analysis report only.

# Sparse DETR: efficient end-to-end object detection with learnable sparsity (2022)

- Paper ref: 1:29IBKEUR
- Title: Sparse DETR: efficient end-to-end object detection with learnable sparsity
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2016 | Ba, Lei Jimmy; Kiros, Jamie Ryan; et al. | Layer normalization |
| ref-2 | 2019 | Baevski, Alexei; Auli, Michael A. | Adaptive input representations for neural language modeling |
| ref-3 | 2020 | Carion, Nicolas; Massa, Francisco; et al. | End-to-end object detection with transformers |
| ref-4 | 2019 | Child, Rewon; Gray, Scott; et al. | Generating long sequences with sparse transformers |
| ref-5 | 2019 | Child, Rewon; Gray, Scott; et al. | Generating long sequences with sparse transformers |
| ref-6 | 2021 | Choromanski, Krzysztof Marcin; Likhosherstov, Valerii; et al. | Rethinking attention with performers |
| ref-7 | 2016 | Dai, Jifeng; Li, Yi; et al. | R-FCN: object detection via region-based fully convolutional networks |
| ref-8 | 2017 | Dai, Jifeng; Qi, Haozhi; et al. | Deformable convolutional networks |
| ref-9 | 2009 | Deng, Jia; Dong, Wei; et al. | Imagenet: A large-scale hierarchical image database |
| ref-10 | 2016 | He, Kaiming; Zhang, Xiangyu; et al. | Deep residual learning for image recognition |
| ref-11 | 2017 | He, Kaiming; Gkioxari, Georgia; et al. | Mask R-CNN |
| ref-12 | 2016 | Hendrycks, Dan; Gimpel, Kevin | Bridging nonlinearities and stochastic regularizers with gaussian error linear units |
| ref-13 | 2019 | Ho, Jonathan; Kalchbrenner, Nal; et al. | Axial attention in multidimensional transformers |
| ref-14 | 2020 | Katharopoulos, Angelos; Vyas, Apoorv; et al. | Transformers are rnns: Fast autoregressive transformers with linear attention |
| ref-15 | 2020 | Kitaev, Nikita; Kaiser, Lukasz; et al. | Reformer: The efficient transformer |
| ref-16 | 2015 | Lee, Chen-Yu; Xie, Saining; et al. | Deeply-Supervised Nets |
| ref-17 | 2014 | Lin, Tsung-Yi; Maire, Michael; et al. | Microsoft coco: Common objects in context |
| ref-18 | 2017 | Lin, Tsung-Yi; Dollar, Piotr; et al. | Feature pyramid networks for object detection |
| ref-19 | 2021 | Liu, Ze; Lin, Yutong; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-20 | 2021 | Pan, Bowen; Jiang, Yifan; et al. | IA-RED2: Interpretability-aware redundancy reduction for vision transformers |
| ref-21 | 2018 | Parmar, Niki; Vaswani, Ashish; et al. | Image transformer |
| ref-22 | 2021 | Rao, Yongming; Zhao, Wenliang; et al. | DynamicViT: efficient vision transformers with dynamic token sparsification |
| ref-23 | 2015 | Ren, Shaoqing; He, Kaiming; et al. | Faster R-CNN: towards real-time object detection with region proposal networks |
| ref-24 | 2021 | Roh, Byungseok; Shin, Wuhyun; et al. | Spatially consistent representation learning |
| ref-25 | 2021 | Sun, Peize; Jiang, Yi; et al. | What makes for end-to-end object detection? |
| ref-26 | 2015 | Szegedy, Christian; Liu, Wei; et al. | Going deeper with convolutions |
| ref-27 | 2017 | Vaswani, Ashish; Shazeer, Noam; et al. | Attention is all you need |
| ref-28 | 2020 | Wang, Huiyu; Zhu, Yukun; et al. | Axial-deeplab: Stand-alone axial-attention for panoptic segmentation |
| ref-29 | 2019 | Wang, Qiang; Li, Bei; et al. | Learning deep transformer models for machine translation |
| ref-30 | 2021 | Wang, Tao; Yuan, Li; et al. | PnP-DETR: towards efficient visual analysis with transformers |
| ref-31 | 2021 | Yao, Zhuyu; Ai, Jiangbo; et al. | Efficient DETR: improving end-to-end object detector with dense prior |
| ref-32 | 2021 | Zhu, Xizhou; Su, Weijie; et al. | Deformable DETR: deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 按功能归类

**Background (背景方法):**
- DETR (Carion et al., 2020): 首个端到端目标检测器，通过集合匹配消除 NMS，是本文基础方法
- Transformer (Vaswani et al., 2017): 核心架构但计算开销大
- 可变形卷积 (Dai et al., 2017): 可变形注意力的灵感来源
- 辅助损失 (Lee et al., 2015; Szegedy et al., 2015): 向深层网络传递梯度的经典技术
- RPN (Ren et al., 2015): 成功利用骨干特征进行目标性检测
- Sun et al. (2021): 中间层损失帮助区分混淆特征的分析

**Baseline (基线方法):**
- Deformable DETR (Zhu et al., 2021): 本文直接改进的基线，通过可变形注意力解决收敛问题

**Contrast (对比方法):**
- PnP-DETR (Wang et al., 2021): 同样稀疏化编码器但破坏 2D 结构，无法与 Deformable DETR 集成
- DynamicViT (Rao et al., 2021) & IA-RED² (Pan et al., 2021): 联合学习 token 选择器但关注分类任务
- FPN (Lin et al., 2017): DETR 无法有效利用的多尺度特征方法

**Component (组件方法):**
- Swin Transformer (Liu et al., 2021): 本文使用的先进 Vision Transformer 骨干网络
- Efficient DETR (Yao et al., 2021): 启发 top-k 解码器查询选择策略

**Dataset (数据集):**
- COCO (Lin et al., 2014): 实验评估基准


# YOLACT: Real-time Instance Segmentation (2019)

- Paper ref: 1:2KUGMFL2
- Title: YOLACT: Real-time Instance Segmentation
- Year: 2019

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2002 | Shivani Agarwal; Dan Roth | Learning a sparse representation for object detection |
| ref-2 | 2015 | Badrinarayanan, Alex Kendall | Segnet: A deep convolutional encoder-decoder architecture for image segmentation |
| ref-3 | 2017 | - [3] Min Bai; Raquel Urtasun | Deep watershed transform for instance segmentation |
| ref-4 | 2018 | Chen, Alexander Hermans; Papandreou, Florian Schroff | Masklab: Instance segmentation by refining object detection with semantic and direction features |
| ref-5 | 2016 | Cordts, Mohamed Omran; Ramos, Timo Rehfeld; et al. | The cityscapes dataset for semantic urban scene understanding |
| ref-6 | 2016 | Dai, Kaiming He; Li, Shaoqing Ren | Instance-sensitive fully convolutional networks |
| ref-7 | 2016 | Dai, Kaiming He | Instance-aware semantic segmentation via multi-task network cascades |
| ref-8 | 2016 | Dai, Yi Li | R-fcn: Object detection via region-based fully convolutional networks |
| ref-9 | 2017 | Brabandere, Davy Neven | Semantic instance segmentation with a discriminative loss function |
| ref-10 | 2009 | Deng, Wei Dong; Socher, Li-Jia Li | Imagenet: A Large-Scale Hierarchical Image Database |
| ref-11 | 2017 | Dvornik, Konstantin Shmelkov | Blitznet: A real-time deep network for scene understanding |
| ref-12 | 2010 | Everingham, Luc Van Gool; Williams, John Winn | The pascal visual object classes (voc) challenge |
| ref-13 | 2017 | Fathi, Zbigniew Wojna; Rathod, Peng Wang; et al. | Se- - mantic instance segmentation via deep metric learning |
| ref-14 | 2019 | Fu, Mykhailo Shvets | Retinamask: Learning to predict masks improves stateof-the-art single-shot detection for free |
| ref-15 | 2012 | Geiger, Philip Lenz | Are we ready for autonomous driving? the kitti vision benchmark suite |
| ref-16 | 2011 | Hariharan, Pablo Arbel; Bourdev, Subhransu Maji | Semantic contours from inverse detectors |
| ref-17 | 2017 | Harley, Konstantinos Derpanis | Segmentation-aware convolutional networks using local attention masks |
| ref-18 | 2017 | He, Georgia Gkioxari | Mask r-cnn |
| ref-19 | 2016 | He, Xiangyu Zhang | Deep residual learning for image recognition |
| ref-20 | 2019 | Huang, Lichao Huang; Gong, Chang Huang | Mask scoring r-cnn |
| ref-21 | 2017 | Jetley, Michael Sapienza | Straight to shapes: real-time detection of encoded shapes |
| ref-22 | 2017 | Kirillov, Evgeny Levinkov; Andres, Bogdan Savchynskyy | Instancecut: from edges to instances with multicut |
| ref-23 | 2001 | - [23] Thomas Leung; Jitendra Malik | Representing and recognizing the visual appearance of materials using threedimensional textons |
| ref-24 | 2017 | Li, Haozhi Qi; Dai, Xiangyang Ji | Fully convolutional instance-aware semantic segmentation |
| ref-25 | 2018 | Liang, Liang Lin; Wei, Xiaohui Shen | Proposal-free network for instance-level object segmentation |
| ref-26 | 2017 | Lin, Piotr Doll; Girshick, Kaiming He | Feature pyramid networks for object detection |
| ref-27 | 2017 | Lin, Priya Goyal; Girshick, Kaiming He | Focal loss for dense object detection |
| ref-28 | 2014 | Lin, Michael Maire; Belongie, James Hays; et al. | Microsoft coco: Common objects in context |
| ref-29 | 2013 | Zhang, Bernard Ghanem; Liu, Changsheng Xu | Low-rank sparse coding for image classification |
| ref-30 | 2018 | Zhao, Xiaojuan Qi; Shen, Jianping Shi | Icnet for real-time semantic segmentation on high-resolution images |
| ref-31 | 2018 | Liu, Lu Qi; Qin, Jianping Shi | Path aggregation network for instance segmentation |
| ref-32 | 2016 | Liu, Dragomir Anguelov; Erhan, Christian Szegedy; et al. | Ssd: Single shot multibox detector |
| ref-33 | 2015 | Long, Evan Shelhamer | Fully convolutional networks for semantic segmentation |
| ref-34 | 2017 | Newell, Zhiao Huang | Associative embedding: End-to-end learning for joint detection and grouping |
| ref-35 | 2016 | Paszke, Abhishek Chaurasia | Enet: A deep neural network architecture for real-time semantic segmentation |
| ref-36 | 2016 | Redmon, Santosh Divvala | You only look once: Unified, real-time object detection |
| ref-37 | 2017 | - [35] Joseph Redmon; Ali Farhadi | Yolo9000: Better, faster, stronger |
| ref-38 | 2018 | - [36] Joseph Redmon; Ali Farhadi | Yolov3: An incremental improvement |
| ref-39 | 2015 | Ren, Kaiming He | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-40 | 2013 | - [38] Xiaofeng Ren; Deva Ramanan | Histograms of sparse codes for object detection |
| ref-41 | 2016 | Shrivastava, Abhinav Gupta | Training region-based object detectors with online hard example mining |
| ref-42 | 2003 | - [40] Josef Sivic; Andrew Zisserman | Video google: A text retrieval approach to object matching in videos |
| ref-43 | 2016 | Treml, Jos; Arjona-Medina, Thomas Unterthiner; et al. | Speeding up semantic segmentation for autonomous driving |
| ref-44 | 2018 | Uhrig, Eike Rehder | Box2pix: Single-shot instance segmentation by assigning pixels to object boxes |
| ref-45 | 2010 | Wang, Jianchao Yang; Yu, Fengjun Lv | Locality-constrained linear coding for image classification |
| ref-46 | 2010 | Yang, John Wright | Image super-resolution via sparse representation |
| ref-47 | 2007 | Yu, Li Yi | Object detection using shape codebook |

## Citation Analysis Report

#### 总体总结
本文在文献综述部分构建了一个清晰的技术叙事。首先通过两阶段方法（Mask R-CNN、FCIS、PANet、RetinaMask）的回顾，指出现有实例分割方法在精度上取得了显著进展但均无法达到实时速度。其次，通过一阶段实例分割方法（FCIS等）的分析，说明即使概念上更快的一阶段方法仍需重池化或复杂后处理。然后，论文通过展示实时目标检测（SSD、YOLO系列）和实时语义分割（SegNet、ENet、ICNet、BlitzNet）的已有成果，凸显了实时实例分割领域的空白。最后，通过原型表示（textons、视觉单词、稀疏编码）的历史回顾，为YOLACT的原型掩码方法建立了理论背景。整体论证策略是先铺陈现有方法的局限，再引出本文提出的原型+系数并行范式作为解决方案。


#### 关键文献

- [18] He, Georgia Gkioxari, 2017: Mask r-cnn (Uncategorized)

- [24] Li, Haozhi Qi, 2017: Fully convolutional instance-aware semantic segmentation (Contrast)

- [30] Liu, Dragomir Anguelov, 2016: Ssd: Single shot multibox detector (Uncategorized)

- [35] - [35] Joseph Redmon, 2017: Yolo9000: Better, faster, stronger (Uncategorized)

- [36] - [36] Joseph Redmon, 2018: Yolov3: An incremental improvement (Uncategorized)



#### 范围
- 章节: Introduction + Related Work
- 行号: 9-53

#### 按功能归类


##### Background

- [1] Shivani Agarwal, 2002
  - 标题: Learning a sparse representation for object detection
  - 关键词: sparse representation, object detection, prototype, codebook
  - 总结: The paper cites this work to situate its prototype-based approach within the broader history of using learned prototypes/vocabularies in computer vision, noting that prior works used prototypes to represent features while YOLACT uses them to assemble masks.

- [2] Badrinarayanan, Alex Kendall, 2015
  - 标题: Segnet: A deep convolutional encoder-decoder architecture for image segmentation
  - 关键词: real-time, semantic segmentation, SegNet
  - 总结: Used to establish that the broader field of semantic segmentation has achieved real-time speeds, making the absence of real-time instance segmentation methods more notable.

- [5] Cordts, Mohamed Omran, 2016
  - 标题: The cityscapes dataset for semantic urban scene understanding
  - 关键词: Cityscapes, dataset, urban scenes
  - 总结: Referenced as the evaluation dataset for Box2Pix, establishing the performance context (10.9 fps on Cityscapes) for comparing real-time instance segmentation methods.

- [8] Dai, Yi Li, 2016
  - 标题: R-fcn: Object detection via region-based fully convolutional networks
  - 关键词: R-FCN, object detection, region-based
  - 总结: Referenced to establish that instance segmentation methods draw on established object detection advances, positioning the field's reliance on detection backbones.

- [9] Brabandere, Davy Neven, 2017
  - 标题: Semantic instance segmentation with a discriminative loss function
  - 关键词: discriminative loss, embedding, instance segmentation
  - 总结: Used to illustrate a class of approaches that learn embeddings for instance grouping, arguing these have multiple stages and expensive clustering limiting real-time viability.

- [11] Dvornik, Konstantin Shmelkov, 2017
  - 标题: Blitznet: A real-time deep network for scene understanding
  - 关键词: BlitzNet, real-time, scene understanding
  - 总结: Referenced as evidence that the semantic segmentation subfield has achieved real-time speeds, highlighting the gap in instance segmentation.

- [12] Everingham, Luc Van Gool, 2010
  - 标题: The pascal visual object classes (voc) challenge
  - 关键词: Pascal VOC, dataset, benchmark
  - 总结: Used as the dataset reference for Box2Pix evaluation context (30 fps on Pascal SBD 2012).

- [13] Fathi, Zbigniew Wojna, 2017
  - 标题: Se- - mantic instance segmentation via deep metric learning
  - 关键词: deep metric learning, instance segmentation, embedding
  - 总结: Used to illustrate the embedding-based approach to instance segmentation, arguing such methods involve expensive procedures limiting real-time performance.

- [15] Geiger, Philip Lenz, 2012
  - 标题: Are we ready for autonomous driving? the kitti vision benchmark suite
  - 关键词: KITTI, autonomous driving, benchmark
  - 总结: Referenced as the dataset for Box2Pix evaluation, establishing the performance benchmark context.

- [16] Hariharan, Pablo Arbel, 2011
  - 标题: Semantic contours from inverse detectors
  - 关键词: semantic contours, inverse detectors
  - 总结: Referenced for dataset/method context related to Pascal SBD 2012 evaluation.

- [23] - [23] Thomas Leung, 2001
  - 标题: Representing and recognizing the visual appearance of materials using threedimensional textons
  - 关键词: textons, visual words, classical representation
  - 总结: Referenced to establish the historical context of prototype-based representations in computer vision, contrasting classical hand-crafted prototypes with YOLACT's learned image-specific prototypes.

- [28] Lin, Michael Maire, 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: MS COCO, dataset, benchmark, instance segmentation
  - 总结: Referenced as the primary evaluation dataset, establishing the benchmark context for comparing instance segmentation methods.

- [46] Zhang, Bernard Ghanem, 2013
  - 标题: Low-rank sparse coding for image classification
  - 关键词: low-rank, sparse coding, classification, sparsity priors
  - 总结: Used to establish the classical prototype representation background, contrasting with YOLACT's learned image-specific prototype masks.

- [47] Zhao, Xiaojuan Qi, 2018
  - 标题: Icnet for real-time semantic segmentation on high-resolution images
  - 关键词: ICNet, real-time, semantic segmentation, high-resolution
  - 总结: Used as evidence that semantic segmentation has achieved real-time performance, highlighting the gap in instance segmentation.

- [32] Newell, Zhiao Huang, 2017
  - 标题: Associative embedding: End-to-end learning for joint detection and grouping
  - 关键词: ENet, real-time, semantic segmentation
  - 总结: Referenced as evidence of real-time semantic segmentation, contrasting with the lack of real-time instance segmentation.

- [37] Ren, Kaiming He, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: sparse codes, object detection, shape codebook
  - 总结: Used to establish the classical prototype representation lineage for object detection.

- [38] - [38] Xiaofeng Ren, 2013
  - 标题: Histograms of sparse codes for object detection
  - 关键词: visual words, object matching, text retrieval
  - 总结: Referenced to establish the classical vocabulary/prototype approach lineage in computer vision.

- [40] - [40] Josef Sivic, 2003
  - 标题: Video google: A text retrieval approach to object matching in videos
  - 关键词: semantic segmentation, autonomous driving, real-time
  - 总结: Used as evidence of real-time semantic segmentation progress, highlighting the instance segmentation speed gap.

- [42] Uhrig, Eike Rehder, 2018
  - 标题: Box2pix: Single-shot instance segmentation by assigning pixels to object boxes
  - 关键词: locality-constrained, linear coding, classification
  - 总结: Referenced to establish classical prototype representation advances, contrasting with YOLACT's approach.

- [43] Wang, Jianchao Yang, 2010
  - 标题: Locality-constrained linear coding for image classification
  - 关键词: sparse representation, super-resolution, image processing
  - 总结: Used to establish the classical prototype/sparsity representation background.

- [44] Yang, John Wright, 2010
  - 标题: Image super-resolution via sparse representation
  - 关键词: shape codebook, object detection, prototype
  - 总结: Referenced to establish the prototype/codebook lineage in object detection, contrasting with YOLACT's learned image-specific prototypes.



##### Contrast

- [3] - [3] Min Bai, 2017
  - 标题: Deep watershed transform for instance segmentation
  - 关键词: pixel clustering, instance segmentation, watershed
  - 总结: The paper uses this citation to illustrate a class of methods that first segment semantically then cluster pixels into instances, arguing these involve expensive clustering procedures unsuitable for real-time.

- [4] Chen, Alexander Hermans, 2018
  - 标题: Masklab: Instance segmentation by refining object detection with semantic and direction features
  - 关键词: one-stage, direction features, semantic segmentation, MaskLab
  - 总结: Used to show that even one-stage instance segmentation methods require repooling or complex computations (like direction prediction), limiting their speed advantage over two-stage approaches.

- [6] Dai, Kaiming He, 2016
  - 标题: Instance-sensitive fully convolutional networks
  - 关键词: position-sensitive pooling, instance-sensitive, FCN
  - 总结: Used alongside FCIS [24] to illustrate that one-stage instance segmentation methods generate position-sensitive maps assembled via pooling, still requiring feature repooling that bottlenecks speed.

- [17] Harley, Konstantinos Derpanis, 2017
  - 标题: Segmentation-aware convolutional networks using local attention masks
  - 关键词: attention masks, instance segmentation, convolutional
  - 总结: Used to illustrate embedding/clustering-based instance segmentation methods that limit real-time viability.

- [20] Huang, Lichao Huang, 2019
  - 标题: Mask scoring r-cnn
  - 关键词: mask scoring, localization accuracy, Mask R-CNN improvement
  - 总结: Used to show that even improvements to Mask R-CNN remain two-stage approaches unable to achieve real-time speeds.

- [21] Jetley, Michael Sapienza, 2017
  - 标题: Straight to shapes: real-time detection of encoded shapes
  - 关键词: real-time, shape detection, accuracy gap
  - 总结: Used to show that existing real-time methods sacrifice too much accuracy, establishing the need for YOLACT's approach that balances both.

- [22] Kirillov, Evgeny Levinkov, 2017
  - 标题: Instancecut: from edges to instances with multicut
  - 关键词: multicut, boundary detection, instance segmentation
  - 总结: Used to illustrate methods that perform semantic segmentation followed by boundary detection, arguing these multi-stage approaches are unsuitable for real-time.

- [24] Li, Haozhi Qi, 2017
  - 标题: Fully convolutional instance-aware semantic segmentation
  - 关键词: FCIS, one-stage, instance-aware, position-sensitive
  - 总结: The paper uses FCIS to illustrate the limitations of existing one-stage instance segmentation: despite being conceptually faster, FCIS requires significant post-processing (position-sensitive pooling, mask voting) keeping it far from real-time speeds.

- [25] Liang, Liang Lin, 2018
  - 标题: Proposal-free network for instance-level object segmentation
  - 关键词: proposal-free, instance segmentation, pixel clustering
  - 总结: Used alongside [3] to illustrate clustering-based instance segmentation methods that involve expensive procedures.

- [29] Liu, Lu Qi, 2018
  - 标题: Path aggregation network for instance segmentation
  - 关键词: PANet, path aggregation, FPN enrichment, Mask R-CNN improvement
  - 总结: Used to show that state-of-the-art two-stage methods focus on accuracy improvements while remaining unable to achieve real-time speeds.

- [41] Treml, Jos, 2016
  - 标题: Speeding up semantic segmentation for autonomous driving
  - 关键词: Box2Pix, single-shot, real-time, instance segmentation
  - 总结: Used to show existing real-time instance segmentation approaches sacrifice too much accuracy, establishing YOLACT's contribution of balancing both.



##### Uncategorized

- [18] He, Georgia Gkioxari, 2017
  - 标题: Mask r-cnn
  - 关键词: Mask R-CNN, two-stage, instance segmentation, RoIAlign, baseline
  - 总结: The paper uses Mask R-CNN as the primary competitive baseline, citing it to establish the two-stage paradigm that YOLACT seeks to replace. The paper compares speed, accuracy, mask quality, and temporal stability against Mask R-CNN throughout.

- [19] He, Xiangyu Zhang, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, residual learning, backbone, feature extraction
  - 总结: Referenced as the feature backbone foundation for YOLACT, with ResNet-101 used as the default configuration.

- [30] Liu, Dragomir Anguelov, 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: SSD, real-time, object detection, one-stage
  - 总结: The paper cites SSD as a paradigm for real-time object detection that instance segmentation lacks an equivalent for. YOLACT aims to be to instance segmentation what SSD is to object detection.

- [33] Paszke, Abhishek Chaurasia, 2016
  - 标题: Enet: A deep neural network architecture for real-time semantic segmentation
  - 关键词: YOLO, real-time, object detection
  - 总结: Referenced as part of the YOLO family of real-time detectors that inspire YOLACT's speed-focused design.

- [34] Redmon, Santosh Divvala, 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: YOLO9000, real-time, object detection
  - 总结: Used to show the trajectory of real-time object detection improvements, setting expectations for what might be possible in instance segmentation.

- [35] - [35] Joseph Redmon, 2017
  - 标题: Yolo9000: Better, faster, stronger
  - 关键词: YOLOv3, motivation, masks, real-time
  - 总结: The paper opens with a YOLOv3-related quote from Redmon ('I can't get YOLO to learn them') as motivation. YOLOv3 is also cited as a real-time detection baseline for comparison in the Appendix.

- [36] - [36] Joseph Redmon, 2018
  - 标题: Yolov3: An incremental improvement
  - 关键词: Faster R-CNN, region proposal, two-stage, detection backbone
  - 总结: Referenced to establish that dominant instance segmentation methods build on two-stage detection architectures, which YOLACT seeks to move beyond.

- [45] Yu, Li Yi, 2007
  - 标题: Object detection using shape codebook
  - 关键词: FPN, feature pyramid, multi-scale, backbone
  - 总结: Referenced as the multi-scale feature extraction method that YOLACT builds upon, providing the deep backbone features for prototype generation.





#### 时间线分析

##### 早期
早期工作奠定了原型表示和视觉词汇的基础。Textons、视觉单词和稀疏表示等方法为对象检测建立了经典的原型/词汇表范式，使用手工特征或浅层学习来表示视觉模式。ImageNet 大规模层次化图像数据库的构建为后续深度学习提供了关键数据基础。


- [1] Shivani Agarwal, 2002: Learning a sparse representation for object detection

- [23] - [23] Thomas Leung, 2001: Representing and recognizing the visual appearance of materials using threedimensional textons

- [46] Zhang, Bernard Ghanem, 2013: Low-rank sparse coding for image classification

- [38] - [38] Xiaofeng Ren, 2013: Histograms of sparse codes for object detection

- [42] Uhrig, Eike Rehder, 2018: Box2pix: Single-shot instance segmentation by assigning pixels to object boxes

- [43] Wang, Jianchao Yang, 2010: Locality-constrained linear coding for image classification

- [44] Yang, John Wright, 2010: Image super-resolution via sparse representation




##### 中期
中期见证了深度学习彻底变革目标检测和实例分割的过程。Faster R-CNN 建立两阶段检测范式，ResNet 提供深度特征骨干，FPN 实现多尺度特征提取。SSD 和 YOLO 系列开创一阶段实时检测。Mask R-CNN 将实例分割建立在两阶段检测之上成为主导方法。FCIS 探索一阶段实例分割但需大量后处理。SegNet、ENet、ICNet 等在语义分割领域实现实时速度，凸显实例分割领域缺乏实时方法的空白。深度度量学习和嵌入方法也在此时期出现。


- [2] Badrinarayanan, Alex Kendall, 2015: Segnet: A deep convolutional encoder-decoder architecture for image segmentation

- [3] - [3] Min Bai, 2017: Deep watershed transform for instance segmentation

- [5] Cordts, Mohamed Omran, 2016: The cityscapes dataset for semantic urban scene understanding

- [6] Dai, Kaiming He, 2016: Instance-sensitive fully convolutional networks

- [8] Dai, Yi Li, 2016: R-fcn: Object detection via region-based fully convolutional networks

- [9] Brabandere, Davy Neven, 2017: Semantic instance segmentation with a discriminative loss function

- [11] Dvornik, Konstantin Shmelkov, 2017: Blitznet: A real-time deep network for scene understanding

- [12] Everingham, Luc Van Gool, 2010: The pascal visual object classes (voc) challenge

- [13] Fathi, Zbigniew Wojna, 2017: Se- - mantic instance segmentation via deep metric learning

- [15] Geiger, Philip Lenz, 2012: Are we ready for autonomous driving? the kitti vision benchmark suite

- [16] Hariharan, Pablo Arbel, 2011: Semantic contours from inverse detectors

- [17] Harley, Konstantinos Derpanis, 2017: Segmentation-aware convolutional networks using local attention masks

- [18] He, Georgia Gkioxari, 2017: Mask r-cnn

- [19] He, Xiangyu Zhang, 2016: Deep residual learning for image recognition

- [21] Jetley, Michael Sapienza, 2017: Straight to shapes: real-time detection of encoded shapes

- [22] Kirillov, Evgeny Levinkov, 2017: Instancecut: from edges to instances with multicut

- [24] Li, Haozhi Qi, 2017: Fully convolutional instance-aware semantic segmentation

- [25] Liang, Liang Lin, 2018: Proposal-free network for instance-level object segmentation

- [28] Lin, Michael Maire, 2014: Microsoft coco: Common objects in context

- [47] Zhao, Xiaojuan Qi, 2018: Icnet for real-time semantic segmentation on high-resolution images

- [29] Liu, Lu Qi, 2018: Path aggregation network for instance segmentation

- [30] Liu, Dragomir Anguelov, 2016: Ssd: Single shot multibox detector

- [32] Newell, Zhiao Huang, 2017: Associative embedding: End-to-end learning for joint detection and grouping

- [33] Paszke, Abhishek Chaurasia, 2016: Enet: A deep neural network architecture for real-time semantic segmentation

- [34] Redmon, Santosh Divvala, 2016: You only look once: Unified, real-time object detection

- [35] - [35] Joseph Redmon, 2017: Yolo9000: Better, faster, stronger

- [36] - [36] Joseph Redmon, 2018: Yolov3: An incremental improvement

- [37] Ren, Kaiming He, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [40] - [40] Josef Sivic, 2003: Video google: A text retrieval approach to object matching in videos

- [41] Treml, Jos, 2016: Speeding up semantic segmentation for autonomous driving




##### 近期
近期工作聚焦于提升实例分割精度和探索实时性能。Mask Scoring R-CNN 和 PANet 在 Mask R-CNN 基础上进一步改善精度但仍为两阶段。YOLOv3 作为一阶段检测的最新进展，其作者关于'无法让 YOLO 学习掩码'的评论直接激发了本研究动机。Straight to Shapes 和 Box2Pix 尝试实时实例分割但精度不足。本论文提出的 YOLACT 是首个在 COCO 上同时实现 >30 fps 和约 30 mAP 的方法。


- [4] Chen, Alexander Hermans, 2018: Masklab: Instance segmentation by refining object detection with semantic and direction features

- [20] Huang, Lichao Huang, 2019: Mask scoring r-cnn

- [45] Yu, Li Yi, 2007: Object detection using shape codebook


# DETR3D: 3D object detection from multi-view images via 3D-to-2D queries (2022)

- Paper ref: 1:3JUY9GBQ
- Title: DETR3D: 3D object detection from multi-view images via 3D-to-2D queries
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | X. Zhou; D. Wang; et al. | Krahenb uhl |
| ref-2 | 2021 | T. Wang; X. Zhu; et al. | FCOS3D: Fully convolutional one-stage monocular 3d object detection |
| ref-3 | 2019 | Z. Tian; C. Shen; et al. | FCOS: Fully convolutional one-stage object detection |
| ref-4 | 2019 | C. Godard; O. Mac Aodha; et al. | Digging into self-supervised monocular depth prediction |
| ref-5 | 2019 | J. H. Lee; M.-K. Han; et al. | From big to small: Multi-scale local planar guidance for monocular depth estimation |
| ref-6 | 2020 | V. Guizilini; R. Ambrus; et al. | 3d packing for self-supervised monocular depth estimation |
| ref-7 | 2020 | A. Simonelli; S. Rota Bulo; et al. | Demystifying pseudo-lidar for monocular 3d object detection, 12 2020. |
| ref-8 | 2016 | K. He; X. Zhang; et al. | Deep residual learning for image recognition |
| ref-9 | 2017 | A. Vaswani; N. Shazeer; et al. | Attention is all you need |
| ref-10 | 2020 | N. Carion; F. Massa; et al. | End-to-end object detection with transformers |
| ref-11 | 2021 | Anonymous | Object dgcnn: 3d object detection using dynamic graphs |
| ref-12 | 2014 | R. Girshick; J. Donahue; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-13 | 2015 | S. Ren; K. He; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-14 | 2017 | K. He; G. Gkioxari; et al. | Mask R-CNN |
| ref-15 | 2016 | W. Liu; D. Anguelov; et al. | SSD: Single shot multibox detector |
| ref-16 | 2016 | J. Redmon; S. K. Divvala; et al. | You only look once: Unified, realtime object detection |
| ref-17 | 2021 | X. Zhu; W. Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-18 | 2020 | Z. Sun; S. Cao; et al. | Rethinking transformer-based set prediction for object detection |
| ref-19 | 2020 | P. Sun; R. Zhang; et al. | SparseR-CNN: End-to-end object detection with learnable proposals |
| ref-20 | 2020 | P. Sun; Y. Jiang; et al. | OneNet: Towards end-to-end one-stage object detection |
| ref-21 | 2016 | X. Chen; K. Kundu; et al. | Monocular 3d object detection for autonomous driving |
| ref-22 | 2018 | T. Roddick; A. Kendall; et al. | Orthographic feature transform for monocular 3d object detection |
| ref-23 | 2017 | A. Mousavian; D. Anguelov; et al. | 3d bounding box estimation using deep learning and geometry |
| ref-24 | 2017 | W. Kehl; F. Manhardt; et al. | Ssd-6d: Making rgb-based 3d detection and 6d pose estimation great again |
| ref-25 | 2019 | J. Ku; A. D. Pon; et al. | Monocular 3d object detection leveraging accurate proposals and shape reconstruction |
| ref-26 | 2020 | D. Beker; H. Kato; et al. | Monocular differentiable rendering for self-supervised 3d object detection |
| ref-27 | 2019 | I. Barabanau; A. Artemov; et al. | Monocular 3d object detection via geometric reasoning on keypoints |
| ref-28 | 2020 | Z. Liu; Z. Wu; et al. | Smoke: single-stage monocular 3d object detection via keypoint estimation |
| ref-29 | 2017 | T.-Y | Lin, P |
| ref-30 | 2016 | R. Stewart; M. Andriluka; et al. | End-to-end people detection in crowded scenes |
| ref-31 | 2017 | T.-Y | Lin, P |
| ref-32 | 1955 | H. W. Kuhn; B. Yaw | The hungarian method for the assignment problem |
| ref-33 | 2019 | H. Caesar; V. Bankiti; et al. | nuscenes: A multimodal dataset for autonomous driving |
| ref-34 | 2017 | J. Dai; H. Qi; et al. | Deformable convolutional networks |
| ref-35 | 2016 | L. J. Ba; J. R. Kiros; et al. | Layer normalization |
| ref-36 | 2019 | I. Loshchilov; F. Hutter | Decoupled weight decay regularization |
| ref-37 | 2021 | D. Park; R. Ambrus; et al. | Is pseudo-lidar needed for monocular 3d object detection? In IEEE/CVF International Conference on Co |
| ref-38 | 2018 | F. Yu; D. Wang; et al. | Deep layer aggregation |
| ref-39 | 2019 | B. Zhu; Z. Jiang; et al. | Class-balanced Grouping and Sampling for Point Cloud 3D Object Detection |
| ref-40 | 2021 | T. Wang; X. ZHU; et al. | Probabilistic and geometric depth: Detecting objects in perspective |
| ref-41 | 2021 | T. Yin; X. Zhou; et al. | Krahenb uhl |
| ref-42 | 2019 | Y. Wang; W.-L. Chao; et al. | Pseudo-lidar from visual depth estimation: Bridging the gap in 3d object detection for autonomous driving |

## Citation Analysis Report

#### 总体总结
本文引用文献展现了从传统2D目标检测、基于集合的Transformer检测、到单目3D检测的清晰技术演进脉络。论文将前人工作组织为三条研究线索：（1）2D检测从两阶段R-CNN系列到单阶段SSD/YOLO，再到无锚点的CenterNet/FCOS范式演进；（2）DETR开创的端到端集合预测范式及其快速改进（Deformable DETR、SparseR-CNN等），消除了NMS后处理需求；（3）单目3D检测从早期Mono3D到基于2D检测器的3D回归方法，再到伪激光雷达路线及其复合误差问题。本文在这些工作的基础上提出DETR3D框架，将2D特征提取与3D预测通过几何反投影直接连接，采用集合预测损失实现端到端训练，无需深度估计网络和NMS后处理。关键参考文献包括作为对比基线的CenterNet和FCOS3D、提供集合预测范式的DETR、以及提供注意力机制基础的Transformer。


#### 关键文献

- [1] X. Zhou, 2019: Krahenb uhl (Baseline)

- [2] T. Wang, 2021: FCOS3D: Fully convolutional one-stage monocular 3d object detection (Baseline)

- [9] A. Vaswani, 2017: Attention is all you need (Component)

- [10] N. Carion, 2020: End-to-end object detection with transformers (Component)



#### 范围
- 章节: Introduction + Related Work
- 行号: 17-44

#### 按功能归类


##### Baseline

- [1] X. Zhou, 2019
  - 标题: Krahenb uhl
  - 关键词: CenterNet, 2D detection, monocular 3D detection, baseline
  - 总结: CenterNet is an anchor-free 2D object detection method adapted for 3D detection. It predicts 3D information through a 2D detection pipeline without considering 3D scene structure or sensor configuration, requiring post-processing to fuse predictions across cameras.

- [2] T. Wang, 2021
  - 标题: FCOS3D: Fully convolutional one-stage monocular 3d object detection
  - 关键词: FCOS3D, monocular 3D detection, fully convolutional, baseline
  - 总结: FCOS3D employs a fully convolutional one-stage pipeline for monocular 3D object detection. It processes each image independently and uses both per-image and global NMS to remove redundant boxes in multi-view settings.



##### Component

- [3] Z. Tian, 2019
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: FCOS, per-pixel prediction, one-stage detection, anchor-free
  - 总结: FCOS is a fully convolutional one-stage object detector that shifts from per-anchor prediction to per-pixel prediction, significantly simplifying the common object detection pipeline.

- [4] C. Godard, 2019
  - 标题: Digging into self-supervised monocular depth prediction
  - 关键词: monocular depth estimation, self-supervised learning, pseudo-LiDAR
  - 总结: A self-supervised monocular depth prediction approach that can be used to create pseudo-LiDAR representations from camera images for downstream 3D object detection.

- [5] J. H. Lee, 2019
  - 标题: From big to small: Multi-scale local planar guidance for monocular depth estimation
  - 关键词: monocular depth estimation, multi-scale, planar guidance
  - 总结: A multi-scale local planar guidance approach for monocular depth estimation that generates dense depth maps used as input for pseudo-LiDAR-based 3D detection.

- [6] V. Guizilini, 2020
  - 标题: 3d packing for self-supervised monocular depth estimation
  - 关键词: PackNet, 3D packing, self-supervised, monocular depth
  - 总结: PackNet introduces 3D packing for self-supervised monocular depth estimation. Used in this paper as the depth prediction network for the pseudo-LiDAR baseline comparison.

- [8] K. He, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, backbone, feature extraction, image encoder
  - 总结: Deep residual learning framework (ResNet) used as the 2D feature extraction backbone in the DETR3D architecture, optionally with deformable convolutions.

- [9] A. Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, self-attention, multi-head attention
  - 总结: The foundational Transformer architecture introducing multi-head self-attention, used in DETR3D to model interactions between object queries after feature sampling.

- [10] N. Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, set prediction, transformer detection, set-to-set loss
  - 总结: DETR casts object detection as a set-to-set prediction problem using transformers, eliminating the need for NMS. DETR3D adopts its set-to-set loss and set prediction paradigm.

- [11] Anonymous, 2021
  - 标题: Object dgcnn: 3d object detection using dynamic graphs
  - 关键词: Object DGCNN, 3D detection, dynamic graphs, NMS-free
  - 总结: Object DGCNN models 3D object detection as message passing on a dynamic graph. Like DETR3D, it does not require NMS post-processing, serving as a methodological comparison point.

- [17] X. Zhu, 2021
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, deformable attention, convergence, transformer detection
  - 总结: Deformable DETR analyzes DETR's slow convergence and proposes a deformable self-attention module that localizes features, accelerating training significantly.

- [18] Z. Sun, 2020
  - 标题: Rethinking transformer-based set prediction for object detection
  - 关键词: set prediction, convergence, TSP-FCOS, transformer cross-attention
  - 总结: Analyzes the slow convergence of DETR and attributes it to the set-based loss and cross-attention mechanism, proposing TSP-FCOS and TSP-RCNN to address these issues.

- [19] P. Sun, 2020
  - 标题: SparseR-CNN: End-to-end object detection with learnable proposals
  - 关键词: SparseR-CNN, set prediction, RCNN, NMS-free
  - 总结: SparseR-CNN incorporates set prediction into an RCNN-style detection pipeline, achieving state-of-the-art results without NMS post-processing.

- [20] P. Sun, 2020
  - 标题: OneNet: Towards end-to-end one-stage object detection
  - 关键词: OneNet, NMS-free, set loss, dense detection
  - 总结: OneNet studies the phenomenon that dense-based object detectors can achieve NMS-free detection when equipped with a minimum-cost set matching loss.

- [26] D. Beker, 2020
  - 标题: Monocular differentiable rendering for self-supervised 3d object detection
  - 关键词: differentiable rendering, self-supervised, monocular 3D detection
  - 总结: Explores differentiable rendering techniques for self-supervised monocular 3D object detection, using rendering-based supervision to improve detection.

- [27] I. Barabanau, 2019
  - 标题: Monocular 3d object detection via geometric reasoning on keypoints
  - 关键词: keypoint detection, geometric reasoning, monocular 3D detection
  - 总结: Performs monocular 3D object detection via geometric reasoning on keypoints, using 2D keypoint detections to infer 3D structure.

- [28] Z. Liu, 2020
  - 标题: Smoke: single-stage monocular 3d object detection via keypoint estimation
  - 关键词: SMOKE, keypoint estimation, single-stage, monocular 3D detection
  - 总结: SMOKE is a single-stage monocular 3D object detector that uses keypoint estimation to predict 3D bounding boxes, operating independently on each camera frame.



##### Contrast

- [7] A. Simonelli, 2020
  - 标题: Demystifying pseudo-lidar for monocular 3d object detection, 12 2020.
  - 关键词: pseudo-LiDAR, compounding errors, depth estimation error
  - 总结: Analyzes and demystifies the pseudo-LiDAR approach for monocular 3D object detection, highlighting issues with error propagation from depth estimation to detection.



##### Historical

- [12] R. Girshick, 2014
  - 标题: Rich feature hierarchies for accurate object detection and semantic segmentation
  - 关键词: R-CNN, object detection, deep learning, object proposals
  - 总结: R-CNN pioneered deep learning-based object detection by feeding pre-selected object proposals into convolutional neural networks, establishing the two-stage detection paradigm.

- [13] S. Ren, 2015
  - 标题: Faster R-CNN: Towards real-time object detection with region proposal networks
  - 关键词: Fast R-CNN, Faster R-CNN, region proposal network, shared features
  - 总结: Fast R-CNN introduced shared CNN processing for the entire image, and Faster R-CNN added a region proposal network that shares full-image convolutional features with the detection network.

- [14] K. He, 2017
  - 标题: Mask R-CNN
  - 关键词: Mask R-CNN, instance segmentation, two-stage detection
  - 总结: Mask R-CNN extends the Faster R-CNN framework by adding a mask prediction branch for parallel instance segmentation, representing the multi-stage refinement paradigm.

- [15] W. Liu, 2016
  - 标题: SSD: Single shot multibox detector
  - 关键词: SSD, single-shot detection, dense prediction, NMS
  - 总结: SSD performs dense object detection in a single shot, significantly faster than two-stage methods, but still requires NMS post-processing to remove redundant predictions.

- [16] J. Redmon, 2016
  - 标题: You only look once: Unified, realtime object detection
  - 关键词: YOLO, single-shot detection, real-time detection, NMS
  - 总结: YOLO is a unified real-time object detection system that performs dense predictions in a single shot, trading off some accuracy for significant speed improvements over two-stage methods.

- [21] X. Chen, 2016
  - 标题: Monocular 3d object detection for autonomous driving
  - 关键词: Mono3D, monocular 3D detection, early work, 3D proposals
  - 总结: Mono3D is an early monocular 3D object detection method that uses semantic and shape cues to select from a collection of 3D proposals, using scene constraints and additional priors.

- [22] T. Roddick, 2018
  - 标题: Orthographic feature transform for monocular 3d object detection
  - 关键词: BEV, orthographic feature transform, monocular 3D detection
  - 总结: Uses the birds-eye-view (BEV) representation for monocular 3D object detection, leveraging orthographic feature transforms to reason about 3D structure.

- [23] A. Mousavian, 2017
  - 标题: 3d bounding box estimation using deep learning and geometry
  - 关键词: 3D bounding box, 2D-3D projection, geometry, monocular 3D detection
  - 总结: Leverages 2D detections for 3D bounding box regression by minimizing 2D-3D projection error, combining deep learning with geometric constraints.

- [24] W. Kehl, 2017
  - 标题: Ssd-6d: Making rgb-based 3d detection and 6d pose estimation great again
  - 关键词: SSD-6D, 6D pose estimation, RGB detection, 2D-to-3D
  - 总结: SSD-6D adapts the single-shot detector paradigm for RGB-based 3D object detection and 6D pose estimation, using 2D detections as a starting point.

- [25] J. Ku, 2019
  - 标题: Monocular 3d object detection leveraging accurate proposals and shape reconstruction
  - 关键词: monocular 3D detection, accurate proposals, shape reconstruction
  - 总结: Proposes monocular 3D object detection leveraging accurate proposals and shape reconstruction, operating on individual camera frames before post-processing fusion.


# Rank-DETR for high quality object detection (2023)

- Paper ref: 1:3YG8UNCI
- Title: Rank-DETR for high quality object detection
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2023 | et al. | Improving DETR with simple IoU-aware BCE loss |
| ref-2 | 2022 | Cao, X.; Yuan, P.; et al. | CF-DETR: Coarse-to-fine transformers for end-to-end object detection |
| ref-3 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-4 | 2020 | Chen, K.; Lin, W.; et al. | AP-loss for accurate one-stage object detection |
| ref-5 | 2021 | Chen, X.; Yan, B.; et al. | Transformer tracking |
| ref-6 | 2022 | Cheng, B.; Misra, I.; et al. | Masked-attention mask transformer for universal image segmentation |
| ref-7 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic DETR: End-to-end object detection with dynamic attention |
| ref-8 | 2021 | Dong, B.; Zeng, F.; et al. | SOLQ: Segmenting objects by learning queries |
| ref-9 | 2021 | Fang, Y.; Yang, S.; et al. | Instances as queries |
| ref-10 | 2021 | Feng, C.; Zhong, Y.; et al. | TOOD: Task-aligned one-stage object detection |
| ref-11 | 2021 | Gao, P.; Zheng, M.; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-12 | 2022 | Gao, Z.; Wang, L.; et al. | Adamixer: A fast-converging query-based object detector |
| ref-13 | 2023 | Guo, J.; Wang, C.; et al. | Zero-shot generative model adaptation via image-specific prompt learning |
| ref-14 | 2023 | Han, Y.; Han, D.; et al. | Dynamic perceiver for efficient visual recognition |
| ref-15 | 2021 | Han, Y.; Huang, G.; et al. | Dynamic neural networks: A survey |
| ref-16 | 2021 | Han, Y.; Huang, G.; et al. | Spatially adaptive feature refinement for efficient inference |
| ref-17 | 2023 | Han, Y.; Liu, Z.; et al. | Latency-aware unified dynamic networks for efficient image recognition |
| ref-18 | 2022 | Han, Y.; Pu, Y.; et al. | Learning to weight samples for dynamic early-exiting networks |
| ref-19 | 2022 | Han, Y.; Yuan, Z.; et al. | Latency-aware spatial-wise dynamic networks |
| ref-20 | 2019 | Hansen, C.; Hansen, C.; et al. | Neural speed reading with structural-jump-lstm |
| ref-21 | 2023 | He, C.; Li, K.; et al. | Hqg-net: Unpaired medical image enhancement with high-quality guidance |
| ref-22 | 2023 | He, C.; Li, K.; et al. | Degradation-resistant unfolding network for heterogeneous image fusion |
| ref-23 | 2023 | He, C.; Li, K.; et al. | Camouflaged object detection with feature decomposition and edge reconstruction |
| ref-24 | 2023 | He, C.; Li, K.; et al. | Weakly-supervised concealed object segmentation with sam-based pseudo labeling and multi-scale feature grouping |
| ref-25 | 2023 | He, C.; Li, K.; et al. | Strategic preys make acute predators: Enhancing camouflaged object detectors by generating camouflaged objects |
| ref-26 | 2022 | He, H.; Yuan, Y.; et al. | RankSeg: Adaptive pixel classification with image category ranking for segmentation |
| ref-27 | 2018 | Huang, G.; Chen, D.; et al. | Multi-scale dense networks for resource efficient image classification |
| ref-28 | 2022 | Huang, G.; Wang, Y.; et al. | Glance and focus networks for dynamic visual recognition |
| ref-29 | 2023 | Huang, R.; Pan, X.; et al. | Joint representation learning for text and 3d point cloud |
| ref-30 | 2023 | Jia, D.; Yuan, Y.; et al. | DETRs with hybrid matching |
| ref-31 | 2018 | Jiang, B.; Luo, R.; et al. | Acquisition of localization confidence for accurate object detection |
| ref-32 | 2023 | Kahraman, F.; Oksuz, K.; et al. | Correlation loss: Enforcing correlation between classification and localization |
| ref-33 | 2023 | Lai, X.; Yuan, Y.; et al. | Mask frozen-detr: High quality instance segmentation with one gpu |
| ref-34 | 2022 | Li, F.; Zhang, H.; et al. | DN-DETR: Accelerate detr training by introducing query denoising |
| ref-35 | 2023 | Li, F.; Zhang, H.; et al. | Mask DINO: Towards a unified transformer-based framework for object detection and segmentation |
| ref-36 | 2021 | Li, K.; Wang, S.; et al. | Pose recognition with cascade transformers |
| ref-37 | 2020 | Li, X.; Wang, W.; et al. | Generalized focal loss: Learning qualified and distributed bounding boxes for dense object detection |
| ref-38 | 2022 | Li, Z.; Wang, W.; et al. | Panoptic segformer: Delving deeper into panoptic segmentation with transformers |
| ref-39 | 2023 | Liang, Z.; Yuan, Y. | Mask frozen-detr: High quality instance segmentation with one gpu |
| ref-40 | 2020 | Lin, M.; Li, C.; et al. | DETR for crowd pedestrian detection |
| ref-41 | 2017 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-42 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft COCO: Common Objects in Context |
| ref-43 | 2023 | Lin, Y.; Yuan, Y.; et al. | Detr does not need multi-scale or locality design |
| ref-44 | 2022 | Liu, S.; Li, F.; et al. | DAB-DETR: Dynamic anchor boxes are better queries for DETR |
| ref-45 | 2023 | Liu, S.; Ren, T.; et al. | Detection transformer with stable matching |
| ref-46 | 2023 | Ma, Y.; Liang, W.; et al. | Revisiting detr pre-training for object detection |
| ref-47 | 2022 | Meinhardt, T.; Kirillov, A.; et al. | Trackformer: Multi-object tracking with transformers |
| ref-48 | 2021 | Meng, D.; Chen, X.; et al. | Conditional DETR for fast training convergence |
| ref-49 | 2020 | Oksuz, K.; Cam, B.C.; et al. | A ranking-based, balanced loss function unifying classification and localisation in object detection |
| ref-50 | 2021 | Oksuz, K.; Cam, B.C.; et al. | Rank & sort loss for object detection and instance segmentation |
| ref-51 | 2023 | Pu, Y.; Han, Y.; et al. | Fine-grained recognition with learnable semantic data augmentation |
| ref-52 | 2023 | Pu, Y.; Wang, Y.; et al. | Adaptive rotated convolution for rotated object detection |
| ref-53 | 2020 | Qian, Q.; Chen, L.; et al. | DR loss: Improving object detection by distributional ranking |
| ref-54 | 2023 | Ren, T.; Liu, S.; et al. | detrex: Benchmarking detection transformers |
| ref-55 | 2023 | Shen, Y.; Geng, Z.; et al. | V-detr: Detr with vertex relative position encoding for 3d object detection |
| ref-56 | 2022 | Shi, D.; Wei, X.; et al. | End-to-end multi-person pose estimation with transformers |
| ref-57 | 2021 | Stoffl, L.; Vidal, M.; et al. | End-to-end trainable multi-instance pose estimation with transformers |
| ref-58 | 2020 | Sun, P.; Cao, J.; et al. | Transtrack: Multiple object tracking with transformer |
| ref-59 | 2019 | Tian, Z.; Shen, C.; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-60 | 2022 | Yang, Q.; Wang, S.; et al. | Efficient knowledge distillation from model checkpoints |
| ref-61 | 2021 | Wang, H.; Zhu, Y.; et al. | Max-deeplab: End-to-end panoptic segmentation with mask transformers |
| ref-62 | 2021 | Wang, S.; Wu, L.; et al. | Glancing at the patch: Anomaly localization with global and local feature comparison |
| ref-63 | 2022 | Wang, Y.; Zhang, X.; et al. | Anchor DETR: Query design for transformer-based detector |
| ref-64 | 2021 | Wang, Y.; Chen, Z.; et al. | Adaptive focus for efficient video recognition |
| ref-65 | 2023 | Wang, Y.; Han, Y.; et al. | Computation-efficient deep learning for computer vision: A survey |
| ref-66 | 2021 | Wang, Y.; Han, Y.; et al. | Not all images are worth 16x16 words: Dynamic transformers for efficient image recognition |
| ref-67 | 2023 | Yang, Q.; Wang, S.; et al. | Boosting offline reinforcement learning with action preference query |
| ref-68 | 2023 | Yang, Q.; Wang, S.; et al. | Hundreds guide millions: Adaptive offline reinforcement learning with expert guidance |
| ref-69 | 2022 | Yu, Q.; Wang, H.; et al. | CMT-DeepLab: Clustering mask transformers for panoptic segmentation |
| ref-70 | 2022 | Yu, X.; Shi, D.; et al. | SOIT: Segmenting objects with instance-aware transformers |
| ref-71 | 2020 | Yuan, Y.; Chen, X.; et al. | Object-contextual representations for semantic segmentation |
| ref-72 | 2023 | Yue, Y.; Kang, B.; et al. | Offline prioritized experience replay |
| ref-73 | 2023 | Yue, Y.; Kang, B.; et al. | Value-consistent representation learning for data-efficient reinforcement learning |
| ref-74 | 2022 | Zhang, G.; Luo, Z.; et al. | Accelerating DETR convergence via semantic-aligned matching |
| ref-75 | 2023 | Zhang, H.; Li, F.; et al. | DINO: DETR with improved denoising anchor boxes for end-to-end object detection |
| ref-76 | 2021 | Zhang, H.; Wang, Y.; et al. | VarifocalNet: An iou-aware dense object detector |
| ref-77 | 2020 | Zhang, S.; Chi, C.; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-78 | 2021 | Zhu, X.; Su, W.; et al. | Deformable DETR: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 按功能归类

**Background（背景工作）:**
- DETR 系列基础：[3] DETR（开创性工作，消除 NMS 需求）、[78] Deformable-DETR（多尺度变形注意力，提升小目标性能）
- 查询公式改进：[44] DAB-DETR（动态锚框）、[34] DN-DETR（查询去噪加速训练）
- 架构改进：[48] Conditional DETR（加速收敛）等 9 篇工作
- 排序相关先验：[31] IoU-Net（IoU 预测器）、[37] Generalized Focal Loss（质量焦点损失）、[76] VarifocalNet（IoU 感知分类分数）、[10] TOOD（高阶组合度量）
- 基于排序的损失：[53] DR loss、[4] AP-loss、[49][50] Oksuz 等 ranking-based loss、[32] Correlation loss
- 动态网络背景：[15] Dynamic neural networks survey

**Baseline（基线方法）:**
- [30] H-DETR（混合匹配，主要基线）
- [75] DINO-DETR（去噪锚框，SOTA 方法）

**Contrast（对比/并发工作）:**
- [1] Align-DETR、[45] Stable-DINO：并发工作，同样应用 IoU 感知分类分数，但本文额外引入架构设计

**Dataset（数据集）:**
- [42] COCO：实验基准数据集

**Tooling（工具）:**
- [54] detrex：实验实现工具箱

#### 按引用编号列举

- [3] DETR：定位为现代目标检测系统转型的起点，消除 NMS 需求的基础方法
- [78] Deformable-DETR：引入多尺度变形注意力，H-DETR 的继承基础
- [75] DINO-DETR：SOTA 方法，通过改进去噪锚框解决一对一匹配低效问题
- [30] H-DETR：主要基线方法，引入混合匹配方案
- [31] IoU-Net：早期探索分类分数与定位一致性工作
- [37] Generalized Focal Loss：联合表示 IoU 和分类分数
- [76] VarifocalNet：IoU 感知分类分数，本文对比实验显示 GCL 优于 VFL
- [10] TOOD：高阶组合锚点对齐度量
- [45] Stable-DINO、[1] Align-DETR：并发工作，共享洞察但本文额外引入架构设计
- [42] COCO、[54] detrex：实验设置


# SOLOv2: Dynamic and Fast Instance Segmentation (2020)

- Paper ref: 1:4DB3YS8Y
- Title: SOLOv2: Dynamic and Fast Instance Segmentation
- Year: 2020

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Xinlong Wang; Tao Kong; et al. | SOLO: Segmenting objects by locations |
| ref-2 | 2019 | Daniel Bolya; Chong Zhou; et al. | YOLACT: Real-time instance segmentation |
| ref-3 | 2017 | Yi Li; Haozhi Qi; et al. | Fully convolutional instance-aware semantic segmentation |
| ref-4 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Girshick |
| ref-5 | 2018 | Shu Liu; Lu Qi; et al. | Path aggregation network for instance segmentation |
| ref-6 | 2019 | Zhaojin Huang; Lichao Huang; et al. | Mask scoring R-CNN |
| ref-7 | 2019 | Xinlei Chen; Ross Girshick; et al. | TensorMask: A foundation for dense object segmentation |
| ref-8 | 2020 | Hao Chen; Kunyang Sun; et al. | BlendMask: Top-down meets bottom-up for instance segmentation |
| ref-9 | 2020 | Rufeng Zhang; Zhi Tian; et al. | Mask encoding for single shot instance segmentation |
| ref-10 | 2020 | Enze Xie; Peize Sun; et al. | PolarMask: Single shot instance segmentation with polar representation |
| ref-11 | 2019 | Zhi Tian; Chunhua Shen; et al. | FCOS: Fully convolutional one-stage object detection |
| ref-12 | 2017 | Alejandro Newell; Zhiao Huang; et al. | Associative embedding: End-to-end learning for joint detection and grouping |
| ref-13 | 2017 | Bert De Brabandere; Davy Neven; et al. | Semantic instance segmentation with a discriminative loss function |
| ref-14 | 2017 | Shu Liu; Jiaya Jia; et al. | Sequential grouping networks for instance segmentation |
| ref-15 | 2019 | Naiyu Gao; Yanhu Shan; et al. | SSAP: Single-shot instance segmentation with affinity pyramid |
| ref-16 | 2015 | Max Jaderberg; Karen Simonyan; et al. | Spatial transformer networks |
| ref-17 | 2016 | Xu Jia; Bert De Brabandere; et al. | Dynamic filter networks |
| ref-18 | 2017 | Jifeng Dai; Haozhi Qi; et al. | Deformable convolutional networks |
| ref-19 | 2018 | Linjie Yang; Yanran Wang; et al. | Katsaggelos |
| ref-20 | 2019 | Konstantin Sofiiuk; Olga Barinova; et al. | AdaptIS: Adaptive instance selection network |
| ref-21 | 2020 | Zhi Tian; Chunhua Shen; et al. | Conditional convolutions for instance segmentation |
| ref-22 | 2017 | Navaneeth Bodla; Bharat Singh; et al. | Soft-NMS: improving object detection with one line of code |
| ref-23 | 2019 | Songtao Liu; Di Huang; et al. | Adaptive NMS: Refining pedestrian detection in a crowd |
| ref-24 | 2019 | Yihui He; Chenchen Zhu; et al. | Bounding box regression with uncertainty for accurate object detection |
| ref-25 | 2019 | Lile Cai; Bin Zhao; et al. | Sabry Aly, and Vijay Chandrasekhar |
| ref-26 | 2018 | Rosanne Liu; Joel Lehman; et al. | An intriguing failing of convolutional neural networks and the coordconv solution |
| ref-27 | 2019 | Alexander Kirillov; Ross Girshick; et al. | Panoptic feature pyramid networks |
| ref-28 | 2018 | Yuxin Wu; Kaiming He | Group normalization |
| ref-29 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-30 | 2018 | Liang-Chieh Chen; Alexander Hermans; et al. | Masklab: Instance segmentation by refining object detection with semantic and direction features |
| ref-31 | 2020 | Yuqing Wang; Zhaoliang Xu; et al. | Centermask: single shot instance segmentation with point representation |
| ref-32 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollár, and C |
| ref-33 | 2019 | Agrim Gupta; Piotr Dollar; et al. | LVIS: A dataset for large vocabulary instance segmentation |
| ref-34 | 2020 | Md Amirul Islam; Sen Jia; et al. | B |
| ref-35 | 2019 | Yanwei Li; Xinze Chen; et al. | Attentionguided unified network for panoptic segmentation |
| ref-36 | 2019 | Yuwen Xiong; Renjie Liao; et al. | UPSNet: A unified panoptic segmentation network |
| ref-37 | 2020 | Bowen Cheng; Maxwell Collins; et al. | Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation |
| ref-38 | 2018 | Joseph Redmon; Ali Farhadi | Yolov3: An incremental improvement |
| ref-39 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Ssd: Single shot multibox detector |
| ref-40 | 2018 | Shifeng Zhang; Longyin Wen; et al. | Single-shot refinement neural network for object detection |
| ref-41 | 2017 | Tsung-Yi Lin; Piotr Dollár; et al. | Girshick, Kaiming He, Bharath Hariharan, and Serge J |
| ref-42 | 2019 | Tao Kong; Fuchun Sun; et al. | Foveabox: Beyond anchor-based object detector |
| ref-43 | 2019 | Ze Yang; Shaohui Liu; et al. | Reppoints: Point set representation for object detection |
| ref-44 | 2019 | Xingyi Zhou; Dequan Wang; et al. | Objects as points |
| ref-45 | 2019 | Kai Chen; Jiaqi Wang; et al. | MMDetection: Open mmlab detection toolbox and benchmark |

## Citation Analysis Report

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


# Object Detection with Transformers: A Review (2025)

- Paper ref: 1:4FUJYLNY
- Title: Object Detection with Transformers: A Review
- Year: 2025

## Compact References

_No references artifact rows available._

## Citation Analysis Report

_No citation analysis report available._


# Joint perceptual learning for enhancement and object detection in underwater scenarios (2023)

- Paper ref: 1:4IUAXCCZ
- Title: Joint perceptual learning for enhancement and object detection in underwater scenarios
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | Al-Rfou, R.; Choe, D.; et al. | Character-level language modeling with deeper self-attention |
| ref-2 | 2015 | Bahdanau, D.; Cho, K.; et al. | Neural machine translation by jointly learning to align and translate |
| ref-3 | 2019 | Bello, I.; Zoph, B.; et al. | Attention augmented convolutional networks |
| ref-4 | 2017 | Bodla, N.; Singh, B.; et al. | Soft-NMS-improving object detection with one line of code |
| ref-5 | 2019 | Cai, Z.; Vasconcelos, N. | Cascade R-CNN: high quality object detection and instance segmentation |
| ref-6 | 2020 | Chan, W.; Saharia, C.; et al. | Imputer: sequence modelling via imputation and dynamic programming |
| ref-7 | 2019 | Devlin, J.; Chang, M.W.; et al. | BERT: pre-training of deep bidirectional transformers for language understanding |
| ref-8 | 2014 | Erhan, D.; Szegedy, C.; et al. | Scalable object detection using deep neural networks |
| ref-9 | 2019 | Ghazvininejad, M.; Levy, O.; et al. | Mask-predict: parallel decoding of conditional masked language models |
| ref-10 | 2010 | Glorot, X.; Bengio, Y. | Understanding the difficulty of training deep feedforward neural networks |
| ref-11 | 2018 | Gu, J.; Bradbury, J.; et al. | Non-autoregressive neural machine translation |
| ref-12 | 2019 | He, K.; Girshick, R.; et al. | Rethinking imagenet pre-training |
| ref-13 | 2017 | He, K.; Gkioxari, G.; et al. | Mask R-CNN |
| ref-14 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-15 | 2017 | Hosang, J.H.; Benenson, R.; et al. | Learning non-maximum suppression |
| ref-16 | 2018 | Hu, H.; Gu, J.; et al. | Relation networks for object detection |
| ref-17 | 2019 | Kirillov, A.; Girshick, R.; et al. | Panoptic feature pyramid networks |
| ref-18 | 2019 | Kirillov, A.; He, K.; et al. | Panoptic segmentation |
| ref-19 | 1955 | Kuhn, H.W. | The Hungarian method for the assignment problem |
| ref-20 | 2017 | Li, Y.; Qi, H.; et al. | Fully convolutional instance-aware semantic segmentation |
| ref-21 | 2017 | Lin, T.Y.; Doll´ar, P.; et al. | Feature pyramid networks for object detection |
| ref-22 | 2017 | Lin, T.Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-23 | 2014 | Lin, T.-Y.; et al. | Microsoft COCO: common objects in context |
| ref-24 | 2016 | Liu, W.; et al. | SSD: single shot multibox detector |
| ref-25 | 2017 | Loshchilov, I.; Hutter, F. | Decoupled weight decay regularization |
| ref-26 | 2019 | L¨uscher, C.; et al. | RWTH ASR systems for LibriSpeech: hybrid vs attention - w/o data augmentation |
| ref-27 | 2016 | Milletari, F.; Navab, N.; et al. | V-net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-28 | 2017 | Oord, A.; et al. | Parallel wavenet: fast high-fidelity speech synthesis |
| ref-29 | 2015 | Park, E.; Berg, A.C. | Learning to decompose for object detection and instance segmentation |
| ref-30 | 2018 | Parmar, N.; et al. | Image transformer |
| ref-31 | 2019 | Paszke, A.; et al. | Pytorch: an imperative style, high-performance deep learning library |
| ref-32 | 2019 | Pineda, L.; Salvador, A.; et al. | Elucidating image-to-set prediction: an analysis of models, losses and datasets |
| ref-33 | 2019 | Radford, A.; Wu, J.; et al. | Language models are unsupervised multitask learners |
| ref-34 | 2016 | Redmon, J.; Divvala, S.; et al. | You only look once: unified, real-time object detection |
| ref-35 | 2017 | Ren, M.; Zemel, R.S. | End-to-end instance segmentation with recurrent attention |
| ref-36 | 2015 | Ren, S.; He, K.; et al. | Faster R-CNN: towards real-time object detection with region proposal networks |
| ref-37 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union |
| ref-38 | 2018 | Rezatofighi, S.H.; et al. | Deep perm-set net: learn to predict sets with unknown permutation and cardinality using deep neural networks |
| ref-39 | 2017 | Rezatofighi, S.H.; et al. | Deepsetnet: predicting sets with deep neural networks |
| ref-40 | 2016 | Romera-Paredes, B.; Torr, P.H.S. | Recurrent instance segmentation |
| ref-41 | 2017 | Salvador, A.; Bellver, M.; et al. | Recurrent neural networks for semantic instance segmentation |
| ref-42 | 2015 | Stewart, R.J.; Andriluka, M.; et al. | End-to-end people detection in crowded scenes |
| ref-43 | 2014 | Sutskever, I.; Vinyals, O.; et al. | Sequence to sequence learning with neural networks |
| ref-44 | 2019 | Synnaeve, G.; et al. | End-to-end ASR: from supervised to semi-supervised learning with modern architectures |
| ref-45 | 2019 | Tian, Z.; Shen, C.; et al. | FCOS: fully convolutional one-stage object detection |
| ref-46 | 2017 | Vaswani, A.; et al. | Attention is all you need |
| ref-47 | 2016 | Vinyals, O.; Bengio, S.; et al. | Order matters: sequence to sequence for sets |
| ref-48 | 2018 | Wang, X.; Girshick, R.B.; et al. | Non-local neural networks |
| ref-49 | 2019 | Wu, Y.; Kirillov, A.; et al. | Detectron2 |
| ref-50 | 2019 | Xiong, Y.; et al. | Upsnet: a unified panoptic segmentation network |
| ref-51 | 2019 | Zhang, S.; Chi, C.; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-52 | 2019 | Zhou, X.; Wang, D.; et al. | Objects as points |

## Citation Analysis Report

#### 按功能归类
- Background: [2] Neural machine translation by jointly learning to align and translate；[6] Imputer: sequence modelling via imputation and dynamic programming；[7] BERT: pre-training of deep bidirectional transformers for language understanding；[9] Mask-predict: parallel decoding of conditional masked language models；[11] Non-autoregressive neural machine translation；[26] RWTH ASR systems for LibriSpeech: hybrid vs attention - w/o data augmentation；[28] Parallel wavenet: fast high-fidelity speech synthesis；[30] Image transformer；[32] Elucidating image-to-set prediction: an analysis of models, losses and datasets；[33] Language models are unsupervised multitask learners；[39] Deepsetnet: predicting sets with deep neural networks；[44] End-to-end ASR: from supervised to semi-supervised learning with modern architectures
- Baseline: [5] Cascade R-CNN: high quality object detection and instance segmentation；[22] Focal loss for dense object detection；[36] Faster R-CNN: towards real-time object detection with region proposal networks；[45] FCOS: fully convolutional one-stage object detection；[51] Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection；[52] Objects as points
- Contrast: [4] Soft-NMS-improving object detection with one line of code；[8] Scalable object detection using deep neural networks；[15] Learning non-maximum suppression；[16] Relation networks for object detection；[24] SSD: single shot multibox detector；[29] Learning to decompose for object detection and instance segmentation；[34] You only look once: unified, real-time object detection；[35] End-to-end instance segmentation with recurrent attention；[38] Deep perm-set net: learn to predict sets with unknown permutation and cardinality using deep neural networks；[40] Recurrent instance segmentation；[41] Recurrent neural networks for semantic instance segmentation；[42] End-to-end people detection in crowded scenes
- Component: [14] Deep residual learning for image recognition；[19] The Hungarian method for the assignment problem；[21] Feature pyramid networks for object detection；[46] Attention is all you need；[48] Non-local neural networks
- Dataset: [23] Microsoft COCO: common objects in context
- Tooling: 无
- Historical: [18] Panoptic segmentation；[43] Sequence to sequence learning with neural networks；[47] Order matters: sequence to sequence for sets
- Other: 无

#### 按引用编号/作者-年份列举
- [2] 本文把它作为注意力机制的早期代表，用来说明 self-attention 之前就已有“从全序列聚合信息”的建模思想。
- [4] 本文把 Soft-NMS 视为改进重复框处理的代表方法，但强调这类方法仍在检测后处理阶段注入额外先验。
- [5] 本文把 Cascade R-CNN 作为基于 proposals 的两阶段检测代表，用来说明主流检测通常绕经候选框代理任务。
- [6] 本文引用该工作说明并行序列生成已扩展到语音识别，从而为 DETR 的并行解码提供跨领域背景。
- [7] 本文把它与其他工作并列为非自回归/并行解码范式的先行研究，论证并行预测并不只适用于检测。
- [8] 本文将其归为早期使用 bipartite matching 的检测器，但指出这类方法仍缺乏足够的全局关系建模，往往需要 NMS 补救。
- [9] 本文把 Mask-Predict 作为并行解码代表，说明 DETR 借用的是一条已经在序列生成中验证过的技术路线。
- [11] 本文把非自回归机器翻译作为 parallel decoding 代表，用来说明并行生成与 Transformer 可以结合。
- [14] 本文把 ResNet 作为可直接复用的标准 backbone，强调 DETR 不需要特殊检测专用卷积结构。
- [15] 本文将其与 Soft-NMS 一起视为 learnable NMS 路线，认为它们减少了后处理但仍引入额外设计先验。
- [16] 本文把 Relation Networks 作为显式建模框间关系的代表，并以此反衬 DETR 希望在更少手工特征下学习关系。
- [18] 本文把这篇工作当作 panoptic segmentation 任务定义，用来说明 DETR 可以扩展到更复杂的像素级统一识别任务。
- [19] 本文把 Hungarian method 作为 permutation-invariant set loss 的算法基础，用来支撑一对一匹配训练目标。
- [21] 本文引用 FPN 不是为了复用其结构，而是借其发展历程说明 small-object 问题仍可能通过后续多尺度设计改进。
- [22] 本文把 Focal Loss/RetinaNet 所代表的 anchor-based 单阶段检测作为主流基线，对比 DETR 去掉 anchor 的设计。
- [23] 本文把 COCO 作为核心检测基准和实验对象，用它来衡量 DETR 是否能与成熟检测器正面对比。
- [24] 本文将 SSD 归为早期使用 bipartite matching 的检测器，但指出其关系建模仍然有限，不能替代真正的 set prediction。
- [26] 本文用该工作说明 Transformer 已在语音处理场景替代 RNN，支撑作者选择统一注意力架构。
- [28] 本文把 Parallel WaveNet 视为 parallel generation 的代表之一，用来说明并行预测在序列建模里已有成功经验。
- [29] 本文把它归为端到端的直接集合预测/实例分割先行工作，但强调这类方法多依赖自回归 RNN 且验证规模有限。
- [30] 本文把 Image Transformer 作为视觉领域采用 Transformer 的例子，说明该架构并非只能处理文本。
- [32] 本文把它当作 image-to-set prediction 的背景综述，用来说明直接集合预测在视觉中已有明确问题设定。
- [33] 本文将其作为 NLP 中 Transformer 成功应用的例子，服务于“Transformer 正在替代 RNN”的总论点。
- [34] 本文把 YOLO 归入早期使用 bipartite matching 的检测器一类，但认为其仍缺乏足够的对象间关系建模。
- [35] 本文把它归入基于 RNN 的端到端实例分割方法，并据此反衬 DETR 采用并行 decoder 的差异。
- [36] 本文多次把 Faster R-CNN 作为最关键的强基线，同时也把 proposal assignment 作为传统检测 heuristics 的代表。
- [38] 本文把 Deep Perm-Set Net 列为直接集合预测的先行尝试之一，但认为它尚未在困难检测基准上证明竞争力。
- [39] 本文把 Deepsetnet 当作集合预测背景文献，用来说明多标签/集合输出问题已有相关建模探索。
- [40] 本文把它归为 recurrent instance segmentation 路线，认为这类自回归方法与 DETR 的并行解码形成鲜明对比。
- [41] 本文把该工作视为语义实例分割中的 RNN 式先行方法，说明早期端到端集合预测普遍依赖递归生成。
- [42] 本文一方面把它列为先前直接检测尝试，另一方面在 related work 中将其归为 end-to-end recurrent detector 的代表。
- [43] 本文把经典 seq2seq 作为自回归生成范式的来源，用来铺垫后文对 parallel decoding 的转向。
- [44] 本文把它作为语音识别中现代 Transformer 架构成功应用的例子，强化跨模态可迁移性论证。
- [45] 本文把 FCOS 作为基于中心点/网格的主流单阶段检测代表，对比 DETR 不依赖中心点启发。
- [46] 这是本文最核心的架构参照。作者直接把原始 Transformer 视为 DETR encoder-decoder 的基础，并强调并行解码改造。
- [47] 本文把 Order Matters 作为集合预测中的自回归序列化方案代表，用来说明以往 set prediction 常依赖 RNN/seq2seq。
- [48] 本文用 Non-Local Neural Networks 类比 self-attention 的全局聚合特性，说明 Transformer 的全局计算适合检测。
- [51] 本文引用 ATSS 用来证明 anchor/proposal/center 等初始猜测及其分配规则会显著影响检测性能。
- [52] 本文把 Objects as Points 作为基于中心点的检测代表，同时也把它归入现代使用非唯一 assignment 的检测系统。


# Masked-attention Mask Transformer for Universal Image Segmentation (2022)

- Paper ref: 1:53A2WXX8
- Title: Masked-attention Mask Transformer for Universal Image Segmentation
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2014 | Pablo Arbelaez; Jordi Pont-Tuset; et al. | Multiscale combinatorial grouping |
| ref-2 | 2021 | Hangbo Bao; Li Dong; et al. | BEiT: BERT pretraining of image transformers |
| ref-3 | 2019 | Daniel Bolya; Chong Zhou; et al. | YOLACT++: Better real-time instance segmentation |
| ref-4 | 2018 | Zhaowei Cai; Nuno Vasconcelos | Cascade R-CNN: Delving into high quality object detection |
| ref-5 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-6 | 2019 | Kai Chen; Jiangmiao Pang; et al. | Hybrid task cascade for instance segmentation |
| ref-7 | 2018 | Liang-Chieh Chen; George Papandreou; et al. | DeepLab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs |
| ref-8 | 2017 | Liang-Chieh Chen; George Papandreou; et al. | Rethinking atrous convolution for semantic image segmentation |
| ref-9 | 2020 | Liang-Chieh Chen; Huiyu Wang; et al. | Scaling wide residual networks for panoptic segmentation |
| ref-10 | 2018 | Liang-Chieh Chen; Yukun Zhu; et al. | Encoder-decoder with atrous separable convolution for semantic image segmentation |
| ref-11 | 2020 | Bowen Cheng; Maxwell D Collins; et al. | Panoptic-DeepLab: A simple, strong, and fast baseline for bottom-up panoptic segmentation |
| ref-12 | 2021 | Bowen Cheng; Ross Girshick; et al. | Boundary iou: Improving object-centric image segmentation evaluation |
| ref-13 | 2021 | Bowen Cheng; Omkar Parkhi; et al. | Pointly-supervised instance segmentation |
| ref-14 | 2021 | Bowen Cheng; Alexander G | Schwing, and Alexander Kirillov |
| ref-15 | 2017 | Franc¸ois Chollet | Xception: Deep learning with depthwise separable convolutions |
| ref-16 | 2016 | Marius Cordts; Mohamed Omran; et al. | The Cityscapes dataset for semantic urban scene understanding |
| ref-17 | 2021 | Alexey Dosovitskiy; Lucas Beyer; et al. | An image is worth 16x16 words: Transformers for image recognition at scale |
| ref-18 | 2021 | Xianzhi Du; Barret Zoph; et al. | Simple training strategies and model scaling for object detection |
| ref-19 | 2015 | Mark Everingham; SM Ali Eslami; et al. | The PASCAL visual object classes challenge: A retrospective |
| ref-20 | 2021 | Yuxin Fang; Shusheng Yang; et al. | Instances as queries |
| ref-21 | 2019 | Jun Fu; Jing Liu; et al. | Dual attention network for scene segmentation |
| ref-22 | 2021 | Peng Gao; Minghang Zheng; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-23 | 2021 | Golnaz Ghiasi; Yin Cui; et al. | Simple copy-paste is a strong data augmentation method for instance segmentation |
| ref-24 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask R-CNN |
| ref-25 | 2016 | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-26 | 2019 | Zilong Huang; Xinggang Wang; et al. | CCNet: Criss-cross attention for semantic segmentation |
| ref-27 | 2019 | Alexander Kirillov; Ross Girshick; et al. | Panoptic feature pyramid networks |
| ref-28 | 2019 | Alexander Kirillov; Kaiming He; et al. | Panoptic segmentation |
| ref-29 | 2017 | Alexander Kirillov; Evgeny Levinkov; et al. | InstanceCut: from edges to instances with multicut |
| ref-30 | 2020 | Alexander Kirillov; Yuxin Wu; et al. | PointRend: Image segmentation as rendering |
| ref-31 | 2021 | Yanwei Li; Hengshuang Zhao; et al. | Fully convolutional networks for panoptic segmentation with point-based supervision |
| ref-32 | 2021 | Zhiqi Li; Wenhai Wang; et al. | Panoptic segformer |
| ref-33 | 2017 | Tsung-Yi Lin; Piotr Dollar; et al. | Feature pyramid networks for object detection |
| ref-34 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-35 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft COCO: Common objects in context |
| ref-36 | 2021 | Ze Liu; Yutong Lin; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-37 | 2015 | Jonathan Long; Evan Shelhamer; et al. | Fully convolutional networks for semantic segmentation |
| ref-38 | 2019 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-39 | 2021 | Shihua Huang Zhichao Lu; Ran Cheng; et al. | Fapn: Feature-aligned pyramid network for dense image prediction |
| ref-40 | 2021 | Depu Meng; Xiaokang Chen; et al. | Conditional detr for fast training convergence |
| ref-41 | 2016 | Fausto Milletari; Nassir Navab; et al. | V-Net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-42 | 2017 | Gerhard Neuhold; Tobias Ollmann; et al. | The mapillary vistas dataset for semantic understanding of street scenes |
| ref-43 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-44 | 2015 | Olga Russakovsky; Jia Deng; et al. | Berg, and Li Fei-Fei |
| ref-45 | 2021 | Robin Strudel; Ricardo Garcia; et al. | Segmenter: Transformer for semantic segmentation |
| ref-46 | 2021 | Zhiqing Sun; Shengcao Cao; et al. | Rethinking transformer-based set prediction for object detection |
| ref-47 | 2020 | Mingxing Tan; Ruoming Pang; et al. | Efficientdet: Scalable and efficient object detection |
| ref-48 | 2020 | Andrew Tao; Karan Sapra; et al. | Hierarchical multi-scale attention for semantic segmentation |
| ref-49 | 2020 | Zhi Tian; Chunhua Shen; et al. | Conditional convolutions for instance segmentation |
| ref-50 | 2013 | Jasper RR Uijlings; Koen EA Van De Sande; et al. | Selective search for object recognition |
| ref-51 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-52 | 2021 | Huiyu Wang; Yukun Zhu; et al. | MaX-DeepLab: End-to-end panoptic segmentation with mask transformers |
| ref-53 | 2019 | Jingdong Wang; Ke Sun; et al. | Deep high-resolution representation learning for visual recognition |
| ref-54 | 2021 | Wenhai Wang; Enze Xie; et al. | Pvtv2: Improved baselines with pyramid vision transformer |
| ref-55 | 2018 | Xiaolong Wang; Ross Girshick; et al. | Non-local neural networks |
| ref-56 | 2020 | Xinlong Wang; Rufeng Zhang; et al. | SOLOv2: Dynamic and fast instance segmentation |
| ref-57 | 2019 | Yuxin Wu; Alexander Kirillov; et al. | Detectron2 |
| ref-58 | 2018 | Tete Xiao; Yingcheng Liu; et al. | Unified perceptual parsing for scene understanding |
| ref-59 | 2021 | Enze Xie; Wenhai Wang; et al. | Segformer: Simple and efficient design for semantic segmentation with transformers |
| ref-60 | 2019 | Yuwen Xiong; Renjie Liao; et al. | Upsnet: A unified panoptic segmentation network |
| ref-61 | 2021 | Yuhui Yuan; Lang Huang; et al. | OCNet: Object context for semantic segmentation |
| ref-62 | 2021 | Wenwei Zhang; Jiangmiao Pang; et al. | K-net: Towards unified image segmentation |
| ref-63 | 2017 | Hengshuang Zhao; Jianping Shi; et al. | Pyramid scene parsing network |
| ref-64 | 2021 | Sixiao Zheng; Jiachen Lu; et al. | Rethinking semantic segmentation from a sequence-to-sequence perspective with transformers |
| ref-65 | 2017 | Bolei Zhou; Hang Zhao; et al. | Scene parsing through ADE20K dataset |
| ref-66 | 2021 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

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


# Deformable DETR: deformable transformers for end-to-end object detection (2021)

- Paper ref: 1:5HBHAWIV
- Title: Deformable DETR: deformable transformers for end-to-end object detection
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Joshua Ainslie; Santiago Ontanon; et al. | Etc: Encoding long and structured data in transformers |
| ref-2 | 2020 | Iz Beltagy; Matthew E Peters; et al. | Longformer: The long-document transformer |
| ref-3 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-4 | 2019 | Rewon Child; Scott Gray; et al. | Generating long sequences with sparse transformers |
| ref-5 | 2020 | Krzysztof Choromanski; Valerii Likhosherstov; et al. | Masked language modeling for proteins via linearly scalable long-context transformers |
| ref-6 | 2017 | Jifeng Dai; Haozhi Qi; et al. | Deformable convolutional networks |
| ref-7 | 2009 | Jia Deng; Wei Dong; et al. | Imagenet: A large-scale hierarchical image database |
| ref-8 | 2019 | Golnaz Ghiasi; Tsung-Yi Lin; et al. | Nas-fpn: Learning scalable feature pyramid architecture for object detection |
| ref-9 | 2016 | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-10 | 2019 | Jonathan Ho; Nal Kalchbrenner; et al. | Axial attention in multidimensional transformers |
| ref-11 | 2019 | Han Hu; Zheng Zhang; et al. | Local relation networks for image recognition |
| ref-12 | 2019 | Zilong Huang; Xinggang Wang; et al. | Ccnet: Criss-cross attention for semantic segmentation |
| ref-13 | 2020 | Angelos Katharopoulos; Apoorv Vyas; et al. | Transformers are rnns: Fast autoregressive transformers with linear attention |
| ref-14 | 2015 | Diederik P Kingma; Jimmy Ba | Adam: A method for stochastic optimization |
| ref-15 | 2020 | Nikita Kitaev, Łukasz Kaiser; Anselm Levskaya | Reformer: The efficient transformer |
| ref-16 | 2018 | Tao Kong; Fuchun Sun; et al. | Deep feature pyramid reconfiguration for object detection |
| ref-17 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft coco: Common objects in context |
| ref-18 | 2017 | Tsung-Yi Lin; Piotr Dollar; et al. | Feature pyramid networks for object detection |
| ref-19 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-20 | 2020 | Li Liu; Wanli Ouyang; et al. | Deep learning for generic object detection: A survey |
| ref-21 | 2018 | Peter J Liu; Mohammad Saleh; et al. | Generating wikipedia by summarizing long sequences |
| ref-22 | 2018 | Shu Liu; Lu Qi; et al. | Path aggregation network for instance segmentation |
| ref-23 | 2018 | Niki Parmar; Ashish Vaswani; et al. | Image transformer |
| ref-24 | 2019 | Jiezhong Qiu; Hao Ma; et al. | Blockwise self-attention for long document understanding |
| ref-25 | 2019 | Prajit Ramachandran; Niki Parmar; et al. | Stand-alone self-attention in vision models |
| ref-26 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-27 | 2020 | Aurko Roy; Mohammad Saffar; et al. | Efficient content-based sparse attention with routing transformers |
| ref-28 | 2020 | Guanglu Song; Yu Liu; et al. | Revisiting the sibling head in object detector |
| ref-29 | 2020 | Mingxing Tan; Ruoming Pang; et al. | Efficientdet: Scalable and efficient object detection |
| ref-30 | 2020 | Yi Tay; Dara Bahri; et al. | Sparse sinkhorn attention |
| ref-31 | 2020 | Yi Tay; Mostafa Dehghani; et al. | Efficient transformers: A survey |
| ref-32 | 2020 | Zachary Teed; Jia Deng | Raft: Recurrent all-pairs field transforms for optical flow |
| ref-33 | 2019 | Zhi Tian; Chunhua Shen; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-34 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-35 | 2020 | Huiyu Wang; Yukun Zhu; et al. | Axial-deeplab: Stand-alone axial-attention for panoptic segmentation |
| ref-36 | 2020 | Sinong Wang; Belinda Li; et al. | Linformer: Self-attention with linear complexity |
| ref-37 | 2019 | Felix Wu; Angela Fan; et al. | Pay less attention with lightweight and dynamic convolutions |
| ref-38 | 2017 | Saining Xie; Ross Girshick; et al. | Aggregated residual transformations for deep neural networks |
| ref-39 | 2019 | Hang Xu; Lewei Yao; et al. | Auto-fpn: Automatic network architecture adaptation for object detection beyond classification |
| ref-40 | 2020 | Manzil Zaheer; Guru Guruganesh; et al. | Big bird: Transformers for longer sequences |
| ref-41 | 2020 | Shifeng Zhang; Cheng Chi; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-42 | 2019 | Qijie Zhao; Tao Sheng; et al. | M2det: A single-shot object detector based on multi-level feature pyramid network |
| ref-43 | 2019 | Xizhou Zhu; Dazhi Cheng; et al. | An empirical study of spatial attention mechanisms in deep networks |
| ref-44 | 2019 | Xizhou Zhu; Han Hu; et al. | Deformable convnets v2: More deformable, better results |

## Citation Analysis Report

#### 总体总结
在 Introduction 与 Related Work 范围内，原文先用 DETR、Transformer 和传统检测器综述界定问题：目标检测长期依赖 anchor、规则化 assignment、NMS 与多尺度特征结构，而 DETR 虽然提供端到端集合预测框架，却因图像特征 attention 的全局密集计算而收敛慢、小目标性能不足。随后，原文把 efficient attention 文献分成预定义稀疏模式、数据依赖稀疏模式和低秩/线性近似三条路线，说明已有 Transformer 降复杂度方法虽丰富，但在图像域要么依赖固定局部模式，要么存在实现效率问题。最后，原文通过 deformable convolution、spatial attention 经验研究和多尺度特征金字塔文献，把本文定位为一条结合稀疏空间采样、Transformer 关系建模与多尺度特征聚合的路线：既继承 DETR 的端到端检测目标，又用可学习的少量采样点替代对整张特征图的密集 attention。


#### 关键文献

- [AY-1] Nicolas Carion, 2020: End-to-end object detection with transformers (Baseline)

- [AY-3] Ashish Vaswani, 2017: Attention is all you need (Background)

- [AY-6] Jifeng Dai, 2017: Deformable convolutional networks (Component)

- [AY-7] Tsung-Yi Lin, 2017: Feature pyramid networks for object detection (Background)

- [AY-5] Shaoqing Ren, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks (Baseline)



#### 范围
- 章节: 1 INTRODUCTION + 2 RELATED WORK
- 行号: 16-50

#### 按功能归类


##### Background

- [AY-9] Joshua Ainslie, 2020
  - 标题: Etc: Encoding long and structured data in transformers
  - 关键词: sparse attention, long sequence, global tokens
  - 总结: 原文用该工作补充第一类 efficient attention 的代表，说明预定义稀疏模式能减少复杂度，但仍与本文可学习采样的 deformable attention 不同。

- [AY-10] Iz Beltagy, 2020
  - 标题: Longformer: The long-document transformer
  - 关键词: Longformer, sparse attention, local window
  - 总结: 该引用被用于构成 efficient attention 的背景谱系，原文借它说明局部窗口加全局 token 的做法仍属于预定义稀疏模式。

- [AY-11] Rewon Child, 2019
  - 标题: Generating long sequences with sparse transformers
  - 关键词: Sparse Transformer, fixed pattern, receptive field
  - 总结: 该工作被原文用来说明固定稀疏 attention 可扩展感受野，但其预设模式与本文从 query 预测采样位置的策略形成区别。

- [AY-23] Krzysztof Choromanski, 2020
  - 标题: Masked language modeling for proteins via linearly scalable long-context transformers
  - 关键词: linear attention, kernel approximation, low-rank attention
  - 总结: 原文用该引用补全 efficient attention 的低秩或核化近似分支，反衬本文不是改写全部 attention 矩阵，而是先用稀疏空间采样预过滤关键位置。

- [AY-27] Golnaz Ghiasi, 2019
  - 标题: Nas-fpn: Learning scalable feature pyramid architecture for object detection
  - 关键词: NAS-FPN, multi-scale features, feature pyramid
  - 总结: 该引用帮助原文铺设多尺度检测背景，随后引出本文主张：multi-scale deformable attention 可在不依赖这些金字塔结构的情况下聚合多尺度特征。

- [AY-12] Jonathan Ho, 2019
  - 标题: Axial attention in multidimensional transformers
  - 关键词: axial attention, vision transformer, fixed sparse pattern
  - 总结: 原文用该工作说明图像域已有 attention 降复杂度尝试，但这类方法仍可能受限于固定模式和内存访问效率。

- [AY-14] Zilong Huang, 2019
  - 标题: Ccnet: Criss-cross attention for semantic segmentation
  - 关键词: criss-cross attention, semantic segmentation, fixed sparse attention
  - 总结: 原文用该引用充实视觉 efficient attention 背景，说明已有视觉 attention 的稀疏性多来自人为设定的空间连接。

- [AY-24] Angelos Katharopoulos, 2020
  - 标题: Transformers are rnns: Fast autoregressive transformers with linear attention
  - 关键词: linear attention, kernelization, efficient transformer
  - 总结: 该引用用于界定低秩/线性 attention 方向，原文借它说明本文方法不是同一类数学近似，而是面向图像特征的可学习采样。

- [AY-21] Nikita Kitaev, Łukasz Kaiser, 2020
  - 标题: Reformer: The efficient transformer
  - 关键词: Reformer, LSH attention, data-dependent sparsity
  - 总结: 该工作被用来代表数据依赖稀疏 attention 路线，帮助原文把本文可学习采样的 deformable attention 放到更大的 efficient attention 分类中。

- [AY-28] Tao Kong, 2018
  - 标题: Deep feature pyramid reconfiguration for object detection
  - 关键词: feature pyramid, multi-scale fusion, object detection
  - 总结: 该引用被用于铺设多尺度特征融合背景，原文借此说明检测器通常需要专门结构处理尺度差异。

- [AY-7] Tsung-Yi Lin, 2017
  - 标题: Feature pyramid networks for object detection
  - 关键词: FPN, multi-scale features, small objects
  - 总结: 该工作帮助原文说明多尺度特征是目标检测的成熟需求，随后本文声称 multi-scale deformable attention 可自然聚合多尺度特征而无需 FPN。

- [AY-2] Li Liu, 2020
  - 标题: Deep learning for generic object detection: A survey
  - 关键词: object detection survey, hand-designed components, multi-scale detection
  - 总结: 该引用被原文用作目标检测背景综述，帮助界定 DETR 和本文想摆脱的传统检测器设计负担。

- [AY-15] Peter J Liu, 2018
  - 标题: Generating wikipedia by summarizing long sequences
  - 关键词: local attention, sparse transformer, long sequence
  - 总结: 该引用为 efficient attention 的第一类路线提供例证，原文借它说明预定义局部模式能降复杂度但会损失全局信息。

- [AY-16] Niki Parmar, 2018
  - 标题: Image transformer
  - 关键词: Image Transformer, local window, visual attention
  - 总结: 该工作被用来说明视觉任务中已有局部 attention 方案，但原文借其归类指出这些方法主要依赖预定义稀疏模式。

- [AY-17] Jiezhong Qiu, 2019
  - 标题: Blockwise self-attention for long document understanding
  - 关键词: blockwise attention, long document, distant connections
  - 总结: 该引用帮助原文说明固定稀疏模式的变体可以加入远距连接，但仍属于预定义结构，不是本文的可学习空间采样。

- [AY-22] Aurko Roy, 2020
  - 标题: Efficient content-based sparse attention with routing transformers
  - 关键词: routing transformer, data-dependent sparse attention, clustering
  - 总结: 该引用补充了数据依赖稀疏 attention 分支，帮助原文把本文可学习采样机制与 LSH/k-means/routing 类方法并列比较。

- [AY-29] Mingxing Tan, 2020
  - 标题: Efficientdet: Scalable and efficient object detection
  - 关键词: EfficientDet, BiFPN, multi-scale fusion
  - 总结: 该工作被原文用于多尺度检测背景，随后本文强调自己的 multi-scale deformable attention 可以替代这类专门特征金字塔结构。

- [AY-8] Yi Tay, 2020
  - 标题: Sparse sinkhorn attention
  - 关键词: efficient transformers, Sparse Sinkhorn, block sparse attention
  - 总结: 该引用承担双重作用：提供 efficient attention 分类背景，并作为数据依赖稀疏 attention 的例子衔接本文的可学习采样思想。

- [AY-3] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, self-attention, encoder-decoder
  - 总结: 该工作是本文技术背景的基础引用：原文借它交代 DETR 的核心架构来源和 efficient attention 讨论的对象。

- [AY-19] Huiyu Wang, 2020
  - 标题: Axial-deeplab: Stand-alone axial-attention for panoptic segmentation
  - 关键词: Axial-DeepLab, axial attention, vision attention
  - 总结: 该引用被用于说明视觉 attention 的多种降复杂度尝试，原文借它强调图像域已有方案仍多受固定模式或实现效率限制。

- [AY-25] Felix Wu, 2019
  - 标题: Pay less attention with lightweight and dynamic convolutions
  - 关键词: dynamic convolution, lightweight convolution, attention as convolution
  - 总结: 该引用帮助原文把卷积变体纳入 attention 谱系，支持本文从 deformable convolution 发展出 deformable attention 的合理性。

- [AY-30] Hang Xu, 2019
  - 标题: Auto-fpn: Automatic network architecture adaptation for object detection beyond classification
  - 关键词: Auto-FPN, neural architecture search, feature pyramid
  - 总结: 该引用补充了多尺度特征融合背景，原文借它说明本文方法面对的是一系列成熟的特征金字塔设计，而不是单一 FPN 基线。

- [AY-20] Manzil Zaheer, 2020
  - 标题: Big bird: Transformers for longer sequences
  - 关键词: BigBird, global token, sparse attention
  - 总结: 该引用用于完善 fixed sparse attention 分支，原文借它说明已有稀疏模式仍是预定义结构，与本文按 query 特征预测采样点的方式不同。

- [AY-31] Qijie Zhao, 2019
  - 标题: M2det: A single-shot object detector based on multi-level feature pyramid network
  - 关键词: M2Det, multi-level features, object detection
  - 总结: 该引用被用于多尺度目标检测背景，原文借它铺垫本文希望用 attention 机制自然聚合多尺度特征。



##### Baseline

- [AY-1] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, end-to-end detection, set prediction
  - 总结: 原文用 DETR 建立核心基线和问题定义，本文的所有改动都围绕保留其端到端集合预测优势并解决其训练与特征分辨率瓶颈展开。

- [AY-5] Shaoqing Ren, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, training convergence, detection baseline
  - 总结: 该引用被用来建立传统强检测器的基线参照，原文借它强调本文要解决的不只是精度，而是端到端检测器的收敛成本。



##### Component

- [AY-6] Jifeng Dai, 2017
  - 标题: Deformable convolutional networks
  - 关键词: deformable convolution, spatial sampling, visual attention
  - 总结: 该工作是本文方法构造的关键来源：原文借它说明可学习稀疏采样适合图像特征，但本文进一步补上 Transformer 式关系建模。



##### Contrast

- [AY-13] Han Hu, 2019
  - 标题: Local relation networks for image recognition
  - 关键词: local relation, vision attention, implementation cost
  - 总结: 该工作被原文用作对比对象：它代表视觉局部 attention 路线，原文借其局限强调 deformable attention 在相同 FLOPs 下只比卷积略慢。

- [AY-18] Prajit Ramachandran, 2019
  - 标题: Stand-alone self-attention in vision models
  - 关键词: stand-alone self-attention, vision, memory access
  - 总结: 该工作被原文作为视觉 attention 路线的关键对照，说明仅降低理论复杂度不足以保证工程效率，本文声称 deformable attention 更接近卷积效率。



##### Dataset

- [AY-4] Tsung-Yi Lin, 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, object detection benchmark, evaluation
  - 总结: 该引用为原文提供实验与问题背景的基准语境，说明本文比较的收敛速度、小目标性能和 AP 指标主要围绕 COCO 展开。



##### Historical

- [AY-26] Xizhou Zhu, 2019
  - 标题: An empirical study of spatial attention mechanisms in deep networks
  - 关键词: spatial attention, deformable convolution, attention taxonomy
  - 总结: 该工作被用来建立本文方法的概念桥梁：原文借它把视觉卷积变体与 attention 统一起来，从而支撑 deformable attention 的设计解释。





#### 时间线分析

##### 早期
早期条目主要给出本文论证的基础坐标：COCO 作为检测基准，Faster R-CNN 和 FPN 代表传统检测与多尺度特征路线，Transformer 与 deformable convolution 则分别提供关系建模和稀疏空间采样两个关键技术源头。


- [AY-6] Jifeng Dai, 2017: Deformable convolutional networks

- [AY-4] Tsung-Yi Lin, 2014: Microsoft coco: Common objects in context

- [AY-7] Tsung-Yi Lin, 2017: Feature pyramid networks for object detection

- [AY-5] Shaoqing Ren, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [AY-3] Ashish Vaswani, 2017: Attention is all you need




##### 中期
中期条目集中展开两个背景分支：一方面是图像域 self-attention、局部/轴向/块状稀疏 attention 与 dynamic convolution 的效率讨论，另一方面是 PANet、NAS-FPN、Auto-FPN、M2Det 等多尺度特征融合路线，用来衬托本文对可学习多尺度采样的定位。


- [AY-11] Rewon Child, 2019: Generating long sequences with sparse transformers

- [AY-27] Golnaz Ghiasi, 2019: Nas-fpn: Learning scalable feature pyramid architecture for object detection

- [AY-12] Jonathan Ho, 2019: Axial attention in multidimensional transformers

- [AY-13] Han Hu, 2019: Local relation networks for image recognition

- [AY-14] Zilong Huang, 2019: Ccnet: Criss-cross attention for semantic segmentation

- [AY-28] Tao Kong, 2018: Deep feature pyramid reconfiguration for object detection

- [AY-2] Li Liu, 2020: Deep learning for generic object detection: A survey

- [AY-15] Peter J Liu, 2018: Generating wikipedia by summarizing long sequences

- [AY-16] Niki Parmar, 2018: Image transformer

- [AY-17] Jiezhong Qiu, 2019: Blockwise self-attention for long document understanding

- [AY-18] Prajit Ramachandran, 2019: Stand-alone self-attention in vision models

- [AY-25] Felix Wu, 2019: Pay less attention with lightweight and dynamic convolutions

- [AY-30] Hang Xu, 2019: Auto-fpn: Automatic network architecture adaptation for object detection beyond classification

- [AY-31] Qijie Zhao, 2019: M2det: A single-shot object detector based on multi-level feature pyramid network

- [AY-26] Xizhou Zhu, 2019: An empirical study of spatial attention mechanisms in deep networks




##### 近期
近期条目把论述收束到 efficient Transformer 与 DETR 前沿：DETR 是本文直接基线，Reformer、Routing Transformer、Sparse Sinkhorn、Longformer、BigBird、Linformer/linear attention 等构成高效 attention 分类背景，EfficientDet 则代表强多尺度检测器对照。


- [AY-9] Joshua Ainslie, 2020: Etc: Encoding long and structured data in transformers

- [AY-10] Iz Beltagy, 2020: Longformer: The long-document transformer

- [AY-1] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-23] Krzysztof Choromanski, 2020: Masked language modeling for proteins via linearly scalable long-context transformers

- [AY-24] Angelos Katharopoulos, 2020: Transformers are rnns: Fast autoregressive transformers with linear attention

- [AY-21] Nikita Kitaev, Łukasz Kaiser, 2020: Reformer: The efficient transformer

- [AY-22] Aurko Roy, 2020: Efficient content-based sparse attention with routing transformers

- [AY-29] Mingxing Tan, 2020: Efficientdet: Scalable and efficient object detection

- [AY-8] Yi Tay, 2020: Sparse sinkhorn attention

- [AY-19] Huiyu Wang, 2020: Axial-deeplab: Stand-alone axial-attention for panoptic segmentation

- [AY-20] Manzil Zaheer, 2020: Big bird: Transformers for longer sequences


# SOLO: Segmenting Objects by Locations (2020)

- Paper ref: 1:76BD6UYE
- Title: SOLO: Segmenting Objects by Locations
- Year: 2020

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Gompper G; Winkler R G; et al. | Journal of Physics: Condensed Matter 32 193001 |
| ref-2 | 2010 | Ramaswamy S | Annual Review of Condensed Matter Physics 1 323-345 |
| ref-3 | 2013 | Marchetti M C; Joanny J F; et al. | Rev. Mod. Phys. 85(3) 1143-1189 |
| ref-4 | 2016 | Bechinger C; Di Leonardo R; et al. | Reviews of Modern Physics 88 045006 |
| ref-5 | 2019 | Golestanian R | Phoretic Active Matter |
| ref-6 | 2015 | Cates M E; Tailleur J | Annu. Rev. Condens. Matter Phys. 6 219-244 |
| ref-7 | 2011 | Henkes S; Fily Y; et al. | Phys. Rev. E 84(4) 040301 |
| ref-8 | 2013 | Redner G S; Hagan M F; et al. | Phys. Rev. Lett. 110(5) 055701 |
| ref-9 | 2013 | Buttinoni I; Bialke J; et al. | Phys. Rev. Lett. 110(23) 238301 |
| ref-10 | 2014 | Soto R; Golestanian R | Phys. Rev. E 89(1) 012706 |
| ref-11 | 2016 | Blaschke J; Maurer M; et al. | Soft Matter 12 9821-9831 |
| ref-12 | 2018 | Digregorio P; Levis D; et al. | Phys. Rev. Lett. 121(9) 098003 |
| ref-13 | 2018 | Abaurrea Velasco C; Abkenar M; et al. | Phys. Rev. E 98(2) 022605 |
| ref-14 | 2015 | Solon A P; Chate H; et al. | Phys. Rev. Lett. 114 068101 |
| ref-15 | 2020 | Chate H | Annual Review of Condensed Matter Physics 11 |
| ref-16 | 2012 | Golestanian R | Phys. Rev. Lett. 108(3) 038303 |
| ref-17 | 2012 | Taktikos J; Zaburdaev V; et al. | Phys. Rev. E 85(5) 051901 |
| ref-18 | 2014 | Saha S; Golestanian R; et al. | Phys. Rev. E 89(6) 062316 |
| ref-19 | 2015 | Liebchen B; Marenduzzo D; et al. | Phys. Rev. Lett. 115(25) 258301 |
| ref-20 | 2018 | Varma A; Montenegro-Johnson T D; et al. | Soft Matter 14(35) 7155-7173 |
| ref-21 | 2019 | Agudo-Canalejo J; Golestanian R | Phys. Rev. Lett. 123(1) 018101 |
| ref-22 | 2014 | Zottl A; Stark H | Phys. Rev. Lett. 112(11) 118101 |
| ref-23 | 2016 | Blaschke J; Maurer M; et al. | Soft Matter 12(48) 9821-9831 |
| ref-24 | 2005 | Toner J; Tu Y; et al. | Annals of Physics 318 170-244 |
| ref-25 | 2019 | Golestanian R | Phys. Rev. E 100(1) 010601 |
| ref-26 | 2018 | Tjhung E; Nardini C; et al. | Phys. Rev. X 8(3) 031080 |
| ref-27 | 2002 | Golestanian R; Ajdari A | EPL (Europhysics Letters) 59 800 |
| ref-28 | 1977 | Ziff R M; Uhlenbeck G E; et al. | Physics Reports 32 169-248 |
| ref-29 | 1987 | Bagnato V; Pritchard D E; et al. | Phys. Rev. A 35(10) 4354-4358 |
| ref-30 | 1999 | Dalfovo F; Giorgini S; et al. | Rev. Mod. Phys. 71(3) 463-512 |
| ref-31 | 2020 | Mahault B; Golestanian R | in preparation |
| ref-32 | 2008 | Chavanis P H | The European Physical Journal B 62 179-208 |
| ref-33 | 2005 | Romero-Rochin V | Phys. Rev. Lett. 94(13) 130601 |
| ref-34 | 2015 | Solon A P; Fily Y; et al. | Nature Physics 11 673 |

## Citation Analysis Report

#### 总体总结
本文引用文献构建了一个清晰的研究叙事框架：从活性物质领域的一般背景出发，经由运动诱导相分离等具体机制，最终聚焦于扩散率边缘这一新概念的引入。早期引用确立了活性物质理论和BEC理论的基础；中期引用展示了MIPS、速度对齐、自生场和流体力学等相分离机制的多样性；近期引用则直接支撑了扩散率边缘概念及其在周期势场中的应用这一核心创新。


#### 关键文献

- [25] Golestanian R, 2019: Phys. Rev. E 100(1) 010601 (Uncategorized)

- [28] Ziff R M, 1977: Physics Reports 32 169-248 (Uncategorized)

- [34] Solon A P, 2015: Nature Physics 11 673 (Uncategorized)



#### 范围
- 章节: Introduction + Sec 2 + Sec 3 + Sec 4 + Sec 5
- 行号: 14-247

#### 按功能归类


##### Background

- [1] Gompper G, 2020
  - 标题: Journal of Physics: Condensed Matter 32 193001
  - 关键词: 活性物质, 自推进, 自组织
  - 总结: 引用[1]用于确立活性物质领域的基本定义和研究范围，说明微观尺度上破坏细致平衡的系统特征

- [2] Ramaswamy S, 2010
  - 标题: Annual Review of Condensed Matter Physics 1 323-345
  - 关键词: 活性物质, 理论框架
  - 总结: 引用[2]作为活性物质理论背景的支撑文献，确立领域框架

- [3] Marchetti M C, 2013
  - 标题: Rev. Mod. Phys. 85(3) 1143-1189
  - 关键词: 涌现, 自组织, 活性
  - 总结: 引用[3]用于说明活性如何引发非平凡的涌现自组织行为

- [4] Bechinger C, 2016
  - 标题: Reviews of Modern Physics 88 045006
  - 关键词: 活性物质, 实验
  - 总结: 引用[4]作为活性物质实验进展的综述支撑

- [5] Golestanian R, 2019
  - 标题: Phoretic Active Matter
  - 关键词: 游动, 活性物质
  - 总结: 引用[5]关于游动活性物质的理论工作

- [6] Cates M E, 2015
  - 标题: Annu. Rev. Condens. Matter Phys. 6 219-244
  - 关键词: MIPS, 相分离, 运动诱导
  - 总结: 引用[6]作为MIPS现象的综述文献，说明持续运动与局部运动抑制耦合时的相分离

- [7] Henkes S, 2011
  - 标题: Phys. Rev. E 84(4) 040301
  - 关键词: MIPS, 模拟
  - 总结: 引用[7]作为MIPS现象的数值模拟研究

- [8] Redner G S, 2013
  - 标题: Phys. Rev. Lett. 110(5) 055701
  - 关键词: MIPS, 理论
  - 总结: 引用[8]作为MIPS的理论研究工作

- [9] Buttinoni I, 2013
  - 标题: Phys. Rev. Lett. 110(23) 238301
  - 关键词: MIPS, 实验
  - 总结: 引用[9]作为MIPS的实验验证研究

- [10] Soto R, 2014
  - 标题: Phys. Rev. E 89(1) 012706
  - 关键词: 团簇, 活性粒子
  - 总结: 引用[10]关于活性粒子聚集行为的研究

- [11] Blaschke J, 2016
  - 标题: Soft Matter 12 9821-9831
  - 关键词: 密排, 有序结构
  - 总结: 引用[11]说明运动诱导相分离可导致密排有序结构的形成

- [12] Digregorio P, 2018
  - 标题: Phys. Rev. Lett. 121(9) 098003
  - 关键词: 密排, 有序
  - 总结: 引用[12]关于活性系统中密排有序结构的研究

- [13] Abaurrea Velasco C, 2018
  - 标题: Phys. Rev. E 98(2) 022605
  - 关键词: 密排, 结构
  - 总结: 引用[13]关于活性粒子密排结构的研究

- [14] Solon A P, 2015
  - 标题: Phys. Rev. Lett. 114 068101
  - 关键词: 速度对齐, 取向有序
  - 总结: 引用[14]关于短程速度对齐在宏观取向有序 onset 时引发相分离的工作

- [15] Chate H, 2020
  - 标题: Annual Review of Condensed Matter Physics 11
  - 关键词: 综述, 相分离
  - 总结: 引用[15]作为活性物质相分离的近期综述

- [16] Golestanian R, 2012
  - 标题: Phys. Rev. Lett. 108(3) 038303
  - 关键词: 自生场, 聚集
  - 总结: 引用[16]关于由自生浓度/温度场诱导的活性粒子聚集研究

- [17] Taktikos J, 2012
  - 标题: Phys. Rev. E 85(5) 051901
  - 关键词: 自生场, 相互作用
  - 总结: 引用[17]关于自生场诱导聚集的研究

- [18] Saha S, 2014
  - 标题: Phys. Rev. E 89(6) 062316
  - 关键词: 自生场, 聚集
  - 总结: 引用[18]关于自生场诱导聚集的研究

- [19] Liebchen B, 2015
  - 标题: Phys. Rev. Lett. 115(25) 258301
  - 关键词: 自生场, 相互作用
  - 总结: 引用[19]关于自生场诱导的活性粒子相互作用研究

- [20] Varma A, 2018
  - 标题: Soft Matter 14(35) 7155-7173
  - 关键词: 自生场, 聚集
  - 总结: 引用[20]关于自生场诱导聚集的研究

- [21] Agudo-Canalejo J, 2019
  - 标题: Phys. Rev. Lett. 123(1) 018101
  - 关键词: 自生场, 相互作用
  - 总结: 引用[21]关于自生场诱导的活性粒子相互作用研究

- [22] Zottl A, 2014
  - 标题: Phys. Rev. Lett. 112(11) 118101
  - 关键词: 流体力学, 长程相互作用
  - 总结: 引用[22]关于活性粒子流体力学相互作用导致长程关联的研究

- [23] Blaschke J, 2016
  - 标题: Soft Matter 12(48) 9821-9831
  - 关键词: 流体力学, 长程
  - 总结: 引用[23]关于流体力学诱导长程相互作用的研究

- [24] Toner J, 2005
  - 标题: Annals of Physics 318 170-244
  - 关键词: 取向有序, Toner-Tu
  - 总结: 引用[23]关于Toner-Tu长程取向有序理论的工作，作为对比背景

- [26] Tjhung E, 2018
  - 标题: Phys. Rev. X 8(3) 031080
  - 关键词: 特征长度, 团簇
  - 总结: 引用[26]关于活性系统中特征长度尺度选择的工作，说明团簇尺寸受限不随系统尺寸缩放的例子

- [31] Mahault B, 2020
  - 标题: in preparation
  - 关键词: 后续工作
  - 总结: 引用[31]是本文作者关于指数z和势场形状系统研究的后续工作预告



##### Uncategorized

- [25] Golestanian R, 2019
  - 标题: Phys. Rev. E 100(1) 010601
  - 关键词: 扩散率边缘, BEC, 谐振势阱
  - 总结: 引用[25]是本文的直接前驱工作：Golestanian(2019)首次引入扩散率边缘概念，并发现谐振势阱中系统发生类BEC凝聚

- [27] Golestanian R, 2002
  - 标题: EPL (Europhysics Letters) 59 800
  - 关键词: 流体力学, 非局域效应
  - 总结: 引用[27]作为忽略流体力学相互作用引起的非局域效应的依据

- [28] Ziff R M, 1977
  - 标题: Physics Reports 32 169-248
  - 关键词: BEC, 理想玻色气体
  - 总结: 引用[28]作为理想玻色气体BEC理论的经典参照，与深势阱极限下的凝聚分数形式对比

- [29] Bagnato V, 1987
  - 标题: Phys. Rev. A 35(10) 4354-4358
  - 关键词: BEC, 束缚势
  - 总结: 引用[29]关于束缚势中BEC行为的研究，作为对比背景

- [30] Dalfovo F, 1999
  - 标题: Rev. Mod. Phys. 71(3) 463-512
  - 关键词: BEC, 综述
  - 总结: 引用[30]作为BEC现象的经典综述，与本文热力学不连续跳跃特征对比

- [32] Chavanis P H, 2008
  - 标题: The European Physical Journal B 62 179-208
  - 关键词: 广义熵, Gibbs
  - 总结: 引用[32]作为广义熵Gibbs定义的类似工作，支撑本文熵的定义

- [33] Romero-Rochin V, 2005
  - 标题: Phys. Rev. Lett. 94(13) 130601
  - 关键词: BEC, 谐振势, 体积
  - 总结: 引用[33]作为谐振势中理想玻色气体典型体积计算的参照

- [34] Solon A P, 2015
  - 标题: Nature Physics 11 673
  - 关键词: 压强, 力学定义
  - 总结: 引用[34]作为从力学角度定义活性系统压强的前驱工作，支撑本文力学压强与热力学压强等价性的推导


# DETRs with collaborative hybrid assignments training (2023)

- Paper ref: 1:7AERRYC7
- Title: DETRs with collaborative hybrid assignments training
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Carion, Nicolas; Massa, Francisco; et al. | End-to-end object detection with transformers |
| ref-2 | 2022 | Chen, Fangyi; Zhang, Han; et al. | Enhanced training of querybased object detection via selective query recollection |
| ref-3 | 2019 | Chen, Kai; Pang, Jiangmiao; et al. | Hybrid task cascade for instance segmentation |
| ref-4 | 2019 | Chen, Kai; Wang, Jiaqi; et al. | Mmdetection: Open mmlab detection toolbox and benchmark |
| ref-5 | 2022 | Chen, Qiang; Chen, Xiaokang; et al. | Group detr: Fast training convergence with decoupled one-to-many label assignment |
| ref-6 | 2022 | Chen, Qiang; Wang, Jian; et al. | Group detr v2: Strong object detector with encoder-decoder pretraining |
| ref-7 | 2021 | Dosovitskiy, Alexey; Beyer, Lucas; et al. | An image is worth 16x16 words: Transformers for image recognition at scale |
| ref-8 | 2023 | Fang, Yuxin; Sun, Quan; et al. | Eva-O2: A visual representation for neon genesis |
| ref-9 | 2022 | Gao, Ziteng; Wang, Limin; et al. | Adamixer: A fast-converging query-based object detector |
| ref-10 | 2021 | Ghiasi, Golnaz; Cui, Yin; et al. | Simple copy-paste is a strong data augmentation method for instance segmentation |
| ref-11 | 2015 | Girshick, Ross | Fast r-cnn |
| ref-12 | 2019 | Gupta, Agrim; Dollar, Piotr; et al. | Lvis:A dataset for large vocabulary instance segmentation |
| ref-13 | 2022 | He, Kaiming; Chen, Xinlei; et al. | Masked autoencoders are scalable vision learners |
| ref-14 | 2017 | He, Kaiming; Gkioxari, Georgia; et al. | Mask r-cnn |
| ref-15 | 2016 | He, Kaiming; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-16 | 2022 | Jia, Ding; Yuan, Yuhui; et al. | Detrs with hybrid matching |
| ref-17 | 2020 | Kim, Kang; Lee, Hee Seok | Probabilistic anchor assignment with iou prediction for object detection |
| ref-18 | 2022 | Li, Feng; Zhang, Hao; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-19 | 2020 | Li, Xiang; Wang, Wenhai; et al. | Generalized focal loss: Learning qualified and distributed bounding boxes for dense object detection |
| ref-20 | 2022 | Li, Yanghao; Mao, Hanzi; et al. | Exploring plain vision transformer backbones for object detection |
| ref-21 | 2017 | Lin, Tsung-Yi; Goyal, Priya; et al. | Focal loss for dense object detection |
| ref-22 | 2014 | Lin, Tsung-Yi; Maire, Michael; et al. | Microsoft coco: Common objects in context |
| ref-23 | 2022 | Liu, Shilong; Li, Feng; et al. | Dab-detr: Dynamic anchor boxes are bettr queries for detr |
| ref-24 | 2022 | Liu, Ze; Hu, Han; et al. | Swin transformer v2: Scaling up capacity and resolution |
| ref-25 | 2021 | Liu, Ze; Lin, Yutong; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-26 | 2021 | Meng, Depu; Chen, Xiaokang; et al. | Conditional detr for fast training convergence |
| ref-27 | 2015 | Ren, Shaoqing; He, Kaiming; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-28 | 2017 | Selvaraju, Ramprasaath R; Cogswell, Michael; et al. | Grad-cam: Visual explanations from deep networks via gradient-based localization |
| ref-29 | 2019 | Shao, Shuai; Li, Zeming; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-30 | 2020 | Song, Guanglu; Liu, Yu; et al. | Revisiting the sibling head in object detector |
| ref-31 | 2019 | Tian, Zhi; Shen, Chunhua; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-32 | 2022 | Wang, Wenhui; Bao, Hangbo; et al. | Image as a foreign language:Beit pretraining for all vision and visionlanguage tasks |
| ref-33 | 2022 | Wang, Wenhai; Dai, Jifeng; et al. | Internimage: Exploring large-scale vision foundation models with deformable convolutions |
| ref-34 | 2022 | Wang, Yingming; Zhang, Xiangyu; et al. | Anchor detr: Query design for transformer-based detector |
| ref-35 | 2022 | Wei, Yixuan; Hu, Han; et al. | Contrastive learning rivals masked image modeling in fine-tuning via feature distillation |
| ref-36 | 2022 | Xue, Zeyue; Liang, Jianming; et al. | Large-batch optimization for dense visual predictions |
| ref-37 | 2022 | Yang, Jianwei; Li, Chunyuan; et al. | Focal modulation networks |
| ref-38 | 2022 | Zhang, Hao; Li, Feng; et al. | Dino:Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-39 | 2022 | Zhang, Haotian; Zhang, Pengchuan; et al. | Glipv2: Unifying localization and vision-language understanding |
| ref-40 | 2020 | Zhang, Shifeng; Chi, Cheng; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-41 | 2021 | Zhou, Xingyi; Koltun, Vladlen; et al. | Probabilistic two-stage detection |
| ref-42 | 2020 | Zhu, Xizhou; Su, Weijie; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-43 | 2021 | Zong, Zhuofan; Cao, Qianggang; et al. | Rcnet: Reverse feature pyramid and cross-scale shift network for object detection |

## Citation Analysis Report

#### 按功能归类

**Background（背景工作）:**
- DETR [1]：开创性地将目标检测建模为集合预测问题，引入一对一匈牙利匹配机制
- R-CNN 系列 [11,27,14]：传统检测器的代表，采用一对多样本分配策略
- RetinaNet [21]、FCOS [31]、PAA [17]：一对多分配的不同实现方式（基于锚点/无锚点）
- DN-DETR [18]：证明一对一匹配不稳定性导致收敛缓慢

**Baseline（基准方法）:**
- Deformable-DETR [42]：本文主要改进对象，采用可变形注意力机制
- DAB-DETR [23]：动态锚框查询表示
- DINO [38]：当前最先进方法，结合对比去噪技术

**Contrast（对比方法）:**
- Group-DETR [5]：通过解耦一对多分配引入更多正查询
- H-DETR [16]：混合匹配方案，与 Group-DETR 类似

**Component（组件/工具）:**
- ATSS [40]：自适应样本选择，本文采用的主要辅助头
- Swin Transformer [25]、ViT [7]、EVA-02 [8]：骨干网络
- MMDetection [4]：实验复现框架

**Dataset（数据集）:**
- COCO [22]：主要评估基准
- LVIS [12]：长尾数据集验证
- Objects365 [29]：大规模预训练数据集

#### 按引用编号列举

- [1] DETR：作为基础框架，本文在其一对一匹配基础上引入一对多辅助监督
- [4] MMDetection：实验复现工具
- [5] Group-DETR：对比方法，采用不同的一对多实现策略
- [7] ViT：大规模骨干网络基础
- [8] EVA-02：提供预训练权重实现最佳性能
- [11,14,17,18,21,23,25,27,31,38,40,42]：各类检测器和方法，构成研究背景和技术对比
- [12,22,29]：实验数据集
- [16] H-DETR：混合匹配对比方法


# SegDINO: An Efficient Design for Medical and Natural Image Segmentation with DINO-V3 (2025)

- Paper ref: 1:7T29H6SR
- Title: SegDINO: An Efficient Design for Medical and Natural Image Segmentation with DINO-V3
- Year: 2025

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2018 | Md Zahangir Alom; Mahmudul Hasan; et al. | Recurrent residual convolutional neural network based on u-net (r2u-net) for medical image segmentation |
| ref-2 | 2021 | Tomer Amit; Tal Shaharbany; et al. | Segdiff: Image segmentation with diffusion probabilistic models |
| ref-3 | 2024 | Lev Ayzenberg; Raja Giryes; et al. | Dinov2 based self supervised learning for few shot medical image segmentation |
| ref-4 | 2024 | Reza Azad; Ehsan Khodapanah Aghdam; et al. | Medical image segmentation review: The success of u-net |
| ref-5 | 2017 | Vijay Badrinarayanan; Alex Kendall; et al. | Segnet: A deep convolutional encoderdecoder architecture for image segmentation |
| ref-6 | 2021 | Mathilde Caron; Hugo Touvron; et al. | Emerging properties in self-supervised vision transformers |
| ref-7 | 2021 | Jieneng Chen; Yongyi Lu; et al. | Transunet: Transformers make strong encoders for medical image segmentation |
| ref-8 | 2021 | Wuyang Chen; Xianzhi Du; et al. | A simple single-scale vision transformer for object localization and instance segmentation |
| ref-9 | 2020 | Zhihao Chen; Lei Zhu; et al. | A multi-task mean teacher for semi-supervised shadow detection |
| ref-10 | 2021 | Zhihao Chen; Liang Wan; et al. | Triplecooperative video shadow detection |
| ref-11 | 2021 | Ho Kei Cheng; Yu-Wing Tai; et al. | Rethinking space-time networks with improved memory coverage for efficient video object segmentation |
| ref-12 | 2018 | Noel CF Codella; David Gutman; et al. | Skin lesion analysis toward melanoma detection: A challenge at the 2017 international symposium on biomedical imaging (isbi), hosted by the international skin imaging collaboration (isic) |
| ref-13 | 2025 | Simon Damm; Mike Laszkiewicz; et al. | Anomalydino: Boosting patch-based few-shot anomaly detection with dinov2 |
| ref-14 | 2022 | Xinpeng Ding; Jingwen Yang; et al. | Learning shadow correspondence for video shadow detection |
| ref-15 | 2025 | Yifan Gao; Haoyue Li; et al. | Dino u-net: Exploiting highfidelity dense features from foundation models for medical image segmentation, 2025 |
| ref-16 | 2023 | Haifan Gong; Jiaxin Chen; et al. | Thyroid region prior guided attention for ultrasound segmentation of thyroid nodules |
| ref-17 | 2022 | Huankang Guan; Jiaying Lin; et al. | Learning semantic associations for mirror detection |
| ref-18 | 2022 | Kaiming He; Xinlei Chen; et al. | Masked au- ´ toencoders are scalable vision learners |
| ref-19 | 2023 | Ruozhen He; Jiaying Lin; et al. | Efficient mirror detection via multi-level heterogeneous learning |
| ref-20 | 2021 | Xiaowei Hu; Tianyu Wang; et al. | Revisiting shadow detection: A new benchmark dataset for complex world |
| ref-21 | 2023 | Tianyu Huang; Bowen Dong; et al. | Symmetry-aware transformer-based mirror detection |
| ref-22 | 2023 | Jitesh Jain; Jiachen Li; et al. | Oneformer: One transformer to rule universal image segmentation |
| ref-23 | 2019 | Debesh Jha; Pia H Smedsrud; et al. | Kvasir-seg: A segmented polyp dataset |
| ref-24 | 2023 | Alexander Kirillov; Eric Mintun; et al. | Segment anything |
| ref-25 | 2025 | Chenxin Li; Xinyu Liu; et al. | U-kan makes strong backbone for medical image segmentation and generation |
| ref-26 | 2024 | Xiangtai Li; Henghui Ding; et al. | Transformer-based visual segmentation: A survey |
| ref-27 | 2020 | Jiaying Lin; Guodong Wang; et al. | Progressive mirror detection |
| ref-28 | 2021 | Jiaying Lin; Zebang He; et al. | Rich context aggregation with reflection prior for glass surface detection |
| ref-29 | 2023 | Jiaying Lin; Xin Tan; et al. | Learning to detect mirrors from videos via dual correspondences |
| ref-30 | 2024 | Fang Liu; Yuhao Liu; et al. | Multi-view dynamic reflection prior for video glass surface detection |
| ref-31 | 2023 | Lihao Liu; Jean Prost; et al. | Scotch and soda: A transformer video shadow detection framework |
| ref-32 | 2015 | Jonathan Long; Evan Shelhamer; et al. | Fully convolutional networks for semantic segmentation |
| ref-33 | 2017 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-34 | 2019 | Xiankai Lu; Wenguan Wang; et al. | See more, know more: Unsupervised video object segmentation with co-attention siamese networks |
| ref-35 | 2022 | Xiao Lu; Yihong Cao; et al. | Video shadow detection via spatio-temporal interpolation consistency training |
| ref-36 | 2024 | Jun Ma; Feifei Li; et al. | U-mamba: Enhancing long-range dependency for biomedical image segmentation |
| ref-37 | 2023 | Maciej A Mazurowski; Haoyu Dong; et al. | Segment anything model for medical image analysis: an experimental study |
| ref-38 | 2021 | Shervin Minaee; Yuri Boykov; et al. | Image segmentation using deep learning: A survey |
| ref-39 | 2019 | Seoung Wug Oh; Joon-Young Lee; et al. | Video object segmentation using space-time memory networks |
| ref-40 | 2018 | Ozan Oktay; Jo Schlemper; et al. | Attention u-net: Learning where to look for the pancreas |
| ref-41 | 2023 | Maxime Oquab; Timothee Darcet; et al. | Dinov2: Learning robust visual features without supervision |
| ref-42 | 2019 | Adam Paszke; Sam Gross; et al. | Pytorch: An imperative style, highperformance deep learning library |
| ref-43 | 2022 | Gensheng Pei; Fumin Shen; et al. | Hierarchical feature alignment network for unsupervised video object segmentation |
| ref-44 | 2021 | Rene Ranftl; Alexey Bochkovskiy; et al. | Vision transformers for dense prediction |
| ref-45 | 2015 | Olaf Ronneberger; Philipp Fischer; et al. | U-net: Convolutional networks for biomedical image segmentation |
| ref-46 | 2025 | Oriane Simeoni; Huy V Vo; et al. | Dinov3 |
| ref-47 | 2021 | Robin Strudel; Ricardo Garcia; et al. | Segmenter: Transformer for semantic segmentation |
| ref-48 | 2022 | Xin Tan; Jiaying Lin; et al. | Mirror detection with the visual chirality cue |
| ref-49 | 2022 | Jeya Maria Jose Valanarasu; Vishal M Patel | Unext: Mlp-based rapid medical image segmentation network |
| ref-50 | 2017 | Tomas F Yago Vicente; Minh Hoai; et al. | Leave-one-out kernel optimization for shadow detection and removal |
| ref-51 | 2024 | Hongqiu Wang; Jian Chen; et al. | Dual-reference source-free active domain adaptation for nasopharyngeal carcinoma tumor segmentation across multiple hospitals |
| ref-52 | 2024 | Hongqiu Wang; Guang Yang; et al. | Video-instrument synergistic network for referring video instrument segmentation in robotic surgery |
| ref-53 | 2025 | Hongqiu Wang; Yixian Chen; et al. | Serp-mamba: Advancing high-resolution retinal vessel segmentation with selective state-space model |
| ref-54 | 2025 | Jianyuan Wang; Minghao Chen; et al. | Vggt: Visual geometry grounded transformer |
| ref-55 | 2025 | Shansong Wang; Mojtaba Safari; et al. | Dinov3 with test-time training for medical image registration |
| ref-56 | 2024 | Junde Wu; Rao Fu; et al. | Medsegdiff: Medical image segmentation with diffusion probabilistic model |
| ref-57 | 2021 | Enze Xie; Wenhai Wang; et al. | Segformer: Simple and efficient design for semantic segmentation with transformers |
| ref-58 | 2024 | Zhifeng Xie; Sen Wang; et al. | Csfwinformer: Cross-spacefrequency window transformer for mirror detection |
| ref-59 | 2024 | Zhaohu Xing; Tian Ye; et al. | Segmamba: Long-range sequential modeling mamba for 3d medical image segmentation |
| ref-60 | 2025 | Lihe Yang; Zhen Zhao; et al. | Unimatch v2: Pushing the limit of semi-supervised semantic segmentation |
| ref-61 | 2019 | Xin Yang; Haiyang Mei; et al. | Where is my mirror? In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp |
| ref-62 | 2021 | Chiyuan Zhang; Samy Bengio; et al. | Understanding deep learning (still) requires rethinking generalization |
| ref-63 | 2024 | Zhuoyang Zhang; Han Cai; et al. | Efficientvit-sam: Accelerated segment anything model without performance loss |
| ref-64 | 2023 | Xu Zhao; Wenchao Ding; et al. | Fast segment anything |
| ref-65 | 2024 | Haipeng Zhou; Hongqiu Wang; et al. | Timeline and boundary guided diffusion network for video shadow detection |
| ref-66 | 2024 | Tianfei Zhou; Wang Xia; et al. | Image segmentation in foundation model era: A survey |
| ref-67 | 2024 | Lei Zhu; Fangyun Wei; et al. | Scaling the codebook size of vq-gan to 100,000 with a utilization rate of 99% |

## Citation Analysis Report

#### 总体总结
本文围绕'如何高效利用自监督基础模型表征进行图像分割'这一核心问题组织引文。先用 FCN、U-Net 等奠基性工作和 DINO、MAE 等自监督模型铺垫技术背景，再将 CNN/Transformer/Mamba/扩散等多种分割路线并置比较，最后通过 SAM 模型的计算开销问题和现有 DINO 适配方法的重型解码器缺陷，引出本文冻结 DINOv3 + 轻量 MLP 解码器的路线。实验部分的大量镜面检测和阴影检测基线方法进一步证明了 SegDINO 在自然图像任务上的广泛适用性。


#### 关键文献

- [AY-18] Mathilde Caron, 2021: Emerging properties in self-supervised vision transformers (Background)

- [AY-4] Alexander Kirillov, 2023: Segment anything (Contrast)

- [AY-6] Jonathan Long, 2015: Fully convolutional networks for semantic segmentation (Background)

- [AY-25] Maxime Oquab, 2023: Dinov2: Learning robust visual features without supervision (Background)

- [AY-10] Olaf Ronneberger, 2015: U-net: Convolutional networks for biomedical image segmentation (Background)

- [AY-20] Oriane Simeoni, 2025: Dinov3 (Background)



#### 范围
- 章节: INTRODUCTION + METHODOLOGY + EXPERIMENTS
- 行号: 9-118

#### 按功能归类


##### Baseline

- [AY-40] Md Zahangir Alom, 2018
  - 标题: Recurrent residual convolutional neural network based on u-net (r2u-net) for medical image segmentation
  - 关键词: R2U-Net, medical segmentation baseline, recurrent residual
  - 总结: 该工作作为医学图像分割的经典基线方法被纳入实验对比，用于证明SegDINO在医学数据集上的性能优势。

- [AY-41] Vijay Badrinarayanan, 2017
  - 标题: Segnet: A deep convolutional encoderdecoder architecture for image segmentation
  - 关键词: SegNet, encoder-decoder, medical baseline
  - 总结: 该工作是经典的编码器-解码器分割架构，被用作医学图像分割实验的对比基线。

- [AY-34] Jieneng Chen, 2021
  - 标题: Transunet: Transformers make strong encoders for medical image segmentation
  - 关键词: TransUNet, transformer medical, baseline
  - 总结: 该工作是Transformer应用于医学图像分割的代表方法，在实验中作为最强竞争者被对比。

- [AY-45] Zhihao Chen, 2020
  - 标题: A multi-task mean teacher for semi-supervised shadow detection
  - 关键词: mean teacher, semi-supervised, shadow detection
  - 总结: 该工作被用作视频阴影检测任务的对比基线。

- [AY-46] Ho Kei Cheng, 2021
  - 标题: Rethinking space-time networks with improved memory coverage for efficient video object segmentation
  - 关键词: video object segmentation, space-time memory, STCN
  - 总结: 该工作是视频对象分割的经典方法，被纳入VMD-D视频镜面检测的对比实验。

- [AY-47] Xinpeng Ding, 2022
  - 标题: Learning shadow correspondence for video shadow detection
  - 关键词: shadow correspondence, video shadow, Sc-Cor
  - 总结: 该工作通过学习阴影对应关系进行视频阴影检测，被纳入ViSha数据集的对比实验。

- [AY-48] Huankang Guan, 2022
  - 标题: Learning semantic associations for mirror detection
  - 关键词: semantic association, mirror detection, SANet
  - 总结: 该工作通过学习语义关联进行镜面检测，被纳入MSD数据集的对比实验。

- [AY-49] Ruozhen He, 2023
  - 标题: Efficient mirror detection via multi-level heterogeneous learning
  - 关键词: heterogeneous learning, mirror detection, HetNet
  - 总结: 该工作是MSD镜面检测数据集上的第二好方法，被用来证明SegDINO的性能优势。

- [AY-51] Tianyu Huang, 2023
  - 标题: Symmetry-aware transformer-based mirror detection
  - 关键词: symmetry-aware, mirror detection, SATNet
  - 总结: 该工作利用对称感知Transformer进行镜面检测，被纳入MSD数据集的对比实验。

- [AY-42] Chenxin Li, 2025
  - 标题: U-kan makes strong backbone for medical image segmentation and generation
  - 关键词: U-KAN, medical segmentation, KAN
  - 总结: 该工作将KAN架构用于医学图像分割，在ISIC数据集上是第二好的方法。

- [AY-52] Jiaying Lin, 2020
  - 标题: Progressive mirror detection
  - 关键词: progressive mirror, PMDNet, mirror detection
  - 总结: 该工作提出了渐进式镜面检测方法，被纳入MSD和VMD-D数据集的对比实验。

- [AY-53] Jiaying Lin, 2021
  - 标题: Rich context aggregation with reflection prior for glass surface detection
  - 关键词: glass detection, GlassNet, reflection prior
  - 总结: 该工作提出了玻璃表面检测方法，被纳入VMD-D视频镜面检测的对比实验。

- [AY-54] Fang Liu, 2024
  - 标题: Multi-view dynamic reflection prior for video glass surface detection
  - 关键词: multi-view dynamic, glass detection, MVDRP
  - 总结: 该工作利用多视角动态反射先验进行视频玻璃表面检测，被纳入VMD-D对比实验。

- [AY-55] Lihao Liu, 2023
  - 标题: Scotch and soda: A transformer video shadow detection framework
  - 关键词: video shadow detection, transformer, Scotch-Soda
  - 总结: 该工作提出了基于Transformer的视频阴影检测框架，被纳入ViSha数据集的对比实验。

- [AY-56] Xiankai Lu, 2019
  - 标题: See more, know more: Unsupervised video object segmentation with co-attention siamese networks
  - 关键词: co-attention, video segmentation, COS-Net
  - 总结: 该工作利用协同注意孪生网络进行视频对象分割，被纳入ViSha数据集的对比实验。

- [AY-57] Xiao Lu, 2022
  - 标题: Video shadow detection via spatio-temporal interpolation consistency training
  - 关键词: spatio-temporal, shadow detection, STICT
  - 总结: 该工作通过时空插一致性训练进行视频阴影检测，被纳入ViSha和VMD-D的对比实验。

- [AY-58] Seoung Wug Oh, 2019
  - 标题: Video object segmentation using space-time memory networks
  - 关键词: space-time memory, video segmentation, STM
  - 总结: 该工作提出了时空记忆网络进行视频对象分割，被纳入ViSha数据集的对比实验。

- [AY-43] Ozan Oktay, 2018
  - 标题: Attention u-net: Learning where to look for the pancreas
  - 关键词: Attention U-Net, attention mechanism, medical
  - 总结: 该工作将注意力机制引入U-Net，被用作医学图像分割实验的对比基线。

- [AY-59] Gensheng Pei, 2022
  - 标题: Hierarchical feature alignment network for unsupervised video object segmentation
  - 关键词: hierarchical feature, video segmentation, HFAN
  - 总结: 该工作提出了层次特征对齐网络用于视频对象分割，被纳入VMD-D对比实验。

- [AY-60] Xin Tan, 2022
  - 标题: Mirror detection with the visual chirality cue
  - 关键词: visual chirality, mirror detection, VCNet
  - 总结: 该工作利用视觉手性线索进行镜面检测，被纳入MSD和VMD-D的对比实验。

- [AY-44] Jeya Maria Jose Valanarasu, 2022
  - 标题: Unext: Mlp-based rapid medical image segmentation network
  - 关键词: U-NeXt, MLP segmentation, medical
  - 总结: 该工作提出了基于MLP的快速医学图像分割网络，被用作医学图像分割实验的对比基线。

- [AY-28] Enze Xie, 2021
  - 标题: Segformer: Simple and efficient design for semantic segmentation with transformers
  - 关键词: SegFormer, semantic segmentation, efficient
  - 总结: 该工作提出了简洁高效的Transformer分割设计，既是重型解码器问题的代表，也是MSD镜面分割的对比基线。

- [AY-61] Zhifeng Xie, 2024
  - 标题: Csfwinformer: Cross-spacefrequency window transformer for mirror detection
  - 关键词: CSFwinformer, mirror detection, cross-frequency
  - 总结: 该工作提出了跨空频窗口的Transformer镜面检测方法，被纳入MSD和ViSha的对比实验。

- [AY-21] Haipeng Zhou, 2024
  - 标题: Timeline and boundary guided diffusion network for video shadow detection
  - 关键词: TBG-Diff, video shadow, diffusion
  - 总结: 该工作提出了时间边界引导扩散网络用于视频阴影检测，是ViSha数据集上的第二好方法。



##### Background

- [AY-1] Tomer Amit, 2021
  - 标题: Segdiff: Image segmentation with diffusion probabilistic models
  - 关键词: diffusion models, image segmentation, probabilistic
  - 总结: 该工作被用来展示图像分割领域中扩散模型架构的兴起，与CNN、Transformer、Mamba等并列说明当前分割方法的多元化趋势。

- [AY-22] Lev Ayzenberg, 2024
  - 标题: Dinov2 based self supervised learning for few shot medical image segmentation
  - 关键词: DINOv2, few-shot medical, self-supervised
  - 总结: 该工作展示了DINOv2在少样本医学图像分割中的应用，佐证了DINO系列在医学领域的迁移能力。

- [AY-2] Reza Azad, 2024
  - 标题: Medical image segmentation review: The success of u-net
  - 关键词: U-Net survey, medical segmentation, review
  - 总结: 该综述被引用来论证U-Net在医学图像分割中的持续成功与广泛影响。

- [AY-18] Mathilde Caron, 2021
  - 标题: Emerging properties in self-supervised vision transformers
  - 关键词: DINO, self-supervised, vision transformer
  - 总结: 该工作是DINO系列的开创性论文，被用来追溯自监督视觉Transformer的技术起点。

- [AY-23] Simon Damm, 2025
  - 标题: Anomalydino: Boosting patch-based few-shot anomaly detection with dinov2
  - 关键词: DINOv2, anomaly detection, few-shot
  - 总结: 该工作展示了DINOv2在异常检测任务中的应用，佐证了DINO系列的广泛迁移能力。

- [AY-19] Kaiming He, 2022
  - 标题: Masked au- ´ toencoders are scalable vision learners
  - 关键词: MAE, self-supervised, masked autoencoder
  - 总结: 该工作是掩码自编码器的开创性论文，被用来论证自监督基础模型在视觉领域的兴起。

- [AY-3] Jitesh Jain, 2023
  - 标题: Oneformer: One transformer to rule universal image segmentation
  - 关键词: OneFormer, universal segmentation, transformer
  - 总结: 该工作是通用图像分割的Transformer方法，被用来说明Transformer在分割任务中的广泛应用。

- [AY-5] Xiangtai Li, 2024
  - 标题: Transformer-based visual segmentation: A survey
  - 关键词: segmentation survey, transformer, review
  - 总结: 该综述被用来说明Transformer在视觉分割领域的最新进展。

- [AY-6] Jonathan Long, 2015
  - 标题: Fully convolutional networks for semantic segmentation
  - 关键词: FCN, fully convolutional, semantic segmentation
  - 总结: 该工作是全卷积网络的开创性论文，被用来追溯卷积分割方法的技术起点。

- [AY-7] Jun Ma, 2024
  - 标题: U-mamba: Enhancing long-range dependency for biomedical image segmentation
  - 关键词: U-Mamba, mamba, biomedical segmentation
  - 总结: 该工作将Mamba架构用于 biomedical 图像分割，被用来说明分割方法的多样化发展。

- [AY-9] Shervin Minaee, 2021
  - 标题: Image segmentation using deep learning: A survey
  - 关键词: deep learning survey, image segmentation, review
  - 总结: 该综述被用来说明图像分割在图像分析中的核心地位和深度学习方法的进展。

- [AY-25] Maxime Oquab, 2023
  - 标题: Dinov2: Learning robust visual features without supervision
  - 关键词: DINOv2, self-supervised, robust features
  - 总结: 该工作是DINOv2的原始论文，被用来说明DINO系列在自监督特征学习中的重要进展。

- [AY-10] Olaf Ronneberger, 2015
  - 标题: U-net: Convolutional networks for biomedical image segmentation
  - 关键词: U-Net, biomedical segmentation, CNN
  - 总结: 该工作是U-Net的原始论文，既是CNN分割方法的代表性工作，也在实验中作为医学图像分割的基线。

- [AY-20] Oriane Simeoni, 2025
  - 标题: Dinov3
  - 关键词: DINOv3, self-supervised, foundation model
  - 总结: 该工作是DINOv3的原始论文，是本文冻结骨干网络的来源，在引言和方法中被多次引用。

- [AY-11] Robin Strudel, 2021
  - 标题: Segmenter: Transformer for semantic segmentation
  - 关键词: Segmenter, transformer segmentation, semantic
  - 总结: 该工作将Transformer用于语义分割，被用来说明Transformer在分割任务中的应用。

- [AY-12] Hongqiu Wang, 2024
  - 标题: Dual-reference source-free active domain adaptation for nasopharyngeal carcinoma tumor segmentation across multiple hospitals
  - 关键词: domain adaptation, medical segmentation, computer-aided
  - 总结: 该工作涉及医学图像分割的域适应问题，被用来说明分割在计算机辅助诊断中的应用。

- [AY-26] Hongqiu Wang, 2025
  - 标题: Serp-mamba: Advancing high-resolution retinal vessel segmentation with selective state-space model
  - 关键词: SERP-Mamba, retinal vessel, state-space
  - 总结: 该工作将Mamba状态空间模型用于高分辨率视网膜血管分割，被用来说明Mamba在医学分割中的应用。

- [AY-13] Junde Wu, 2024
  - 标题: Medsegdiff: Medical image segmentation with diffusion probabilistic model
  - 关键词: MedSegDiff, diffusion medical, probabilistic
  - 总结: 该工作将扩散概率模型用于医学图像分割，被用来说明扩散方法在医学分割中的应用。

- [AY-14] Zhaohu Xing, 2024
  - 标题: Segmamba: Long-range sequential modeling mamba for 3d medical image segmentation
  - 关键词: SegMamba, 3D medical, long-range
  - 总结: 该工作将Mamba用于3D医学图像的长序列建模分割，被用来说明Mamba在医学分割中的应用。

- [AY-15] Chiyuan Zhang, 2021
  - 标题: Understanding deep learning (still) requires rethinking generalization
  - 关键词: generalization, deep learning, rethinking
  - 总结: 该工作被用来论证深度学习在训练数据有限时的泛化挑战。

- [AY-27] Lei Zhu, 2024
  - 标题: Scaling the codebook size of vq-gan to 100,000 with a utilization rate of 99%
  - 关键词: VQ-GAN, codebook scaling, representation
  - 总结: 该工作涉及VQ-GAN码本缩放，被用来说明DINO系列在表征学习中的应用范围。



##### Dataset

- [AY-31] Noel CF Codella, 2018
  - 标题: Skin lesion analysis toward melanoma detection: A challenge at the 2017 international symposium on biomedical imaging (isbi), hosted by the international skin imaging collaboration (isic)
  - 关键词: ISIC dataset, skin lesion, benchmark
  - 总结: 该文献描述了ISIC皮肤病变分割基准数据集，是本文三个医学图像评估基准之一。

- [AY-32] Haifan Gong, 2023
  - 标题: Thyroid region prior guided attention for ultrasound segmentation of thyroid nodules
  - 关键词: TN3K dataset, thyroid nodule, ultrasound
  - 总结: 该文献描述了TN3K甲状腺结节分割数据集，是本文三个医学图像评估基准之一。

- [AY-50] Xiaowei Hu, 2021
  - 标题: Revisiting shadow detection: A new benchmark dataset for complex world
  - 关键词: shadow detection benchmark, complex world, FSD
  - 总结: 该工作提出了复杂世界的阴影检测新基准数据集，被纳入ViSha数据集的对比实验。

- [AY-33] Debesh Jha, 2019
  - 标题: Kvasir-seg: A segmented polyp dataset
  - 关键词: Kvasir-SEG, polyp segmentation, colonoscopy
  - 总结: 该文献描述了Kvasir-SEG息肉分割数据集，是本文三个医学图像评估基准之一。

- [AY-35] Jiaying Lin, 2023
  - 标题: Learning to detect mirrors from videos via dual correspondences
  - 关键词: VMD-D dataset, video mirror, dual correspondence
  - 总结: 该文献既描述了VMD-D视频镜面检测数据集，也提出了双对应视频镜面检测方法。

- [AY-36] Xin Yang, 2019
  - 标题: Where is my mirror? In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp
  - 关键词: MSD dataset, mirror detection, MirrorNet
  - 总结: 该文献既描述了MSD静态镜面分割数据集，也提出了MirrorNet方法，被用于MSD和VMD-D的对比实验。



##### Contrast

- [AY-24] Yifan Gao, 2025
  - 标题: Dino u-net: Exploiting highfidelity dense features from foundation models for medical image segmentation, 2025
  - 关键词: DINO U-Net, dense features, medical
  - 总结: 该工作代表了利用DINO密集特征进行医学图像分割的技术路线，与本文方法形成对比。

- [AY-4] Alexander Kirillov, 2023
  - 标题: Segment anything
  - 关键词: SAM, zero-shot, segment anything
  - 总结: 该工作提出了Segment Anything模型，被用来说明零样本分割方法虽然强大但需要大量微调且计算开销大。

- [AY-8] Maciej A Mazurowski, 2023
  - 标题: Segment anything model for medical image analysis: an experimental study
  - 关键词: SAM medical, experimental study, medical image
  - 总结: 该工作对SAM模型在医学图像分析中的应用进行了实验研究，佐证了SAM在医学领域的适用性但同时也暗示了其局限性。

- [AY-29] Lihe Yang, 2025
  - 标题: Unimatch v2: Pushing the limit of semi-supervised semantic segmentation
  - 关键词: UniMatch v2, semi-supervised, segmentation
  - 总结: 该工作代表了半监督语义分割中重型解码器的技术路线，被用来说明现有DINO适配方法的复杂度问题。

- [AY-16] Zhuoyang Zhang, 2024
  - 标题: Efficientvit-sam: Accelerated segment anything model without performance loss
  - 关键词: EfficientViT-SAM, accelerated SAM, efficiency
  - 总结: 该工作尝试加速SAM模型，被用来说明SAM计算开销大的问题以及轻量化努力的必要性。

- [AY-17] Xu Zhao, 2023
  - 标题: Fast segment anything
  - 关键词: Fast SAM, segment anything, speed
  - 总结: 该工作提出了快速SAM方法，被用来说明SAM模型在轻量或资源受限场景中的计算开销问题。



##### Tooling

- [AY-37] Ilya Loshchilov, 2017
  - 标题: Decoupled weight decay regularization
  - 关键词: AdamW, optimizer, weight decay
  - 总结: 该文献描述了AdamW优化器，是本文实验设置中使用的优化方法。

- [AY-38] Adam Paszke, 2019
  - 标题: Pytorch: An imperative style, highperformance deep learning library
  - 关键词: PyTorch, deep learning framework, implementation
  - 总结: 该文献描述了PyTorch框架，是本文实验的实现基础。

- [AY-39] Tomas F Yago Vicente, 2017
  - 标题: Leave-one-out kernel optimization for shadow detection and removal
  - 关键词: shadow BER, evaluation metric, leave-one-out
  - 总结: 该文献描述了阴影检测中使用的评估指标方法，是本文阴影分割实验指标的来源。



##### Component

- [AY-30] Rene Ranftl, 2021
  - 标题: Vision transformers for dense prediction
  - 关键词: ViT dense prediction, upsampling, decoder design
  - 总结: 该工作提出了Vision Transformer用于密集预测的方法，其升采样和通道集成设计被本文L-Decoder借鉴。





#### 时间线分析

##### 早期
早期工作奠定了图像分割的基础架构与评估方法。FCN (Long et al., 2015) 开创了全卷积分割范式，U-Net (Ronneberger et al., 2015) 确立了编码器-解码器架构在医学图像分割中的主导地位。SegNet、Attention U-Net、R2U-Net 等变体进一步丰富了 CNN 分割方法。同时，PyTorch 框架和 AdamW 优化器等工具性工为后续深度学习实验提供了基础设施。MSD、Kvasir-SEG、ISIC 等基准数据集和 MirrorNet 等镜面检测方法也在这一时期建立。


- [AY-40] Md Zahangir Alom, 2018: Recurrent residual convolutional neural network based on u-net (r2u-net) for medical image segmentation

- [AY-41] Vijay Badrinarayanan, 2017: Segnet: A deep convolutional encoderdecoder architecture for image segmentation

- [AY-31] Noel CF Codella, 2018: Skin lesion analysis toward melanoma detection: A challenge at the 2017 international symposium on biomedical imaging (isbi), hosted by the international skin imaging collaboration (isic)

- [AY-33] Debesh Jha, 2019: Kvasir-seg: A segmented polyp dataset

- [AY-6] Jonathan Long, 2015: Fully convolutional networks for semantic segmentation

- [AY-37] Ilya Loshchilov, 2017: Decoupled weight decay regularization

- [AY-56] Xiankai Lu, 2019: See more, know more: Unsupervised video object segmentation with co-attention siamese networks

- [AY-58] Seoung Wug Oh, 2019: Video object segmentation using space-time memory networks

- [AY-43] Ozan Oktay, 2018: Attention u-net: Learning where to look for the pancreas

- [AY-38] Adam Paszke, 2019: Pytorch: An imperative style, highperformance deep learning library

- [AY-10] Olaf Ronneberger, 2015: U-net: Convolutional networks for biomedical image segmentation

- [AY-39] Tomas F Yago Vicente, 2017: Leave-one-out kernel optimization for shadow detection and removal

- [AY-36] Xin Yang, 2019: Where is my mirror? In Proceedings of the IEEE/CVF International Conference on Computer Vision, pp




##### 中期
中期工作将 Transformer 和自监督学习引入分割领域。DINO (Caron et al., 2021) 和 MAE (He et al., 2022) 开创了自监督视觉表征学习路线，TransUNet 将 Transformer 引入医学图像分割。Diffusion 模型（SegDiff、MedSegDiff）为分割提供了新的概率建框架。Segmenter、OneFormer 等方法推动了纯 Transformer 分割的发展。同时，镜面检测（PMDNet、VCNet、SANet、HetNet）和视频阴影检测（COS-Net、STM、STICT、Scotch-Soda）等特定任务方法也在这一时期快速发展。


- [AY-1] Tomer Amit, 2021: Segdiff: Image segmentation with diffusion probabilistic models

- [AY-18] Mathilde Caron, 2021: Emerging properties in self-supervised vision transformers

- [AY-34] Jieneng Chen, 2021: Transunet: Transformers make strong encoders for medical image segmentation

- [AY-45] Zhihao Chen, 2020: A multi-task mean teacher for semi-supervised shadow detection

- [AY-46] Ho Kei Cheng, 2021: Rethinking space-time networks with improved memory coverage for efficient video object segmentation

- [AY-47] Xinpeng Ding, 2022: Learning shadow correspondence for video shadow detection

- [AY-48] Huankang Guan, 2022: Learning semantic associations for mirror detection

- [AY-19] Kaiming He, 2022: Masked au- ´ toencoders are scalable vision learners

- [AY-50] Xiaowei Hu, 2021: Revisiting shadow detection: A new benchmark dataset for complex world

- [AY-52] Jiaying Lin, 2020: Progressive mirror detection

- [AY-53] Jiaying Lin, 2021: Rich context aggregation with reflection prior for glass surface detection

- [AY-57] Xiao Lu, 2022: Video shadow detection via spatio-temporal interpolation consistency training

- [AY-9] Shervin Minaee, 2021: Image segmentation using deep learning: A survey

- [AY-59] Gensheng Pei, 2022: Hierarchical feature alignment network for unsupervised video object segmentation

- [AY-30] Rene Ranftl, 2021: Vision transformers for dense prediction

- [AY-11] Robin Strudel, 2021: Segmenter: Transformer for semantic segmentation

- [AY-60] Xin Tan, 2022: Mirror detection with the visual chirality cue

- [AY-44] Jeya Maria Jose Valanarasu, 2022: Unext: Mlp-based rapid medical image segmentation network

- [AY-28] Enze Xie, 2021: Segformer: Simple and efficient design for semantic segmentation with transformers

- [AY-15] Chiyuan Zhang, 2021: Understanding deep learning (still) requires rethinking generalization




##### 近期
近期工作收束到本文所处的方法脉络。DINOv2/v3 (Oquab et al., 2023; Simeoni et al., 2025) 显著提升了自监督骨干的表征能力，DINO U-Net (Gao et al., 2025) 等探索了 DINO 密集特征用于医学分割。SAM (Kirillov et al., 2023) 虽然零样本能力强但计算开销大，EfficientViT-SAM 和 Fast SAM 尝试加速。Mamba 架构（U-Mamba、SegMamba、SERP-Mamba）为长序列建模提供了 CNN/Transformer 之外的新路线。TBG-Diff 等扩散方法在阴影检测中达到 SOTA。这些工作共同构成了 SegDINO 的技术背景与对比基线。


- [AY-22] Lev Ayzenberg, 2024: Dinov2 based self supervised learning for few shot medical image segmentation

- [AY-2] Reza Azad, 2024: Medical image segmentation review: The success of u-net

- [AY-23] Simon Damm, 2025: Anomalydino: Boosting patch-based few-shot anomaly detection with dinov2

- [AY-24] Yifan Gao, 2025: Dino u-net: Exploiting highfidelity dense features from foundation models for medical image segmentation, 2025

- [AY-32] Haifan Gong, 2023: Thyroid region prior guided attention for ultrasound segmentation of thyroid nodules

- [AY-49] Ruozhen He, 2023: Efficient mirror detection via multi-level heterogeneous learning

- [AY-51] Tianyu Huang, 2023: Symmetry-aware transformer-based mirror detection

- [AY-3] Jitesh Jain, 2023: Oneformer: One transformer to rule universal image segmentation

- [AY-4] Alexander Kirillov, 2023: Segment anything

- [AY-42] Chenxin Li, 2025: U-kan makes strong backbone for medical image segmentation and generation

- [AY-5] Xiangtai Li, 2024: Transformer-based visual segmentation: A survey

- [AY-35] Jiaying Lin, 2023: Learning to detect mirrors from videos via dual correspondences

- [AY-54] Fang Liu, 2024: Multi-view dynamic reflection prior for video glass surface detection

- [AY-55] Lihao Liu, 2023: Scotch and soda: A transformer video shadow detection framework

- [AY-7] Jun Ma, 2024: U-mamba: Enhancing long-range dependency for biomedical image segmentation

- [AY-8] Maciej A Mazurowski, 2023: Segment anything model for medical image analysis: an experimental study

- [AY-25] Maxime Oquab, 2023: Dinov2: Learning robust visual features without supervision

- [AY-20] Oriane Simeoni, 2025: Dinov3

- [AY-12] Hongqiu Wang, 2024: Dual-reference source-free active domain adaptation for nasopharyngeal carcinoma tumor segmentation across multiple hospitals

- [AY-26] Hongqiu Wang, 2025: Serp-mamba: Advancing high-resolution retinal vessel segmentation with selective state-space model

- [AY-13] Junde Wu, 2024: Medsegdiff: Medical image segmentation with diffusion probabilistic model

- [AY-61] Zhifeng Xie, 2024: Csfwinformer: Cross-spacefrequency window transformer for mirror detection

- [AY-14] Zhaohu Xing, 2024: Segmamba: Long-range sequential modeling mamba for 3d medical image segmentation

- [AY-29] Lihe Yang, 2025: Unimatch v2: Pushing the limit of semi-supervised semantic segmentation

- [AY-16] Zhuoyang Zhang, 2024: Efficientvit-sam: Accelerated segment anything model without performance loss

- [AY-17] Xu Zhao, 2023: Fast segment anything

- [AY-21] Haipeng Zhou, 2024: Timeline and boundary guided diffusion network for video shadow detection

- [AY-27] Lei Zhu, 2024: Scaling the codebook size of vq-gan to 100,000 with a utilization rate of 99%


# LW-DETR: a transformer replacement to YOLO for real-time detection (2024)

- Paper ref: 1:8838AH6P
- Title: LW-DETR: a transformer replacement to YOLO for real-time detection
- Year: 2024

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Carion, N.; Massa, F.; et al. | Endto-end object detection with transformers |
| ref-2 | 2023 | Chang, J.; Wang, S.; et al. | Detrdistill: A universal knowledge distillation framework for detr-families |
| ref-3 | 2023 | Chen, Q.; Chen, X.; et al. | Group detr: Fast detr training with group-wise one-to-many assignment |
| ref-4 | 2022 | Chen, Q.; Wang, J.; et al. | Group detr v2: Strong object detector with encoder-decoder pretraining. arXiv preprint arXiv:2211.03594 |
| ref-5 | 2021 | Chen, W.; Du, X.; et al. | A simple single-scale vision transformer for object localization and instance segmentation. arXiv preprint arXiv:2112.09747 |
| ref-6 | 2022 | Chen, X.; Chen, J.; et al. | D $^ 3$ etr: Decoder distillation for detection transformer. arXiv preprint arXiv:2211.09768 |
| ref-7 | 2022 | Chen, X.; Ding, M.; et al. | Context autoencoder for self-supervised representation learning. arXiv preprint arXiv:2202.03026 |
| ref-8 | 2022 | Chen, X.; Wei, F.; et al. | Conditional detr v2: Efficient detection transformer with box queries. arXiv preprint arXiv:2207.08914 |
| ref-9 | 2023 | Chen, Y.; Yuan, X.; et al. | Yolo-ms: Rethinking multi-scale representation learning for real-time object detection. arXiv preprint arXiv:2308.05480 |
| ref-10 | 2022 | Ciaglia, F.; Zuppichini, F.S.; et al. | Roboflow 100: A rich, multi-domain object detection benchmark. arXiv preprint arXiv:2211.13523 |
| ref-11 | 2020 | Clark, K.; Luong, M.T.; et al. | Electra: Pre-training text encoders as discriminators rather than generators. arXiv preprint arXiv:2003.10555 |
| ref-12 | 2009 | Deng, J.; Dong, W.; et al. | Imagenet: A largescale hierarchical image database |
| ref-13 | 2021 | Ding, X.; Zhang, X.; et al. | Repvgg: Making vgg-style convnets great again |
| ref-14 | 2020 | Dosovitskiy, A.; Beyer, L.; et al. | An image is worth 16x16 words: Transformers for image recognition at scale. arXiv preprint arXiv:2010.11929 |
| ref-15 | 2020 | Feng, D.; Rosenbaum, L.; et al. | Deep multi-modal object detection and semantic segmentation for autonomous driving: Datasets, methods, and challenges. IEEE Transactions on Intelligent Transportation Systems 22(3), 1341–1360 |
| ref-16 | 2022 | Gao, Z.; Wang, L.; et al. | Adamixer: A fast-converging query-based object detector |
| ref-17 | 2021 | Ge, Z.; Liu, S.; et al. | Yolox: Exceeding yolo series in 2021. arXiv preprint arXiv:2107.08430 |
| ref-18 | 2023 | Hatamizadeh, A.; Heinrich, G.; et al. | Fastervit: Fast vision transformers with hierarchical attention. arXiv preprint arXiv:2306.06189 |
| ref-19 | 2022 | He, K.; Chen, X.; et al. | Masked autoencoders are scalable vision learners |
| ref-20 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-21 | 2017 | Hosang, J.; Benenson, R.; et al. | Learning non-maximum suppression |
| ref-22 | 2023 | Hu, Y.; Yang, J.; et al. | Planning-oriented autonomous driving |
| ref-23 | 2017 | Huang, G.; Liu, Z.; et al. | Densely connected convolutional networks |
| ref-24 | 2023 | Jia, D.; Yuan, Y.; et al. | Detrs with hybrid matching |
| ref-25 | 2020 | Jocher, G. | Ultralytics yolov5 (2020), https://github.com/ultralytics/yolov5 |
| ref-26 | 2023 | Jocher, G.; Chaurasia, A.; et al. | Ultralytics yolov8 (2023), https://github. com/ultralytics/ultralytics |
| ref-27 | 2019 | Karaoguz, H.; Jensfelt, P. | Object detection approach for robot grasp detection |
| ref-28 | 2019 | Li, B.; Ouyang, W.; et al. | Gs3d: An efficient 3d object detection framework for autonomous driving |
| ref-29 | 2023 | Li, C.; Li, L.; et al. | Yolov6 v3. 0: A full-scale reloading. arXiv preprint arXiv:2301.05586 |
| ref-30 | 2022 | Li, C.; Li, L.; et al. | Yolov6: A single-stage object detection framework for industrial applications. arXiv preprint arXiv:2209.02976 |
| ref-31 | 2023 | Li, F.; Zeng, A.; et al. | Lite detr: An interleaved multi-scale encoder for efficient detr |
| ref-32 | 2022 | Li, F.; Zhang, H.; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-33 | 2022 | Li, Y.; Mao, H.; et al. | Exploring plain vision transformer backbones for object detection |
| ref-34 | 2021 | Li, Y.; Xie, S.; et al. | Benchmarking detection transfer learning with vision transformers. arXiv preprint arXiv:2111.11429 |
| ref-35 | 2017 | Lin, T.Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-36 | 2014 | Lin, T.Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-37 | 2023 | Lin, Y.; Yuan, Y.; et al. | Detr doesn’t need multiscale or locality design. arXiv preprint arXiv:2308.01904 |
| ref-38 | 2022 | Liu, S.; Li, F.; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr. arXiv preprint arXiv:2201.12329 |
| ref-39 | 2023 | Liu, S.; Ren, T.; et al. | Detection transformer with stable matching. arXiv preprint arXiv:2304.04742 |
| ref-40 | 2021 | Liu, Z.; Lin, Y.; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-41 | 2017 | Loshchilov, I.; Hutter, F. | Decoupled weight decay regularization. arXiv preprint arXiv:1711.05101 |
| ref-42 | 2023 | Lv, W.; Xu, S.; et al. | Detrs beat yolos on real-time object detection. arXiv preprint arXiv:2304.08069 |
| ref-43 | 2022 | Lyu, C.; Zhang, W.; et al. | Rtmdet: An empirical study of designing real-time object detectors. arXiv preprint arXiv:2212.07784 |
| ref-44 | 2021 | Meng, D.; Chen, X.; et al. | Conditional detr for fast training convergence |
| ref-45 | 2022 | Ouyang-Zhang, J.; Cho, J.H.; et al. | Nms strikes back. arXiv preprint arXiv:2212.06137 |
| ref-46 | 2021 | Paul, S.K.; Chowdhury, M.T.; et al. | Object detection and pose estimation from rgb and depth data for real-time, adaptive robotic grasping |
| ref-47 | 2016 | Redmon, J.; Divvala, S.; et al. | You only look once: Unified, real-time object detection |
| ref-48 | 2015 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks. Advances in neural information processing systems 28 |
| ref-49 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union: A metric and a loss for bounding box regression |
| ref-50 | 2021 | Roh, B.; Shin, J.; et al. | Sparse detr: Efficient end-to-end object detection with learnable sparsity. arXiv preprint arXiv:2111.14330 |
| ref-51 | 2019 | Shao, S.; Li, Z.; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-52 | 2017 | Tarvainen, A.; Valpola, H. | Mean teachers are better role models: Weight-averaged consistency targets improve semi-supervised deep learning results. Advances in neural information processing systems 30 |
| ref-53 | 2019 | Tian, Z.; Shen, C.; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-54 | 2024 | Wang, A.; Chen, H.; et al. | Yolov10: Realtime end-to-end object detection. arXiv preprint arXiv:2405.14458 |
| ref-55 | 2023 | Wang, C.; He, W.; et al. | Gold-yolo: Efficient object detector via gather-and-distribute mechanism. arXiv preprint arXiv:2309.11331 |

## Citation Analysis Report

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


# Conditional Convolutions for Instance Segmentation (2020)

- Paper ref: 1:8AXAW2GX
- Title: Conditional Convolutions for Instance Segmentation
- Year: 2020

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | A. Paszke et al. | PyTorch: An imperative style, high-performance deep learning library |
| ref-2 | 2020 | Bian, J.W.; Zhan, H.; et al. | Unsupervised depth learning in challenging indoor video: Weak rectification to rescue. arXiv preprint arXiv:2006.02708 |
| ref-3 | 2019 | Bian, J.; Li, Z.; et al. | Unsupervised scale-consistent depth and ego-motion learning from monocular video |
| ref-4 | 2019 | Bolya, D.; Zhou, C.; et al. | YOLACT: real-time instance segmentation |
| ref-5 | 2016 | Boominathan, L.; Kruthiventi, S.; et al. | Crowdnet: A deep convolutional network for dense crowd counting |
| ref-6 | 2020 | Chen, H.; Sun, K.; et al. | Blendmask: Top-down meets bottom-up for instance segmentation |
| ref-7 | 2019 | Chen, K.; Pang, J.; et al. | Hybrid task cascade for instance segmentation |
| ref-8 | 2017 | Chen, L.C.; Papandreou, G.; et al. | Deeplab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs |
| ref-9 | 2019 | Chen, X.; Girshick, R.; et al. | Tensormask: A foundation for dense object segmentation |
| ref-10 | 2016 | Dai, J.; He, K.; et al. | Instance-sensitive fully convolutional networks |
| ref-11 | 2009 | Deng, J.; Dong, W.; et al. | Imagenet: A large-scale hierarchical image database |
| ref-12 | 2017 | Fathi, A.; Wojna, Z.; et al. | Semantic instance segmentation via deep metric learning. arXiv: Comp. Res. Repository |
| ref-13 | 2019 | He, K.; Girshick, R. | Rethinking imagenet pre-training |
| ref-14 | 2017 | He, K.; Gkioxari, G.; et al. | Mask R-CNN |
| ref-15 | 2015 | He, K.; Zhang, X.; et al. | Spatial pyramid pooling in deep convolutional networks for visual recognition |
| ref-16 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-17 | 2019 | He, T.; Shen, C.; et al. | Knowledge adaptation for efficient semantic segmentation |
| ref-18 | 2019 | Huang, Z.; Huang, L.; et al. | Mask scoring r-cnn |
| ref-19 | 2015 | Ioffe, S.; Szegedy, C. | Batch normalization: Accelerating deep network training by reducing internal covariate shift. arXiv preprint arXiv:1502.03167 |
| ref-20 | 2016 | Jia, X.; Brabandere, B.; et al. | Dynamic filter networks |
| ref-21 | 2017 | Lin, T.Y.; Girshick, R.; et al. | Feature pyramid networks for object detection |
| ref-22 | 2017 | Lin, T.Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-23 | 2014 | Lin, T.Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-24 | 2016 | Liu, F.; Shen, C.; et al. | Learning depth from single monocular images using deep convolutional neural fields |
| ref-25 | 2018 | Liu, S.; Qi, L.; et al. | Path aggregation network for instance segmentation |
| ref-26 | 2020 | Liu, Y.; Shu, C.; et al. | Structured knowledge distillation for dense prediction |
| ref-27 | 2015 | Long, J.; Shelhamer, E.; et al. | Fully convolutional networks for semantic segmentation |
| ref-28 | 2016 | M. Abadi et al. | TensorFlow: A system for large-scale machine learning |
| ref-29 | 2016 | Milletari, F.; Navab, N.; et al. | V-net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-30 | 2019 | Neven, D.; Brabandere, B.D.; et al. | Instance segmentation by jointly optimizing spatial embeddings and clustering bandwidth |
| ref-31 | 2017 | Newell, A.; Huang, Z.; et al. | Associative embedding: End-to-end learning for joint detection and grouping |
| ref-32 | 2018 | Novotny, D.; Albanie, S.; et al. | Semi-convolutional operators for instance segmentation |
| ref-33 | 2018 | Perez, E.; Strub, F.; et al. | Film: Visual reasoning with a general conditioning layer |
| ref-34 | 2015 | Ren, S.; He, K.; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-35 | 2019 | Sofiiuk, K.; Barinova, O.; et al. | Adaptis: Adaptive instance selection network |
| ref-36 | 2019 | Tian, Z.; He, T.; et al. | Decoders matter for semantic segmentation: Data-dependent decoding enables flexible feature aggregation |
| ref-37 | 2019 | Tian, Z.; Shen, C.; et al. | FCOS: Fully convolutional one-stage object detection |
| ref-38 | 2019 | Wang, X.; Kong, T.; et al. | SOLO: Segmenting objects by locations. arXiv: Comp. Res. Repository |
| ref-39 | 2019 | Wu, Y.; Kirillov, A.; et al. | Detectron2. https:// github.com/facebookresearch/detectron2 |
| ref-40 | 2020 | Xie, E.; Sun, P.; et al. | PolarMask: Single shot instance segmentation with polar representation |
| ref-41 | 2019 | Yang, B.; Bender, G.; et al. | Condconv: Conditionally parameterized convolutions for efficient inference |
| ref-42 | 2019 | Yin, W.; Liu, Y.; et al. | Enforcing geometric constraints of virtual normal for depth prediction |
| ref-43 | 2020 | Yin, W.; Wang, X.; et al. | Diversedepth: Affine-invariant depth prediction using diverse data. arXiv preprint arXiv:2002.00569 |
| ref-44 | 2019 | Ying, H.; Huang, Z.; et al. | Embedmask: Embedding coupling for one-stage instance segmentation. arXiv preprint arXiv:1912.01954 |
| ref-45 | 2019 | Zhou, X.; Wang, D. | Objects as points. arXiv: Comp. Res. Repository |

## Citation Analysis Report

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


# DINO Soars: DINOv3 for Open-Vocabulary Semantic Segmentation of Remote Sensing Imagery (2026)

- Paper ref: 1:8DP4884A
- Title: DINO Soars: DINOv3 for Open-Vocabulary Semantic Segmentation of Remote Sensing Imagery
- Year: 2026

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 |  | 2D Semantic Labeling | https://www.isprs.org/ |
| ref-2 | 2024 | Luca Barsellotti; Roberto Amoroso; et al. | Training-Free Open-Vocabulary Segmentation with Offline Diffusion-Augmented Prototype Generation. In 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3689–3698, 2024. 3 |
| ref-3 | 2018 | Holger Caesar; Jasper Uijlings; et al. | Thing and stuff classes in context. In Computer Vision and Pattern Recognition (CVPR), 2018 IEEE Conference On. IEEE, 2018. 2, 5 |
| ref-4 | 2025 | Qinglong Cao; Yuntian Chen; et al. | 1–14, 2025. 3, 4, 7 |
| ref-5 | 2018 | Jia-Ren Chang; Yong-Sheng Chen | Pyramid Stereo Matching Network. In 2018 IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 5410–5418, 2018. 3 |
| ref-6 | 2023 | Mehdi Cherti; Romain Beaumont; et al. | Reproducible scaling laws for contrastive language-image learning. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 2818–2829, 2023. 2 |
| ref-7 | 2023 | Seokju Cho; Sunghwan Hong; et al. | Boosting cost aggregation with convolutions and transformers. IEEE Transactions on Pattern Analysis and Machine Intelligence, 45(6):7174–7194, 2023. 3 |
| ref-8 | 2024 | Seokju Cho; Heeseong Shin; et al. | Cost Aggregation for Open-Vocabulary Semantic Segmentation. In 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 4113–4123, Seattle, WA, USA, 2024. IEEE. 3, 4, 6 |
| ref-9 | 2025 | Paul Couairon; Loick Chambon; et al. | Jack up any feature at any resolution, 2025. 2, 3 |
| ref-10 | 2022 | Jian Ding; Nan Xue; et al. | Decoupling Zero-Shot Semantic Segmentation. In 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 11573–11582, 2022. 3 |
| ref-11 | 2020 | Alexey Dosovitskiy; Lucas Beyer; et al. | Transformers for Image Recognition at Scale. In International Conference on Learning Representations, 2020. 3 |
| ref-12 | 2025 | Saikat Dutta; Akhil Vasim; et al. | Harnessing SAM for Open-Vocabulary Segmentation in Remote Sensing Images. In 2025 IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (CVPRW), pages 2245–2255, Nashville, TN, USA, 2025. IEEE. 3 |
| ref-13 | 2024 | Stephanie Fu; Mark Hamilton; et al. | A model-agnostic framework for features at any resolution. In The Twelfth International Conference on Learning Representations, 2024. 2, 3 |
| ref-14 | 2022 | Golnaz Ghiasi; Xiuye Gu; et al. | Scaling Open-Vocabulary Image Segmentation with Image-Level Labels. In Computer Vision – ECCV 2022, pages 540–557. Springer Nature Switzerland, Cham, 2022. 3 |
| ref-15 | 2019 | Xiaoyang Guo; Kai Yang; et al. | Group-Wise Correlation Stereo Network. In 2019 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3268–3277, Long Beach, CA, USA, 2019. IEEE. 3 |
| ref-16 | 2024 | Cijo Jose; Théo Moutakanni; et al. | A unified framework for image- and pixel-level vision-language alignment, 2024. 1, 3 |
| ref-17 | 2024 | Dahyun Kang; Minsu Cho | 18th European Conference, Milan, Italy, September 29–October 4, 2024, Proceedings, Part XLI, pages 143–164, Berlin, Heidelberg, 2024. Springer-Verlag. 3 |
| ref-18 | 2023 | Alexandre Lacoste; Nils Lehmann; et al. | Toward foundation models for earth monitoring. In Proceedings of the 37th International Conference on Neural Information Processing Systems, pages 51080–51093, Red Hook, NY, USA, 2023. Curran Associates Inc. 2, 3 |
| ref-19 | 2024 | Mengcheng Lan; Chaofeng Chen; et al. | Proxy attention improves clip for open-vocabulary segmentation. In European Conference on Computer Vision, pages 70–88. Springer, 2024. 3 |
| ref-20 | 2022 | Boyi Li; Kilian Q Weinberger; et al. | Language-driven semantic segmentation. In International Conference on Learning Representations, 2022. 3 |
| ref-21 | 2022 | Junnan Li; Dongxu Li; et al. | Bootstrapping language-image pre-training for unified vision-language understanding and generation. In ICML, 2022. 2 |
| ref-22 | 2023 | Junnan Li; Dongxu Li; et al. | Bootstrapping language-image pre-training with frozen image encoders and large language models. In Proceedings of the 40th International Conference on Machine Learning, pages 19730–19742, Honolulu, Hawaii, USA, 2023. JMLR.org. 2 |
| ref-23 | 2025 | Kaiyu Li; Ruixun Liu; et al. | Segearth-ov: Towards training-free open-vocabulary segmentation for remote sensing images |
| ref-24 | 2025 | training-free open-vocabulary segmentation for remote sensing images | In Proceedings of the Computer Vision and Pattern Recognition Conference, pages 10545–10556, 2025. 3, 6, 7, 1 |
| ref-25 | 2023 | Feng Liang; Bichen Wu; et al. | Open-vocabulary semantic segmentation with mask-adapted clip. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 7061–7070, 2023. 3 |
| ref-26 | 2024 | Yong Liu; Sule Bai; et al. | Open-Vocabulary Segmentation with Semantic-Assisted Calibration. In 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3491–3500, 2024. 3 |
| ref-27 | 2021 | Ze Liu; Yutong Lin; et al. | Hierarchical Vision Transformer using Shifted Windows. In 2021 IEEE/CVF International Conference on Computer Vision (ICCV), pages 9992–10002, Montreal, QC, Canada, 2021. IEEE. 4 |
| ref-28 | 2023 | Jishnu Mukhoti; Tsung-Yu Lin; et al. | Torr, and Ser-Nam Lim. Open Vocabulary Semantic Segmentation with Patch Aligned Contrastive Learning. In 2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 19413– 19423, 2023. 3 |
| ref-29 | 2021 | Alec Radford; Jong Wook Kim; et al. | Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger, and I. Sutskever. Learning Transferable Visual Models From Natural Language Supervision. In International Conference on Machine Learning, 2021. 2 |
| ref-30 | 2025 | Tong Shao; Zhuotao Tian; et al. | Explore the Potential of CLIP for Training-Free Open Vocabulary Semantic Segmentation. In Computer Vision – ECCV 2024, pages 139–156, Cham, 2025. Springer Nature Switzerland. 3 |
| ref-31 | 2025 | Oriane Siméoni; Huy V. Vo; et al. | Vo, Maximilian Seitzer, Federico Baldassarre, Maxime Oquab, Cijo Jose, Vasil Khalidov, Marc Szafraniec, Seungeun Yi, Michaël Ramamonjisoa, Francisco Massa, Daniel Haziza, Luca Wehrstedt, Jianyuan Wang, Timothée Darcet, Théo Moutakanni, Leonel Sentana, Claire Roberts, Andrea Vedaldi, Jamie Tolan, John Brandt, Camille Couprie, Julien Mairal, Hervé Jégou, Patrick Labatut, and Piotr Bojanowski. DINOv3, 2025. 1, 3, 7 |
| ref-32 | 2024 | Shuyang Sun; Runjia Li; et al. | Segment countless visual concepts without training endeavor. In CVPR, 2024. 3 |
| ref-33 | 2025 | Saksham Suri; Matthew Walmer; et al. | A surprisingly simple lightweight feature transform for dense ViT descriptors. In European Conference on Computer Vision, pages 110–128. Springer, 2025. 2, 3 |
| ref-34 | 2024 | Daniela Szwarcman; Sujit Roy; et al. | A versatile multitemporal foundation model for earth observation applications. arXiv preprint arXiv:2412.02732, 2024. 2, 3 |
| ref-35 | 2024 | Jamie Tolan; Hung-I Yang; et al. | 113888, 2024. 3 |
| ref-36 | 2025 | Tobias Uelwer; Jan Robine; et al. | 111, 2025. 3 |
| ref-37 | 2021 | Junjue Wang; Zhuo Zheng; et al. | LoveDA: A Remote Sensing Land-Cover Dataset for Domain Adaptive Semantic Segmentation |
| ref-38 | 2023 | Jinglong Wang; Xiawei Li; et al. | 2309.02773, 2023. 3 |
| ref-39 | 2025 | Wenzhen Wang; Aoran Xiao; et al. | 1–17, 2025. 3 |
| ref-40 | 2025 | Thomas Wimmer; Prune Truong; et al. | Universal feature upsampling. arXiv preprint arXiv:2510.12764, 2025. 2, 3 |
| ref-41 | 2023 | Junshi Xia; Naoto Yokoya; et al. | A Benchmark Dataset for Global High-Resolution Land Cover Mapping. In 2023 IEEE/CVF Winter Conference on Applications of Computer Vision (WACV), pages 6243–6253, 2023. 6 |
| ref-42 | 2024 | Zhitong Xiong; Yi Wang; et al. | 2403.15356, 2024. 3 |
| ref-43 | 2025 | Zhitong Xiong; Yi Wang; et al. | Stewart, Joëlle Hanna, Damian Borth, Ioannis Papoutsis, Bertrand Le Saux, Gustau Camps-Valls, and Xiao Xiang Zhu. Neural Plasticity-Inspired Multimodal Foundation Model for Earth Observation, 2025. 2 |
| ref-44 | 2023 | Mengde Xu; Zheng Zhang; et al. | Side adapter network for open-vocabulary semantic segmentation. IEEE Transactions on Pattern Analysis and Machine Intelligence, 45(12):15546–15561, 2023. 3 |
| ref-45 | 2025 | Chengyang Ye; Yunzhi Zhuge; et al. | 9436–9444, 2025. 3, 6, 7 |
| ref-46 | 2022 | Xiaohua Zhai; Xiao Wang; et al. | Zero-Shot Transfer with Locked-image text Tuning. In 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 18102–18112, 2022. 3 |
| ref-47 | 2024 | Shijie Zhang; Bin Zhang; et al. | Multimodal Visual-Language and Prompt Learning for High-Resolution Remote Sensing Semantic Segmentation. IEEE Transactions on Geoscience and Remote Sensing, 62:1–16, 2024. 3 |
| ref-48 | 2024 | Chaoyang Zhu; Long Chen | Past, present, and future. IEEE Transactions on Pattern Analysis and Machine Intelligence, 46(12):8954–8975, 2024. 2 |

## Citation Analysis Report

#### 总体总结
本文在引言与相关工作中组织了一条清晰的研究脉络：首先从CLIP等视觉-语言模型出发，展示开放词汇语义分割如何借助VLM实现任意类别的零样本分割；然后将遥感OVSS方法并置比较，揭示它们虽有效果但均依赖遥感数据训练的局限；接着引入DINOv3与DINO.txt两条近期关键路线，证明自然图像大规模预训练可超越遥感专用基础模型；最后借CAT-Seg的代价聚合与AnyUp的特征上采样技术，将本文的方法路线明确为无需遥感微调的OVSS方案。整个叙述动作为：先铺技术背景，再对比主流检测范式并揭示局限，最后借关键文献引出本文路线。


#### 关键文献

- [9] Paul Couairon, 2025: Jack up any feature at any resolution, 2025. 2, 3 (Component)

- [16] Cijo Jose, 2024: A unified framework for image- and pixel-level vision-language alignment, 2024. 1, 3 (Component)

- [19] Mengcheng Lan, 2024: Proxy attention improves clip for open-vocabulary segmentation. In European Conference on Computer Vision, pages 70–88. Springer, 2024. 3 (Dataset)

- [28] Alec Radford, 2021: Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger, and I. Sutskever. Learning Transferable Visual Models From Natural Language Supervision. In International Conference on Machine Learning, 2021. 2 (Background)

- [30] Oriane Siméoni, 2025: Vo, Maximilian Seitzer, Federico Baldassarre, Maxime Oquab, Cijo Jose, Vasil Khalidov, Marc Szafraniec, Seungeun Yi, Michaël Ramamonjisoa, Francisco Massa, Daniel Haziza, Luca Wehrstedt, Jianyuan Wang, Timothée Darcet, Théo Moutakanni, Leonel Sentana, Claire Roberts, Andrea Vedaldi, Jamie Tolan, John Brandt, Camille Couprie, Julien Mairal, Hervé Jégou, Patrick Labatut, and Piotr Bojanowski. DINOv3, 2025. 1, 3, 7 (Component)

- [39] Thomas Wimmer, 2025: Universal feature upsampling. arXiv preprint arXiv:2510.12764, 2025. 2, 3 (Component)



#### 范围
- 章节: Introduction + Related Work
- 行号: 14-81

#### 按功能归类


##### Baseline

- [2] Luca Barsellotti, 2024
  - 标题: Training-Free Open-Vocabulary Segmentation with Offline Diffusion-Augmented Prototype Generation. In 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3689–3698, 2024. 3
  - 关键词: 扩散模型增强, 零样本分割, 原型生成
  - 总结: 在相关工作中作为CLIP衍生OVSS方法之一被引用，属于该领域众多基于CLIP的后续工作之一，用于说明OVSS方法的发展脉络

- [4] Qinglong Cao, 2025
  - 标题: 1–14, 2025. 3, 4, 7
  - 关键词: 遥感分割, 旋转不变性, CAT-Seg改进
  - 总结: 在遥感OVSS相关工作部分被引用，指出其对CAT-Seg框架做了遥感针对性改进如旋转不变性编码和特征引导上采样，但本质上仍需在遥感数据上训练

- [12] Saikat Dutta, 2025
  - 标题: Harnessing SAM for Open-Vocabulary Segmentation in Remote Sensing Images. In 2025 IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops (CVPRW), pages 2245–2255, Nashville, TN, USA, 2025. IEEE. 3
  - 关键词: SAM空间细化, CLIP特征引导, 遥感分割
  - 总结: 在遥感OVSS相关工作部分被引用，指出其使用SAM对CLIP特征进行空间细化并引导上采样，但仍需在遥感数据上训练

- [17] Dahyun Kang, 2024
  - 标题: 18th European Conference, Milan, Italy, September 29–October 4, 2024, Proceedings, Part XLI, pages 143–164, Berlin, Heidelberg, 2024. Springer-Verlag. 3
  - 关键词: 代理注意力, CLIP改进, 分割校准
  - 总结: 在相关工作中作为CLIP衍生OVSS方法之一被引用，属于该领域众多基于CLIP的后续改进方法之一

- [23] Kaiyu Li, 2025
  - 标题: Segearth-ov: Towards training-free open-vocabulary segmentation for remote sensing images
  - 关键词: 免训练遥感分割, CLIP特征上采样, 自监督训练
  - 总结: 在遥感OVSS和特征上采样两处相关工作中被引用。该方法直接上采样CLIP特征并用输入图像引导，减去CLS令牌提取局部特征，仅需在遥感数据上进行自监督训练但需逐数据集进行。同时作为特征上采样器可直接应用于CLIP OVSS方法的实例

- [24] Feng Liang, 2023
  - 标题: Open-vocabulary semantic segmentation with mask-adapted clip. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 7061–7070, 2023. 3
  - 关键词: 掩码适配, CLIP分割, 开放词汇
  - 总结: 在相关工作中作为CLIP衍生OVSS方法之一被引用，属于该领域众多基于CLIP的后续改进方法之一

- [25] Yong Liu, 2024
  - 标题: Open-Vocabulary Segmentation with Semantic-Assisted Calibration. In 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3491–3500, 2024. 3
  - 关键词: 语义校准, 开放词汇分割, CLIP适配
  - 总结: 在相关工作中作为CLIP衍生OVSS方法之一被引用，属于该领域众多基于CLIP的后续改进方法之一

- [27] Jishnu Mukhoti, 2023
  - 标题: Torr, and Ser-Nam Lim. Open Vocabulary Semantic Segmentation with Patch Aligned Contrastive Learning. In 2023 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 19413– 19423, 2023. 3
  - 关键词: 补丁级对比学习, 图像补丁对齐, 早期CLIP适配
  - 总结: 在相关工作OVSS部分被引用，作为CLIP早期适配方法之一，引入了图像补丁级别的对齐目标，推动了从全局图像嵌入向局部特征对齐的发展

- [29] Tong Shao, 2025
  - 标题: Explore the Potential of CLIP for Training-Free Open Vocabulary Semantic Segmentation. In Computer Vision – ECCV 2024, pages 139–156, Cham, 2025. Springer Nature Switzerland. 3
  - 关键词: 免训练分割, CLIP潜力, 掩码提议
  - 总结: 在相关工作中作为OVSS后期方法之一被引用，与同类方法一起说明分割技术的发展方向

- [31] Shuyang Sun, 2024
  - 标题: Segment countless visual concepts without training endeavor. In CVPR, 2024. 3
  - 关键词: 免训练分割, 无限量概念, 掩码提议
  - 总结: 在相关工作中作为OVSS后期方法之一被引用，与同类方法一起说明分割技术的发展方向

- [35] Tobias Uelwer, 2025
  - 标题: 111, 2025. 3
  - 关键词: 自监督遥感训练, 逐数据集训练, 遥感数据依赖
  - 总结: 在遥感OVSS相关工作中被引用，指出SegEarth-OV仅需在遥感数据上进行自监督训练，但仍存在逐数据集训练的局限性

- [38] Wenzhen Wang, 2025
  - 标题: 1–17, 2025. 3
  - 关键词: 梯度激活映射, CLIP嵌入增强, 遥感分割
  - 总结: 在遥感OVSS相关工作中被引用，指出其使用梯度激活映射增强CLIP嵌入，但仍需在遥感数据上训练

- [43] Mengde Xu, 2023
  - 标题: Side adapter network for open-vocabulary semantic segmentation. IEEE Transactions on Pattern Analysis and Machine Intelligence, 45(12):15546–15561, 2023. 3
  - 关键词: 侧边适配器网络, CLIP分割, 开放词汇
  - 总结: 在相关工作中作为CLIP衍生OVSS方法之一被引用，属于该领域众多基于CLIP的后续改进方法之一

- [44] Chengyang Ye, 2025
  - 标题: 9436–9444, 2025. 3, 6, 7
  - 关键词: DINO遥感骨干, 大规模遥感数据集, CLIP引导分割
  - 总结: 在遥感OVSS相关工作中被引用，指出其使用基于DINO的遥感骨干引导冻结的CLIP模型，并在新引入的大规模遥感语义分割数据集上训练

- [46] Shijie Zhang, 2024
  - 标题: Multimodal Visual-Language and Prompt Learning for High-Resolution Remote Sensing Semantic Segmentation. IEEE Transactions on Geoscience and Remote Sensing, 62:1–16, 2024. 3
  - 关键词: 多模态视觉语言, 提示学习, 高分辨率遥感分割
  - 总结: 在相关工作OVSS部分被引用，作为CLIP早期适配方法之一，引入了图像补丁级别的对齐目标，是CLIP在分割任务上的早期探索



##### Dataset

- [3] Holger Caesar, 2018
  - 标题: Thing and stuff classes in context. In Computer Vision and Pattern Recognition (CVPR), 2018 IEEE Conference On. IEEE, 2018. 2, 5
  - 关键词: 自然图像数据集, 场景分割, 训练数据
  - 总结: 在贡献部分明确指出，利用DINOv3在遥感图像上的迁移能力，仅使用COCO-Stuff数据集的遥感目标子集在自然图像上训练CAFe-DINO，无需遥感标注数据

- [19] Mengcheng Lan, 2024
  - 标题: Proxy attention improves clip for open-vocabulary segmentation. In European Conference on Computer Vision, pages 70–88. Springer, 2024. 3
  - 关键词: 遥感基准, 分割评估, 地理空间基准
  - 总结: 在引言和DINOv3相关工作中被引用，DINOv3在GEO-Bench的六个分割任务中的五个上优于遥感专用基础模型，且仅使用RGB波段，这是支撑采用DINOv3作为遥感OVSS骨干的关键证据



##### Background

- [5] Jia-Ren Chang, 2018
  - 标题: Pyramid Stereo Matching Network. In 2018 IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 5410–5418, 2018. 3
  - 关键词: 立体匹配, 语义对应, 相似度图处理
  - 总结: 在代价聚合相关工作中被引用，用于说明代价聚合技术的起源，该技术最初用于处理图像间的相似度图

- [6] Mehdi Cherti, 2023
  - 标题: Reproducible scaling laws for contrastive language-image learning. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 2818–2829, 2023. 2
  - 关键词: 对比学习, 可扩展性规律, 图文对齐
  - 总结: 在相关工作中作为视觉语言模型领域的引用之一出现，与CLIP等方法一起构成OVSS方法发展的技术背景

- [7] Seokju Cho, 2023
  - 标题: Boosting cost aggregation with convolutions and transformers. IEEE Transactions on Pattern Analysis and Machine Intelligence, 45(6):7174–7194, 2023. 3
  - 关键词: Transformer代价聚合, 空间细化, 类间依赖
  - 总结: 在代价聚合相关工作中被引用，与CATs++一起说明现代基于Transformer的代价聚合方法如何对代价图进行空间细化并建模类间依赖关系

- [11] Alexey Dosovitskiy, 2020
  - 标题: Transformers for Image Recognition at Scale. In International Conference on Learning Representations, 2020. 3
  - 关键词: ViT架构, 大规模视觉骨干, 自监督预训练
  - 总结: 在DINOv3相关工作中被引用，说明DINOv3基于ViT架构并扩展到70亿参数，通过自监督学习在超过10亿无标签图像上训练

- [14] Golnaz Ghiasi, 2022
  - 标题: Scaling Open-Vocabulary Image Segmentation with Image-Level Labels. In Computer Vision – ECCV 2022, pages 540–557. Springer Nature Switzerland, Cham, 2022. 3
  - 关键词: 图像级标签, 弱监督分割, CLIP扩展
  - 总结: 在相关工作中作为CLIP衍生OVSS方法之一被引用，属于该领域基于CLIP的后续工作之一

- [15] Xiaoyang Guo, 2019
  - 标题: Group-Wise Correlation Stereo Network. In 2019 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 3268–3277, Long Beach, CA, USA, 2019. IEEE. 3
  - 关键词: 语义对应, 代价图处理, 相似度匹配
  - 总结: 在代价聚合相关工作中被引用，用于说明代价聚合技术最初是为语义对应任务开发的，用于处理图像间的相似度图

- [18] Alexandre Lacoste, 2023
  - 标题: Toward foundation models for earth monitoring. In Proceedings of the 37th International Conference on Neural Information Processing Systems, pages 51080–51093, Red Hook, NY, USA, 2023. Curran Associates Inc. 2, 3
  - 关键词: 掩码提议, 区域分割, CLIP适配
  - 总结: 在相关工作中作为OVSS后期方法之一被引用，与同类方法一起说明分割技术从简单的全局图像对齐发展到更复杂的基于掩码提议的区域分割

- [21] Junnan Li, 2022
  - 标题: Bootstrapping language-image pre-training for unified vision-language understanding and generation. In ICML, 2022. 2
  - 关键词: 语言图像预训练, 视觉语言理解, 多模态生成
  - 总结: 在相关工作中作为视觉语言模型领域的引用之一出现，构成OVSS方法发展的技术背景

- [22] Junnan Li, 2023
  - 标题: Bootstrapping language-image pre-training with frozen image encoders and large language models. In Proceedings of the 40th International Conference on Machine Learning, pages 19730–19742, Honolulu, Hawaii, USA, 2023. JMLR.org. 2
  - 关键词: BLIP-2, 大语言模型, 冻结图像编码器
  - 总结: 在相关工作中作为视觉语言模型领域的引用之一出现，构成OVSS方法发展的技术背景

- [28] Alec Radford, 2021
  - 标题: Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger, and I. Sutskever. Learning Transferable Visual Models From Natural Language Supervision. In International Conference on Machine Learning, 2021. 2
  - 关键词: 图文对比学习, 零样本分类, 视觉语言基础模型
  - 总结: 在相关工作中被多次引用。CLIP引入对比方法对齐图像和文本嵌入，实现零样本图像分类。此后CLIP成为大多数OVSS方法的骨干基础，衍生出SegCLIP、PACL、CAT-Seg等多种改进方法

- [45] Xiaohua Zhai, 2022
  - 标题: Zero-Shot Transfer with Locked-image text Tuning. In 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 18102–18112, 2022. 3
  - 关键词: 锁定图像调优, 零样本迁移, 对比学习目标
  - 总结: 在DINO.txt相关工作中被引用，用于解释DINO.txt的锁定图像调优机制。该方法冻结DINO骨干网络，仅使用类似CLIP的对比目标训练文本编码器，与CLIP的全局图像表示对齐不同，DINO.txt连接了平均池化的补丁嵌入与CLS令牌以改进密集特征表示

- [47] Chaoyang Zhu, 2024
  - 标题: Past, present, and future. IEEE Transactions on Pattern Analysis and Machine Intelligence, 46(12):8954–8975, 2024. 2
  - 关键词: OVSS综述, 开放词汇分割, 领域综述
  - 总结: 在相关工作中作为OVSS领域的综述性引用出现，用于定义开放词汇语义分割任务并概述该领域的整体发展状况



##### Component

- [8] Seokju Cho, 2024
  - 标题: Cost Aggregation for Open-Vocabulary Semantic Segmentation. In 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 4113–4123, Seattle, WA, USA, 2024. IEEE. 3, 4, 6
  - 关键词: Transformer代价聚合, 空间细化, 类间依赖建模
  - 总结: 在代价聚合相关工作中被引用两次，分别作为现代代价聚合标准和CAT-Seg方法的架构参考来源。CAT-Seg遵循其框架，交替进行代价图空间细化和类间特征依赖聚合

- [9] Paul Couairon, 2025
  - 标题: Jack up any feature at any resolution, 2025. 2, 3
  - 关键词: 代价聚合, CLIP特征分割, 概率图细化
  - 总结: 在相关工作中被多次引用，作为首个将代价聚合应用于OVSS的方法。该方法将CLIP文本和图像嵌入的相似度分数构建为代价图，通过聚合细化为每类概率图。OVRS方法也基于其框架进行遥感改进

- [10] Jian Ding, 2022
  - 标题: Decoupling Zero-Shot Semantic Segmentation. In 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pages 11573–11582, 2022. 3
  - 关键词: 特征上采样, 免训练, 特征无关上采样
  - 总结: 在引言和特征上采样相关工作中被多次引用。CAFe-DINO采用AnyUp对聚合后的特征进行直接上采样，无需微调。AnyUp的特征无关特性使其能够适应未见过的骨干网络，避免了训练域受限的上采样器

- [13] Stephanie Fu, 2024
  - 标题: A model-agnostic framework for features at any resolution. In The Twelfth International Conference on Learning Representations, 2024. 2, 3
  - 关键词: 模型无关框架, 任意分辨率, 特征变换
  - 总结: 在引言和特征上采样相关工作中被引用，作为特征上采样方法之一。其模型无关特性使其适用于多种骨干网络的特征处理

- [16] Cijo Jose, 2024
  - 标题: A unified framework for image- and pixel-level vision-language alignment, 2024. 1, 3
  - 关键词: 视觉语言对齐, 锁定图像调优, 密集特征表示
  - 总结: 在引言和DINO.txt相关工作中被多次引用。DINO.txt最初为DINOv2开发，后集成到DINOv3。与CLIP不同，它冻结DINO骨干仅训练文本编码器，并通过连接平均池化补丁嵌入与CLS令牌来改进密集特征表示，其遥感有效性和分割导向设计使其比CLIP更适合作为遥感OVSS骨干

- [30] Oriane Siméoni, 2025
  - 标题: Vo, Maximilian Seitzer, Federico Baldassarre, Maxime Oquab, Cijo Jose, Vasil Khalidov, Marc Szafraniec, Seungeun Yi, Michaël Ramamonjisoa, Francisco Massa, Daniel Haziza, Luca Wehrstedt, Jianyuan Wang, Timothée Darcet, Théo Moutakanni, Leonel Sentana, Claire Roberts, Andrea Vedaldi, Jamie Tolan, John Brandt, Camille Couprie, Julien Mairal, Hervé Jégou, Patrick Labatut, and Piotr Bojanowski. DINOv3, 2025. 1, 3, 7
  - 关键词: 自监督视觉基础模型, 70亿参数ViT, 十亿级图像预训练
  - 总结: 在引言和DINOv3相关工作中被多次引用。DINOv3是基于ViT扩展到70亿参数的大规模视觉基础模型，通过自监督学习在超过10亿无标签图像上训练。其遥感适应性和DINOv3.txt的密集特征表示能力使其成为遥感OVSS的理想骨干

- [32] Saksham Suri, 2025
  - 标题: A surprisingly simple lightweight feature transform for dense ViT descriptors. In European Conference on Computer Vision, pages 110–128. Springer, 2025. 2, 3
  - 关键词: 轻量级特征变换, ViT描述子, 密集特征处理
  - 总结: 在引言和特征上采样相关工作中被引用，作为特征上采样方法之一。该方法提供了一种简单轻量的特征变换方式，适用于ViT密集描述子的处理

- [39] Thomas Wimmer, 2025
  - 标题: Universal feature upsampling. arXiv preprint arXiv:2510.12764, 2025. 2, 3
  - 关键词: 通用特征上采样, 特征无关, 免训练上采样
  - 总结: 在引言和特征上采样相关工作中被多次引用（4次）。AnyUp是CAFe-DINO的关键组件，其特征无关特性使其能在未见过的骨干网络上良好工作而无需微调。相比之前需要可训练上采样器的方法，AnyUp使CAFe-DINO能够避免训练域受限的上采样器，实现遥感数据免训练微调



##### Contrast

- [20] Boyi Li, 2022
  - 标题: Language-driven semantic segmentation. In International Conference on Learning Representations, 2022. 3
  - 关键词: 扩散模型, 非CLIP方法, 文本引导嵌入
  - 总结: 在相关工作OVSS部分被引用，与同类方法一起说明存在不依赖CLIP的OVSS方法，这类方法使用文本引导的扩散模型生成任意类别的嵌入

- [33] Daniela Szwarcman, 2024
  - 标题: A versatile multitemporal foundation model for earth observation applications. arXiv preprint arXiv:2412.02732, 2024. 2, 3
  - 关键词: 地球观测基础模型, 多时相建模, 遥感专用模型
  - 总结: 在引言和DINOv3相关工作中被引用。作为遥感专用基础模型，在GEO-Bench上被DINOv3超越，用于证明自然图像大规模训练可以克服遥感特有的尺度分辨率差异、传感器噪声和光谱变化等障碍

- [34] Jamie Tolan, 2024
  - 标题: 113888, 2024. 3
  - 关键词: 地理空间基础模型, 遥感专用, GEO-Bench对比
  - 总结: 在DINOv3相关工作中被引用，作为被DINOv3在GEO-Bench分类和分割赛道上超越的现有地理空间基础模型之一，尽管这些模型使用全部可用波段而DINOv3仅使用RGB通道

- [37] Jinglong Wang, 2023
  - 标题: 2309.02773, 2023. 3
  - 关键词: 扩散模型嵌入, 非CLIP路线, 文本引导生成
  - 总结: 在相关工作OVSS部分被引用，与同类方法一起说明存在不依赖CLIP的OVSS方法，这类方法使用文本引导的扩散模型来生成任意类别的嵌入

- [41] Zhitong Xiong, 2024
  - 标题: 2403.15356, 2024. 3
  - 关键词: 地球观测模型, 遥感基础模型, GEO-Bench对比
  - 总结: 在DINOv3相关工作中被引用，作为被DINOv3在GEO-Bench基准上超越的现有地理空间基础模型之一

- [42] Zhitong Xiong, 2025
  - 标题: Stewart, Joëlle Hanna, Damian Borth, Ioannis Papoutsis, Bertrand Le Saux, Gustau Camps-Valls, and Xiao Xiang Zhu. Neural Plasticity-Inspired Multimodal Foundation Model for Earth Observation, 2025. 2
  - 关键词: 神经可塑性, 地球观测基础模型, 遥感专用模型
  - 总结: 在引言相关工作中被引用，作为遥感专用基础模型，在GEO-Bench上被DINOv3超越，用于支撑采用自然图像大规模预训练替代遥感领域专用训练的核心论点


# RT-DETRv2: Improved Baseline with Bag-of-Freebies for Real-Time Detection Transformer (2024)

- Paper ref: 1:8PP8HQMY
- Title: RT-DETRv2: Improved Baseline with Bag-of-Freebies for Real-Time Detection Transformer
- Year: 2024

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2024 | Atakishiyev, S.; Salameh, M.; et al. | Explainable artificial intelligence for autonomous driving: A comprehensive overview and field guide for future research directions |
| ref-2 | 2017 | Redmon, J.; Farhadi, A. | Yolo9000: better, faster, stronger |
| ref-3 | 2018 | Redmon, J.; Farhadi, A. | Yolov3: An incremental improvement |
| ref-4 | 2020 | Bochkovskiy, A.; Wang, C.-Y.; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-5 | 2022 | Jocher, G. | Yolov5 release v7.0 |
| ref-6 | 2022 | Xu, S.; Wang, X.; et al. | Pp-yoloe: An evolved version of yolo |
| ref-7 | 2023 | Li, C.; Li, L.; et al. | Yolov6 v3.0: A full-scale reloading |
| ref-8 | 2023 | Wang, C.-Y.; Bochkovskiy, A.; et al. | Yolov7: Trainable bag-of-freebies sets new state-of-the-art for real-time object detectors |
| ref-9 | 2023 | Jocher, G. | Yolov8 |
| ref-10 | 2024 | Wang, C.-Y.; Yeh, I.-H.; et al. | Yolov9: Learning what you want to learn using programmable gradient information |
| ref-11 | 2024 | Wang, A.; Chen, H.; et al. | Yolov10: Real-time end-to-end object detection |
| ref-12 | 2024 | Zhao, Y.; Lv, W.; et al. | Detrs beat yolos on real-time object detection |
| ref-13 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-14 | 2020 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-15 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-16 | 2018 | Loshchilov, I.; Hutter, F. | Decoupled weight decay regularization |
| ref-17 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |

## Citation Analysis Report

#### 总体总结
原文在引言、方法与实验部分的引文组织遵循了一条清晰的研究叙事：先以 ResNet、YOLO 系列和 COCO 数据集奠定目标检测的基础设施与技术路线，再以 DETR 与 Deformable DETR 把 Transformer 架构引入检测任务，最后通过 RT-DETR 证明 DETR 系列可以在实时检测场景中超越 YOLO，并在此基础上引出本文的改进方案 RT-DETRv2。此外，AdamW 优化器作为训练基础设施被引用，自动驾驶 XAI 工作为实时检测提供应用动机。


#### 关键文献

- [AY-3] Zhao, Y., 2024: Detrs beat yolos on real-time object detection (Component)

- [AY-4] Carion, N., 2020: End-to-end object detection with transformers (Historical)

- [AY-5] Zhu, X., 2020: Deformable detr: Deformable transformers for end-to-end object detection (Component)



#### 范围
- 章节: Introduction + Method + Experiment
- 行号: 15-69

#### 按功能归类


##### Background

- [AY-1] Atakishiyev, S., 2024
  - 标题: Explainable artificial intelligence for autonomous driving: A comprehensive overview and field guide for future research directions
  - 关键词: autonomous driving, application scenario, real-time detection
  - 总结: 原文在引言开篇引用该工作来说明实时目标检测在自动驾驶等实际场景中的重要性，以此为研究动机提供现实应用背景支撑。



##### Historical

- [AY-2] Redmon, J., 2017
  - 标题: Yolo9000: better, faster, stronger
  - 关键词: YOLO, real-time detection, historical lineage
  - 总结: 原文将 YOLOv2 和 YOLOv3 作为 YOLO 系列检测器发展历程的起点引用，用来论证 YOLO 架构在实时检测领域长期占据主导地位的原因，从而衬托 RT-DETR 打破这一格局的意义。

- [AY-4] Carion, N., 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, end-to-end detection, transformer encoder
  - 总结: 原文在引言中引用 DETR 来交代 RT-DETR 的技术谱系：RT-DETR 的 hybrid encoder 替代了 DETR 中的 vanilla Transformer encoder，从而显著提升推理速度。这一引用帮助读者理解 RT-DETR 相对于经典 DETR 架构的改进路径。



##### Component

- [AY-3] Zhao, Y., 2024
  - 标题: Detrs beat yolos on real-time object detection
  - 关键词: RT-DETR, detection transformer, baseline
  - 总结: RT-DETR 是本文 RT-DETRv2 的直接基线。原文在引言中详细阐述了 RT-DETR 的 hybrid encoder 设计（解耦多尺度特征的尺度内交互与跨尺度融合）和 uncertainty-minimal query selection 机制，在实验部分则将其作为主要对比对象来展示 RT-DETRv2 在各尺度上的性能增益。

- [AY-5] Zhu, X., 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: deformable attention, multi-scale feature, efficient attention
  - 总结: 原文在方法部分的 Framework 小节中引用 Deformable DETR 来介绍可变形注意力模块的来源，指出现有 DETR 在各尺度使用相同采样点数量的局限性，进而提出为不同尺度设置差异化采样点数量的改进方案。



##### Tooling

- [AY-6] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, backbone, pre-trained model
  - 总结: 原文在实验实现细节和训练方案两部分中引用 ResNet。在训练方案部分，原文以不同规模的 ResNet（ResNet18 到 ResNet101）为例，说明小型 backbone 应提高学习率而大型 backbone 应降低学习率的尺度自适应策略。在实验部分，ResNet 作为所有 RT-DETRv2 变体的预训练 backbone。

- [AY-7] Loshchilov, I., 2018
  - 标题: Decoupled weight decay regularization
  - 关键词: AdamW, optimizer, training configuration
  - 总结: 原文在实验实现细节部分引用 AdamW 优化器，说明 RT-DETRv2 使用该优化器进行训练，并给出了 batch size 和 EMA 衰减系数等超参数配置。



##### Dataset

- [AY-8] Lin, T.-Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, benchmark dataset, evaluation protocol
  - 总结: 原文在实验评估部分引用 COCO 数据集，说明 RT-DETRv2 使用 COCO train2017 进行训练并在 val2017 上验证，同时采用标准 AP 和 AP50 指标进行评估。这确立了实验结果的评估基准。





#### 时间线分析

##### 早期
早期工作奠定了目标检测与骨干网络的基础。ResNet 成为后续检测器的标准 backbone 选择；YOLO 系列开启了实时检测器的技术路线；COCO 数据集确立了目标检测的评估基准。


- [AY-2] Redmon, J., 2017: Yolo9000: better, faster, stronger

- [AY-6] He, K., 2016: Deep residual learning for image recognition

- [AY-8] Lin, T.-Y., 2014: Microsoft coco: Common objects in context




##### 中期
中期工作将 Transformer 引入目标检测领域，标志着从传统 CNN 检测器向端到端检测器的范式转变。AdamW 优化器成为训练大规模视觉模型的标准配置。


- [AY-4] Carion, N., 2020: End-to-end object detection with transformers

- [AY-5] Zhu, X., 2020: Deformable detr: Deformable transformers for end-to-end object detection

- [AY-7] Loshchilov, I., 2018: Decoupled weight decay regularization




##### 近期
近期工作收束到本文所处的方法脉络：RT-DETR 打破了 YOLO 在实时检测领域的主导地位，本文在其基础上进一步改进。自动驾驶等应用场景的 XAI 研究也为实时检测提供了应用动机。


- [AY-1] Atakishiyev, S., 2024: Explainable artificial intelligence for autonomous driving: A comprehensive overview and field guide for future research directions

- [AY-3] Zhao, Y., 2024: Detrs beat yolos on real-time object detection


# Segment Anything (2023)

- Paper ref: 1:8WM66ZL3
- Title: Segment Anything
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2001 | Edward H Adelson | On seeing stuff: the perception of materials by humans and machines |
| ref-2 | 2010 | Thomas Deselaers, Bogdan Alexe; Vittorio Ferrari | What is an object |
| ref-3 | 2010 | Pablo Arbelaez; Michael Maire; et al. | Contour detection and hierarchical image segmentation |
| ref-4 | 2016 | Jamie Ryan Kiros, Jimmy Lei Ba; Geoffrey E Hinton | Layer normalization |
| ref-5 | 2021 | Li Dong, Hangbo Bao; Furu Wei | BEiT: BERT pre-training of image transformers |
| ref-6 | 2022 | Dina Bashkirova; Mohamed Abdelfattah; et al. | ZeroWaste dataset: Towards deformable object segmentation in cluttered scenes |
| ref-7 | 2019 | Stuart Berg; Dominik Kutra; et al. | Straehle, Bernhard X. Kausler, Carsten Haubold, Martin Schiegg, Janez Ales, Thorsten Beier, Markus Rudy, Kemal Eren, Jaime I. Cervantes, Buote Xu, Fynn Beuttenmueller, Adrian Wolny, Chong Zhang, Ullrich Koethe, Fred A. Hamprecht, and Anna Kreshuk. ilastik: interactive machine learning for (bio)image analysis |
| ref-8 | 2021 | Rishi Bommasani, Drew A Hudson, Ehsan Adeli, Russ Altman, Simran Arora, Sydney von Arx, Michael S Bernstein, Jeannette Bohg, Antoine Bosselut, Emma Brunskill, et al | On the opportunities and risks of foundation models |
| ref-9 | 2018 | Christine Tanner, Gustav Bredell; Ender Konukoglu | Iterative interaction training for segmentation editing networks |
| ref-10 | 2020 | Tom Brown; Benjamin Mann; et al. | Language models are few-shot learners |
| ref-11 | 2018 | Zhaowei Cai; Nuno Vasconcelos | Cascade R-CNN: Delving into high quality object detection |
| ref-12 | 2019 | Juan C | Caicedo, Allen Goodman, Kyle W. Karhohs, Beth A. Cimini, Jeanelle Ackerman, Marzieh Haghighi, CherKeng Heng, Tim Becker, Minh Doan, Claire McQuin, Mohammad Rohban, Shantanu Singh, and Anne E. Carpenter. Nucleus segmentation across imaging experiments: the 2018 data science bowl |
| ref-13 | 1986 | John Canny | A computational approach to edge detection |
| ref-14 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with Transformers |
| ref-15 | 2008 | Matthias Hofmann, Guillaume Charpiat; Bernhard Scholkopf.¨ Automatic image colorization via multimodal predictions | Guillaume Charpiat, Matthias Hofmann, and Bernhard Scholkopf.¨ Automatic image colorization via multimodal predictions. |
| ref-16 | 2016 | Neelima Chavali; Harsh Agrawal; et al. | Object-proposal evaluation protocol is’ gameable’ |
| ref-17 | 2022 | Jiazhou Chen; Yanghui Xu; et al. | 3D instance segmentation of MVS buildings |
| ref-18 | 2022 | Xi Chen; Zhiyan Zhao; et al. | FocalClick: towards practical interactive image segmentation |
| ref-19 | 2022 | Bowen Cheng; Ishan Misra; et al. | Masked-attention mask transformer for universal image segmentation |
| ref-20 | 2021 | Alex Schwing, Bowen Cheng; Alexander Kirillov | Perpixel classification is not all you need for semantic segmentation |
| ref-21 | 2022 | Aakanksha Chowdhery, Sharan Narang, Jacob Devlin, Maarten Bosma, Gaurav Mishra, Adam Roberts, Paul Barham, Hyung Won Chung, Charles Sutton, Sebastian Gehrmann, et al | PaLM: Scaling language modeling with pathways |
| ref-22 | 2021 | Luca Ciampi; Carlos Santiago; et al. | Domain adaptation for traffic density estimation |
| ref-23 | 2022 | Luca Ciampi; Carlos Santiago; et al. | Night and day instance segmented park (NDIS-Park) dataset: a collection of images taken by day and by night for vehicle detection, segmentation and counting in parking areas |
| ref-24 | 2022 | Yael Newman, Nadav Cohen; Ariel Shamir | Semantic segmentation in art paintings |
| ref-25 | 2016 | Marius Cordts; Mohamed Omran; et al. | The Cityscapes dataset for semantic urban scene understanding |
| ref-26 | 2012 | George Konidaris, Bruno da Silva; Andrew Barto | Learning parameterized skills |
| ref-27 | 2022 | Dima Damen; Hazel Doughty; et al. | Rescaling egocentric vision: Collection, pipeline and challenges for EPIC-KITCHENS-100 |
| ref-28 | 2022 | Ahmad Darkhalil; Dandan Shan; et al. | EPIC-KITCHENS VISOR benchmark: Video segmentations and object relations |
| ref-29 | 2019 | Terrance De Vries; Ishan Misra; et al. | Does object recognition work for everyone |
| ref-30 | 2022 | Mark D´ıaz; Ian Kivlichan; et al. | Crowd-WorkSheets: Accounting for individual and collective identities underlying crowdsourced dataset annotation |
| ref-31 | 2020 | Henghui Ding; Scott Cohen; et al. | PhraseClick: toward achieving flexible interactive segmentation by phrase and click |
| ref-32 | 2014 | Piotr Dollar; C Lawrence Zitnick | Fast edge detection using ´ structured forests |
| ref-33 | 2021 | Alexey Dosovitskiy; Lucas Beyer; et al. | An image is worth 16x16 words: Transformers for image recognition at scale |
| ref-34 | 2011 | Xiaofeng Ren, Alireza Fathi; James M | Rehg. Learning to recognize objects in egocentric activities |
| ref-35 | 2004 | Pedro F Felzenszwalb; Daniel P Huttenlocher | Efficient graphbased image segmentation |
| ref-36 | 1988 | Thomas B | Fitzpatrick. The validity and practicality of sun-reactive skin types i through vi |
| ref-37 | 2020 | Marco Forte; Brian Price; et al. | Marco Forte, Brian Price, Scott Cohen, Ning Xu, and Franc¸ois Pitie. Getting to 99% accuracy in interactive segmentation.´ arXiv:2003.07932, 2020. 5, 17 |
| ref-38 | 2022 | Jean-Michel Fortin; Olivier Gamache; et al. | Instance segmentation for au- \` tonomous log grasping in forestry operations |
| ref-39 | 2021 | Timnit Gebru; Jamie Morgenstern; et al. | Datasheets for datasets |
| ref-40 | 2021 | Golnaz Ghiasi; Yin Cui; et al. | Simple copy-paste is a strong data augmentation method for instance segmentation |
| ref-41 | 2014 | Ross Girshick; Jeff Donahue; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-42 | 2017 | Priya Goyal; Piotr Dollar; et al. | Accurate, large minibatch SGD: Training ImageNet in 1 hour |
| ref-43 | 2022 | Kristen Grauman; Andrew Westbury; et al. | V. Jawahar, Hanbyul Joo, Kris Kitani, Haizhou Li, Richard Newcombe, Aude Oliva, Hyun Soo Park, James M. Rehg, Yoichi Sato, Jianbo Shi, Mike Zheng Shou, Antonio Torralba, Lorenzo Torresani, Mingfei Yan, and Jitendra Malik. Ego4D: Around the World in 3,000 Hours of Egocentric Video |
| ref-44 | 2019 | Piotr Dollar, Agrim Gupta; Ross Girshick | LVIS: A dataset for large vocabulary instance segmentation |
| ref-45 | 2012 | Dhruv Batra, Abner Guzman-Rivera; Pushmeet Kohli | Multiple choice learning: Learning to produce multiple structured outputs |
| ref-46 | 2022 | Hjalmar S, Timm Haucke | Kuhl, and Volker Steinhage. ¨ SOCRATES: Introducing depth in visual wildlife monitoring using stereo vision |
| ref-47 | 2022 | Kaiming He; Xinlei Chen; et al. | Masked autoencoders are scalable vision learners |
| ref-48 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Kaiming He, Georgia Gkioxari, Piotr Dollar, and Ross Girshick.´ Mask R-CNN. |
| ref-49 | 2016 | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-50 | 2016 | Dan Hendrycks; Kevin Gimpel | Gaussian error linear units (gelus) |
| ref-51 | 2022 | Jordan Hoffmann, Sebastian Borgeaud, Arthur Mensch, Elena Buchatskaya, Trevor Cai, Eliza Rutherford, Diego de Las Casas, Lisa Anne Hendricks, Johannes Welbl, Aidan Clark, et al | Training compute-optimal large language models |
| ref-52 | 2020 | Michael Fulton, Jungseok Hong; Junaed Sattar | TrashCan: A semantically-segmented dataset towards visual detection of marine debris |
| ref-53 | 2016 | Gao Huang; Yu Sun; et al. | Deep networks with stochastic depth |
| ref-54 | 2022 | Jitesh Jain; Jiachen Li; et al. | Oneformer: One transformer to rule universal image segmentation |
| ref-55 | 2021 | Chao Jia; Yinfei Yang; et al. | Scaling up visual and vision-language representation learning with noisy text supervision |
| ref-56 | 2020 | Jared Kaplan; Sam McCandlish; et al. | Scaling laws for neural language models |
| ref-57 | 1988 | Andrew Witkin, Michael Kass; Demetri Terzopoulos | Snakes: Active contour models |
| ref-58 | 2022 | Dahun Kim; Tsung-Yi Lin; et al. | Learning open-world object proposals without learning to classify |
| ref-59 | 2019 | Alexander Kirillov; Kaiming He; et al. | Alexander Kirillov, Kaiming He, Ross Girshick, Carsten Rother, and Piotr Dollar. Panoptic segmentation.´ |
| ref-60 | 2020 | Alina Kuznetsova; Hassan Rom; et al. | The open images dataset v4: Unified image classification, object detection, and visual relationship detection at scale |
| ref-61 | 2019 | Alexandre Lacoste; Alexandra Luccioni; et al. | Quantifying the carbon emissions of machine learning |
| ref-62 | 2022 | Yanghao Li; Hanzi Mao; et al. | Exploring plain vision transformer backbones for object detection |
| ref-63 | 2015 | Zhefan Ye, Yin Li; James M | Rehg. Delving into egocentric actions |
| ref-64 | 2018 | Qifeng Chen, Zhuwen Li; Vladlen Koltun | Interactive image segmentation with latent diversity |
| ref-65 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-66 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Mi-´ crosoft COCO: Common objects in context |
| ref-67 | 2022 | Qin Liu; Zhenlin Xu; et al. | SimpleClick: Interactive image segmentation with simple vision transformers |
| ref-68 | 2019 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-69 | 2014 | Cathy H Lucas; Daniel OB Jones; et al. | Gelatinous zooplankton biomass in the global oceans: geographic variation and environmental drivers |
| ref-70 | 2018 | Paul Voigtlaender, Sabarinath Mahadevan; Bastian Leibe | Iteratively trained interactive segmentation |
| ref-71 | 2018 | Kevis-Kokitsi Maninis; Sergi Caelles; et al. | Deep extreme cut: From extreme points to object segmentation |
| ref-72 | 2001 | David Martin; Charless Fowlkes; et al. | A database of human segmented natural images and its application to evaluating segmentation algorithms and measuring ecological statistics |
| ref-73 | 2016 | Nassir Navab, Fausto Milletari; Seyed-Ahmad Ahmadi | V-Net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-74 | 2016 | Massimo Minervini; Andreas Fischbach; et al. | Tsaftaris. Finely-grained annotated datasets for imagebased plant phenotyping |
| ref-75 | 2019 | Margaret Mitchell; Simone Wu; et al. | Model cards for model reporting |
| ref-76 | 2017 | Dim P Papadopoulos; Jasper RR Uijlings; et al. | Extreme clicking for efficient object annotation |
| ref-77 | 2021 | David Patterson; Joseph Gonzalez; et al. | Carbon emissions and large neural network training |
| ref-78 | 2017 | Matthew E Peters; Waleed Ammar; et al. | Semi-supervised sequence tagging with bidirectional language models |
| ref-79 | 2022 | Mengyang Pu; Yaping Huang; et al. | EDTER: Edge detection with transformer |
| ref-80 | 2022 | Mattia Pugliatti; Francesco Topputo | DOORS: Dataset fOr bOuldeRs Segmentation |
| ref-81 | 2022 | Jiyang Qi; Yan Gao; et al. | Occluded video instance segmentation: A benchmark |
| ref-82 | 2021 | Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, et al | Learning transferable visual models from natural language supervision |
| ref-83 | 2021 | Aditya Ramesh; Mikhail Pavlov; et al. | Zero-shot textto-image generation |
| ref-84 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-85 | 2003 | Xiaofeng Ren; Jitendra Malik | Learning a classification model for segmentation |
| ref-86 | 2021 | Mike Roberts; Jason Ramapuram; et al. | Susskind. Hypersim: A photorealistic synthetic dataset for holistic indoor scene understanding |
| ref-87 | 2021 | Candice Schumann; Susanna Ricco; et al. | A step toward more inclusive people annotations for fairness |
| ref-88 | 2020 | Sefik Ilkin Serengil; Alper Ozpinar | LightFace: A hybrid deep face recognition framework |
| ref-89 | 2021 | Sefik Ilkin Serengil; Alper Ozpinar | HyperExtended LightFace: A facial attribute analysis framework |
| ref-90 | 2006 | Jamie Shotton; John Winn; et al. | TextonBoost: Joint appearance, shape and context modeling for mulit-class object recognition and segmentation |
| ref-91 | 2019 | Corey Snyder; Minh Do | STREETS: A novel camera network dataset for traffic flow |
| ref-92 | 2022 | Ilya A Petrov, Konstantin Sofiiuk; Anton Konushin | Reviving iterative training with mask guidance for interactive segmentation |
| ref-93 | 2014 | Nitish Srivastava; Geoffrey Hinton; et al. | Dropout: A simple way to prevent neural networks from overfitting |
| ref-94 | 1999 | Chris Stauffer; W Eric L Grimson | Adaptive background mixture models for real-time tracking |
| ref-95 | 2020 | Matthew Tancik; Pratul Srinivasan; et al. | Fourier features let networks learn high frequency functions in low dimensional domains |
| ref-96 | 2017 | Yansong Tang; Yi Tian; et al. | Action recognition in RGB-D egocentric videos |
| ref-97 | 2019 | Yansong Tang; Zian Wang; et al. | Multi-stream deep neural networks for RGB-D egocentric action recognition |
| ref-98 | 2022 | The World Bank | The World Bank. |
| ref-99 | 1995 | Sebastian Thrun | Is learning the n-th thing any easier than learning the first |
| ref-100 | 2020 | Cameron Trotter; Georgia Atkinson; et al. | Stephen McGough, Nick Wright, Ben Burville, and Per Berggren. NDD20: A large-scale few-shot dolphin dataset for coarse and fine-grained categorisation |
| ref-101 | 2022 | United States Environmental Protection Agency | Greenhouse Gas Equivalencies Calculator |
| ref-102 | 2011 | Koen EA van de Sande; Jasper RR Uijlings; et al. | Segmentation as selective search for object recognition |
| ref-103 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-104 | 2021 | Boying Wang; Libo Zhang; et al. | Towards real-world prohibited item detection: A largescale x-ray benchmark |
| ref-105 | 2022 | Weiyao Wang; Matt Feiszli; et al. | Open-world instance segmentation: Exploiting pseudo ground truth from learned pairwise affinity |
| ref-106 | 2023 | Chao-Yuan Wu; Justin Johnson; et al. | Multiview compressive coding for 3D reconstruction |
| ref-107 | 2010 | Jianxiong Xiao; James Hays; et al. | SUN database: Large-scale scene recognition from abbey to zoo |
| ref-108 | 2015 | Saining Xie; Zhuowen Tu | Holistically-nested edge detection |
| ref-109 | 2016 | Ning Xu; Brian Price; et al. | Deep interactive object selection |
| ref-110 | 2020 | Kaiyu Yang; Klint Qinami; et al. | Towards fairer datasets: Filtering and balancing the distribution of the people subtree in the imagenet hierarchy |
| ref-111 | 2021 | Lei Yang; Yan Zi Wei; et al. | iShape: A first step towards irregular shape instance segmentation |
| ref-112 | 2019 | Senthil Yogamani, Ciaran Hughes, Jonathan Horgan, Ganesh Sistu, ´ Padraig Varley, Derek O’Dea, Michal Uricar, Stefan Milz, Mar- ´ tin Simon, Karl Amende, et al | WoodScape: A multi-task, multicamera fisheye dataset for autonomous driving |
| ref-113 | 2022 | Lingzhi Zhang; Shenghao Zhou; et al. | Finegrained egocentric hand-object segmentation: Dataset, model, and applications |
| ref-114 | 2021 | Wenwei Zhang; Jiangmiao Pang; et al. | K-Net: Towards unified image segmentation |
| ref-115 | 2017 | Jieyu Zhao; Tianlu Wang; et al. | Men also like shopping: Reducing gender bias amplification using corpus-level constraints |
| ref-116 | 2017 | Bolei Zhou; Agata Lapedriza; et al. | Places: A 10 million image database for scene recognition |
| ref-117 | 2019 | Bolei Zhou; Hang Zhao; et al. | Semantic understanding of scenes through the ADE20K dataset |

## Citation Analysis Report

#### 总体总结
本文的引文组织遵循清晰的研究叙事逻辑。论文首先通过基础模型概念（[8], [9]）和视觉-语言对齐方法（[81], [82]）确立研究动机，将NLP领域的基础模型成功迁移到图像分割任务。在方法论层面，论文引用了Transformer架构（[13], [32], [102]）、MAE自监督预训练（[46]）以及交互式分割技术（[69], [89], [91]）作为SAM设计的技术基础。在实验评估阶段，论文广泛引用了各任务的SOTA方法进行对比：交互式分割（[17], [66]）、边缘检测（[12], [78], [107]）、目标提议（[1], [43], [101]）、实例分割（[10], [47], [65]）。同时，论文引用了主要分割数据集（[43], [59], [65], [116]）进行规模对比，凸显SA-1B的数据优势。在负责任AI分析部分，引用了公平性相关工作（[35], [86], [109], [114]）。整体引文结构呈现'动机—方法—验证—反思'的完整论证链条。


#### 关键文献

- [8] Rishi Bommasani, Drew A Hudson, Ehsan Adeli, Russ Altman, Simran Arora, Sydney von Arx, Michael S Bernstein, Jeannette Bohg, Antoine Bosselut, Emma Brunskill, et al, 2021: On the opportunities and risks of foundation models (Background)

- [10] Tom Brown, 2020: Language models are few-shot learners (Background)

- [14] Nicolas Carion, 2020: End-to-end object detection with Transformers (Uncategorized)

- [33] Alexey Dosovitskiy, 2021: An image is worth 16x16 words: Transformers for image recognition at scale (Uncategorized)

- [47] Kaiming He, 2022: Masked autoencoders are scalable vision learners (Uncategorized)

- [48] Kaiming He, 2017: Kaiming He, Georgia Gkioxari, Piotr Dollar, and Ross Girshick.´ Mask R-CNN. (Uncategorized)

- [66] Tsung-Yi Lin, 2014: Mi-´ crosoft COCO: Common objects in context (Uncategorized)

- [70] Paul Voigtlaender, Sabarinath Mahadevan, 2018: Iteratively trained interactive segmentation (Uncategorized)

- [72] David Martin, 2001: A database of human segmented natural images and its application to evaluating segmentation algorithms and measuring ecological statistics (Uncategorized)

- [82] Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, et al, 2021: Learning transferable visual models from natural language supervision (Uncategorized)

- [90] Jamie Shotton, 2006: TextonBoost: Joint appearance, shape and context modeling for mulit-class object recognition and segmentation (Uncategorized)

- [103] Ashish Vaswani, 2017: Attention is all you need (Uncategorized)



#### 范围
- 章节: Introduction + Zero-Shot Transfer Experiments + Discussion
- 行号: 1-261

#### 按功能归类


##### Uncategorized

- [1] Edward H Adelson, 2001
  - 标题: On seeing stuff: the perception of materials by humans and machines
  - 关键词: stuff vs things, annotation, semantic constraint
  - 总结: 论文引用该文献，说明数据引擎中标注员标注时不对物体施加语义约束，自由标注'stuff'和'things'

- [3] Pablo Arbelaez, 2010
  - 标题: Contour detection and hierarchical image segmentation
  - 关键词: contour detection, BSDS500, edge detection
  - 总结: 论文在两处引用该文献，在相关工作列举和BSDS500边缘检测实验中作为对比基线引用

- [11] Zhaowei Cai, 2018
  - 标题: Cascade R-CNN: Delving into high quality object detection
  - 关键词: Cascade R-CNN, object detection, baseline
  - 总结: 论文引用该文献，在目标提议实验中，将Cascade R-CNN作为强检测基线进行比较

- [13] John Canny, 1986
  - 标题: A computational approach to edge detection
  - 关键词: Canny, edge detection, classical method
  - 总结: 论文引用该文献，在BSDS500边缘检测实验中作为零样本对比基线（Canny算子）

- [14] Nicolas Carion, 2020
  - 标题: End-to-end object detection with Transformers
  - 关键词: DETR, Transformer decoder, object detection
  - 总结: 论文在多处（共3处）引用该文献，SAM的掩码解码器设计受DETR启发，使用Transformer decoder块进行双向交叉注意力

- [15] Matthias Hofmann, Guillaume Charpiat, 2008
  - 标题: Guillaume Charpiat, Matthias Hofmann, and Bernhard Scholkopf.¨ Automatic image colorization via multimodal predictions.
  - 关键词: multimodal, multiple outputs, ambiguity
  - 总结: 论文引用该文献，在讨论歧义性处理和最小损失策略时引用相关多输出方法

- [16] Neelima Chavali, 2016
  - 标题: Object-proposal evaluation protocol is’ gameable’
  - 关键词: AR metric, proposal evaluation, DMP
  - 总结: 论文在两处引用该文献，在目标提议实验中讨论AR指标的局限性和'gameable'问题

- [18] Xi Chen, 2022
  - 标题: FocalClick: towards practical interactive image segmentation
  - 关键词: FocalClick, interactive segmentation, baseline
  - 总结: 论文在多处（共3处）引用该文献，在单点掩码实验中作为对比基线（FocalClick），SAM在单点设置下显著优于该方法

- [19] Bowen Cheng, 2022
  - 标题: Masked-attention mask transformer for universal image segmentation
  - 关键词: Mask2Former, mask transformer, universal segmentation
  - 总结: 论文引用该文献，SAM的掩码解码器设计参考了Mask2Former的Transformer分割架构

- [20] Alex Schwing, Bowen Cheng, 2021
  - 标题: Perpixel classification is not all you need for semantic segmentation
  - 关键词: semantic segmentation, universal segmentation
  - 总结: 论文在两处引用该文献，在相关工作中提及，讨论语义分割的统一方法

- [31] Henghui Ding, 2020
  - 标题: PhraseClick: toward achieving flexible interactive segmentation by phrase and click
  - 关键词: PhraseClick, interactive segmentation, phrase grounding
  - 总结: 论文引用该文献，在相关工作中提及短语点击交互式分割方法

- [33] Alexey Dosovitskiy, 2021
  - 标题: An image is worth 16x16 words: Transformers for image recognition at scale
  - 关键词: ViT, Vision Transformer, image recognition
  - 总结: 论文在多处（共3处）引用该文献，SAM的图像编码器使用ViT架构，并进行了高分辨率适配

- [35] Pedro F Felzenszwalb, 2004
  - 标题: Efficient graphbased image segmentation
  - 关键词: graph-based segmentation, Felzenszwalb, efficient graph
  - 总结: 论文引用该文献，在BSDS500边缘检测实验中作为零样本对比基线（Felzenszwalb-Huttenlocher）

- [37] Marco Forte, 2020
  - 标题: Marco Forte, Brian Price, Scott Cohen, Ning Xu, and Franc¸ois Pitie. Getting to 99% accuracy in interactive segmentation.´ arXiv:2003.07932, 2020. 5, 17
  - 关键词: deep interactive segmentation, zoom-in, boundary quality
  - 总结: 论文引用该文献，讨论SAM在处理细小结构时的局限性，对比'zoom-in'方法

- [41] Ross Girshick, 2014
  - 标题: Rich feature hierarchies for accurate object detection and semantic segmentation
  - 关键词: R-CNN, object detection, pioneering system
  - 总结: 论文引用该文献，在目标提议实验中，作为先驱检测系统的代表之一进行引用

- [44] Piotr Dollar, Agrim Gupta, 2019
  - 标题: LVIS: A dataset for large vocabulary instance segmentation
  - 关键词: LVIS, instance segmentation, large vocabulary
  - 总结: 论文在多处（共5处）引用该文献，在目标提议和数据集对比实验中，使用LVIS作为大规模词汇实例分割基准

- [45] Dhruv Batra, Abner Guzman-Rivera, 2012
  - 标题: Multiple choice learning: Learning to produce multiple structured outputs
  - 关键词: multiple choice learning, multiple outputs
  - 总结: 论文引用该文献，在歧义性处理和多掩码输出策略中引用相关学习方法

- [47] Kaiming He, 2022
  - 标题: Masked autoencoders are scalable vision learners
  - 关键词: MAE, masked autoencoder, self-supervised
  - 总结: 论文在多处（共3处）引用该文献，SAM的图像编码器使用MAE预训练的ViT权重初始化

- [48] Kaiming He, 2017
  - 标题: Kaiming He, Georgia Gkioxari, Piotr Dollar, and Ross Girshick.´ Mask R-CNN.
  - 关键词: Mask R-CNN, instance segmentation, baseline
  - 总结: 论文引用该文献，在实例分割实验中，将Cascade Mask R-CNN作为强基线进行比较

- [54] Jitesh Jain, 2022
  - 标题: Oneformer: One transformer to rule universal image segmentation
  - 关键词: OneFormer, universal segmentation, multi-task
  - 总结: 论文引用该文献，在多任务分割系统的相关工作中提及

- [55] Chao Jia, 2021
  - 标题: Scaling up visual and vision-language representation learning with noisy text supervision
  - 关键词: ALIGN, vision-language, noisy text supervision
  - 总结: 论文引用该文献，SAM使用CLIP的视觉-语言对齐能力实现文本提示功能

- [59] Alexander Kirillov, 2019
  - 标题: Alexander Kirillov, Kaiming He, Ross Girshick, Carsten Rother, and Piotr Dollar. Panoptic segmentation.´
  - 关键词: panoptic segmentation, FPN, Panoptic FPN
  - 总结: 论文引用该文献，在相关工作中提及全景分割作为多任务分割系统的一种

- [60] Alina Kuznetsova, 2020
  - 标题: The open images dataset v4: Unified image classification, object detection, and visual relationship detection at scale
  - 关键词: Open Images, dataset comparison, large-scale
  - 总结: 论文在多处（共5处）引用该文献，将SA-1B与Open Images V4进行规模和多样性对比，SA-1B掩码数量是Open Images的400倍

- [62] Yanghao Li, 2022
  - 标题: Exploring plain vision transformer backbones for object detection
  - 关键词: ViTDet, ViT backbone, object detection
  - 总结: 论文在多处（共5处）引用该文献，在目标提议实验中，将ViTDet-H作为强检测基线进行比较

- [64] Qifeng Chen, Zhuwen Li, 2018
  - 标题: Interactive image segmentation with latent diversity
  - 关键词: latent diversity, interactive segmentation
  - 总结: 论文引用该文献，在预训练方法中借鉴交互式分割的设置，模拟提示序列

- [65] Tsung-Yi Lin, 2017
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, dense object detection, training loss
  - 总结: 论文引用该文献，SAM使用focal loss和dice loss的线性组合作为掩码监督信号

- [66] Tsung-Yi Lin, 2014
  - 标题: Mi-´ crosoft COCO: Common objects in context
  - 关键词: COCO, dataset comparison, common objects
  - 总结: 论文在多处（共7处）引用该文献，将SA-1B与COCO进行规模和多样性对比；在实例分割实验中用COCO进行评估

- [67] Qin Liu, 2022
  - 标题: SimpleClick: Interactive image segmentation with simple vision transformers
  - 关键词: SimpleClick, interactive segmentation, ViT
  - 总结: 论文在多处（共3处）引用该文献，在单点掩码实验中作为对比基线（SimpleClick），SAM显著优于该方法

- [70] Paul Voigtlaender, Sabarinath Mahadevan, 2018
  - 标题: Iteratively trained interactive segmentation
  - 关键词: iterative training, interactive segmentation, RITM
  - 总结: 论文引用该文献，SAM的预训练模拟交互式设置，随机采样多轮提示

- [71] Kevis-Kokitsi Maninis, 2018
  - 标题: Deep extreme cut: From extreme points to object segmentation
  - 关键词: extreme points, annotation efficiency, Deep Extreme Cut
  - 总结: 论文引用该文献，讨论SAM数据引擎的标注效率，与极值点标注速度对比

- [72] David Martin, 2001
  - 标题: A database of human segmented natural images and its application to evaluating segmentation algorithms and measuring ecological statistics
  - 关键词: BSDS500, edge detection benchmark, human segmented
  - 总结: 论文引用该文献，在边缘检测实验中使用BSDS500进行零样本边缘检测评估

- [79] Mengyang Pu, 2022
  - 标题: EDTER: Edge detection with transformer
  - 关键词: EDETR, edge detection, Transformer
  - 总结: 论文引用该文献，在BSDS500边缘检测实验中作为SOTA对比方法

- [82] Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, et al, 2021
  - 标题: Learning transferable visual models from natural language supervision
  - 关键词: CLIP, natural language supervision, zero-shot
  - 总结: 论文在多处（共6处）引用该文献，SAM使用CLIP的文本编码器处理自由文本提示；CLIP是视觉基础模型的核心先例

- [83] Aditya Ramesh, 2021
  - 标题: Zero-shot textto-image generation
  - 关键词: DALL-E, text-to-image, composition
  - 总结: 论文在多处（共3处）引用该文献，说明基础模型如何组合成更大系统；SAM的文本到掩码实验借鉴类似组合设计

- [84] Shaoqing Ren, 2015
  - 标题: Faster R-CNN: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, RPN, object detection
  - 总结: 论文在两处引用该文献，在目标提议实验中，作为先驱检测系统的代表之一引用

- [90] Jamie Shotton, 2006
  - 标题: TextonBoost: Joint appearance, shape and context modeling for mulit-class object recognition and segmentation
  - 关键词: RITM, interactive segmentation, state-of-the-art
  - 总结: 论文引用该文献，在单点掩码实验中作为主要对比基线（RITM），SAM在16/23数据集上优于该方法

- [99] Sebastian Thrun, 1995
  - 标题: Is learning the n-th thing any easier than learning the first
  - 关键词: MCC, 3D reconstruction, composition
  - 总结: 论文引用该文献，说明SAM可作为组件用于MCC等3D重建系统，实现零样本泛化

- [102] Koen EA van de Sande, 2011
  - 标题: Segmentation as selective search for object recognition
  - 关键词: selective search, object proposal, segmentation
  - 总结: 论文在两处引用该文献，在目标提议实验中，作为经典目标提议方法的代表引用

- [103] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, attention, sequence modeling
  - 总结: 论文引用该文献，SAM的掩码解码器使用Transformer解码器块，受Attention is All You Need启发

- [106] Chao-Yuan Wu, 2023
  - 标题: Multiview compressive coding for 3D reconstruction
  - 关键词: HED, holistically-nested, edge detection
  - 总结: 论文引用该文献，在BSDS500边缘检测实验中作为深度学习SOTA对比方法

- [108] Saining Xie, 2015
  - 标题: Holistically-nested edge detection
  - 关键词: interactive selection, deep interactive, annotation
  - 总结: 论文在两处引用该文献，在预训练方法中借鉴交互式分割的设置；相关工作列举

- [109] Ning Xu, 2016
  - 标题: Deep interactive object selection
  - 关键词: interactive segmentation, pre-training, prompt simulation
  - 总结: 论文在两处引用该文献，SAM的预训练方法从交互式分割工作中借鉴，模拟提示序列进行训练

- [114] Wenwei Zhang, 2021
  - 标题: K-Net: Towards unified image segmentation
  - 关键词: K-Net, unified segmentation, multi-task
  - 总结: 论文引用该文献，在多任务分割系统的相关工作中提及统一分割方法

- [117] Bolei Zhou, 2019
  - 标题: Semantic understanding of scenes through the ADE20K dataset
  - 关键词: ADE20K, scene understanding, dataset comparison
  - 总结: 论文在两处引用该文献，将SA-1B与ADE20K进行空间分布和掩码属性对比



##### Background

- [2] Thomas Deselaers, Bogdan Alexe, 2010
  - 标题: What is an object
  - 关键词: objectness, object proposal, what is an object
  - 总结: 论文在两处引用该文献，在相关工作和目标提议实验中引用，讨论'什么是目标'这一基础问题

- [7] Stuart Berg, 2019
  - 标题: Straehle, Bernhard X. Kausler, Carsten Haubold, Martin Schiegg, Janez Ales, Thorsten Beier, Markus Rudy, Kemal Eren, Jaime I. Cervantes, Buote Xu, Fynn Beuttenmueller, Adrian Wolny, Chong Zhang, Ullrich Koethe, Fred A. Hamprecht, and Anna Kreshuk. ilastik: interactive machine learning for (bio)image analysis
  - 关键词: ilastik, interactive ML, domain-specific tool
  - 总结: 论文引用该文献，讨论SAM与领域专用工具（如ilastik）的对比，承认专用工具在其领域可能优于SAM

- [8] Rishi Bommasani, Drew A Hudson, Ehsan Adeli, Russ Altman, Simran Arora, Sydney von Arx, Michael S Bernstein, Jeannette Bohg, Antoine Bosselut, Emma Brunskill, et al, 2021
  - 标题: On the opportunities and risks of foundation models
  - 关键词: foundation model, opportunities and risks, Stanford HAI report
  - 总结: 论文在多处（共3处）引用该文献，确立'基础模型'的定义和框架，并在讨论部分对比本文方法与基础模型报告的异同

- [10] Tom Brown, 2020
  - 标题: Language models are few-shot learners
  - 关键词: GPT-3, language model, few-shot, prompt engineering
  - 总结: 论文在多处（共4处）引用该文献，作为NLP基础模型成功的核心例证，启发SAM将提示概念迁移到分割领域

- [21] Aakanksha Chowdhery, Sharan Narang, Jacob Devlin, Maarten Bosma, Gaurav Mishra, Adam Roberts, Paul Barham, Hyung Won Chung, Charles Sutton, Sebastian Gehrmann, et al, 2022
  - 标题: PaLM: Scaling language modeling with pathways
  - 关键词: PaLM, scaling, language modeling
  - 总结: 论文在两处引用该文献，在引言中说明模型规模、数据集大小和训练算力与性能的正相关趋势

- [26] George Konidaris, Bruno da Silva, 2012
  - 标题: Learning parameterized skills
  - 关键词: parameterized skills, future work
  - 总结: 论文引用该文献，在讨论部分作为未来方向（视频分割等）的类比引用

- [36] Thomas B, 1988
  - 标题: Fitzpatrick. The validity and practicality of sun-reactive skin types i through vi
  - 关键词: Fitzpatrick, skin tone, fairness
  - 总结: 论文引用该文献，在公平性分析中使用Fitzpatrick皮肤分型标准对肤色进行分类

- [51] Jordan Hoffmann, Sebastian Borgeaud, Arthur Mensch, Elena Buchatskaya, Trevor Cai, Eliza Rutherford, Diego de Las Casas, Lisa Anne Hendricks, Johannes Welbl, Aidan Clark, et al, 2022
  - 标题: Training compute-optimal large language models
  - 关键词: Chinchilla, compute-optimal, scaling law
  - 总结: 论文引用该文献，在引言中说明训练算力最优化的趋势与模型性能的关系

- [56] Jared Kaplan, 2020
  - 标题: Scaling laws for neural language models
  - 关键词: scaling laws, neural language models, Kaplan
  - 总结: 论文引用该文献，在引言中引用规模法则说明更大模型带来更强泛化能力

- [57] Andrew Witkin, Michael Kass, 1988
  - 标题: Snakes: Active contour models
  - 关键词: snakes, active contour, classical segmentation
  - 总结: 论文引用该文献，在相关工作中提及经典分割方法

- [73] Nassir Navab, Fausto Milletari, 2016
  - 标题: V-Net: Fully convolutional neural networks for volumetric medical image segmentation
  - 关键词: V-Net, medical segmentation, domain-specific
  - 总结: 论文引用该文献，在讨论部分提及SAM在医学等特定领域可能不如专用工具

- [76] Dim P Papadopoulos, 2017
  - 标题: Extreme clicking for efficient object annotation
  - 关键词: model cards, responsible AI, transparency
  - 总结: 论文引用该文献，在附录中提供模型卡片和数据卡片时引用model cards方法论

- [85] Xiaofeng Ren, 2003
  - 标题: Learning a classification model for segmentation
  - 关键词: TextonBoost, context modeling, appearance
  - 总结: 论文引用该文献，在相关工作中提及上下文建模在多类别目标识别中的应用

- [87] Candice Schumann, 2021
  - 标题: A step toward more inclusive people annotations for fairness
  - 关键词: MIAP, inclusive annotations, fairness
  - 总结: 论文引用该文献，在公平性分析中使用MIAP数据集进行性别和年龄分组评估

- [92] Ilya A Petrov, Konstantin Sofiiuk, 2022
  - 标题: Reviving iterative training with mask guidance for interactive segmentation
  - 关键词: background mixture, tracking, Stauffer
  - 总结: 论文在多处（共5处）引用该文献，在相关工作中提及经典分割方法

- [94] Chris Stauffer, 1999
  - 标题: Adaptive background mixture models for real-time tracking
  - 关键词: Fourier features, positional encoding, high frequency
  - 总结: 论文引用该文献，在讨论部分或模型设计中涉及高频函数学习

- [95] Matthew Tancik, 2020
  - 标题: Fourier features let networks learn high frequency functions in low dimensional domains
  - 关键词: learning theory, Valiant
  - 总结: 论文引用该文献，在讨论部分引用经典学习理论

- [110] Kaiyu Yang, 2020
  - 标题: Towards fairer datasets: Filtering and balancing the distribution of the people subtree in the imagenet hierarchy
  - 关键词: fairness, ImageNet, dataset bias
  - 总结: 论文在两处引用该文献，在公平性分析中引用ImageNet人群子树公平性工作，说明数据集中的代表性问题

- [115] Jieyu Zhao, 2017
  - 标题: Men also like shopping: Reducing gender bias amplification using corpus-level constraints
  - 关键词: gender bias, dataset bias, fairness
  - 总结: 论文引用该文献，在公平性分析中提及女性在检测和分割数据集中代表性不足的问题


# Real-time object detection meets DINOv3 (2026)

- Paper ref: 1:8YS3DEMI
- Title: Real-time object detection meets DINOv3
- Year: 2026

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2021 | Cheng Cui; Ruoyu Guo; et al. | Beyond self-supervision: A simple yet effective network distillation alternative to improve backbones |
| ref-2 | 2022 | Tri Dao; Dan Fu; et al. | Flashattention: Fast and memory-efficient exact attention with io-awareness |
| ref-3 | 2020 | Alexey Dosovitskiy; Lucas Beyer; et al. | An image is worth 16x16 words: Transformers for image recognition at scale |
| ref-4 | 2021 | Golnaz Ghiasi; Yin Cui; et al. | Simple copy-paste is a strong data augmentation method for instance segmentation |
| ref-5 | 2023 | Glenn Jocher | Yolov8 |
| ref-6 | 2024 | Glenn Jocher | Yolo11 |
| ref-7 | 2025 | Shihua Huang; Zhichao Lu; et al. | Deim: Detr with improved matching for fast convergence |
| ref-8 | 2023 | Muhammad Hussain | Yolo-v1 to yolo-v8, the rise of yolo and its complementary nature toward digital manufacturing and industrial defect detection |
| ref-9 | 2023 | Chuyi Li; Lulu Li; et al. | Yolov6 v3.0: A full-scale reloading |
| ref-10 | 2022 | Yanghao Li; Hanzi Mao; et al. | Exploring plain vision transformer backbones for object detection |
| ref-11 | 2022 | Siyuan Liang; Hao Wu; et al. | Edge yolo: Real-time intelligent object detection system based on edge-cloud cooperation in autonomous vehicles |
| ref-12 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft coco: Common objects in context |
| ref-13 | 2020 | Xiang Long; Kaipeng Deng; et al. | Pp-yolo: An effective and efficient implementation of object detector |
| ref-14 | 2024 | Wenyu Lv; Yian Zhao; et al. | Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer |
| ref-15 | 2021 | Rangi Lyu | Nanodet-plus |
| ref-16 | 2024 | Debapriya Maji; Soyeb Nagori; et al. | Yolo-6d-pose: Enhancing yolo for single-stage monocular multi-object 6d pose estimation |
| ref-17 | 2024 | Yansong Peng; Hebei Li; et al. | D-fine: Redefine regression task in detrs as fine-grained distribution refinement |
| ref-18 | 2016 | Joseph Redmon; Santosh Divvala; et al. | You only look once: Unified, real-time object detection |
| ref-19 | 2019 | Hamid Rezatofighi; Nathan Tsoi; et al. | Generalized intersection over union: A metric and a loss for bounding box regression |
| ref-20 | 2020 | Noam Shazeer | Glu variants improve transformer |
| ref-21 | 2025 | Oriane Simeoni; Huy V Vo; et al. | Dinov3 |
| ref-22 | 2025 | Yunjie Tian; Qixiang Ye; et al. | Yolov12: Attention-centric real-time object detectors |
| ref-23 | 2024 | Ao Wang; Hui Chen; et al. | Yolov10: Real-time end-to-end object detection |
| ref-24 | 2023 | Chengcheng Wang; Wei He; et al. | Gold-yolo: Efficient object detector via gather-and-distribute mechanism |
| ref-25 | 2024 | Chien-Yao Wang; I-Hau Yeh; et al. | Yolov9: Learning what you want to learn using programmable gradient information |
| ref-26 | 2021 | Guanghua Yu; Qinyao Chang; et al. | Pp-picodet: A better real-time object detector on mobile devices |
| ref-27 | 2019 | Biao Zhang; Rico Sennrich | Root mean square layer normalization |
| ref-28 | 2017 | Hongyi Zhang | mixup: Beyond empirical risk minimization |
| ref-29 | 2024 | Yian Zhao; Wenyu Lv; et al. | Detrs beat yolos on real-time object detection |
| ref-30 | 2021 | Ge Zheng; Liu Songtao; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-31 | 2021 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 总体总结
本文在引言和方法部分通过三条研究脉络组织引文：首先追溯实时目标检测从 YOLO 到 DETR-based 方法的技术演进，确立研究背景；其次对比主流检测范式（依赖 NMS 的后处理路线 vs 直接集合预测路线），说明不同技术路线的优劣；最后引出 DEIMv2 的方法路线，结合 DINOv3 特征与 STA 适配器实现性能突破。关键文献包括 DINOv3（特征基础）、DEIM 前作（架构来源）、RT-DETR（整体框架）、D-FINE（损失函数）、以及 YOLOv10/v12（主要对比基线）。


#### 关键文献

- [7] Shihua Huang, 2025: Deim: Detr with improved matching for fast convergence (Uncategorized)

- [12] Tsung-Yi Lin, 2014: Microsoft coco: Common objects in context (Dataset)

- [14] Wenyu Lv, 2024: Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer (Uncategorized)

- [17] Yansong Peng, 2024: D-fine: Redefine regression task in detrs as fine-grained distribution refinement (Uncategorized)

- [21] Oriane Simeoni, 2025: Dinov3 (Uncategorized)

- [23] Ao Wang, 2024: Yolov10: Real-time end-to-end object detection (Uncategorized)



#### 范围
- 章节：1. Introduction + 2. Method + 3. Experiments
- 行号：15-86

#### 按功能归类


##### Uncategorized

- [1] Cheng Cui, 2021
  - 标题：Beyond self-supervision: A simple yet effective network distillation alternative to improve backbones
  - 关键词：backbone, distillation, HGNetv2
  - 总结：论文引用该工作以说明 HGNetv2 骨干网络的来源，该网络被用作 Nano/Pico/Femto/Atto 变体的基础架构。

- [2] Tri Dao, 2022
  - 标题：Flashattention: Fast and memory-efficient exact attention with io-awareness
  - 关键词：attention, optimization, inference
  - 总结：论文在讨论未来优化方向时引用该工作，指出 Flash Attention 可进一步加速推理。

- [3] Alexey Dosovitskiy, 2020
  - 标题：An image is worth 16x16 words: Transformers for image recognition at scale
  - 关键词：ViT, transformer, backbone
  - 总结：论文引用 ViT 原始工作以说明其 ViT 变体骨干网络的基础架构来源。

- [4] Golnaz Ghiasi, 2021
  - 标题：Simple copy-paste is a strong data augmentation method for instance segmentation
  - 关键词：copy-paste, data augmentation, instance segmentation
  - 总结：论文引用 Copy-Paste 作为对比基线，说明其 Copy-Blend 方法的不同之处：Copy-Blend  blending 而非完全覆盖目标区域。

- [5] Glenn Jocher, 2023
  - 标题：Yolov8
  - 关键词：YOLO, real-time detection, baseline
  - 总结：论文在实验部分引用 YOLOv8 作为主要的对比基线之一，用于性能比较。

- [6] Glenn Jocher, 2024
  - 标题：Yolo11
  - 关键词：YOLO, real-time detection, baseline
  - 总结：论文在实验部分引用 YOLO11 作为主要的对比基线之一，用于性能比较。

- [7] Shihua Huang, 2025
  - 标题：Deim: Detr with improved matching for fast convergence
  - 关键词：DEIM, DETR, object detection
  - 总结：论文引用其前作 DEIM 以说明 DEIMv2 的基础架构来源，包括 Dense O2O 等核心组件。

- [9] Chuyi Li, 2023
  - 标题：Yolov6 v3.0: A full-scale reloading
  - 关键词：YOLO, lightweight detection
  - 总结：论文在实验部分引用 YOLOv6 作为轻量级检测器的对比基线之一。

- [10] Yanghao Li, 2022
  - 标题：Exploring plain vision transformer backbones for object detection
  - 关键词：ViT, object detection, backbone
  - 总结：论文引用该工作以说明纯 ViT 骨干在目标检测中的可行性，支持其 ViT-based 变体设计。

- [11] Siyuan Liang, 2022
  - 标题：Edge yolo: Real-time intelligent object detection system based on edge-cloud cooperation in autonomous vehicles
  - 关键词：edge computing, autonomous vehicles, application
  - 总结：论文在引言部分引用该工作以说明实时目标检测在自动驾驶边缘云协作场景中的应用。

- [13] Xiang Long, 2020
  - 标题：Pp-yolo: An effective and efficient implementation of object detector
  - 关键词：PP-YOLO, lightweight detection
  - 总结：论文在超轻量级模型对比中引用 PP-YOLO 作为基线之一。

- [14] Wenyu Lv, 2024
  - 标题：Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer
  - 关键词：RT-DETR, DETR, real-time detection
  - 总结：论文引用 RT-DETR 以说明其整体架构设计来源，DEIMv2 基于 RT-DETR 框架进行改进。

- [15] Rangi Lyu, 2021
  - 标题：Nanodet-plus
  - 关键词：NanoDet, ultra-lightweight detection
  - 总结：论文在超轻量级模型对比中引用 NanoDet-M 作为基线，DEIMv2-Atto 与其性能相当但尺寸更小。

- [16] Debapriya Maji, 2024
  - 标题：Yolo-6d-pose: Enhancing yolo for single-stage monocular multi-object 6d pose estimation
  - 关键词：6D pose, YOLO, application
  - 总结：论文在引言部分引用该工作以说明实时目标检测技术的扩展应用。

- [17] Yansong Peng, 2024
  - 标题：D-fine: Redefine regression task in detrs as fine-grained distribution refinement
  - 关键词：D-FINE, loss function, distillation
  - 总结：论文引用 D-FINE 以说明其损失函数设计，采用 FGL Loss 和 DDF Loss 作为训练组件（大型变体）。

- [19] Hamid Rezatofighi, 2019
  - 标题：Generalized intersection over union: A metric and a loss for bounding box regression
  - 关键词：GIoU, loss function, bounding box
  - 总结：论文引用 GIoU Loss 以说明其训练损失设计，GIoU 是五个损失组件之一。

- [20] Noam Shazeer, 2020
  - 标题：Glu variants improve transformer
  - 关键词：GLU, FFN, transformer
  - 总结：论文引用 GLU 变体工作以说明其 Decoder 中 SwishFFN 设计的来源。

- [21] Oriane Simeoni, 2025
  - 标题：Dinov3
  - 关键词：DINOv3, feature representation, pretraining
  - 总结：论文引用 DINOv3 以说明其大型变体（L/X）采用的预训练骨干来源，DINOv3 提供强语义特征表示。

- [22] Yunjie Tian, 2025
  - 标题：Yolov12: Attention-centric real-time object detectors
  - 关键词：YOLOv12, real-time detection, attention
  - 总结：论文在实验部分引用 YOLOv12 作为对比基线，并指出其采用 Flash Attention 优化推理速度。

- [23] Ao Wang, 2024
  - 标题：Yolov10: Real-time end-to-end object detection
  - 关键词：YOLOv10, real-time detection, end-to-end
  - 总结：论文在实验部分引用 YOLOv10 作为主要对比基线，DEIMv2-Pico 以约 50% 更少参数达到与 YOLOv10-Nano 相当的性能。

- [24] Chengcheng Wang, 2023
  - 标题：Gold-yolo: Efficient object detector via gather-and-distribute mechanism
  - 关键词：Gold-YOLO, efficient detection
  - 总结：论文在实验部分引用 Gold-YOLO 作为对比基线之一。

- [25] Chien-Yao Wang, 2024
  - 标题：Yolov9: Learning what you want to learn using programmable gradient information
  - 关键词：YOLOv9, programmable gradient
  - 总结：论文在实验部分引用 YOLOv9 作为对比基线之一。

- [26] Guanghua Yu, 2021
  - 标题：Pp-picodet: A better real-time object detector on mobile devices
  - 关键词：PP-PicoDet, mobile detection
  - 总结：论文在超轻量级模型对比中引用 PP-PicoDet 作为基线之一。

- [27] Biao Zhang, 2019
  - 标题：Root mean square layer normalization
  - 关键词：RMSNorm, normalization, transformer
  - 总结：论文引用 RMSNorm 以说明其 Decoder 中 normalization 设计的来源，用于替代传统 LayerNorm。

- [28] Hongyi Zhang, 2017
  - 标题：mixup: Beyond empirical risk minimization
  - 关键词：mixup, data augmentation
  - 总结：论文引用 MixUp 以说明其数据增强策略的背景。

- [29] Yian Zhao, 2024
  - 标题：Detrs beat yolos on real-time object detection
  - 关键词：DETR, real-time detection
  - 总结：论文在引言部分引用该工作以说明 DETR-based 方法在实时检测中的应用前景。

- [30] Ge Zheng, 2021
  - 标题：Yolox: Exceeding yolo series in 2021
  - 关键词：YOLOX, lightweight detection
  - 总结：论文在超轻量级模型对比中引用 YOLOX-Nano 作为基线之一。

- [31] Xizhou Zhu, 2021
  - 标题：Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词：deformable attention, DETR, transformer
  - 总结：论文引用可变形 DETR 以说明其解码器中可变形注意力机制的设计来源。



##### Background

- [8] Muhammad Hussain, 2023
  - 标题：Yolo-v1 to yolo-v8, the rise of yolo and its complementary nature toward digital manufacturing and industrial defect detection
  - 关键词：YOLO, survey, industrial inspection
  - 总结：论文在引言部分引用该综述以说明实时目标检测在工业缺陷检测中的应用。



##### Dataset

- [12] Tsung-Yi Lin, 2014
  - 标题：Microsoft coco: Common objects in context
  - 关键词：COCO, dataset, benchmark
  - 总结：论文引用 COCO 数据集以说明其实验评估平台，所有主要结果均在 COCO val2017 上报告。



##### Historical

- [18] Joseph Redmon, 2016
  - 标题：You only look once: Unified, real-time object detection
  - 关键词：YOLO, real-time detection, historical
  - 总结：论文在引言部分引用 YOLO 原始工作以说明实时目标检测的发展背景。





#### 时间线分析

##### 早期
早期工作奠定了目标检测和数据集基础。COCO 数据集 (2014) 成为标准 benchmark，YOLO (2016) 开创了实时检测路线，GIoU Loss (2019) 改进了边界框回归。


- [12] Tsung-Yi Lin, 2014: Microsoft coco: Common objects in context

- [18] Joseph Redmon, 2016: You only look once: Unified, real-time object detection

- [19] Hamid Rezatofighi, 2019: Generalized intersection over union: A metric and a loss for bounding box regression




##### 中期
中期工作引入了 Transformer 架构和优化技术。ViT (2020) 将 Transformer 引入视觉领域，Deformable DETR (2021) 改进注意力机制，ViTDet (2022) 探索纯 ViT 骨干，FlashAttention (2022) 优化推理效率，RMSNorm (2019) 和 GLU 变体 (2020) 改进了 Transformer 组件。


- [2] Tri Dao, 2022: Flashattention: Fast and memory-efficient exact attention with io-awareness

- [3] Alexey Dosovitskiy, 2020: An image is worth 16x16 words: Transformers for image recognition at scale

- [20] Noam Shazeer, 2020: Glu variants improve transformer

- [27] Biao Zhang, 2019: Root mean square layer normalization

- [28] Hongyi Zhang, 2017: mixup: Beyond empirical risk minimization

- [29] Yian Zhao, 2024: Detrs beat yolos on real-time object detection

- [30] Ge Zheng, 2021: Yolox: Exceeding yolo series in 2021

- [31] Xizhou Zhu, 2021: Deformable detr: Deformable transformers for end-to-end object detection




##### 近期
近期工作集中在实时 DETR 和 YOLO 系列的持续演进。DINOv3 (2025) 提供强语义特征，YOLOv8/v9/v10/v12 (2023-2025) 持续改进实时检测性能，RT-DETRv2 (2024) 和 D-FINE (2024) 推进 DETR-based 检测器，DEIM (2025) 提出改进匹配策略，HGNetv2 蒸馏 (2021) 和 PP 系列 (2020-2021) 优化轻量级部署。


- [1] Cheng Cui, 2021: Beyond self-supervision: A simple yet effective network distillation alternative to improve backbones

- [4] Golnaz Ghiasi, 2021: Simple copy-paste is a strong data augmentation method for instance segmentation

- [5] Glenn Jocher, 2023: Yolov8

- [6] Glenn Jocher, 2024: Yolo11

- [7] Shihua Huang, 2025: Deim: Detr with improved matching for fast convergence

- [8] Muhammad Hussain, 2023: Yolo-v1 to yolo-v8, the rise of yolo and its complementary nature toward digital manufacturing and industrial defect detection

- [9] Chuyi Li, 2023: Yolov6 v3.0: A full-scale reloading

- [10] Yanghao Li, 2022: Exploring plain vision transformer backbones for object detection

- [11] Siyuan Liang, 2022: Edge yolo: Real-time intelligent object detection system based on edge-cloud cooperation in autonomous vehicles

- [13] Xiang Long, 2020: Pp-yolo: An effective and efficient implementation of object detector

- [14] Wenyu Lv, 2024: Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer

- [15] Rangi Lyu, 2021: Nanodet-plus

- [16] Debapriya Maji, 2024: Yolo-6d-pose: Enhancing yolo for single-stage monocular multi-object 6d pose estimation

- [17] Yansong Peng, 2024: D-fine: Redefine regression task in detrs as fine-grained distribution refinement

- [21] Oriane Simeoni, 2025: Dinov3

- [22] Yunjie Tian, 2025: Yolov12: Attention-centric real-time object detectors

- [23] Ao Wang, 2024: Yolov10: Real-time end-to-end object detection

- [24] Chengcheng Wang, 2023: Gold-yolo: Efficient object detector via gather-and-distribute mechanism

- [25] Chien-Yao Wang, 2024: Yolov9: Learning what you want to learn using programmable gradient information

- [26] Guanghua Yu, 2021: Pp-picodet: A better real-time object detector on mobile devices


# DinoDental: Benchmarking DINOv3 as a Unified Vision Encoder for Dental Image Analysis (2026)

- Paper ref: 1:9CBBDH3Y
- Title: DinoDental: Benchmarking DINOv3 as a Unified Vision Encoder for Dental Image Analysis
- Year: 2026

## Compact References

_No references artifact rows available._

## Citation Analysis Report

## 引文分析报告

### 摘要

本文引用了79篇文献，涵盖自监督学习、视觉基础模型、牙科图像分析等领域。

### 信号

无详细引文分析数据。


# YOLOv7: Trainable Bag-of-Freebies Sets New State-of-the-Art for Real-Time Object Detectors (2023)

- Paper ref: 1:ABTG2CFC
- Title: YOLOv7: Trainable Bag-of-Freebies Sets New State-of-the-Art for Real-Time Object Detectors
- Year: 2023

## Compact References

_No references artifact rows available._

## Citation Analysis Report

#### 按功能归类

**Background（背景文献）:**
- 模型重参数化技术：[11,12,28] - RepVGG、Diverse Branch Block、在线卷积重参数化等方法成为网络训练和目标检测的重要研究方向
- 动态标签分配技术：[16,19,40] - TOOD、OTA、双权重标签分配方案等方法成为研究热点
- 特征融合方法：[8,21,29,36,43,56,71,94] - Dynamic Head、NAS-FPN、A²-FPN、Panoptic FPN、EfficientDet 等方法
- 应用领域文献：多目标跟踪 [90,91]、自动驾驶 [17,39]、机器人 [34,55]、医学图像分析 [33,44]

**Baseline（基线方法）:**
- YOLO 系列：[2] YOLOv4、[20] YOLOX、[22] YOLOv5、[76] Scaled-YOLOv4、[79] YOLOR、[83] PP-YOLOE
- 面向边缘 CPU 的方法：[46,47] MCUNet、[51] NanoDet
- 面向 GPU 的方法：[20] YOLOX、[79] YOLOR、[94] CenterNet

**Component（组件/架构）:**
- 轻量级骨干网络：MobileNet [26,27,63]、ShuffleNet [52,89]、GhostNet [24]
- GPU 导向架构：ResNet [25]、DarkNet [60]、DLA [85]、CSPNet [77]

#### 按引用编号列举

- **[2] YOLOv4**: 作为当前最先进的实时目标检测器之一，是重要的基线方法，本文方法在 YOLOv4 基础上进行改进。
- **[11,12,28] 模型重参数化**: RepVGG、Diverse Branch Block、在线卷积重参数化等方法成为网络训练的重要技术，本文分析了重参数化在不同网络结构中的适用性并提出计划重参数化模型。
- **[16,19,40] 动态标签分配**: TOOD、OTA、双权重标签分配等方法成为研究热点，本文针对多输出层模型的标签分配问题提出新的解决方案。
- **[20] YOLOX / [79] YOLOR**: 作为面向 GPU 优化的实时检测器代表，与本文方法属于同一研究方向，是最重要的基线方法。
- **[46,47] MCUNet / [51] NanoDet**: 作为面向边缘 CPU 优化的方法，与本文面向 GPU 的方法形成对比，代表不同的优化方向。
- **[25] ResNet / [77] CSPNet**: 作为 GPU 导向检测器的常用架构，CSPNet 是本文作者团队之前的工作，对本文架构设计有重要影响。


# PolarStream: Streaming Lidar Object Detection and Segmentation with Polar Pillars (2021)

- Paper ref: 1:AHF2RU48
- Title: PolarStream: Streaming Lidar Object Detection and Segmentation with Polar Pillars
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Alsfasser, M.; Siegemund, J.; et al. | Exploiting polar grid structure and object shadows for fast object detection in point clouds |
| ref-2 | 2018 | Berman, M.; Triki, A.R.; et al. | The lovász-softmax loss: A tractable surrogate for the optimization of the intersection-over-union measure in neural networks |
| ref-3 | 2019 | Caesar, H.; Bankiti, V.; et al. | nuscenes: A multimodal dataset for autonomous driving. arXiv preprint arXiv:1903.11027 |
| ref-4 | 2018 | Casas, S.; Luo, W.; et al. | Intentnet: Learning to predict intention from raw sensor data |
| ref-5 | 2020 | Chen, Q.; Sun, L.; et al. | Every view counts: Cross-view consistency in 3d object detection with hybrid-cylindrical-spherical voxelization. Advances in Neural Information Processing Systems |
| ref-6 | 2020 | Chen, Q.; Sun, L.; et al. | Object as hotspots: An anchor-free 3d object detection approach via firing of hotspots |
| ref-7 | 2017 | Chen, X.; Ma, H.; et al. | Multi-view 3d object detection network for autonomous driving |
| ref-8 | 2021 | Cheng, R.; Razani, R.; et al. | 2-s3net: Attentive feature fusion with adaptive feature selection for sparse semantic segmentation network. arXiv preprint arXiv:2102.04530 |
| ref-9 | 2020 | Cortinhal, T.; Tzelepis, G.; et al. | Salsanext: Fast, uncertainty-aware semantic segmentation of lidar point clouds for autonomous driving. arXiv preprint arXiv:2003.03653 |
| ref-10 | 2021 | Fan, L.; Xiong, X.; et al. | Rangedet: In defense of range view for lidar-based 3d object detection. arXiv preprint arXiv:2103.10039 |
| ref-11 | 2020 | Frossard, D.; Suo, S.; et al. | Strobe: Streaming object detection from lidar packets. arXiv preprint arXiv:2011.06425 |
| ref-12 | 2013 | Geiger, A.; Lenz, P.; et al. | Vision meets robotics: The kitti dataset. The International Journal of Robotics Research 32(11), 1231–1237 |
| ref-13 | 2020 | Han, W.; Zhang, Z.; et al. | Streaming object detection for 3-d point clouds |
| ref-14 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-15 | 2015 | Ioffe, S.; Szegedy, C. | Batch normalization: Accelerating deep network training by reducing internal covariate shift |
| ref-16 | 2019 | Lang, A.H.; Vora, S.; et al. | Pointpillars: Fast encoders for object detection from point clouds |
| ref-17 | 2017 | Lin, T.Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-18 | 2016 | Liu, W.; Anguelov, D.; et al. | Ssd: Single shot multibox detector |
| ref-19 | 2018 | Luo, W.; Yang, B.; et al. | Fast and furious: Real time end-to-end 3d detection, tracking and motion forecasting with a single convolutional net. In: Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR) (June |
| ref-20 | 2015 | Maturana, D.; Scherer, S. | Voxnet: A 3d convolutional neural network for real-time object recognition |
| ref-21 | 2019 | Meyer, G.P.; Laddha, A.; et al. | Lasernet: An efficient probabilistic 3d object detector for autonomous driving |
| ref-22 | 2017 | Qi, C.R.; Su, H.; et al. | Pointnet: Deep learning on point sets for 3d classification and segmentation |
| ref-23 | 2020 | Rapoport-Lavie, M.; Raviv, D. | It’s all around you: Range-guided cylindrical network for 3d object detection. arXiv preprint arXiv:2012.03121 |
| ref-24 | 2016 | Ren, S.; He, K.; et al. | Faster r-cnn: towards real-time object detection with region proposal networks. IEEE transactions on pattern analysis and machine intelligence 39(6), 1137–1149 |
| ref-25 | 2015 | Ronneberger, O.; Fischer, P.; et al. | U-net: Convolutional networks for biomedical image segmentation |
| ref-26 | 2018 | Simon, M.; Milz, S.; et al. | Complex-yolo: Real-time 3d object detection on point clouds. CoRR |
| ref-27 | 2020 | Sun, P.; Kretzschmar, H.; et al. | Scalability in perception for autonomous driving: Waymo open dataset |
| ref-28 | 2020 | Tang, H.; Liu, Z.; et al. | Searching efficient 3d architectures with sparse point-voxel convolution |
| ref-29 | 2020 | Vora, S.; Lang, A.H.; et al. | Pointpainting: Sequential fusion for 3d object detection |
| ref-30 | 2018 | Yan, Y.; Mao, Y.; et al. | Second: Sparsely embedded convolutional detection. Sensors 18(10), 3337 |
| ref-31 | 2018 | Yang, B.; Liang, M.; et al. | HDNET: Exploiting HD maps for 3d object detection |
| ref-32 | 2018 | Yang, B.; Luo, W.; et al. | Pixor: Real-time 3d object detection from point clouds |
| ref-33 | 2018 | Yang, B.; Luo, W.; et al. | PIXOR: Real-time 3d object detection from point clouds |
| ref-34 | 2020 | Ye, Y.; Chen, H.; et al. | Sarpnet: Shape attention regional proposal network for lidar-based 3d object detection. Neurocomputing 379, 53–63 |
| ref-35 | 2020 | Yin, T.; Zhou, X. | Center-based 3d object detection and tracking. arXiv preprint arXiv:2006.11275 |
| ref-36 | 2020 | Zhang, Y.; Zhou, Z.; et al. | Polarnet: An improved grid representation for online lidar point clouds semantic segmentation. arXiv preprint arXiv:2003.14032 |
| ref-37 | 2020 | Zhou, H.; Zhu, X.; et al. | Cylinder3d: An effective 3d framework for driving-scene lidar semantic segmentation. arXiv preprint arXiv:2008.01550 |
| ref-38 | 2019 | Zhou, Y.; Sun, P.; et al. | End-to-end multi-view fusion for 3d object detection in lidar point clouds. arXiv preprint arXiv:1910.06528 |
| ref-39 | 2018 | Zhou, Y.; Tuzel, O. | Voxelnet: End-to-end learning for point cloud based 3d object detection |
| ref-40 | 2021 | Zhou, Z.; Zhang, Y.; et al. | Panoptic-polarnet: Proposal-free lidar point cloud panoptic segmentation. arXiv preprint arXiv:2103.14962 |
| ref-41 | 2019 | Zhu, B.; Jiang, Z.; et al. | Class-balanced grouping and sampling for point cloud 3d object detection. arXiv preprint arXiv:1908.09492 |

## Citation Analysis Report

#### 总体总结
引言与相关工作部分的引文组织呈现了一条清晰的技术叙事：先以图像检测和3D特征学习的奠基工作（Faster R-CNN、SSD、VoxNet、PointNet）铺出感知背景，再展示这些思想如何迁移到激光雷达BEV表示中，形成以占用网格和柱体为主流范式的检测路线。随后引入流式感知这条并行线索，将Han et al.和STROBE作为降低延迟的开创方案进行定位。最后在极坐标网格的子线索中，一方面肯定PolarNet和Cylinder3D在分割任务上的成功，另一方面指出极坐标检测仍受畸变困扰，为本文方法的登场铺垫了明确的技术空缺。


#### 关键文献

- [13] Han, W., 2020: Streaming object detection for 3-d point clouds (Baseline)

- [11] Frossard, D., 2020: Strobe: Streaming object detection from lidar packets. arXiv preprint arXiv:2011.06425 (Baseline)

- [16] Lang, A.H., 2019: Pointpillars: Fast encoders for object detection from point clouds (Component)

- [36] Zhang, Y., 2020: Polarnet: An improved grid representation for online lidar point clouds semantic segmentation. arXiv preprint arXiv:2003.14032 (Background)

- [37] Zhou, H., 2020: Cylinder3d: An effective 3d framework for driving-scene lidar semantic segmentation. arXiv preprint arXiv:2008.01550 (Background)



#### 范围
- 章节: Introduction + Related Works
- 行号: 16-55

#### 按功能归类


##### Background

- [1] Alsfasser, M., 2020
  - 标题: Exploiting polar grid structure and object shadows for fast object detection in point clouds
  - 关键词: polar grid, 3D detection, distortion
  - 总结: 该工作被引用来说明极坐标网格在3D目标检测上的性能瓶颈——物体在展开为矩形表示时发生畸变，导致与卷积的平移不变性不兼容。原文借这一局限引出自己的Feature Undistortion方案。

- [3] Caesar, H., 2019
  - 标题: nuscenes: A multimodal dataset for autonomous driving. arXiv preprint arXiv:1903.11027
  - 关键词: nuScenes, benchmark dataset, autonomous driving
  - 总结: nuScenes被两处引用：一是作为推动激光雷达感知进展的基准数据集之一，与KITTI和Waymo并列；二是作为本文实验的评估数据集。

- [4] Casas, S., 2018
  - 标题: Intentnet: Learning to predict intention from raw sensor data
  - 关键词: BEV, trajectory prediction, multi-task
  - 总结: 该工作被用来佐证BEV表示的优势之一：能够同时进行检测和轨迹预测，属于背景性引用。

- [5] Chen, Q., 2020
  - 标题: Every view counts: Cross-view consistency in 3d object detection with hybrid-cylindrical-spherical voxelization. Advances in Neural Information Processing Systems
  - 关键词: hybrid voxelization, cylindrical, 3D detection
  - 总结: 该工作被引用为极坐标网格检测性能受限的证据之一，与[1]和[23]一起说明极坐标表示下物体畸变问题。

- [7] Chen, X., 2017
  - 标题: Multi-view 3d object detection network for autonomous driving
  - 关键词: multi-view, occupancy grid, BEV
  - 总结: 该工作作为VoxNet、MV3D、Pixor、Complex-YOLO等占用网格方法之一被列举，属于背景性文献回顾。

- [10] Fan, L., 2021
  - 标题: Rangedet: In defense of range view for lidar-based 3d object detection. arXiv preprint arXiv:2103.10039
  - 关键词: range view, 3D detection, lidar
  - 总结: 该工作被引用为基于range view的激光雷达3D检测方法的代表，与[21]一起作为BEV之外的另一种表示选择。

- [12] Geiger, A., 2013
  - 标题: Vision meets robotics: The kitti dataset. The International Journal of Robotics Research 32(11), 1231–1237
  - 关键词: KITTI, benchmark dataset
  - 总结: KITTI与nuScenes、Waymo并列被引用为推动激光雷达感知进展的基准数据集。

- [18] Liu, W., 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: SSD, single-stage, image detection
  - 总结: SSD作为图像感知文献的代表之一被引用，说明激光雷达感知从图像检测领域借鉴思想。

- [19] Luo, W., 2018
  - 标题: Fast and furious: Real time end-to-end 3d detection, tracking and motion forecasting with a single convolutional net. In: Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR) (June
  - 关键词: real-time, detection, tracking, motion forecasting
  - 总结: 该工作被用来佐证BEV表示能够同时进行检测和轨迹预测的优势。

- [20] Maturana, D., 2015
  - 标题: Voxnet: A 3d convolutional neural network for real-time object recognition
  - 关键词: VoxNet, 3D CNN, occupancy grid
  - 总结: VoxNet作为早期3D卷积占用网格方法的代表被列举。

- [21] Meyer, G.P., 2019
  - 标题: Lasernet: An efficient probabilistic 3d object detector for autonomous driving
  - 关键词: LaserNet, range view, probabilistic
  - 总结: 该工作被引用为基于range view的激光雷达检测方法的代表之一。

- [23] Rapoport-Lavie, M., 2020
  - 标题: It’s all around you: Range-guided cylindrical network for 3d object detection. arXiv preprint arXiv:2012.03121
  - 关键词: cylindrical network, range-guided, 3D detection
  - 总结: 该工作与[1]和[5]一起被引用为极坐标检测性能受限的证据。

- [24] Ren, S., 2016
  - 标题: Faster r-cnn: towards real-time object detection with region proposal networks. IEEE transactions on pattern analysis and machine intelligence 39(6), 1137–1149
  - 关键词: Faster R-CNN, region proposal, image detection
  - 总结: Faster R-CNN作为图像感知文献的代表之一被引用。

- [26] Simon, M., 2018
  - 标题: Complex-yolo: Real-time 3d object detection on point clouds. CoRR
  - 关键词: Complex-YOLO, occupancy grid, real-time
  - 总结: 该工作作为占用网格方法之一被列举。

- [27] Sun, P., 2020
  - 标题: Scalability in perception for autonomous driving: Waymo open dataset
  - 关键词: Waymo, benchmark dataset, scalability
  - 总结: Waymo与KITTI、nuScenes并列被引用为推动激光雷达感知进展的基准数据集。

- [31] Yang, B., 2018
  - 标题: HDNET: Exploiting HD maps for 3d object detection
  - 关键词: HD map, BEV, 3D detection
  - 总结: 该工作被用来佐证BEV表示的优势之一：易于融合高清地图。

- [32] Yang, B., 2018
  - 标题: Pixor: Real-time 3d object detection from point clouds
  - 关键词: PIXOR, real-time, BEV
  - 总结: 该工作被引用为BEV表示的3D检测方法代表之一。

- [33] Yang, B., 2018
  - 标题: PIXOR: Real-time 3d object detection from point clouds
  - 关键词: PIXOR, occupancy grid
  - 总结: 该工作作为占用网格方法之一被列举。

- [36] Zhang, Y., 2020
  - 标题: Polarnet: An improved grid representation for online lidar point clouds semantic segmentation. arXiv preprint arXiv:2003.14032
  - 关键词: PolarNet, semantic segmentation, polar grid
  - 总结: PolarNet被引用为极坐标网格在激光雷达语义分割上优于笛卡尔网格的关键证据，同时也作为极坐标体素成功应用的例子。

- [37] Zhou, H., 2020
  - 标题: Cylinder3d: An effective 3d framework for driving-scene lidar semantic segmentation. arXiv preprint arXiv:2008.01550
  - 关键词: Cylinder3D, cylindrical grid, semantic segmentation
  - 总结: Cylinder3D与PolarNet一起被引用为柱面/极坐标网格在激光雷达语义分割上优于笛卡尔体素的证据。

- [38] Zhou, Y., 2019
  - 标题: End-to-end multi-view fusion for 3d object detection in lidar point clouds. arXiv preprint arXiv:1910.06528
  - 关键词: multi-view fusion, spherical voxel, 3D detection
  - 总结: 该工作被引用为BEV方法探索非笛卡尔体素化的例子之一。

- [40] Zhou, Z., 2021
  - 标题: Panoptic-polarnet: Proposal-free lidar point cloud panoptic segmentation. arXiv preprint arXiv:2103.14962
  - 关键词: Panoptic-PolarNet, panoptic segmentation, polar grid
  - 总结: 该工作被引用为极坐标网格从语义分割扩展到全景分割的代表，同时其全景融合方案被本文借鉴用于流式数据的全局全景融合。



##### Baseline

- [11] Frossard, D., 2020
  - 标题: Strobe: Streaming object detection from lidar packets. arXiv preprint arXiv:2011.06425
  - 关键词: streaming, STROBE, multi-scale memory
  - 总结: STROBE是本文最重要的对比基线之一。原文多次引用它：指出其矩形表示的浪费、其多尺度特征图方案的上下文增强机制及其计算开销，并在实验中进行量化对比。

- [13] Han, W., 2020
  - 标题: Streaming object detection for 3-d point clouds
  - 关键词: streaming, LSTM, stateful NMS
  - 总结: Han et al.是流式激光雷达检测的开创性工作。原文在多处引用它：交代问题起源、指出其矩形表示的浪费、分析其LSTM上下文增强机制的局限性，并作为实验基线。



##### Component

- [16] Lang, A.H., 2019
  - 标题: Pointpillars: Fast encoders for object detection from point clouds
  - 关键词: PointPillars, pillar, efficient encoder
  - 总结: PointPillars是本文方法的基础架构。原文首先将其作为高效体素表示的代表工作引用，随后PolarStream直接在其之上添加极坐标柱和分割头。

- [17] Lin, T.Y., 2017
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, classification, dense detection
  - 总结: 该工作被引用为本文分类损失函数的来源，属于工具性引用。

- [22] Qi, C.R., 2017
  - 标题: Pointnet: Deep learning on point sets for 3d classification and segmentation
  - 关键词: PointNet, point features, voxel
  - 总结: PointNet被引用为VoxelNet中点特征提取的基础方法，说明从体素占用网格到特征体素的演进。

- [39] Zhou, Y., 2018
  - 标题: Voxelnet: End-to-end learning for point cloud based 3d object detection
  - 关键词: VoxelNet, voxel, 3D detection
  - 总结: VoxelNet被多次引用：作为3D检测进展代表、作为从占用网格到特征体素演进的关键工作（采样固定点+PointNet）、以及体素化方法的代表。


# MedDINOv3: How to adapt vision foundation models for medical image segmentation? (2025)

- Paper ref: 1:BBIY57N3
- Title: MedDINOv3: How to adapt vision foundation models for medical image segmentation?
- Year: 2025

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2022 | Yuanfeng Ji; Haotian Bai; et al. | Amos: A large-scale abdominal multi-organ benchmark for versatile medical image segmentation |
| ref-2 | 2025 | Yuheng Li; Jacob F Wynne; et al. | Automatic medical imaging segmentation via self-supervising large-scale convolutional neural networks |
| ref-3 | 2022 | Yucheng Tang; Dong Yang; et al. | Self-supervised pre-training of swinunetr for 3d medical image analysis |
| ref-4 | 2021 | Fabian Isensee; Paul F Jaeger; et al. | nnu-net: a self-adapting framework for u-net-based medical image segmentation |
| ref-5 | 2022 | Ali Hatamizadeh; Vishwesh Nath; et al. | Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images |
| ref-6 | 2023 | Jun Ma; Bo Wang; et al. | Segment anything in medical images |
| ref-7 | 2021 | Rishi Bommasani; Drew A Hudson; et al. | On the opportunities and risks of foundation models |
| ref-8 | 2023 | Xingyu Zhou; Zheng Zhang; et al. | A comprehensive survey on pretraining-based foundation models: A history from bert to chatgpt |
| ref-9 | 2024 | Yuheng Li; Mingzhe Hu,; et al. | Polyp-sam: Transfer sam for polyp segmentation |
| ref-10 | 2025 | Shansong Wang; Mojtaba Safari; et al. | Dinov3 with test-time training for medical image registration |
| ref-11 | 2021 | Mathilde Caron; Hugo Touvron; et al. | Emerging properties in self-supervised vision transformers |
| ref-12 | 2021 | Alec Radford; Jong Wook Kim; et al. | Learning transferable visual models from natural language supervision |
| ref-13 | 2025 | Michael Tschannen; Xiaohua Zhai; et al. | Siglip 2: Better, faster, stronger |
| ref-14 | 2023 | Maxime Oquab; Timothée Darcet; et al. | Dinov2: Learning robust visual features without supervision |
| ref-15 | 2025 | Oriane Siméoni; Huy V Vo; et al. | Dinov3: Advancing self-supervised learning at scale |
| ref-16 | 2024 | Fabian Isensee; Tassilo Wald; et al. | nnu-net revisited: A call for rigorous validation in 3d medical image segmentation |
| ref-17 | 2024 | Mohammed Baharoon; Waseem Qureshi; et al. | Evaluating general purpose vision foundation models for medical image analysis: An experimental study of dinov2 on radiology benchmarks |
| ref-18 | 2022 | Xiaohua Zhai; Alexander Kolesnikov; et al. | Scaling vision transformers |
| ref-19 | 2023 | Haotian Zhang; Xuanyu Dong; et al. | Vit-adapter: Exploring efficient adaptation of vision transformers for dense predictions |
| ref-20 | 2022 | Bowen Cheng; Alexander Schwing,; et al. | Masked-attention mask transformer for universal image segmentation |
| ref-21 | 2022 | Ali Hatamizadeh; Yucheng Tang; et al. | Unetr: Transformers for 3d medical image segmentation |
| ref-22 | 2021 | Yutong Xie; Jianpeng Zhang; et al. | Cotr: Efficiently bridging cnn and transformer for 3d medical image segmentation |
| ref-23 | 2022 | Yutong Xie; Jianpeng Zhang; et al. | Unimiss: Universal medical self-supervised learning via breaking dimensionality barrier |
| ref-24 | 2021 | Jieneng Chen; Yongyi Lu; et al. | Transunet: Transformers make strong encoders for medical image segmentation |
| ref-25 | 2021 | Hong-Yu Zhou; Jiansen Guo; et al. | nnformer: Interleaved transformer for volumetric segmentation |
| ref-26 | 2025 | Tassilo Wald; Saikat Roy; et al. | Primus: Enforcing attention usage for 3d medical image segmentation |
| ref-27 | 2025 | Tommie Kerssies; Niccolò Cavagnero; et al. | Your vit is secretly an image segmentation model |
| ref-28 | 2021 | Zongwei Zhou; Vatsal Sodha; et al. | Models genesis |
| ref-29 | 2025 | Tassilo Wald; Constantin Ulrich; et al. | Revisiting mae pre-training for 3d medical image segmentation |
| ref-30 | 2024 | Yuheng Li; Tianyu Luan; et al. | Anatomask: Enhancing medical image segmentation with reconstruction-guided self-masking |
| ref-31 | 2023 | Guoping Xu; Xuan Zhang; et al. | Levit-unet: Make faster encoders with transformer for medical image segmentation |
| ref-32 | 2021 | Yunhe Gao; Mu Zhou,; et al. | Utnet: a hybrid transformer architecture for medical image segmentation |
| ref-33 | 2015 | Bennett Landman; Zhoubing Xu; et al. | Miccai multi-atlas labeling beyond the cranial vault–workshop and challenge |
| ref-34 | 2015 | Holger R Roth; Le Lu; et al. | Deeporgan: Multi-level deep convolutional networks for automated pancreas segmentation |
| ref-35 | 2021 | A Emre Kavur; N Sinem Gezer; et al. | Chaos challenge-combined (ct-mr) healthy abdominal organ segmentation |
| ref-36 | 2023 | Patrick Bilic; Patrick Christ; et al. | The liver tumor segmentation benchmark (lits) |
| ref-37 | 2023 | Nicholas Heller; Fabian Isensee; et al. | The kits21 challenge: Automatic segmentation of kidneys, renal tumors, and renal cysts in corticomedullary-phase ct |
| ref-38 | 2022 | Xiangde Luo; Wenjun Liao; et al. | Word: A large scale dataset, benchmark and clinical applicable study for abdominal organ segmentation from ct image |
| ref-39 | 2021 | Jun Ma; Yao Zhang; et al. | Abdomenct-1k: Is abdominal organ segmentation a solved problem? IEEE Transactions on Pattern Analysis and Machine Intelligence, 44(10):6695–6714, |
| ref-40 | 2022 | Michela Antonelli; Annika Reinke; et al. | The medical segmentation decathlon |
| ref-41 | 2020 | Blaine Rister; Darvin Yi; et al. | Ct-org, a new dataset for multiple organ segmentation in computed tomography |
| ref-42 | 2023 | Jakob Wasserthal; Hanns-Christian Breit; et al. | Totalsegmentator: robust segmentation of 104 anatomic structures in ct images |
| ref-43 | 2025 | Pedro RAS Bassi; Mehmet Can Yavuz; et al. | Radgpt: Constructing 3d image-text tumor datasets |
| ref-44 | 2021 | Enze Xie; Wenhai Wang; et al. | Segformer: Simple and efficient design for semantic segmentation with transformers |
| ref-45 | 2025 | Yifan Gao; Haoyue Li; et al. | Dino u-net: Exploiting high-fidelity dense features from foundation models for medical image segmentation |

## Citation Analysis Report

#### 总体总结
本文在引言与相关工作部分以清晰的研究叙事组织引文：先从医学图像分割的临床重要性和现有任务专用架构的局限出发铺陈背景，再引入基础模型作为统一视觉骨干的潜力，并指出自然图像预训练迁移到医学域面临 ViT 骨干在密集预测上落后于 CNN 以及域差距两大挑战。Related Work 部分将现有工作分为两条主线——医学视觉基础模型（自监督学习在医学域的应用）和 ViT 在医学分割中的应用——前者追溯从 Models Genesis 到 MIM 预训练的技术演进，后者从 TransUNet 到 Primus 展示 Transformer 架构的简化趋势。最终，本文借 DINOv3 作为技术起点和 nnU-Net 作为对标基线，明确了自身方法的定位。


#### 关键文献

- [4] Fabian Isensee, 2021: nnu-net: a self-adapting framework for u-net-based medical image segmentation (Baseline)

- [14] Maxime Oquab, 2023: Dinov2: Learning robust visual features without supervision (Component)

- [15] Oriane Siméoni, 2025: Dinov3: Advancing self-supervised learning at scale (Component)

- [16] Fabian Isensee, 2024: nnu-net revisited: A call for rigorous validation in 3d medical image segmentation (Contrast)

- [17] Mohammed Baharoon, 2024: Evaluating general purpose vision foundation models for medical image analysis: An experimental study of dinov2 on radiology benchmarks (Contrast)

- [26] Tassilo Wald, 2025: Primus: Enforcing attention usage for 3d medical image segmentation (Component)



#### 范围
- 章节: Introduction + Related Work
- 行号: 13-58

#### 按功能归类


##### Dataset

- [1] Yuanfeng Ji, 2022
  - 标题: Amos: A large-scale abdominal multi-organ benchmark for versatile medical image segmentation
  - 关键词: 腹部器官分割, AMOS基准, 医学图像分割数据集
  - 总结: 原文将 AMOS 作为医学图像分割重要性的背景例证引用，说明器官分割在临床中的价值。



##### Background

- [2] Yuheng Li, 2025
  - 标题: Automatic medical imaging segmentation via self-supervising large-scale convolutional neural networks
  - 关键词: 自监督学习, 医学影像分割, CNN
  - 总结: 原文引用该工作展示自监督预训练在医学图像分割中的有效性，并在 Related Work 中将其归入 MIM 预训练路线。

- [6] Jun Ma, 2023
  - 标题: Segment anything in medical images
  - 关键词: SAM迁移, 医学图像, 分割泛化
  - 总结: 原文引用该工作说明现有分割模型多为任务专用、泛化能力有限的问题背景。

- [7] Rishi Bommasani, 2021
  - 标题: On the opportunities and risks of foundation models
  - 关键词: 基础模型, 综述, 机遇与风险
  - 总结: 原文引用该工作为基础模型概念提供背景支撑，说明 FMs 作为统一视觉骨干的潜力。

- [8] Xingyu Zhou, 2023
  - 标题: A comprehensive survey on pretraining-based foundation models: A history from bert to chatgpt
  - 关键词: 预训练模型, 发展综述, BERT到ChatGPT
  - 总结: 原文引用该工作为基础模型的发展脉络提供综述性参考，支撑 FMs 作为统一视觉骨干的论述。

- [9] Yuheng Li, 2024
  - 标题: Polyp-sam: Transfer sam for polyp segmentation
  - 关键词: SAM, 息肉分割, 迁移学习
  - 总结: 原文将该工作作为基础模型可迁移到医学下游任务的实例引用。

- [10] Shansong Wang, 2025
  - 标题: Dinov3 with test-time training for medical image registration
  - 关键词: DINOv3, 测试时训练, 医学图像配准
  - 总结: 原文引用该工作展示 DINOv3 在医学域的应用先例，为本文使用 DINOv3 提供动机支撑。

- [13] Michael Tschannen, 2025
  - 标题: Siglip 2: Better, faster, stronger
  - 关键词: SigLIP, 视觉语言模型, 预训练
  - 总结: 原文将该工作作为视觉语言预训练领域的最新进展引用，支撑基础模型潜力的论述。

- [29] Tassilo Wald, 2025
  - 标题: Revisiting mae pre-training for 3d medical image segmentation
  - 关键词: MAE预训练, 3D医学分割, 掩码建模
  - 总结: 原文引用该工作支撑 MIM 预训练在医学分割中有效性的论述。

- [30] Yuheng Li, 2024
  - 标题: Anatomask: Enhancing medical image segmentation with reconstruction-guided self-masking
  - 关键词: Anatomask, 自掩码, 医学图像分割
  - 总结: 原文将该工作作为 MIM 预训练有效性的支撑证据之一引用。



##### Component

- [3] Yucheng Tang, 2022
  - 标题: Self-supervised pre-training of swinunetr for 3d medical image analysis
  - 关键词: SwinUNETR, 自监督预训练, 3D医学图像
  - 总结: 原文在引言中引用说明手动标注的成本问题，在 Related Work 中将其作为 SwinUNETR 框架下 SSL 预训练的代表性成果。

- [14] Maxime Oquab, 2023
  - 标题: Dinov2: Learning robust visual features without supervision
  - 关键词: DINOv2, 自监督学习, 视觉特征
  - 总结: 原文引用 DINOv2 作为自然图像 SSL 的关键成果，是本文采用 DINOv3 的技术谱系起点。

- [15] Oriane Siméoni, 2025
  - 标题: Dinov3: Advancing self-supervised learning at scale
  - 关键词: DINOv3, 大规模自监督, 视觉基础模型
  - 总结: 原文直接将 DINOv3 作为 MedDINOv3 的预训练起点，是全文最核心的技术基础引用。

- [26] Tassilo Wald, 2025
  - 标题: Primus: Enforcing attention usage for 3d medical image segmentation
  - 关键词: Primus, 解构架构, 3D医学分割
  - 总结: 原文将 Primus 作为简化 Transformer 解码器设计的参考，本文在其基础上进一步改进，并通过多尺度 token 聚合和高分辨率训练提升性能。

- [27] Tommie Kerssies, 2025
  - 标题: Your vit is secretly an image segmentation model
  - 关键词: ViT, 隐式分割, 解构设计
  - 总结: 原文引用该工作支撑解构 Transformer 复杂解码器的思路，为本文简化架构提供理论依据。



##### Baseline

- [4] Fabian Isensee, 2021
  - 标题: nnu-net: a self-adapting framework for u-net-based medical image segmentation
  - 关键词: nnU-Net, 自适配框架, 医学图像分割基线
  - 总结: 原文在引言中将其作为高度专用化架构的代表，暗示其泛化局限。nnU-Net 在实验部分被用作最强基线对照。

- [5] Ali Hatamizadeh, 2022
  - 标题: Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images
  - 关键词: Swin Transformer, 医学图像分割, UNETR变体
  - 总结: 原文在引言中将其归入高度专用化架构，在方法讨论中将其作为 Swin Transformer 用于医学分割的代表作。

- [21] Ali Hatamizadeh, 2022
  - 标题: Unetr: Transformers for 3d medical image segmentation
  - 关键词: UNETR, ViT编码器, 3D医学分割
  - 总结: 原文引用 UNETR 作为 ViT 直接用于医学分割的代表作，同时也指出这类方法仍依赖重型卷积组件。

- [22] Yutong Xie, 2021
  - 标题: Cotr: Efficiently bridging cnn and transformer for 3d medical image segmentation
  - 关键词: CoTr, CNN-Transformer桥接, 3D医学分割
  - 总结: 原文将 CoTr 归入现有 ViT 医学分割方法之一，说明这类方法仍然依赖重型组件。

- [23] Yutong Xie, 2022
  - 标题: Unimiss: Universal medical self-supervised learning via breaking dimensionality barrier
  - 关键词: UniMiss, 自监督学习, 跨维度
  - 总结: 原文引用该工作作为现有医学分割方法的一部分，说明这类方法仍不如强 CNN 基线。

- [24] Jieneng Chen, 2021
  - 标题: Transunet: Transformers make strong encoders for medical image segmentation
  - 关键词: TransUNet, Transformer U-Net, 医学图像分割
  - 总结: 原文在 Related Work 中将其作为 ViT 用于医学分割的早期代表工作，说明 transformer 在分割中的应用历史。

- [25] Hong-Yu Zhou, 2021
  - 标题: nnformer: Interleaved transformer for volumetric segmentation
  - 关键词: nnFormer, 交叠Transformer, 体积分割
  - 总结: 原文将 nnFormer 归入现有 ViT 医学分割方法之一，说明这类设计仍落后于强 CNN 基线。

- [31] Guoping Xu, 2023
  - 标题: Levit-unet: Make faster encoders with transformer for medical image segmentation
  - 关键词: LeViT-UNet, 高效注意力, 医学分割
  - 总结: 原文在 Related Work 中将 LeViT-UNet 作为 ViT 医学分割的变体之一列出。

- [32] Yunhe Gao, 2021
  - 标题: Utnet: a hybrid transformer architecture for medical image segmentation
  - 关键词: UTNet, 混合Transformer, 多分辨率
  - 总结: 原文在 Related Work 中将 UTNet 作为现有 ViT 医学分割方法之一，说明这类方法仍落后于 CNN 基线。



##### Historical

- [11] Mathilde Caron, 2021
  - 标题: Emerging properties in self-supervised vision transformers
  - 关键词: 自监督学习, ViT, 表征学习
  - 总结: 原文引用该工作说明自监督 ViT 能产生可迁移表征这一技术背景。

- [12] Alec Radford, 2021
  - 标题: Learning transferable visual models from natural language supervision
  - 关键词: CLIP, 自然语言监督, 视觉表征
  - 总结: 原文引用该工作作为自监督/自然语言监督产生可迁移视觉表征的代表作。

- [18] Xiaohua Zhai, 2022
  - 标题: Scaling vision transformers
  - 关键词: ViT, 可扩展性, 大规模预训练
  - 总结: 原文引用该工作论证 ViT 在大规模预训练中的可扩展性优势，为采用 ViT 架构提供理论支撑。

- [28] Zongwei Zhou, 2021
  - 标题: Models genesis
  - 关键词: Models Genesis, 自监督, 医学图像
  - 总结: 原文在 Related Work 中将其作为医学图像自监督学习的开创性工作，追溯该领域的技术起点。



##### Contrast

- [16] Fabian Isensee, 2024
  - 标题: nnu-net revisited: A call for rigorous validation in 3d medical image segmentation
  - 关键词: nnU-Net, 严格验证, CNN基线
  - 总结: 原文引用该工作强调 CNN（特别是 nnU-Net）在 3D 医学分割中仍是强基线，为本文方法需要超越的目标。

- [17] Mohammed Baharoon, 2024
  - 标题: Evaluating general purpose vision foundation models for medical image analysis: An experimental study of dinov2 on radiology benchmarks
  - 关键词: DINOv2, 放射学基准, 域迁移
  - 总结: 原文引用该工作说明自然图像 SSL 特征直接迁移到医学分割的局限性，为本文进行域自适应预训练提供动机。

- [19] Haotian Zhang, 2023
  - 标题: Vit-adapter: Exploring efficient adaptation of vision transformers for dense predictions
  - 关键词: ViT-Adapter, 密集预测, 适配组件
  - 总结: 原文引用该工作说明 ViT 需要额外的适配器组件才能实现好的分割效果，暗示需要架构改进。

- [20] Bowen Cheng, 2022
  - 标题: Masked-attention mask transformer for universal image segmentation
  - 关键词: Mask2Former, 通用分割, 定制组件
  - 总结: 原文引用该工作进一步说明 ViT 需要额外的定制组件才能实现好的分割。


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


# Enhancing DETRs variants through improved content query and similar query aggregation (2024)

- Paper ref: 1:CGJBFE6C
- Title: Enhancing DETRs variants through improved content query and similar query aggregation
- Year: 2024

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-2 | 2022 | Qiang Chen; Xiaokang Chen; et al. | Group detr: Fast training convergence with decoupled one-to-many label assignment |
| ref-3 | 2023 | Fangyi Chen; Han Zhang; et al. | Enhanced training of query-based object detection via selective query recollection |
| ref-4 | 2021 | Xiyang Dai; Yinpeng Chen; et al. | Dynamic detr: End-to-end object detection with dynamic attention |
| ref-5 | 2021 | Xiyang Dai; Yinpeng Chen; et al. | Dynamic detr: End-to-end object detection with dynamic attention |
| ref-6 | 2014 | Ross Girshick; Jeff Donahue; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-7 | 2015 | Ross Girshick | Fast r-cnn |
| ref-8 | 2015 | Kaiming He; X | Zhang, Shaoqing Ren, and Jian Sun |
| ref-9 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask r-cnn |
| ref-10 | 2017 | Jan Hendrik Hosang; Rodrigo Benenson; et al. | Learning non-maximum suppression |
| ref-11 | 2018 | Jie Hu; Li Shen; et al. | Squeezeand-excitation networks |
| ref-12 | 2022 | Ding Jia; Yuhui Yuan; et al. | Detrs with hybrid matching |
| ref-13 | 2011 | James M | Joyce |
| ref-14 | 2022 | Feng Li; Hao Zhang; et al. | Ni, and Lei Zhang |
| ref-15 | 2022 | Feng Li; Hao Zhang; et al. | Mask dino: Towards a unified transformer-based framework for object detection and segmentation |
| ref-16 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C |
| ref-17 | 2017 | Tsung-Yi Lin; Piotr Dollar; et al. | Gir- ´ shick, Kaiming He, Bharath Hariharan, and Serge J |
| ref-18 | 2019 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object ´ detection |
| ref-19 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Ssd: Single shot multibox detector |
| ref-20 | 2021 | Ze Liu; Yutong Lin; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-21 | 2022 | Shilong Liu; Feng Li; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr |
| ref-22 | 2022 | Yang Liu; Yao Zhang; et al. | Sap-detr: Bridging the gap between salient points and queries-based transformer detector for fast model convergency |
| ref-23 | 2023 | Siyi Liu; Tianhe Ren; et al. | Detection transformer with stable matching |
| ref-24 | 2017 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-25 | 2023 | Tian Qiu; Linyun Zhou; et al. | Team detr: Guide queries as a professional team in detection transformers |
| ref-26 | 2018 | Joseph Redmon; Ali Farhadi | Yolov3: An incrementalimprovement |
| ref-27 | 2016 | Joseph Redmon; Santosh Divvala; et al. | You only look once: Unified, real-time object detection |
| ref-28 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-29 | 2019 | Seyed Hamid Rezatofighi; Nathan Tsoi; et al. | Reid, and Silvio Savarese |
| ref-30 | 2022 | Byungseok Roh; JaeWoong Shin; et al. | Sparse detr: Efficient end-to-end object detection with learnable sparsity |
| ref-31 | 2014 | Olga Russakovsky; Jia Deng; et al. | Bernstein, Alexander C |
| ref-32 | 2020 | Zhiqing Sun; Shengcao Cao; et al. | Rethinking transformer-based set prediction for object detection |
| ref-33 | 2019 | Zhi Tian; Chunhua Shen; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-34 | 2021 | Tao Wang; Li Yuan; et al. | Pnp-detr: Towards efficient visual analysis with transformers |
| ref-35 | 2021 | Yingming Wang; Xiangyu Zhang; et al. | Anchor detr: Query design for transformer-based detector |
| ref-36 | 2022 | Gongjie Zhang; Zhipeng Luo; et al. | Accelerating detr convergence via semantic-aligned matching |
| ref-37 | 2023 | Hao Zhang; Feng Li; et al. | Ni, and HeungYeung Shum |
| ref-38 | 2023 | Kaikai Zhao; Norimichi Ukita | Ks-detr: Knowledge sharing in attention learning for detection transformer |
| ref-39 | 2021 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-40 | 2022 | Zhuofan Zong; Guanglu Song; et al. | Detrs with collaborative hybrid assignments training |
| ref-41 | 2023 | Zhuofan Zong; Guanglu Song; et al. | Detrs with collaborative hybrid assignments training |

## Citation Analysis Report

#### 按功能归类
- Background:
  - (Ding Jia, 2022) Detrs with hybrid matching：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Siyi Liu, 2023) Detection transformer with stable matching：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Tian Qiu, 2023) Team detr: Guide queries as a professional team in detection transformers：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Byungseok Roh, 2022) Sparse detr: Efficient end-to-end object detection with learnable sparsity：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Zhiqing Sun, 2020) Rethinking transformer-based set prediction for object detection：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Tao Wang, 2021) Pnp-detr: Towards efficient visual analysis with transformers：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Gongjie Zhang, 2022) Accelerating detr convergence via semantic-aligned matching：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Kaikai Zhao, 2023) Ks-detr: Knowledge sharing in attention learning for detection transformer：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
  - (Zhuofan Zong, 2023) Detrs with collaborative hybrid assignments training：作为 DETR 及其变体/训练策略的相关工作引用，用于定位本文方法的差异与互补性。
- Baseline:
  - (Nicolas Carion, 2020) End-to-end object detection with transformers：作为 DETR 原始工作，本文以其“查询驱动集合预测”框架为出发点，指出内容查询初始化缺乏先验的问题。
  - (Feng Li, 2022) Mask dino: Towards a unified transformer-based framework for object detection and segmentation：作为加速收敛/改进匹配的 DETR 系列方法背景，用于说明现有工作多聚焦位置查询或匹配策略。
- Historical:
  - (Ross Girshick, 2015) Fast r-cnn：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
  - (Kaiming He, 2017) Mask r-cnn：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
  - (Jan Hendrik Hosang, 2017) Learning non-maximum suppression：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
  - (Wei Liu, 2016) Ssd: Single shot multibox detector：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
  - (Joseph Redmon, 2016) You only look once: Unified, real-time object detection：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
  - (Shaoqing Ren, 2015) Faster r-cnn: Towards real-time object detection with region proposal networks：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
  - (Zhi Tian, 2019) Fcos: Fully convolutional one-stage object detection：用于概述 DETR 之前主流检测范式（两阶段/一阶段、NMS 等）并作为背景对照。
- Other:
  - (Fangyi Chen, 2023) Enhanced training of query-based object detection via selective query recollection：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。
  - (Ross Girshick, 2014) Rich feature hierarchies for accurate object detection and semantic segmentation：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。
  - (James M, 2011) Joyce：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。
  - (Feng Li, 2022) Ni, and Lei Zhang：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。
  - (Tsung-Yi Lin, 2017) Gir- ´ shick, Kaiming He, Bharath Hariharan, and Serge J：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。
  - (Joseph Redmon, 2018) Yolov3: An incrementalimprovement：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。
  - (Hao Zhang, 2023) Ni, and HeungYeung Shum：作为相关工作引用，帮助界定本文提出的内容查询优化与匹配改进问题背景。


# PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation (2020)

- Paper ref: 1:CHPBJDLU
- Title: PolarNet: An Improved Grid Representation for Online LiDAR Point Clouds Semantic Segmentation
- Year: 2020

## Compact References

_No references artifact rows available._

## Citation Analysis Report

_No citation analysis report available._


# DETRs with Hybrid Matching (2023)

- Paper ref: 1:D6BUKS9Q
- Title: DETRs with Hybrid Matching
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2022 | Xuyang Bai; Zeyu Hu; et al. | Transfusion: Robust lidar-camera fusion for 3d object detection with transformers |
| ref-2 | 2021 | Guillem Braso; Nikita Kister; et al. | The ´ center of attention: Center-keypoint grouping via attention for multi-person pose estimation |
| ref-3 | 2020 | Holger Caesar; Varun Bankiti; et al. | nuscenes: A multimodal dataset for autonomous driving |
| ref-4 | 2022 | Xipeng Cao; Peng Yuan; et al. | Cf-detr: Coarse-to-fine transformers for end-to-end object detection |
| ref-5 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-toend object detection with transformers |
| ref-6 | 2022 | Qiang Chen; Xiaokang Chen; et al. | Group detr: Fast training convergence with decoupled one-to-many label assignment |
| ref-7 | 2021 | Xin Chen; Bin Yan; et al. | Transformer tracking |
| ref-8 | 2021 | Bowen Cheng; Anwesa Choudhuri; et al. | Mask2former for video instance segmentation |
| ref-9 | 2021 | Bowen Cheng; Ishan Misra; et al. | Maskedattention mask transformer for universal image segmentation |
| ref-10 | 2017 | Angela Dai; Angel X Chang; et al. | Scannet: Richly-annotated 3d reconstructions of indoor scenes |
| ref-11 | 2021 | Xiyang Dai; Yinpeng Chen; et al. | Dynamic detr: End-toend object detection with dynamic attention |
| ref-12 | 2022 | Tri Dao; Daniel Y | Fu, Stefano Ermon, Atri Rudra, and Christopher Re. FlashAttention: Fast and memory-efficient ´ exact attention with IO-awareness |
| ref-13 | 2021 | Bin Dong; Fangao Zeng; et al. | Solq: Segmenting objects by learning queries. NeurIPS |
| ref-14 | 2021 | Yuxin Fang; Shusheng Yang; et al. | Instances as queries |
| ref-15 | 2021 | Peng Gao; Minghang Zheng; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-16 | 2022 | Ziteng Gao; Limin Wang; et al. | Adamixer: A fast-converging query-based object detector |
| ref-17 | 2015 | Ross Girshick | Fast r-cnn |
| ref-18 | 2021 | Brent A Griffin; Jason J Corso | Depth from camera motion and object detection |
| ref-19 | 2019 | Agrim Gupta; Piotr Dollar; et al. | Lvis: A dataset for large vocabulary instance segmentation |
| ref-20 | 2022 | Junjie Huang; Guan Huang | Bevdet4d: Exploit temporal cues in multi-camera 3d object detection |
| ref-21 | 2021 | Junjie Huang; Guan Huang; et al. | Bevdet: High-performance multi-camera 3d object detection in bird-eye-view |
| ref-22 | 2021 | Aishwarya Kamath; Mannat Singh; et al. | Mdetrmodulated detection for end-to-end multi-modal understanding |
| ref-23 | 2020 | Youngwan Lee; Jongyoul Park | Centermask: Real-time anchor-free instance segmentation |
| ref-24 | 2022 | Feng Li; Hao Zhang; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-25 | 2022 | Feng Li; Hao Zhang; et al. | Mask dino: Towards a unified transformer-based framework for object detection and segmentation |
| ref-26 | 2021 | Ke Li; Shijie Wang; et al. | Pose recognition with cascade transformers |
| ref-27 | 2021 | Yanghao Li; Chao-Yuan Wu; et al. | Improved multiscale vision transformers for classification and detection |
| ref-28 | 2021 | Yanjie Li; Shoukui Zhang; et al. | Tokenpose: Learning keypoint tokens for human pose estimation |
| ref-29 | 2022 | Zhenyu Li; Zehui Chen; et al. | Depthformer: Exploiting long-range correlation and local information for accurate monocular depth estimation |
| ref-30 | 2022 | Zhiqi Li; Wenhai Wang; et al. | Bevformer: Learning bird’s-eye-view representation from multi-camera images via spatiotemporal transformers |
| ref-31 | 2022 | Zhiqi Li; Wenhai Wang; et al. | Panoptic segformer: Delving deeper into panoptic segmentation with transformers |
| ref-32 | 2022 | Zhenyu Li; Xuyang Wang; et al. | Binsformer: Revisiting adaptive bins for monocular depth estimation |
| ref-33 | 2022 | Tingting Liang; Xiaojie Chu; et al. | Cbnet: A composite backbone network architecture for object detection. TIP |
| ref-34 | 2022 | Tingting Liang; Hongwei Xie; et al. | Bevfusion: A simple and robust lidar-camera fusion framework |
| ref-35 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-36 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft coco: Common objects in context |
| ref-37 | 2022 | Shilong Liu; Feng Li; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr |
| ref-38 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Ssd: Single shot multibox detector |
| ref-39 | 2022 | Yingfei Liu; Tiancai Wang; et al. | Petr: Position embedding transformation for multi-view 3d object detection |
| ref-40 | 2022 | Yingfei Liu; Junjie Yan; et al. | Petrv2: A unified framework for 3d perception from multi-camera images |
| ref-41 | 2022 | Ze Liu; Han Hu; et al. | Swin transformer v2: Scaling up capacity and resolution |
| ref-42 | 2021 | Ze Liu; Yutong Lin; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-43 | 2022 | Zhuang Liu; Hanzi Mao; et al. | A convnet for the 2020s |
| ref-44 | 2022 | Zhijian Liu; Haotian Tang; et al. | Bevfusion: Multitask multi-sensor fusion with unified bird’s-eye view representation |
| ref-45 | 2021 | Ze Liu; Zheng Zhang; et al. | Group-free 3d object detection via transformers |
| ref-46 | 2022 | Shangbang Long; Siyang Qin; et al. | Towards endto-end unified scene text detection and layout analysis |
| ref-47 | 2022 | Qian Lou; Yen-Chang Hsu; et al. | Lite-mdetr: A lightweight multimodal detector |
| ref-48 | 2021 | Weian Mao; Yongtao Ge; et al. | Tfpose: Direct human pose estimation with transformers |
| ref-49 | 2022 | Tim Meinhardt; Alexander Kirillov; et al. | Trackformer: Multi-object tracking with transformers |
| ref-50 | 2021 | Depu Meng; Xiaokang Chen; et al. | Conditional detr for fast training convergence |
| ref-51 | 2016 | Anton Milan; Laura Leal-Taixe; et al. | Mot16: A benchmark for multi-object tracking |
| ref-52 | 2021 | Ishan Misra; Rohit Girdhar; et al. | An endto-end transformer model for 3d object detection |
| ref-53 | 2006 | Alexander Neubeck; Luc Van Gool | Efficient nonmaximum suppression |
| ref-54 | 2021 | Kemal Oksuz; Baris Can Cam; et al. | One metric to measure them all: Localisation recall precision (lrp) for evaluating visual detection tasks. TPAMI |
| ref-55 | 2021 | Zobeir Raisi; Mohamed A Naiel; et al. | Transformer-based text detection in the wild |
| ref-56 | 2022 | Zobeir Raisi; Georges Younes; et al. | Arbitrary shape text detection using transformers |
| ref-57 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks. NeurIPS |
| ref-58 | 2021 | Byungseok Roh; JaeWoong Shin; et al. | Sparse detr: Efficient end-to-end object detection with learnable sparsity |
| ref-59 | 2022 | Dahu Shi; Xing Wei; et al. | End-to-end multi-person pose estimation with transformers |
| ref-60 | 2021 | Lucas Stoffl; Maxime Vidal; et al. | End-toend trainable multi-instance pose estimation with transformers |
| ref-61 | 2020 | Peize Sun; Jinkun Cao; et al. | Transtrack: Multiple object tracking with transformer |
| ref-62 | 2019 | Zhi Tian; Chunhua Shen; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-63 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-64 | 2021 | Huiyu Wang; Yukun Zhu; et al. | Max-deeplab: End-to-end panoptic segmentation with mask transformers |
| ref-65 | 2021 | Jianfeng Wang; Lin Song; et al. | End-to-end object detection with fully convolutional network |
| ref-66 | 2022 | Wen Wang; Jing Zhang; et al. | Towards data-efficient detection transformers |
| ref-67 | 2022 | Yue Wang; Vitor Campagnolo Guizilini; et al. | Detr3d: 3d object detection from multi-view images via 3d-to-2d queries |
| ref-68 | 2021 | Yingming Wang; Xiangyu Zhang; et al. | Anchor detr: Query design for transformer-based detector |
| ref-69 | 2022 | Jiannan Wu; Yi Jiang; et al. | Language as queries for referring video object segmentation |
| ref-70 | 2021 | Junfeng Wu; Yi Jiang; et al. | Seqformer: a frustratingly simple model for video instance segmentation |
| ref-71 | 2021 | Yifan Xu; Weijian Xu; et al. | Line segment detection using transformers without edges |
| ref-72 | 2021 | Bin Yan; Houwen Peng; et al. | Learning spatio-temporal transformer for visual tracking |
| ref-73 | 2022 | Chenglin Yang; Siyuan Qiao; et al. | Moat: Alternating mobile convolution and attention brings strong vision models |
| ref-74 | 2022 | Zhao Yang; Jiaqi Wang; et al. | Lavt: Language-aware vision transformer for referring image segmentation |
| ref-75 | 2022 | Qihang Yu; Huiyu Wang; et al. | Cmt-deeplab: Clustering mask transformers for panoptic segmentation |
| ref-76 | 2022 | Qihang Yu; Huiyu Wang; et al. | Cmt-deeplab: Clustering mask transformers for panoptic segmentation |
| ref-77 | 2022 | Qihang Yu; Huiyu Wang; et al. | k-means mask transformer |
| ref-78 | 2021 | Xiaodong Yu; Dahu Shi; et al. | Soit: Segmenting objects with instance-aware transformers |
| ref-79 | 2020 | Yuhui Yuan; Xilin Chen; et al. | Objectcontextual representations for semantic segmentation |
| ref-80 | 2021 | Fangao Zeng; Bin Dong; et al. | Motr: End-to-end multiple-object tracking with transformer |
| ref-81 | 2022 | Gongjie Zhang; Zhipeng Luo; et al. | Accelerating DETR convergence via semantic-aligned matching |
| ref-82 | 2022 | Hao Zhang; Feng Li; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-83 | 2021 | Jianfeng Zhang; Yujun Cai; et al. | Direct multi-view multi-person 3d pose estimation. NeurIPS |
| ref-84 | 2020 | Shifeng Zhang; Cheng Chi; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-85 | 2022 | Xiang Zhang; Yongwen Su; et al. | Text spotting transformers |
| ref-86 | 2021 | Moju Zhao; Kei Okada; et al. | Trtr: Visual tracking with transformer |
| ref-87 | 2022 | Xingyi Zhou; Rohit Girdhar; et al. | Detecting twenty-thousand ¨ classes using image-level supervision |
| ref-88 | 2020 | Benjin Zhu; Jianfeng Wang; et al. | Autoassign: Differentiable label assignment for dense object detection |
| ref-89 | 2020 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

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


# Group DETR: Fast DETR Training with Group-Wise One-to-Many Assignment (2023)

- Paper ref: 1:DBYQ4LWE
- Title: Group DETR: Fast DETR Training with Group-Wise One-to-Many Assignment
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Holger Caesar; Varun Bankiti; et al. | nuScenes: A multimodal dataset for autonomous driving |
| ref-2 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-3 | 2021 | Qiang Chen; Yingming Wang; et al. | You only look one-level feature |
| ref-4 | 2022 | Xiaokang Chen; Fangyun Wei; et al. | Conditional detr v2: Efficient detection transformer with box queries |
| ref-5 | 2021 | Bowen Cheng; Ishan Misra; et al. | Masked-attention mask transformer for universal image segmentation |
| ref-6 | 2022 | Tri Dao; Daniel Y Fu; et al. | Flashattention: Fast and memory-efficient exact attention with io-awareness |
| ref-7 | 2021 | Alexey Dosovitskiy; Lucas Beyer; et al. | An image is worth 16x16 words: Transformers for image recognition at scale |
| ref-8 | 2021 | Peng Gao; Minghang Zheng; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-9 | 2022 | Ziteng Gao; Limin Wang; et al. | Adamixer: A fast-converging query-based object detector |
| ref-10 | 2021 | Zheng Ge; Songtao Liu; et al. | OTA: Optimal transport assignment for object detection |
| ref-11 | 2021 | Zheng Ge; Songtao Liu; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-12 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask R-CNN |
| ref-13 | 2016 | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-14 | 2017 | J Hosang; R Benenson; et al. | Learning non-maximum suppression |
| ref-15 | 2021 | Junjie Huang; Guan Huang; et al. | Bevdet: High-performance multi-camera 3d object detection in bird-eye-view |
| ref-16 | 2022 | Ding Jia; Yuhui Yuan; et al. | Detrs with hybrid matching |
| ref-17 | 2020 | Kang Kim; Hee Seok Lee | Probabilistic anchor assignment with iou prediction for object detection |
| ref-18 | 2020 | Youngwan Lee; Jongyoul Park | Centermask: Real-time anchor-free instance segmentation |
| ref-19 | 2022 | Benjamin Lefaudeux; Francisco Massa; et al. | xformers: A modular and hackable transformer modelling library |
| ref-20 | 2022 | Feng Li; Hao Zhang; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-21 | 2022 | Feng Li; Hao Zhang; et al. | Mask dino: Towards a unified transformer-based framework for object detection and segmentation |
| ref-22 | 2022 | Zhiqi Li; Wenhai Wang; et al. | Bevformer: Learning bird's-eye-view representation from multi-camera images via spatiotemporal transformers |
| ref-23 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-24 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft COCO: Common objects in context |
| ref-25 | 2022 | Shilong Liu; Feng Li; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr |
| ref-26 | 2022 | Yingfei Liu; Tiancai Wang; et al. | Petr: Position embedding transformation for multi-view 3d object detection |
| ref-27 | 2022 | Yingfei Liu; Junjie Yan; et al. | Petrv2: A unified framework for 3d perception from multi-camera images |
| ref-28 | 2022 | Ze Liu; Han Hu; et al. | Swin transformer v2: Scaling up capacity and resolution |
| ref-29 | 2021 | Ze Liu; Yutong Lin; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-30 | 2021 | Depu Meng; Xiaokang Chen; et al. | Conditional detr for fast training convergence |
| ref-31 | 2022 | Jeffrey Ouyang-Zhang; Jang Hyun Cho; et al. | Nms strikes back |
| ref-32 | 2018 | Joseph Redmon; Ali Farhadi | Yolov3: An incremental improvement |
| ref-33 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-34 | 2019 | Shuai Shao; Zeming Li; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-35 | 2021 | Peize Sun; Yi Jiang; et al. | What makes for end-to-end object detection? |
| ref-36 | 2019 | Zhi Tian; Chunhua Shen; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-37 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-38 | 2021 | Jianfeng Wang; Lin Song; et al. | End-to-end object detection with fully convolutional network |
| ref-39 | 2022 | Wenhui Wang; Hangbo Bao; et al. | Image as a foreign language: Beit pretraining for all vision and vision-language tasks |
| ref-40 | 2022 | Yingming Wang; Xiangyu Zhang; et al. | Anchor detr: Query design for transformer-based detector |
| ref-41 | 2022 | Yixuan Wei; Han Hu; et al. | Contrastive learning rivals masked image modeling in fine-tuning via feature distillation |
| ref-42 | 2022 | Jianwei Yang; Chunyuan Li; et al. | Focal modulation networks |
| ref-43 | 2021 | Zhuyu Yao; Jiangbo Ai; et al. | Efficient detr: Improving end-to-end object detector with dense prior |
| ref-44 | 2022 | Hao Zhang; Feng Li; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-45 | 2020 | Shifeng Zhang; Cheng Chi; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-46 | 2020 | Benjin Zhu; Jianfeng Wang; et al. | Autoassign: Differentiable label assignment for dense object detection |
| ref-47 | 2020 | Xizhou Zhu; Weijie Su; et al. | Deformable DETR: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 按功能归类

**Background（背景方法）**:
- DETR [2]: 端到端检测 Transformer 基础方法，采用一对一分派和二分匹配
- Transformer [37]: 自注意力机制基础架构
- ResNet [13]: CNN 骨干网络基础
- SMCA [8]: 空间调制加速 DETR 收敛

**Baseline（实验基线）**:
- Faster R-CNN [33]: 一对多分配在传统检测中的成功代表
- FCOS [36]: 无锚框一对多检测方法
- Deformable DETR [47]: 可变形注意力稀疏采样
- Conditional DETR [30]: 空间注意力软选择，本文主要基线
- DAB-DETR [25]: 动态锚框查询设计
- DINO [44]: 最强 DETR 变体，对比去噪训练

**Contrast（对比/并发工作）**:
- DN-DETR [20]: 去噪查询稳定分配，与本文正交互补
- H-DETR [16]: 并发工作，混合分配策略，推理需 NMS
- DETA [31]: 并发工作，一对多分配+NMS

**Dataset（数据集）**:
- COCO [24]: 主要评估基准

**Tooling（工具）**:
- FlashAttention [6]: 高效注意力实现

#### 按引用编号列举

- [2] DETR：本文研究的基础框架，首次实现端到端检测无需 NMS
- [6] FlashAttention：用于优化并行解码器效率
- [8] SMCA：修改交叉注意力加速收敛的代表工作
- [13] ResNet：骨干网络基础
- [16] H-DETR：并发工作，采用混合分配但推理需 NMS
- [20] DN-DETR：通过去噪查询稳定分配，与本文方法互补
- [24] COCO：实验评估数据集
- [25] DAB-DETR：动态锚框查询，本文基线之一
- [30] Conditional DETR：主要基线，本文提升 5.0 mAP
- [31] DETA：并发工作，引入 NMS 回 DETR
- [33] Faster R-CNN：一对多分配在传统检测中的成功案例
- [36] FCOS：无锚框一对多检测
- [37] Transformer：注意力机制基础
- [44] DINO：最强基线，本文仍提升 0.7 mAP
- [47] Deformable DETR：可变形注意力加速训练


# Panoptic-PolarNet: Proposal-free LiDAR Point Cloud Panoptic Segmentation (2021)

- Paper ref: 1:DDT5Q9QF
- Title: Panoptic-PolarNet: Proposal-free LiDAR Point Cloud Panoptic Segmentation
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | Jens Behley; Martin Garbade; et al. | SemanticKITTI: A dataset for semantic scene understanding of lidar sequences |
| ref-2 | 2020 | Jens Behley; Andres Milioto; et al. | A Benchmark for LiDAR-based Panoptic Segmentation based on KITTI |
| ref-3 | 2018 | Maxim Berman; Amal Rannen Triki; et al. | The Lovasz-Softmax loss: A tractable surrogate´ for the optimization of the intersection-over-union measure in neural networks |
| ref-4 | 2020 | Alexey Bochkovskiy; Chien-Yao Wang; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-5 | 2020 | Holger Caesar; Varun Bankiti; et al. | nuscenes: A multimodal dataset for autonomous driving |
| ref-6 | 2020 | Yifeng Chen; Guangchen Lin; et al. | Banet: Bidirectional aggregation network with occlusion handling for panoptic segmentation |
| ref-7 | 2020 | Bowen Cheng; Maxwell D Collins; et al. | Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation |
| ref-8 | 2020 | Tiago Cortinhal; George Tzelepis; et al. | Salsanext: Fast, uncertainty-aware semantic segmentation of lidar point clouds for autonomous driving |
| ref-9 | 2017 | Bert De Brabandere; Davy Neven; et al. | Semantic instance segmentation with a discriminative loss function |
| ref-10 | 2019 | Naiyu Gao; Yanhu Shan; et al. | Ssap: Single-shot instance segmentation with affinity pyramid |
| ref-11 | 2020 | Stefano Gasperini; Mohammad-Ali Nikouei Mahani; et al. | Panoster: End-to-end panoptic segmentation of lidar point clouds |
| ref-12 | 2012 | Andreas Geiger; Philip Lenz; et al. | Are we ready for autonomous driving? The KITTI vision benchmark suite |
| ref-13 | 2020 | Jakob Geyer; Yohannes Kassahun; et al. | A2d2: Audi autonomous driving dataset |
| ref-14 | 2018 | Golnaz Ghiasi; Tsung-Yi Lin; et al. | Dropblock: A regularization method for convolutional networks |
| ref-15 | 2020 | Martin Hahner; Dengxin Dai; et al. | Quantifying data augmentation for lidar based 3d object detection |
| ref-16 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask r-cnn |
| ref-17 | 2020 | Peiyun Hu; Jason Ziglar; et al. | What you see is what you get: Exploiting visibility for 3d object detection |
| ref-18 | 2020 | Qingyong Hu; Bo Yang; et al. | RandLA-Net: Efficient semantic segmentation of large-scale point clouds |
| ref-19 | 2020 | Juana Valeria Hurtado; Rohit Mohan; et al. | Mopt: Multi-object panoptic tracking |
| ref-20 | 2019 | Alexander Kirillov; Kaiming He; et al. | Panoptic segmentation |
| ref-21 | 2020 | Deyvid Kochanov; Fatemeh Karimi Nejadasl; et al. | Kprnet: Improving projection-based lidar semantic segmentation |
| ref-22 | 2019 | Jean Lahoud; Bernard Ghanem; et al. | 3d instance segmentation via multi-task metric learning |
| ref-23 | 2019 | Alex H Lang; Sourabh Vora; et al. | PointPillars: Fast encoders for object detection from point clouds |
| ref-24 | 2019 | Yanwei Li; Xinze Chen; et al. | Attention-guided unified network for panoptic segmentation |
| ref-25 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-26 | 2019 | Huanyu Liu; Chao Peng; et al. | An end-to-end network for panoptic segmentation |
| ref-27 | 2020 | Jinxian Liu; Minghui Yu; et al. | Selfprediction for joint instance and semantic segmentation of point clouds |
| ref-28 | 2015 | Jonathan Long; Evan Shelhamer; et al. | Fully convolutional networks for semantic segmentation |
| ref-29 | 2020 | Andres Milioto; Jens Behley; et al. | Lidar panoptic segmentation for autonomous driving |
| ref-30 | 2019 | Andres Milioto and C Stachniss | RangeNet++: Fast and accurate LiDAR semantic segmentation |
| ref-31 | 2020 | Rohit Mohan and Abhinav Valada | Efficientps: Efficient panoptic segmentation |
| ref-32 | 2019 | Pavlo Molchanov; Arun Mallya; et al. | Importance estimation for neural network pruning |
| ref-33 |  | Quang-Hieu Pham; Thanh Nguyen; et al. | joint semantic-instance |
| ref-34 | 2019 | segmentation of 3d point clouds with multi-task pointwise networks and multi-value conditional random fields | In CVPR, 2019 |
| ref-35 | 2019 | Lorenzo Porzi; Samuel Rota Bulo; et al. | Seamless scene segmentation |
| ref-36 | 2019 | Charles R Qi; Or Litany; et al. | Deep hough voting for 3d object detection in point clouds |
| ref-37 | 2018 | Charles R Qi; Wei Liu; et al. | Frustum pointnets for 3d object detection from rgb-d data |
| ref-38 | 2017 | Charles R Qi; Hao Su; et al. | Pointnet: Deep learning on point sets for 3d classification and segmentation |
| ref-39 | 2017 | Charles Ruizhongtai Qi; Li Yi; et al. | Pointnet++: Deep hierarchical feature learning on point sets in a metric space |
| ref-40 | 2015 | Olaf Ronneberger; Philipp Fischer; et al. | U-net: Convolutional networks for biomedical image segmentation |
| ref-41 | 2020 | Shaoshuai Shi; Chaoxu Guo; et al. | Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection |
| ref-42 | 2019 | Shaoshuai Shi; Xiaogang Wang; et al. | Pointrcnn: 3d object progposal generation and detection from point cloud |
| ref-43 | 2020 | Pei Sun; Henrik Kretzschmar; et al. | Scalability in perception for autonomous driving: Waymo open dataset |
| ref-44 | 2020 | Haotian Tang; Zhijian Liu; et al. | Searching efficient 3d architectures with sparse point-voxel convolution |
| ref-45 | 2020 | OpenPCDet Development Team | Openpcdet: An opensource toolbox for 3d object detection from point clouds |
| ref-46 | 2019 | Hugues Thomas; Charles R | Qi, Jean-Emmanuel Deschaud, Beatriz Marcotegui, Franc¸ois Goulette, and Leonidas J |
| ref-47 | 2019 | Xinlong Wang; Shu Liu; et al. | Associatively segmenting instances and semantics in point clouds |
| ref-48 | 2019 | Yan Wang; Wei-Lun Chao; et al. | Pseudo-lidar from visual depth estimation: Bridging the gap in 3d object detection for autonomous driving |
| ref-49 | 2018 | Bichen Wu; Alvin Wan; et al. | Squeezeseg: Convolutional neural nets with recurrent crf for real-time road-object segmentation from 3d lidar point cloud |
| ref-50 | 2019 | Bichen Wu; Xuanyu Zhou; et al. | Squeezesegv2: Improved model structure and unsupervised domain adaptation for road-object segmentation from a lidar point cloud |
| ref-51 | 2020 | Yangxin Wu; Gengwei Zhang; et al. | Bidirectional graph reasoning network for panoptic segmentation |
| ref-52 | 2019 | Yuwen Xiong; Renjie Liao; et al. | Upsnet: A unified panoptic segmentation network |
| ref-53 | 2018 | Yan Yan; Yuxing Mao; et al. | Second: Sparsely embedded convolutional detection |
| ref-54 | 2018 | Bin Yang; Wenjie Luo; et al. | Pixor: Realtime 3d object detection from point clouds |
| ref-55 | 2019 | Tien-Ju Yang; Maxwell D Collins; et al. | Deeperlab: Single-shot image parser |
| ref-56 | 2020 | Tianwei Yin; Xingyi Zhou; et al. | Center- ¨ based 3d object detection and tracking |
| ref-57 | 2020 | Yang Zhang; Zixiang Zhou; et al. | Polarnet: An improved grid representation for online lidar point clouds semantic segmentation |
| ref-58 | 2020 | Dingfu Zhou; Jin Fang; et al. | Joint 3d instance segmentation and object detection for autonomous driving |
| ref-59 | 2020 | Yin Zhou; Pei Sun; et al. | End-to-end multi-view fusion for 3d object detection in lidar point clouds |
| ref-60 | 2018 | Yin Zhou and Oncel Tuzel | Voxelnet: End-to-end learning for point cloud based 3d object detection |
| ref-61 | 2019 | Benjin Zhu; Zhengkai Jiang; et al. | Class-balanced grouping and sampling for point cloud 3d object detection |

## Citation Analysis Report

#### 总体总结
本文在引言与相关工作中组织了一条清晰的研究叙事：首先确立全景分割问题的定义和LiDAR数据集的可用性，然后平行比较2D图像全景分割的proposal-based与proposal-free两条路线，接着梳理LiDAR点云处理的多种表示方式（点级、体素化、BEV、距离图像），最后将现有LiDAR全景分割方法归纳为距离图像、点级别和室内场景三类，引出本文在极坐标BEV上实现proposal-free全景分割的技术路线。


#### 关键文献

- [20] Alexander Kirillov, 2019: Panoptic segmentation (Historical)

- [55] Tianwei Yin, 2020: Center- ¨ based 3d object detection and tracking (Component)

- [7] Bowen Cheng, 2020: Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation (Component)

- [16] Kaiming He, 2017: Mask r-cnn (Component)

- [37] Charles R Qi, 2017: Pointnet: Deep learning on point sets for 3d classification and segmentation (Component)



#### 范围
- 章节: Introduction + Related Work + Discussion
- 行号: 13-58

#### 按功能归类


##### Dataset

- [1] Jens Behley, 2019
  - 标题: SemanticKITTI: A dataset for semantic scene understanding of lidar sequences
  - 关键词: SemanticKITTI, benchmark, dataset
  - 总结: 在Figure 1中引用SemanticKITTI作为评估数据集，展示各方法在该数据集上的PQ与推理延迟对比。

- [2] Jens Behley, 2020
  - 标题: A Benchmark for LiDAR-based Panoptic Segmentation based on KITTI
  - 关键词: benchmark, KITTI, panoptic, LiDAR dataset
  - 总结: 在引言中引用该工作作为引入LiDAR全景分割问题的数据集基准，在相关工作2.3中再次引用，说明其是第一个LiDAR全景分割数据集。

- [5] Holger Caesar, 2020
  - 标题: nuscenes: A multimodal dataset for autonomous driving
  - 关键词: nuScenes, multimodal, autonomous driving, dataset
  - 总结: 在引言中引用nuScenes作为提供语义和物体标注的LiDAR数据集之一，支撑将全景分割问题扩展到3D扫描数据的动机。

- [13] Jakob Geyer, 2020
  - 标题: A2d2: Audi autonomous driving dataset
  - 关键词: A2d2, Audi, dataset, autonomous driving
  - 总结: 在引言中引用A2d2作为提供语义和物体标注的LiDAR数据集之一，支撑将全景分割问题扩展到3D扫描数据的动机。



##### Background

- [6] Yifeng Chen, 2020
  - 标题: Banet: Bidirectional aggregation network with occlusion handling for panoptic segmentation
  - 关键词: attention module, panoptic segmentation, 2D
  - 总结: 在相关工作2.1中引用该工作作为近期专注于设计注意力模块桥接语义和实例学习的2D全景分割方法之一。

- [8] Tiago Cortinhal, 2020
  - 标题: Salsanext: Fast, uncertainty-aware semantic segmentation of lidar point clouds for autonomous driving
  - 关键词: SalsaNext, LiDAR, semantic segmentation, 2D convolution
  - 总结: 在相关工作2.2中引用该工作作为使用2D卷积在2D点投影上分割点云的方法之一。

- [10] Naiyu Gao, 2019
  - 标题: Ssap: Single-shot instance segmentation with affinity pyramid
  - 关键词: SSAP, graph partition, affinity, bottom-up
  - 总结: 在相关工作2.1中引用SSAP作为bottom-up实例分割方法之一，使用级联图划分方法。

- [18] Qingyong Hu, 2020
  - 标题: RandLA-Net: Efficient semantic segmentation of large-scale point clouds
  - 关键词: RandLA-Net, point cloud, semantic segmentation, large-scale
  - 总结: 在相关工作2.2中引用RandLA-Net作为直接在点云上操作的语义分割方法之一，使用核点卷积和局部特征聚合模块。

- [19] Juana Valeria Hurtado, 2020
  - 标题: Mopt: Multi-object panoptic tracking
  - 关键词: MOPT, range image, panoptic tracking
  - 总结: 在相关工作2.3中引用MOPT作为在距离图像上生成全景分割的LiDAR全景分割方法之一。

- [21] Deyvid Kochanov, 2020
  - 标题: Kprnet: Improving projection-based lidar semantic segmentation
  - 关键词: KPRNet, KNN, projection-based, LiDAR segmentation
  - 总结: 在相关工作2.2中引用KPRNet作为引入额外KNN和对齐处理以从投影视图更好恢复原始点云标签的方法之一。

- [22] Jean Lahoud, 2019
  - 标题: 3d instance segmentation via multi-task metric learning
  - 关键词: indoor, instance segmentation, multi-task
  - 总结: 在相关工作2.3中引用该工作作为探索室内点云全景分割的现有研究之一。

- [24] Yanwei Li, 2019
  - 标题: Attention-guided unified network for panoptic segmentation
  - 关键词: attention, unified network, panoptic segmentation
  - 总结: 在相关工作2.1中引用该工作作为设计注意力引导的统一网络进行全景分割的近期研究之一。

- [26] Huanyu Liu, 2019
  - 标题: An end-to-end network for panoptic segmentation
  - 关键词: end-to-end, spatial ranking, panoptic segmentation
  - 总结: 在相关工作2.1中多次引用该工作，既作为端到端训练全景分割网络的方法，也作为提出空间排序模块解决重叠实例掩码的工作。

- [27] Jinxian Liu, 2020
  - 标题: Selfprediction for joint instance and semantic segmentation of point clouds
  - 关键词: joint segmentation, point cloud, region proposal
  - 总结: 在相关工作2.3中引用该工作作为从语义分割聚类的区域提议中提取实例分割的室内点云全景分割方法。

- [29] Andres Milioto, 2020
  - 标题: Lidar panoptic segmentation for autonomous driving
  - 关键词: LiDAR panoptic, range image, tri-linear upsampling
  - 总结: 在相关工作2.3中引用该工作作为在距离图像上解决LiDAR全景分割并通过三线性上采样恢复到点云级别的方法。

- [30] Andres Milioto and C Stachniss, 2019
  - 标题: RangeNet++: Fast and accurate LiDAR semantic segmentation
  - 关键词: RangeNet++, LiDAR, semantic segmentation, range image
  - 总结: 在相关工作2.2中引用RangeNet++作为使用2D卷积在2D点投影上分割点云的快速准确LiDAR语义分割方法。

- [31] Rohit Mohan and Abhinav Valada, 2020
  - 标题: Efficientps: Efficient panoptic segmentation
  - 关键词: EfficientPS, panoptic fusion, dynamic adaptation
  - 总结: 在相关工作2.1中引用EfficientPS作为提出全景融合模块根据置信度动态适配实例和语义头融合的方法。

- [33] joint semantic-instance
  - 标题: joint semantic-instance
  - 关键词: joint semantic-instance, indoor, pointwise network
  - 总结: 在相关工作2.3中引用该工作作为探索室内点云联合语义-实例分割的研究之一。

- [35] Charles R Qi, 2019
  - 标题: Deep hough voting for 3d object detection in point clouds
  - 关键词: Deep Hough Voting, 3D detection, vote clustering, proposal-free
  - 总结: 在相关工作2.2中引用该工作作为LiDAR目标检测中proposal-free方法之一，通过投票聚类直接预测目标。

- [36] Charles R Qi, 2018
  - 标题: Frustum pointnets for 3d object detection from rgb-d data
  - 关键词: Frustum PointNets, RGB-D, 3D detection
  - 总结: 在相关工作2.2中引用该工作作为使用投影空间进行3D目标检测的方法之一的背景引用。

- [38] Charles Ruizhongtai Qi, 2017
  - 标题: Pointnet++: Deep hierarchical feature learning on point sets in a metric space
  - 关键词: PointNet++, hierarchical, metric space
  - 总结: 在相关工作2.2中引用PointNet++作为在度量空间中点集上进行层次特征学习的代表性方法。

- [43] Haotian Tang, 2020
  - 标题: Searching efficient 3d architectures with sparse point-voxel convolution
  - 关键词: point-voxel convolution, architecture search, sparse
  - 总结: 在相关工作2.2中引用该工作作为探索高效3D架构搜索的方法之一。

- [45] Hugues Thomas, 2019
  - 标题: Qi, Jean-Emmanuel Deschaud, Beatriz Marcotegui, Franc¸ois Goulette, and Leonidas J
  - 关键词: joint segmentation, point cloud, instance semantics
  - 总结: 在相关工作2.3中引用该工作作为联合实例和语义分割点云的方法之一。

- [46] Xinlong Wang, 2019
  - 标题: Associatively segmenting instances and semantics in point clouds
  - 关键词: pseudo-LiDAR, depth estimation, BEV, object detection
  - 总结: 在引言中引用该工作支持BEV表示在目标检测中优于2D投影的发现，从而支撑本文使用BEV进行实例聚类的假设。

- [47] Yan Wang, 2019
  - 标题: Pseudo-lidar from visual depth estimation: Bridging the gap in 3d object detection for autonomous driving
  - 关键词: SqueezeSeg, real-time, road segmentation, CRF
  - 总结: 在相关工作2.2中引用SqueezeSeg作为使用带循环CRF的卷积神经网络从3D LiDAR点云进行实时道路目标分割的方法。

- [48] Bichen Wu, 2018
  - 标题: Squeezeseg: Convolutional neural nets with recurrent crf for real-time road-object segmentation from 3d lidar point cloud
  - 关键词: SqueezeSegV2, domain adaptation, LiDAR segmentation
  - 总结: 在相关工作2.2中引用SqueezeSegV2作为改进模型结构并引入无监督域自适应的LiDAR点云道路目标分割方法。

- [49] Bichen Wu, 2019
  - 标题: Squeezesegv2: Improved model structure and unsupervised domain adaptation for road-object segmentation from a lidar point cloud
  - 关键词: graph reasoning, panoptic segmentation, bidirectional
  - 总结: 在相关工作2.1中引用该工作作为设计双向图推理网络进行全景分割的近期研究之一。

- [50] Yangxin Wu, 2020
  - 标题: Bidirectional graph reasoning network for panoptic segmentation
  - 关键词: UPSnet, unified panoptic, panoptic head, proposal-based
  - 总结: 在相关工作2.1中引用UPSnet作为引入全景头通过添加未知类别标签解决实例和语义预测冲突的统一全景分割网络。

- [51] Yuwen Xiong, 2019
  - 标题: Upsnet: A unified panoptic segmentation network
  - 关键词: SECOND, sparse convolution, 3D detection, proposal-based
  - 总结: 在相关工作2.2中引用SECOND作为从编码特征生成区域提议并使用另一头选择细化边界框的proposal-based目标检测方法。

- [52] Yan Yan, 2018
  - 标题: Second: Sparsely embedded convolutional detection
  - 关键词: PIXOR, real-time, 3D detection, BEV
  - 总结: 在相关工作2.2中引用PIXOR作为从点云进行实时3D目标检测的鸟瞰图方法之一。

- [53] Bin Yang, 2018
  - 标题: Pixor: Realtime 3d object detection from point clouds
  - 关键词: DeeperLab, single-shot, bounding box, bottom-up
  - 总结: 在相关工作2.1中引用DeeperLab作为首个bottom-up全景分割方法，提出使用边界框角点和中心分离实例。

- [56] Yang Zhang, 2020
  - 标题: Polarnet: An improved grid representation for online lidar point clouds semantic segmentation
  - 关键词: 3D instance, region proposal, indoor
  - 总结: 在相关工作2.3中引用该工作作为从语义分割聚类的区域提议中提取实例分割的室内3D实例分割方法。



##### Component

- [7] Bowen Cheng, 2020
  - 标题: Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation
  - 关键词: Panoptic-DeepLab, center heatmap, offset, bottom-up, instance clustering
  - 总结: 本文的实例头直接借鉴了Panoptic-DeepLab的设计，用于预测中心热力图和偏移回归。在相关工作2.1中将其定位为简化实例分组方法的代表性bottom-up方法。

- [9] Bert De Brabandere, 2017
  - 标题: Semantic instance segmentation with a discriminative loss function
  - 关键词: discriminative loss, instance clustering, embedding
  - 总结: 在相关工作2.3中引用该工作作为判别损失函数的来源，说明现有室内点云全景分割方法大多使用该损失学习实例聚类。

- [16] Kaiming He, 2017
  - 标题: Mask r-cnn
  - 关键词: Mask R-CNN, proposal-based, instance mask, object detection
  - 总结: 在引言中引用Mask R-CNN作为proposal-based全景分割方法适配的目标检测网络来源，在相关工作2.1中进一步说明top-down方法使用它获取每个对象的实例掩码。

- [23] Alex H Lang, 2019
  - 标题: PointPillars: Fast encoders for object detection from point clouds
  - 关键词: PointPillars, BEV, object detection, fast encoder
  - 总结: 在相关工作2.2中引用PointPillars作为使用鸟瞰图投影空间进行LiDAR目标检测的代表性方法。

- [34] Lorenzo Porzi, 2019
  - 标题: Seamless scene segmentation
  - 关键词: seamless scene, BEV, scene segmentation
  - 总结: 在相关工作2.2中引用该工作作为使用鸟瞰图投影空间的目标检测方法之一。

- [37] Charles R Qi, 2017
  - 标题: Pointnet: Deep learning on point sets for 3d classification and segmentation
  - 关键词: PointNet, point cloud, deep learning, classification
  - 总结: 在相关工作2.2中引用PointNet作为直接在点级别学习特征处理LiDAR点云的代表性方法。

- [41] Shaoshuai Shi, 2019
  - 标题: Pointrcnn: 3d object progposal generation and detection from point cloud
  - 关键词: PointRCNN, 3D detection, proposal-based, point cloud
  - 总结: 在相关工作2.2中引用PointRCNN作为LiDAR目标检测中proposal-based方法之一，从点云生成3D目标提议并细化边界框。

- [54] Tien-Ju Yang, 2019
  - 标题: Deeperlab: Single-shot image parser
  - 关键词: center-based, 3D detection, tracking, proposal-free
  - 总结: 在相关工作2.2中引用该工作作为LiDAR目标检测中proposal-free方法之一，通过关键点/中心估计直接预测目标。

- [55] Tianwei Yin, 2020
  - 标题: Center- ¨ based 3d object detection and tracking
  - 关键词: PolarNet, polar BEV, grid representation, semantic segmentation
  - 总结: 在引言中引用PolarNet作为本文语义预测骨干网络的来源，在相关工作2.2中说明其使用极坐标BEV编码点云以补偿点分布不平衡。本文的整个框架建立在PolarNet的骨干设计之上。

- [58] Yin Zhou, 2020
  - 标题: End-to-end multi-view fusion for 3d object detection in lidar point clouds
  - 关键词: VoxelNet, voxel, 3D detection, proposal-based
  - 总结: 在相关工作2.2中引用VoxelNet作为从编码特征生成区域提议的proposal-based 3D目标检测方法之一。

- [59] Yin Zhou and Oncel Tuzel, 2018
  - 标题: Voxelnet: End-to-end learning for point cloud based 3d object detection
  - 关键词: class-balanced, grouping, sampling, 3D detection
  - 总结: 在相关工作2.2的方法背景中作为点云3D目标检测的类别平衡分组和采样方法的引用。



##### Historical

- [20] Alexander Kirillov, 2019
  - 标题: Panoptic segmentation
  - 关键词: panoptic segmentation, problem definition, Kirillov
  - 总结: 在引言中引用该工作作为全景分割问题的首次定义者，说明该问题在统一实例分割和语义分割方面的挑战。

- [28] Jonathan Long, 2015
  - 标题: Fully convolutional networks for semantic segmentation
  - 关键词: FCN, semantic segmentation, fully convolutional
  - 总结: 在引言中引用FCN作为proposal-free全景分割方法适配的语义分割网络基础来源。


# End-to-end object detection with transformers (2020)

- Paper ref: 1:EIMSDEU3
- Title: End-to-end object detection with transformers
- Year: 2020

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | Al-Rfou, R.; Choe, D.; et al. | Character-level language modeling with deeper self-attention |
| ref-2 | 2015 | Bahdanau, D.; Cho, K.; et al. | Neural machine translation by jointly learning to align and translate |
| ref-3 | 2019 | Bello, I.; Zoph, B.; et al. | Attention augmented convolutional networks |
| ref-4 | 2017 | Bodla, N.; Singh, B.; et al. | Soft-NMS—improving object detection with one line of code |
| ref-5 | 2019 | Cai, Z.; Vasconcelos, N. | Cascade R-CNN: high quality object detection and instance segmentation. PAMI |
| ref-6 | 2020 | Chan, W.; Saharia, C.; et al. | Imputer: sequence modelling via imputation and dynamic programming. arXiv:2002.08926 |
| ref-7 | 2019 | Devlin, J.; Chang, M.W.; et al. | BERT: pre-training of deep bidirectional transformers for language understanding |
| ref-8 | 2014 | Erhan, D.; Szegedy, C.; et al. | Scalable object detection using deep neural networks |
| ref-9 | 2019 | Ghazvininejad, M.; Levy, O.; et al. | Mask-predict: parallel decoding of conditional masked language models. arXiv:1904.09324 |
| ref-10 | 2010 | Glorot, X.; Bengio, Y. | Understanding the difficulty of training deep feedforward neural networks |
| ref-11 | 2018 | Gu, J.; Bradbury, J.; et al. | Non-autoregressive neural machine translation |
| ref-12 | 2019 | He, K.; Girshick, R. | Rethinking imagenet pre-training |
| ref-13 | 2017 | He, K.; Gkioxari, G.; et al. | Mask R-CNN |
| ref-14 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-15 | 2017 | Hosang, J.H.; Benenson, R.; et al. | Learning non-maximum suppression |
| ref-16 | 2018 | Hu, H.; Gu, J.; et al. | Relation networks for object detection |
| ref-17 | 2019 | Kirillov, A.; Girshick, R.; et al. | Panoptic feature pyramid networks |
| ref-18 | 2019 | Kirillov, A.; He, K.; et al. | Panoptic segmentation |
| ref-19 | 1955 | Kuhn, H.W. | The Hungarian method for the assignment problem |
| ref-20 | 2017 | Li, Y.; Qi, H.; et al. | Fully convolutional instance-aware semantic segmentation |
| ref-21 | 2017 | Lin, T.Y.; Girshick, R.; et al. | Feature pyramid networks for object detection |
| ref-22 | 2017 | Lin, T.Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-23 | 2014 | Lin, T.-Y. | Microsoft COCO: common objects in context. In: Fleet, D., Pajdla, T., Schiele, B., Tuytelaars, T. (eds.) ECCV 2014 |
| ref-24 | 2014 | Springer, Cham | //doi.org/10.1007/978-3-319-10602-1 48 |
| ref-25 | 2016 | Liu, W. | SSD: single shot multibox detector. In: Leibe, B., Matas, J., Sebe, N., Welling, M. (eds.) ECCV 2016 |
| ref-26 | 2016 | Springer, Cham | //doi.org/10.1007/978-3-319-46448-0 2 |
| ref-27 | 2017 | Loshchilov, I.; Hutter, F. | Decoupled weight decay regularization |
| ref-28 | 2019 | L¨uscher, C., et al. | RWTH ASR systems for LibriSpeech: hybrid vs attention - w/o data augmentation. arXiv:1905.03072 |
| ref-29 | 2016 | Milletari, F.; Navab, N.; et al. | V-net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-30 | 2017 | Oord, A. | Parallel wavenet: fast high-fidelity speech synthesis. arXiv:1711.10433 |
| ref-31 | 2015 | Park, E.; Berg, A.C. | Learning to decompose for object detection and instance segmentation. arXiv:1511.06449 |
| ref-32 | 2018 | Parmar, N. | Image transformer |
| ref-33 | 2019 | Paszke, A. | Pytorch: an imperative style, high-performance deep learning library |
| ref-34 | 2019 | Pineda, L.; Salvador, A.; et al. | Elucidating image-to-set prediction: an analysis of models, losses and datasets. arXiv:1904.05709 |
| ref-35 | 2019 | Radford, A.; Wu, J.; et al. | Language models are unsupervised multitask learners |
| ref-36 | 2016 | Redmon, J.; Divvala, S.; et al. | You only look once: unified, real-time object detection |
| ref-37 | 2017 | Ren, M.; Zemel, R.S. | End-to-end instance segmentation with recurrent attention |
| ref-38 | 2015 | Ren, S.; He, K.; et al. | Faster R-CNN: towards real-time object detection with region proposal networks. PAMI |
| ref-39 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union |
| ref-40 | 2018 | Rezatofighi, S.H. | Deep perm-set net: learn to predict sets with unknown permutation and cardinality using deep neural networks. arXiv:1805.00613 |
| ref-41 | 2017 | Rezatofighi, S.H. | Deepsetnet: predicting sets with deep neural networks |
| ref-42 | 2016 | Romera-Paredes, B.; Torr, P.H.S. | Recurrent instance segmentation. In: Leibe, B., Matas, J., Sebe, N., Welling, M. (eds.) ECCV 2016 |
| ref-43 | 2016 | Springer, Cham | //doi.org/10.1007/978-3-319-46466-4 19 |
| ref-44 | 2017 | Salvador, A.; Bellver, M.; et al. | Recurrent neural networks for semantic instance segmentation. arXiv:1712.00617 |
| ref-45 | 2015 | Stewart, R.J.; Andriluka, M.; et al. | End-to-end people detection in crowded scenes |
| ref-46 | 2014 | Sutskever, I.; Vinyals, O.; et al. | Sequence to sequence learning with neural networks |
| ref-47 | 2019 | Synnaeve, G. | End-to-end ASR: from supervised to semi-supervised learning with modern architectures. arXiv:1911.08460 |
| ref-48 | 2019 | Tian, Z.; Shen, C.; et al. | FCOS: fully convolutional one-stage object detection |
| ref-49 | 2017 | Vaswani, A. | Attention is all you need |
| ref-50 | 2016 | Vinyals, O.; Bengio, S.; et al. | Order matters: sequence to sequence for sets |
| ref-51 | 2018 | Wang, X.; Girshick, R.B.; et al. | Non-local neural networks |
| ref-52 | 2019 | Wu, Y.; Kirillov, A.; et al. | Detectron2 (2019). https:// github.com/facebookresearch/detectron2 |
| ref-53 | 2019 | Xiong, Y. | Upsnet: a unified panoptic segmentation network |
| ref-54 | 2019 | Zhang, S.; Chi, C.; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. arXiv:1912.02424 |
| ref-55 | 2019 | Zhou, X.; Wang, D. | Objects as points. arXiv:1904.07850 |

## Citation Analysis Report

#### 总体总结
本文围绕将Transformer引入目标检测以实现端到端直接集合预测这一核心论点组织引文。首先用早期注意力与序列建模工作铺出技术背景，说明自注意力和集合匹配的由来；接着对比主流目标检测范式，突出它们对锚框和NMS的依赖，为DETR的简化设计做铺垫；然后借关键Transformer文献和直接集合预测工作把本文方法路线明确定位在并行解码Transformer加二分匹配损失的交汇点；最后在全景分割扩展中展示DETR的可扩展性。


#### 关键文献

- [14] He, K., 2016: Deep residual learning for image recognition (Uncategorized)

- [19] Kuhn, H.W., 1955: The Hungarian method for the assignment problem (Uncategorized)

- [22] Lin, T.Y., 2017: Focal loss for dense object detection (Historical)

- [23] Lin, T.-Y., 2014: Microsoft COCO: common objects in context. In: Fleet, D., Pajdla, T., Schiele, B., Tuytelaars, T. (eds.) ECCV 2014 (Background)

- [36] Ren, S., 2015: Faster R-CNN: towards real-time object detection with region proposal networks. PAMI (Historical)

- [42] Stewart, R.J., 2015: End-to-end people detection in crowded scenes (Historical)

- [46] Vaswani, A., 2017: Attention is all you need (Uncategorized)



#### 范围
- 章节: Introduction + Related Work + The DETR Model + Experiments + Conclusion
- 行号: 9-179

#### 按功能归类


##### Uncategorized

- [1] Al-Rfou, R., 2019
  - 标题: Character-level language modeling with deeper self-attention
  - 关键词: 辅助损失, 解码器训练, 匈牙利损失
  - 总结: 原文在辅助损失和解码器训练方面引用该工作。原文在解码器每层应用辅助损失时使用，引用该工作作为辅助损失技术的示例。

- [3] Bello, I., 2019
  - 标题: Attention augmented convolutional networks
  - 关键词: 注意力增强卷积, FFN, 消融实验
  - 总结: 原文在注意力增强卷积和FFN方面引用该工作。原文在消融实验中将Transformer的FFN与注意力增强卷积网络进行类比，说明FFN的重要性。

- [10] Glorot, X., 2010
  - 标题: Understanding the difficulty of training deep feedforward neural networks
  - 关键词: 权重初始化, Xavier, 训练技巧
  - 总结: 原文在权重初始化和Xavier方面引用该工作。原文在说明Transformer权重初始化方法时引用该工作。

- [12] He, K., 2019
  - 标题: Rethinking imagenet pre-training
  - 关键词: ImageNet预训练, 长训练, 基线增强
  - 总结: 原文在ImageNet预训练和长训练方面引用该工作。原文在加强Faster R-CNN基线时引用该工作，采用其长训练策略以进行公平比较。

- [13] He, K., 2017
  - 标题: Mask R-CNN
  - 关键词: Mask R-CNN, 实例分割, 架构扩展
  - 总结: 原文在Mask R-CNN和实例分割方面引用该工作。原文在全景分割扩展中类比Faster R-CNN到Mask R-CNN的扩展方式，说明DETR添加掩码头的自然性。

- [14] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, CNN骨干, 特征提取
  - 总结: 原文在ResNet和CNN骨干方面引用该工作。原文使用ResNet作为CNN骨干提取特征，并在架构说明和实验设置中多次引用。

- [19] Kuhn, H.W., 1955
  - 标题: The Hungarian method for the assignment problem
  - 关键词: 匈牙利算法, 二分匹配, 分配问题
  - 总结: 原文在匈牙利算法和二分匹配方面引用该工作。原文在集合预测损失中使用匈牙利算法进行最优二分匹配，引用其原始论文。

- [20] Li, Y., 2017
  - 标题: Fully convolutional instance-aware semantic segmentation
  - 关键词: 膨胀卷积, 特征分辨率, 语义分割
  - 总结: 原文在膨胀卷积和特征分辨率方面引用该工作。原文在提高特征分辨率时引用该方法，通过膨胀 backbone 最后阶段来改善小目标检测。

- [25] Loshchilov, I., 2017
  - 标题: Decoupled weight decay regularization
  - 关键词: AdamW, 优化器, 权重衰减
  - 总结: 原文在AdamW和优化器方面引用该工作。原文在训练设置中说明使用AdamW优化器及其超参数配置。

- [27] Milletari, F., 2016
  - 标题: V-net: Fully convolutional neural networks for volumetric medical image segmentation
  - 关键词: DICE损失, 医学图像分割, 掩码监督
  - 总结: 原文在DICE损失和医学图像分割方面引用该工作。原文在全景分割掩码监督中使用DICE/F-1损失，引用该医学分割工作。

- [46] Vaswani, A., 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, 自注意力, 编码器-解码器, 位置编码
  - 总结: 原文在Transformer和自注意力方面引用该工作。原文的核心架构基础，多次引用其编码器-解码器结构、自注意力机制和位置编码。



##### Historical

- [2] Bahdanau, D., 2015
  - 标题: Neural machine translation by jointly learning to align and translate
  - 关键词: 注意力机制, 序列到序列, 机器翻译
  - 总结: 原文在注意力机制和序列到序列方面引用该工作。原文用它介绍注意力机制的概念，作为transformer自注意力层的思想来源。

- [4] Bodla, N., 2017
  - 标题: Soft-NMS—improving object detection with one line of code
  - 关键词: Soft-NMS, 后处理, 去重
  - 总结: 原文在Soft-NMS和后处理方面引用该工作。原文将其列为 prior work 中使用直接集合损失但仍需要手工特征的NMS替代方法。

- [5] Cai, Z., 2019
  - 标题: Cascade R-CNN: high quality object detection and instance segmentation. PAMI
  - 关键词: Cascade R-CNN, 两阶段检测, 候选框
  - 总结: 原文在Cascade R-CNN和两阶段检测方面引用该工作。原文用它说明现代检测器如何依赖候选框进行间接集合预测，作为DETR要简化的目标。

- [6] Chan, W., 2020
  - 标题: Imputer: sequence modelling via imputation and dynamic programming. arXiv:2002.08926
  - 关键词: 并行解码, 语音识别, 非自回归
  - 总结: 原文在并行解码和语音识别方面引用该工作。原文引用该工作说明并行解码在语音识别领域的应用，支持其采用并行解码的决策。

- [7] Devlin, J., 2019
  - 标题: BERT: pre-training of deep bidirectional transformers for language understanding
  - 关键词: BERT, 预训练, Transformer应用
  - 总结: 原文在BERT和预训练方面引用该工作。原文用它说明Transformer已在NLP等多个领域取得成功，为其引入视觉领域提供依据。

- [8] Erhan, D., 2014
  - 标题: Scalable object detection using deep neural networks
  - 关键词: 深度目标检测, 全连接网络, 集合预测
  - 总结: 原文在深度目标检测和全连接网络方面引用该工作。原文在讨论集合预测方法时引用该工作，说明早期使用全连接网络进行目标检测的尝试。

- [9] Ghazvininejad, M., 2019
  - 标题: Mask-predict: parallel decoding of conditional masked language models. arXiv:1904.09324
  - 关键词: 掩码预测, 并行解码, 条件语言模型
  - 总结: 原文在掩码预测和并行解码方面引用该工作。原文引用该工作说明并行解码在机器翻译中的进展，支持其采用非自回归解码的方法。

- [11] Gu, J., 2018
  - 标题: Non-autoregressive neural machine translation
  - 关键词: 非自回归翻译, 并行解码, 二分匹配
  - 总结: 原文在非自回归翻译和并行解码方面引用该工作。原文将其列为结合二分匹配损失与并行解码的关键 prior work，与DETR的核心设计思想直接相关。

- [15] Hosang, J.H., 2017
  - 标题: Learning non-maximum suppression
  - 关键词: 学习NMS, 后处理消除, 注意力
  - 总结: 原文在学习NMS和后处理消除方面引用该工作。原文将其与Soft-NMS一起列为使用直接集合损失但仍需手工特征的先验方法。

- [16] Hu, H., 2018
  - 标题: Relation networks for object detection
  - 关键词: 关系网络, 注意力, 检测后处理
  - 总结: 原文在关系网络和注意力方面引用该工作。原文在讨论显式建模预测间关系的方法时引用，说明这类方法仍需要额外的手工上下文特征。

- [17] Kirillov, A., 2019
  - 标题: Panoptic feature pyramid networks
  - 关键词: PanopticFPN, 全景分割, 特征金字塔
  - 总结: 原文在PanopticFPN和全景分割方面引用该工作。原文在全景分割实验中将其作为对比基线之一。

- [21] Lin, T.Y., 2017
  - 标题: Feature pyramid networks for object detection
  - 关键词: FPN, 多尺度特征, 小目标检测
  - 总结: 原文在FPN和多尺度特征方面引用该工作。原文在讨论小目标检测挑战时引用FPN，期望未来工作能像FPN改善Faster R-CNN一样改善DETR的小目标性能。

- [22] Lin, T.Y., 2017
  - 标题: Focal loss for dense object detection
  - 关键词: RetinaNet, Focal Loss, 单阶段检测, 锚框
  - 总结: 原文在RetinaNet和Focal Loss方面引用该工作。原文将其作为基于锚框的单阶段检测器代表，在多个上下文中引用来说明现代检测器的设计模式。

- [24] Liu, W., 2016
  - 标题: SSD: single shot multibox detector. In: Leibe, B., Matas, J., Sebe, N., Welling, M. (eds.) ECCV 2016
  - 关键词: SSD, 单阶段检测, 多框检测器
  - 总结: 原文在SSD和单阶段检测方面引用该工作。原文在讨论使用二分匹配损失的早期检测器时引用SSD。

- [26] L¨uscher, C., et al., 2019
  - 标题: RWTH ASR systems for LibriSpeech: hybrid vs attention - w/o data augmentation. arXiv:1905.03072
  - 关键词: 注意力, 语音识别, 混合模型
  - 总结: 原文在注意力和语音识别方面引用该工作。原文在说明Transformer注意力机制的广泛应用时引用该ASR工作。

- [28] Oord, A., 2017
  - 标题: Parallel wavenet: fast high-fidelity speech synthesis. arXiv:1711.10433
  - 关键词: 并行WaveNet, 语音合成, 非自回归
  - 总结: 原文在并行WaveNet和语音合成方面引用该工作。原文在说明并行解码在音频领域的应用时引用，支持其采用非自回归方法的决策。

- [29] Park, E., 2015
  - 标题: Learning to decompose for object detection and instance segmentation. arXiv:1511.06449
  - 关键词: RNN分割, 自回归, 实例分割
  - 总结: 原文在RNN分割和自回归方面引用该工作。原文将其列为最接近DETR思路的循环检测器之一，但指出其基于自回归模型。

- [30] Parmar, N., 2018
  - 标题: Image transformer
  - 关键词: Image Transformer, 视觉Transformer, 位置编码
  - 总结: 原文在Image Transformer和视觉Transformer方面引用该工作。原文在说明Transformer已应用于视觉领域时引用，并在位置编码部分引用其固定位置编码方法。

- [32] Pineda, L., 2019
  - 标题: Elucidating image-to-set prediction: an analysis of models, losses and datasets. arXiv:1904.05709
  - 关键词: 图像到集合, 多标签分类, 集合预测分析
  - 总结: 原文在图像到集合和多标签分类方面引用该工作。原文在讨论集合预测任务时引用该工作，说明多标签分类与检测的结构差异。

- [33] Radford, A., 2019
  - 标题: Language models are unsupervised multitask learners
  - 关键词: GPT-2, 语言模型, 多任务学习
  - 总结: 原文在GPT-2和语言模型方面引用该工作。原文在说明Transformer在NLP领域广泛应用时引用GPT-2。

- [34] Redmon, J., 2016
  - 标题: You only look once: unified, real-time object detection
  - 关键词: YOLO, 单阶段检测, 实时检测
  - 总结: 原文在YOLO和单阶段检测方面引用该工作。原文在讨论使用二分匹配损失的早期检测器时引用YOLO。

- [35] Ren, M., 2017
  - 标题: End-to-end instance segmentation with recurrent attention
  - 关键词: RNN实例分割, 自回归注意力, 编码器-解码器
  - 总结: 原文在RNN实例分割和自回归注意力方面引用该工作。原文将其列为使用二分匹配损失与编码器-解码器架构的自回归实例分割方法。

- [36] Ren, S., 2015
  - 标题: Faster R-CNN: towards real-time object detection with region proposal networks. PAMI
  - 关键词: Faster R-CNN, 区域建议网络, 两阶段检测, 基线对比
  - 总结: 原文在Faster R-CNN和区域建议网络方面引用该工作。原文将Faster R-CNN作为主要对比基线，在多个上下文中引用其候选框机制、训练方式等。

- [38] Rezatofighi, S.H., 2018
  - 标题: Deep perm-set net: learn to predict sets with unknown permutation and cardinality using deep neural networks. arXiv:1805.00613
  - 关键词: 集合预测, 排列不变, 未知基数
  - 总结: 原文在集合预测和排列不变方面引用该工作。原文将其列为先前尝试直接集合预测但未能在挑战基准上取得竞争力的方法之一。

- [39] Rezatofighi, S.H., 2017
  - 标题: Deepsetnet: predicting sets with deep neural networks
  - 关键词: DeepSetNet, 集合预测, 排列不变损失
  - 总结: 原文在DeepSetNet和集合预测方面引用该工作。原文在讨论集合预测方法时引用，说明使用匈牙利匹配损失进行集合预测的早期尝试。

- [40] Romera-Paredes, B., 2016
  - 标题: Recurrent instance segmentation. In: Leibe, B., Matas, J., Sebe, N., Welling, M. (eds.) ECCV 2016
  - 关键词: RNN分割, 自回归, 实例分割
  - 总结: 原文在RNN分割和自回归方面引用该工作。原文将其列为使用自回归模型与二分匹配损失的实例分割方法。

- [41] Salvador, A., 2017
  - 标题: Recurrent neural networks for semantic instance segmentation. arXiv:1712.00617
  - 关键词: RNN分割, 语义实例分割, 自回归
  - 总结: 原文在RNN分割和语义实例分割方面引用该工作。原文将其列为循环实例分割方法之一，说明自回归模型的局限性。

- [42] Stewart, R.J., 2015
  - 标题: End-to-end people detection in crowded scenes
  - 关键词: 人群检测, 端到端, 匈牙利匹配
  - 总结: 原文在人群检测和端到端方面引用该工作。原文将其列为最接近DETR思路的端到端集合预测工作之一，并在匈牙利匹配部分引用。

- [43] Sutskever, I., 2014
  - 标题: Sequence to sequence learning with neural networks
  - 关键词: Seq2Seq, 自回归, 序列学习
  - 总结: 原文在Seq2Seq和自回归方面引用该工作。原文在讨论早期自回归模型时引用该开创性工作，作为Transformer之前序列建模的代表。

- [44] Synnaeve, G., 2019
  - 标题: End-to-end ASR: from supervised to semi-supervised learning with modern architectures. arXiv:1911.08460
  - 关键词: 注意力, ASR, 半监督学习
  - 总结: 原文在注意力和ASR方面引用该工作。原文在说明注意力模型在语音领域的应用时引用。

- [45] Tian, Z., 2019
  - 标题: FCOS: fully convolutional one-stage object detection
  - 关键词: FCOS, 无锚框检测, 单阶段
  - 总结: 原文在FCOS和无锚框检测方面引用该工作。原文将其作为基于网格中心的单阶段检测器代表，说明现代检测器对初始猜测的依赖。

- [47] Vinyals, O., 2016
  - 标题: Order matters: sequence to sequence for sets
  - 关键词: 序列到集合, 排列不变, RNN
  - 总结: 原文在序列到集合和排列不变方面引用该工作。原文在讨论集合预测的序列到序列方法时引用该工作，说明排列不变性的重要性。

- [48] Wang, X., 2018
  - 标题: Non-local neural networks
  - 关键词: 非局部网络, 全局计算, 视觉注意力
  - 总结: 原文在非局部网络和全局计算方面引用该工作。原文在介绍自注意力层时将Transformer的自注意力与非局部神经网络进行类比。

- [50] Xiong, Y., 2019
  - 标题: Upsnet: a unified panoptic segmentation network
  - 关键词: UPSNet, 全景分割, 统一网络
  - 总结: 原文在UPSNet和全景分割方面引用该工作。原文在全景分割实验中将其作为对比基线之一。

- [51] Zhang, S., 2019
  - 标题: Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. arXiv:1912.02424
  - 关键词: 自适应采样, 锚框检测, 无锚框检测
  - 总结: 原文在自适应采样和锚框检测方面引用该工作。原文在讨论锚框与无锚框检测器之间的差距时引用该工作。

- [52] Zhou, X., 2019
  - 标题: Objects as points. arXiv:1904.07850
  - 关键词: CenterNet, 关键点检测, 无锚框
  - 总结: 原文在CenterNet和关键点检测方面引用该工作。原文将其作为基于网格中心的检测器代表，在讨论锚框依赖时多次引用。



##### Background

- [18] Kirillov, A., 2019
  - 标题: Panoptic segmentation
  - 关键词: 全景分割, 像素级识别, things和stuff
  - 总结: 原文在全景分割和像素级识别方面引用该工作。原文在引入全景分割扩展任务时引用该工作，定义任务并提供实验数据集。

- [23] Lin, T.-Y., 2014
  - 标题: Microsoft COCO: common objects in context. In: Fleet, D., Pajdla, T., Schiele, B., Tuytelaars, T. (eds.) ECCV 2014
  - 关键词: COCO, 目标检测数据集, 评估基准
  - 总结: 原文在COCO和目标检测数据集方面引用该工作。原文在实验设置和评估中引用COCO数据集论文，作为主要实验平台。

- [31] Paszke, A., 2019
  - 标题: Pytorch: an imperative style, high-performance deep learning library
  - 关键词: PyTorch, 深度学习框架, 可复现性
  - 总结: 原文在PyTorch和深度学习框架方面引用该工作。原文在强调DETR易于实现时，说明其可在PyTorch等框架中用少量代码复现。

- [49] Wu, Y., 2019
  - 标题: Detectron2 (2019). https:// github.com/facebookresearch/detectron2
  - 关键词: Detectron2, 检测框架, 基线实现, NMS
  - 总结: 原文在Detectron2和检测框架方面引用该工作。原文在实验设置、基线对比和NMS测试中多次引用Detectron2作为实现工具。





#### 时间线分析

##### 早期
早期工作奠定了序列建模、注意力机制和目标检测的基础。包括匈牙利算法(1955)、Xavier初始化(2010)、COCO数据集(2014)、早期的深度目标检测方法如Scalable Object Detection(2014)、Seq2Seq(2014)、Faster R-CNN(2015)、注意力机制(2015)、Order Matters(2016)以及FCOS和SSD等锚框/无锚框检测器。这些工作建立了目标检测依赖候选框/锚框的范式和注意力在序列建模中的应用。


- [2] Bahdanau, D., 2015: Neural machine translation by jointly learning to align and translate

- [8] Erhan, D., 2014: Scalable object detection using deep neural networks

- [10] Glorot, X., 2010: Understanding the difficulty of training deep feedforward neural networks

- [19] Kuhn, H.W., 1955: The Hungarian method for the assignment problem

- [23] Lin, T.-Y., 2014: Microsoft COCO: common objects in context. In: Fleet, D., Pajdla, T., Schiele, B., Tuytelaars, T. (eds.) ECCV 2014

- [29] Park, E., 2015: Learning to decompose for object detection and instance segmentation. arXiv:1511.06449

- [36] Ren, S., 2015: Faster R-CNN: towards real-time object detection with region proposal networks. PAMI

- [42] Stewart, R.J., 2015: End-to-end people detection in crowded scenes

- [43] Sutskever, I., 2014: Sequence to sequence learning with neural networks




##### 中期
中期工作将深度学习推向更成熟的目标检测和分割路线。包括ResNet骨干(2016)、Mask R-CNN(2017)、YOLO(2016)、Focal Loss/RetinaNet(2017)、Soft-NMS(2017)、学习NMS(2017)、关系网络(2018)、Feature Pyramid Networks(2017)等。这一时期的方法进一步完善了基于锚框的两阶段和单阶段检测器，并开始探索可学习的后处理方式和目标间关系建模。


- [4] Bodla, N., 2017: Soft-NMS—improving object detection with one line of code

- [13] He, K., 2017: Mask R-CNN

- [14] He, K., 2016: Deep residual learning for image recognition

- [15] Hosang, J.H., 2017: Learning non-maximum suppression

- [20] Li, Y., 2017: Fully convolutional instance-aware semantic segmentation

- [21] Lin, T.Y., 2017: Feature pyramid networks for object detection

- [22] Lin, T.Y., 2017: Focal loss for dense object detection

- [24] Liu, W., 2016: SSD: single shot multibox detector. In: Leibe, B., Matas, J., Sebe, N., Welling, M. (eds.) ECCV 2016

- [25] Loshchilov, I., 2017: Decoupled weight decay regularization

- [27] Milletari, F., 2016: V-net: Fully convolutional neural networks for volumetric medical image segmentation

- [28] Oord, A., 2017: Parallel wavenet: fast high-fidelity speech synthesis. arXiv:1711.10433

- [34] Redmon, J., 2016: You only look once: unified, real-time object detection

- [35] Ren, M., 2017: End-to-end instance segmentation with recurrent attention

- [39] Rezatofighi, S.H., 2017: Deepsetnet: predicting sets with deep neural networks

- [40] Romera-Paredes, B., 2016: Recurrent instance segmentation. In: Leibe, B., Matas, J., Sebe, N., Welling, M. (eds.) ECCV 2016

- [41] Salvador, A., 2017: Recurrent neural networks for semantic instance segmentation. arXiv:1712.00617

- [46] Vaswani, A., 2017: Attention is all you need

- [47] Vinyals, O., 2016: Order matters: sequence to sequence for sets




##### 近期
近期工作直接收束到DETR所处的方法脉络：Transformer架构(2017)开创性的自注意力机制、非自回归翻译(2018)、BERT(2019)、Image Transformer(2018)等将Transformer推向各领域；同时DeepSetNet、Deep Perm-Set Net、端到端人群检测等探索了直接集合预测；Detectron2(2019)提供了统一的检测框架。这些工作为DETR将Transformer引入目标检测、消除手工组件奠定了直接基础。


- [1] Al-Rfou, R., 2019: Character-level language modeling with deeper self-attention

- [3] Bello, I., 2019: Attention augmented convolutional networks

- [5] Cai, Z., 2019: Cascade R-CNN: high quality object detection and instance segmentation. PAMI

- [6] Chan, W., 2020: Imputer: sequence modelling via imputation and dynamic programming. arXiv:2002.08926

- [7] Devlin, J., 2019: BERT: pre-training of deep bidirectional transformers for language understanding

- [9] Ghazvininejad, M., 2019: Mask-predict: parallel decoding of conditional masked language models. arXiv:1904.09324

- [11] Gu, J., 2018: Non-autoregressive neural machine translation

- [12] He, K., 2019: Rethinking imagenet pre-training

- [16] Hu, H., 2018: Relation networks for object detection

- [17] Kirillov, A., 2019: Panoptic feature pyramid networks

- [18] Kirillov, A., 2019: Panoptic segmentation

- [26] L¨uscher, C., et al., 2019: RWTH ASR systems for LibriSpeech: hybrid vs attention - w/o data augmentation. arXiv:1905.03072

- [30] Parmar, N., 2018: Image transformer

- [31] Paszke, A., 2019: Pytorch: an imperative style, high-performance deep learning library

- [32] Pineda, L., 2019: Elucidating image-to-set prediction: an analysis of models, losses and datasets. arXiv:1904.05709

- [33] Radford, A., 2019: Language models are unsupervised multitask learners

- [38] Rezatofighi, S.H., 2018: Deep perm-set net: learn to predict sets with unknown permutation and cardinality using deep neural networks. arXiv:1805.00613

- [44] Synnaeve, G., 2019: End-to-end ASR: from supervised to semi-supervised learning with modern architectures. arXiv:1911.08460

- [45] Tian, Z., 2019: FCOS: fully convolutional one-stage object detection

- [48] Wang, X., 2018: Non-local neural networks

- [49] Wu, Y., 2019: Detectron2 (2019). https:// github.com/facebookresearch/detectron2

- [50] Xiong, Y., 2019: Upsnet: a unified panoptic segmentation network

- [51] Zhang, S., 2019: Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. arXiv:1912.02424

- [52] Zhou, X., 2019: Objects as points. arXiv:1904.07850


# RT-DETRv3: real-time end-to-end object detection with hierarchical dense positive supervision (2024)

- Paper ref: 1:GHWYS7AF
- Title: RT-DETRv3: real-time end-to-end object detection with hierarchical dense positive supervision
- Year: 2024

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Bochkovskiy, Alexey; Wang, Chien-Yao; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-2 | 2020 | Carion, Nicolas; Massa, Francisco; et al. | End-to-end object detection with transformers |
| ref-3 | 2020 | Carion, Nicolas; Massa, Francisco; et al. | End-to-end object detection with transformers |
| ref-4 | 2023 | Chen, Qiang; Chen, Xiaokang; et al. | Group detr: Fast detr training with group-wise one-to-many assignment |
| ref-5 | 2023 | Chen, Yuming; Yuan, Xinbin; et al. | Yolo-ms: rethinking multiscale representation learning for real-time object detection |
| ref-6 | 2021 | Ding, Xiaohan; Zhang, Xiangyu; et al. | Repvgg: Making vgg-style convnets great again |
| ref-7 | 2021 | Ge, Zheng; Liu, Songtao; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-8 | 2016 | He, Kaiming; Zhang, Xiangyu; et al. | Deep residual learning for image recognition |
| ref-9 | 2024 | Hu, Zhengdong; Sun, Yifan; et al. | Dac-detr: Divide the attention layers and conquer |
| ref-10 | 2021 | Huang, Xin; Wang, Xinxin; et al. | Pp-yolov2: A practical object detector |
| ref-11 | 2023 | Jocher, Glenn; Chaurasia, Ayush; et al. | Ultralytics YOLO |
| ref-12 | 2022 | Jocher, Glenn; Chaurasia, Ayush; et al. | ultralytics/yolov5: v6. 2-yolov5 classification models, apple m1, reproducibility, clearml and deci. ai integrations |
| ref-13 | 2022 | Li, Chuyi; Li, Lulu; et al. | Yolov6: A single-stage object detection framework for industrial applications |
| ref-14 | 2022 | Li, Feng; Zhang, Hao; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-15 | 2014 | Lin, Tsung-Yi; Maire, Michael; et al. | Microsoft coco: Common objects in context |
| ref-16 | 2022 | Liu, Shilong; Li, Feng; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr |
| ref-17 | 2018 | Liu, Shu; Qi, Lu; et al. | Path aggregation network for instance segmentation |
| ref-18 | 2020 | Long, Xiang; Deng, Kaipeng; et al. | Pp-yolo: An effective and efficient implementation of object detector |
| ref-19 | 2024 | Lv, Wenyu; Zhao, Yian; et al. | Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer |
| ref-20 | 2015 | Ren, Shaoqing; He, Kaiming; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-21 | 2019 | Shao, Shuai; Li, Zeming; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-22 | 2024 | Wang, Ao; Chen, Hui; et al. | Yolov10: Real-time end-to-end object detection |
| ref-23 | 2024 | Wang, Chengcheng; He, Wei; et al. | Gold-yolo: Efficient object detector via gather-and-distribute mechanism |
| ref-24 | 2023 | Wang, Chien-Yao; Bochkovskiy, Alexey; et al. | Yolov7: Trainable bag-of-freebies sets new state-of-the-art for real-time object detectors |
| ref-25 | 2020 | Wang, Chien-Yao; Liao, Hong-Yuan Mark; et al. | Cspnet: A new backbone that can enhance learning capability of cnn |
| ref-26 | 2024 | Wang, Chien-Yao; Yeh, I-Hau; et al. | Yolov9: Learning what you want to learn using programmable gradient information |
| ref-27 | 2024 | Xia, Chunlong; Wang, Xinliang; et al. | Vit-comer: Vision transformer with convolutional multi-scale feature interaction for dense predictions |
| ref-28 | 2022 | Xu, Shangliang; Wang, Xinxin; et al. | Pp-yoloe: An evolved version of yolo |
| ref-29 | 2022 | Zhang, Hao; Li, Feng; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-30 | 2020 | Zhang, Shifeng; Chi, Cheng; et al. | Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection |
| ref-31 | 2024 | Zhao, Chuyang; Sun, Yifan; et al. | Ms-detr: Efficient detr training with mixed supervision |
| ref-32 | 2024 | Zhao, Yian; Lv, Wenyu; et al. | Detrs beat yolos on real-time object detection |
| ref-33 | 2023 | Zong, Zhuofan; Song, Guanglu; et al. | Detrs with collaborative hybrid assignments training |

## Citation Analysis Report

#### 按功能归类

**Background（背景工作）:**
- YOLO 系列 [1, 11-13, 22, 24, 26]：作为基于 CNN 的单阶段实时检测器主流方法被引用，采用一到多标签分配策略
- DETR [2, 3]：首个基于 Transformer 的端到端目标检测算法，采用集合预测和匈牙利匹配
- RT-DETR [32] 和 RT-DETRv2 [19]：本文方法的基础框架，首个实时端到端 Transformer 检测器及其改进版本
- DETR 变体 [14, 16, 29]：DAB-DETR、DINO、DN-DETR 等通过迭代细化和去噪训练加速收敛
- PPYOLO 系列 [10, 18]：百度基于 PaddlePaddle 的实时检测解决方案

**Component（组件/方法来源）:**
- Co-DETR [33]：提出多并行一到多标签分配辅助头训练策略，直接影响本文设计
- ViT-CoMer [27]：与 Co-DETR 结合达到 SOTA 性能的成功案例
- DAC-DETR [9]、MSDETR [31]、GroupDETR [4]：通过给解码器添加一到多监督加速收敛
- ATSS [30] 和 Faster RCNN [20]：Co-DETR 采用的辅助头策略
- PP-YOLOE [28]：本文 CNN 辅助分支直接采用的密集监督方法
- CSPNet [25]、PAN [17]、RepVGG [6]、SimOTA [7]：YOLO 系列采用的架构组件
- ResNet [8]：本文可使用的 CNN 骨干网络

**Dataset（数据集）:**
- MS COCO [15]：本文实验评估基准数据集
- Objects365 [21]：用于解决过拟合问题的额外训练数据

**Contrast（对比方法）:**
- YOLO-MS [5]、Gold-YOLO [23]：CNN 基实时检测器对比方法

#### 按引用编号列举

- [1] YOLOv4：作为 YOLO 系列代表，说明 CNN 单阶段检测器主流方法
- [2, 3] DETR：首个 Transformer 端到端检测器，无需 NMS 后处理
- [4] GroupDETR：通过分组一到多分配加速 DETR 训练
- [5] YOLO-MS：多尺度表示学习实时检测，对比方法
- [6] RepVGG：YOLOv6 采用的骨干网络组件
- [7] SimOTA：YOLOv6 采用的有效训练策略
- [8] ResNet：本文可使用的 CNN 骨干
- [9] DAC-DETR：通过注意力层分割加速收敛
- [10, 18] PPYOLO 系列：百度 PaddlePaddle 实时检测方案
- [11] YOLOv8：提出 C2f 模块进行特征提取融合
- [12] YOLOv5：采用 CSPNet 和 PAN 优化架构
- [13] YOLOv6：引入 RepVGG 骨干、解耦头、SimOTA
- [14] DN-DETR：通过查询去噪加速 DETR 训练
- [15] MS COCO：实验评估基准数据集
- [16] DAB-DETR：动态锚框作为更好查询
- [17] PAN：特征金字塔聚合网络
- [19] RT-DETRv2：RT-DETR 改进版本，优化训练策略
- [20] Faster R-CNN：经典两阶段检测器，Co-DETR 辅助策略之一
- [21] Objects365：额外训练数据解决过拟合
- [22] YOLOv10：实时端到端检测，YOLO 系列最新工作
- [23] Gold-YOLO：聚集 - 分发机制高效检测器，对比方法
- [24] YOLOv7：E-ELAN 注意力模块和自适应锚点机制
- [25] CSPNet：增强 CNN 学习能力的骨干网络
- [26] YOLOv9：GELAN 架构和 PGI 增强训练
- [27] ViT-CoMer：与 Co-DETR 结合达到 SOTA
- [28] PP-YOLOE：本文 CNN 辅助分支采用的方法
- [29] DINO：改进去噪锚框的 DETR
- [30] ATSS：自适应训练样本选择，Co-DETR 辅助策略
- [31] MSDETR：混合监督高效 DETR 训练
- [32] RT-DETR：本文基础框架，首个实时端到端 Transformer 检测器
- [33] Co-DETR：协作混合分配训练，核心参考工作


# SAM 3: segment anything with concepts (2026)

- Paper ref: 1:HDDAIKQQ
- Title: SAM 3: segment anything with concepts
- Year: 2026

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2022 | United States Environmental Protection Agency | Greenhouse gas equivalencies calculator |
| ref-2 | 2024 | Xiang An; Kaicheng Yang; et al. | Multi-label cluster discrimination for visual representation learning |
| ref-3 | 2023 | Ali Athar; Jonathon Luiten; et al. | Burst: A benchmark for unifying object recognition, segmentation and tracking in video |
| ref-4 | 2021 | Hexin Bai; Wensheng Cheng; et al. | Gmot-40: A benchmark for generic multiple object tracking |
| ref-5 | 2025 | Kevin Barnard; Elaine Liu; et al. | DeepSea MOT: A benchmark dataset for multi-object tracking on deep-sea video |
| ref-6 | 2019 | Philipp Bergmann; Tim Meinhardt,; et al. | Tracking without bells and whistles |
| ref-7 | 2016 | Alex Bewley; Zongyuan Ge; et al. | Simple online and realtime tracking |
| ref-8 | 2024 | Lucas Beyer; Andreas Steiner; et al. | PaliGemma: A versatile 3B VLM for transfer |
| ref-9 | 2020 | Alexey Bochkovskiy; Chien-Yao Wang,; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-10 | 2024 | Daniel Bolya; Chaitanya Ryali; et al. | Window attention is bugged: How not to interpolate position embeddings |
| ref-11 | 2025 | Daniel Bolya; Po-Yao Huang; et al. | Perception encoder: The best visual embeddings are not at the output of the network |
| ref-12 | 2024 | Zhi Cai; Songtao Liu; et al. | Align-detr: Enhancing end-to-end object detection with aligned loss |
| ref-13 | 2023 | Jinkun Cao; Jiangmiao Pang; et al. | Observation-centric sort: Rethinking sort for robust multi-object tracking |
| ref-14 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-15 | 2024 | Qiang Chen; Xiangbo Su; et al. | Lw-detr: A transformer replacement to yolo for real-time detection |
| ref-16 | 2024 | Yi-Chia Chen; Wei-Hua Li; et al. | Sam4mllm: Enhance multi-modal large language model for referring expression segmentation |
| ref-17 | 2025 | Yuming Chen; Jiangyan Feng; et al. | Re-aligning language to visual objects with an agentic workflow |
| ref-18 | 2021 | Bowen Cheng; Alexander G | Schwing, and Alexander Kirillov. Per-pixel classification is not all you need for semantic segmentation |
| ref-19 | 2025 | Jang Hyun Cho; Andrea Madotto; et al. | Perceptionlm: Open-access data and models for detailed visual understanding |
| ref-20 | 2020 | Kevin Clark; Minh-Thang Luong; et al. | ELECTRA: Pre-training text encoders as discriminators rather than generators |
| ref-21 | 2025 | Gheorghe Comanici; Eric Bieber; et al. | Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities |
| ref-22 | 2016 | Marius Cordts; Mohamed Omran; et al. | The cityscapes dataset for semantic urban scene understanding |
| ref-23 | 2022 | Achal Dave; Piotr Dollár; et al. | Evaluating large-vocabulary object detectors: The devil is in the details |
| ref-24 | 2025 | Matt Deitke; Christopher Clark; et al. | Molmo and pixmo: Open weights and open data for state-of-the-art vision-language models |
| ref-25 | 2025 | Henghui Ding; Kaining Ying; et al. | Mosev2: A more challenging dataset for video object segmentation in complex scenes |
| ref-26 | 2023 | Kexin Ding; Mu Zhou; et al. | A large-scale synthetic pathological dataset for deep learning-enabled segmentation of breast cancer. Scientific Data, 10(1):231 |
| ref-27 | 2024 | Shuangrui Ding; Rui Qian; et al. | Sam2long: Enhancing sam 2 for long video segmentation with a training-free memory tree |
| ref-28 | 2022 | Zheng Ding; Jieke Wang,; et al. | Open-vocabulary universal image segmentation with maskclip |
| ref-29 | 2022 | Zi-Yi Dou; Aishwarya Kamath; et al. | Coarse-to-fine vision-language pre-training with fusion in the backbone |
| ref-30 | 2024 | Abhimanyu Dubey; Abhinav Jauhri; et al. | The llama 3 herd of models |
| ref-31 | 2021 | Christoffer Edlund; Timothy R Jackson; et al. | Livecell—a large-scale dataset for label-free live cell segmentation. Nature methods, 18(9):1038–1045 |
| ref-32 | 2017 | Christoph Feichtenhofer; Axel Pinz,; et al. | Detect to track and track to detect |
| ref-33 |  | FFmpeg developers | FFmpeg. https://ffmpeg.org/ |
| ref-34 | 2025 | Shenghao Fu; Qize Yang; et al. | Llmdet: Learning strong open-vocabulary object detectors under the supervision of large language models |
| ref-35 | 2019 | Jevgenij Gamper; Navid Alemi Koohbanani; et al. | Pannuke: an open pan-cancer histology dataset for nuclei instance segmentation and classification |
| ref-36 | 2020 | Jevgenij Gamper; Navid Alemi Koohbanani; et al. | Pannuke dataset extension, insights and baselines |
| ref-37 | 2022 | Kristen Grauman; Andrew Westbury; et al. | V. Jawahar, Hanbyul Joo, Kris Kitani, Haizhou Li, Richard Newcombe, Aude Oliva, Hyun Soo Park, James M. Rehg, Yoichi Sato, Jianbo Shi, Mike Zheng Shou, Antonio Torralba, Lorenzo Torresani, Mingfei Yan, and Jitendra Malik. Ego4d: Around the World in 3,000 Hours of Egocentric Video |
| ref-38 | 2021 | Xiuye Gu; Tsung-Yi Lin; et al. | Open-vocabulary object detection via vision and language knowledge distillation |
| ref-39 | 2019 | Agrim Gupta; Piotr Dollar,; et al. | Lvis: A dataset for large vocabulary instance segmentation |
| ref-40 | 2022 | Kaiming He; Xinlei Chen; et al. | Masked autoencoders are scalable vision learners |
| ref-41 | 2024 | Byeongho Heo; Song Park; et al. | Rotary position embedding for vision transformer |
| ref-42 | 2025 | Miran Heo; Sukjun Hwang; et al. | Autoregressive universal video segmentation model |
| ref-43 | 2024 | Lingyi Hong; Zhongying Liu; et al. | Lvos: A benchmark for large-scale long-term video object segmentation |
| ref-44 | 2020 | Matthew Honnibal; Ines Montani; et al. | spaCy: Industrial-strength Natural Language Processing in Python. 2020. doi: 10.5281/zenodo.1212303 |
| ref-45 | 2017 | Grant Van Horn; Oisin Mac Aodha; et al. | Belongie. The inaturalist challenge 2017 dataset. CoRR, abs/1707.06642 |
| ref-46 | 2023 | Zhengdong Hu; Yifan Sun; et al. | DAC-DETR: Divide the attention layers and conquer |
| ref-47 | 2025 | Jiaqi Huang; Zunnan Xu; et al. | Densely connected parameterefficient tuning for referring image segmentation |
| ref-48 | 2022 | Ding Jia; Yuhui Yuan; et al. | Detrs with hybrid matching |
| ref-49 | 2020 | Menglin Jia; Mengyun Shi; et al. | Belongie. Fashionpedia: Ontology, segmentation, and an attribute localization dataset. CoRR, abs/2004.12276 |
| ref-50 | 2025 | Junjie Jiang; Zelin Wang; et al. | Sam2mot: A novel paradigm of multi-object tracking by segmentation |
| ref-51 | 2024 | Qing Jiang; Feng Li; et al. | T-rex2: Towards generic object detection via text-visual prompt synergy |
| ref-52 | 2020 | Arne Hoffhues Jonathon Luiten | Trackeval. https://github.com/JonathonLuiten/TrackEval |
| ref-53 | 2021 | Aishwarya Kamath; Mannat Singh; et al. | Mdetr-modulated detection for end-to-end multi-modal understanding |
| ref-54 | 2025 | Seil Kang; Jinyeong Kim; et al. | Your large vision-language model only needs a few attention heads for visual grounding |
| ref-55 | 2021 | Kakani Katija; Eric C | Orenstein, Brian Schlining, Lonny Lundsten, Kevin Barnard, Giovanna Sainz, Oceane Boulais, Benjamin G. Woodward, and Katy Croff Bell. Fathomnet: A global underwater image training set for enabling artificial intelligence in the ocean. CoRR, abs/2109.14646 |
| ref-56 | 2014 | Sahar Kazemzadeh; Vicente Ordonez; et al. | Referitgame: Referring to objects in photographs of natural scenes |
| ref-57 | 2022 | Lei Ke; Henghui Ding; et al. | Video mask transfiner for high-quality video instance segmentation |
| ref-58 | 2024 | Alexander Khazatsky; Karl Pertsch; et al. | Zhao, Christopher Agia, Rohan Baijal, Mateo Guaman Castro, Daphne Chen, Qiuyu Chen, Trinity Chung, Jaimyn Drake, Ethan Paul Foster, Jensen Gao, Vitor Guizilini, David Antonio Herrera, Minho Heo, Kyle Hsu, Jiaheng Hu, Muhammad Zubair Irshad, Donovon Jackson, Charlotte Le, Yunshuang Li, Kevin Lin, Roy Lin, Zehan Ma, Abhiram Maddukuri, Suvir Mirchandani, Daniel Morton, Tony Nguyen, Abigail O’Neill, Rosario Scalise, Derick Seale, Victor Son, Stephen Tian, Emi Tran, Andrew E. Wang, Yilin Wu, Annie Xie, Jingyun Yang, Patrick Yin, Yunchu Zhang, Osbert Bastani, Glen Berseth, Jeannette Bohg, Ken Goldberg, Abhinav Gupta, Abhishek Gupta, Dinesh Jayaraman, Joseph J Lim, Jitendra Malik, Roberto Martín-Martín, Subramanian Ramamoorthy, Dorsa Sadigh, Shuran Song, Jiajun Wu, Michael C. Yip, Yuke Zhu, Thomas Kollar, Sergey Levine |
| ref-59 | 2024 | Rawal Khirodkar; Timur Bagautdinov; et al. | Sapiens: Foundation for human vision models |
| ref-60 | 2023 | Alexander Kirillov; Eric Mintun; et al. | Segment anything |
| ref-61 | 2017 | Ranjay Krishna; Yuke Zhu; et al. | Visual genome: Connecting language and vision using crowdsourced dense image annotations. International journal of computer vision, 123(1):32–73 |
| ref-62 | 2020 | Alina Kuznetsova; Hassan Rom; et al. | The open images dataset v4: Unified image classification, object detection, and visual relationship detection at scale. International journal of computer vision, 128(7):1956–1981 |
| ref-63 | 2019 | Alexandre Lacoste; Alexandra Luccioni; et al. | Quantifying the carbon emissions of machine learning |
| ref-64 | 2024 | Xin Lai; Zhuotao Tian; et al. | Lisa: Reasoning segmentation via large language model |
| ref-65 | 2021 | Hoang-An Le; Partha Das; et al. | EDEN: Multimodal Synthetic Dataset of Enclosed garDEN Scenes |
| ref-66 | 2022 | Chunyuan Li; Haotian Liu; et al. | Elevater: A benchmark and toolkit for evaluating language-augmented visual models. Advances in Neural Information Processing Systems, 35:9287–9301 |
| ref-67 | 2023 | Feng Li; Qing Jiang; et al. | Visual in-context prompting. 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pp. 12861–12871 |
| ref-68 | 2025 | Jiachen Li; Qing Xie; et al. | Lgd: Leveraging generative descriptions for zero-shot referring image segmentation |
| ref-69 | 2023 | Junnan Li; Dongxu Li; et al. | Blip-2: Bootstrapping language-image pre-training with frozen image encoders and large language models |
| ref-70 | 2023 | Liunian Li; Zi-Yi Dou; et al. | Desco: Learning object recognition with rich language descriptions. Advances in Neural Information Processing Systems, 36:37511–37526 |
| ref-71 | 2022 | Liunian Harold Li; Pengchuan Zhang; et al. | Grounded language-image pre-training |
| ref-72 | 2022 | Siyuan Li; Martin Danelljan; et al. | Tracking every thing in the wild |
| ref-73 | 2022 | Yanghao Li; Hanzi Mao; et al. | Exploring plain vision transformer backbones for object detection |
| ref-74 | 2023 | Feng Liang; Bichen Wu; et al. | Open-vocabulary semantic segmentation with mask-adapted clip |
| ref-75 |  | LILA BC | WCS camera traps. URL https://lila.science/datasets/wcscameratraps |
| ref-76 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft coco: Common objects in context |
| ref-77 | 2023 | Yutong Lin; Yuhui Yuan; et al. | Detr doesn’t need multi-scale or locality design |
| ref-78 | 2023 | Shilong Liu; Zhaoyang Zeng; et al. | Grounding dino: Marrying dino with grounded pre-training for open-set object detection |
| ref-79 | 2024 | Shilong Liu; Zhaoyang Zeng; et al. | Grounding dino: Marrying dino with grounded pre-training for open-set object detection |
| ref-80 | 2025 | Ting Liu; Siyuan Li | Hybrid global-local representation with augmented spatial guidance for zero-shot referring image segmentation |
| ref-81 | 2024 | Yong Liu; Cairong Zhang; et al. | Universal segmentation at arbitrary granularity with language instruction |
| ref-82 | 2025 | Yuqi Liu; Bohao Peng; et al. | Seg-zero: Reasoning-chain guided segmentation via cognitive reinforcement |
| ref-83 | 2022 | Shangbang Long; Siyang Qin; et al. | Towards end-to-end unified scene text detection and layout analysis |
| ref-84 | 2023 | Shangbang Long; Siyang Qin; et al. | Icdar 2023 competition on hierarchical text detection and recognition |
| ref-85 | 2019 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization. ICLR |
| ref-86 | 2025 | Yi Lu; Jiawang Cao; et al. | Rsvp: Reasoning segmentation via visual prompting and multi-modal chain-of-thought |
| ref-87 | 2021 | Jonathon Luiten; Aljosa Osep; et al. | Hota: A higher order metric for evaluating multi-object tracking. International Journal of Computer Vision, pp. 548–578 |
| ref-88 | 2025 | Jun Ma; Zongxin Yang; et al. | Medsam2: Segment anything in 3d medical images and videos |
| ref-89 | 2016 | Junhua Mao; Jonathan Huang; et al. | Generation and comprehension of unambiguous object descriptions |
| ref-90 | 2023 | Xiaofeng Mao; Yuefeng Chen; et al. | Coco-o: A benchmark for object detectors under natural distribution shifts |
| ref-91 | 2022 | Tim Meinhardt; Alexander Kirillov; et al. | Trackformer: Multi-object tracking with transformers |
| ref-92 | 2022 | Matthias Minderer; Alexey Gritsenko; et al. | Simple open-vocabulary object detection |
| ref-93 | 2024 | Matthias Minderer; Alexey Gritsenko,; et al. | Scaling open-vocabulary object detection |
| ref-94 | 2023 | Chaitanya Mitash; Fan Wang; et al. | Armbench: An object-centric benchmark dataset for robotic manipulation |
| ref-95 | 2019 | Margaret Mitchell; Simone Wu; et al. | Model cards for model reporting |
| ref-96 | 2021 | Sharada Prasanna Mohanty; Gaurav Singhal; et al. | The food recognition benchmark: Using deeplearning to recognize food on images |
| ref-97 | 2014 | Roozbeh Mottaghi; Xianjie Chen; et al. | The role of context for object detection and semantic segmentation in the wild |
| ref-98 | 2022 | Vishvak Murahari; Carlos Jimenez; et al. | Datamux: Data multiplexing for neural networks. NeurIPS |
| ref-99 |  | National Gallery of Art | Public domain collection dataset. URL https://www.nga.gov/artworks/ free-images-and-open-access |
| ref-100 | 2023 | Minheng Ni; Yabo Zhang; et al. | Ref-diff: Zero-shot referring image segmentation with generative models |
| ref-101 | 2024 | Maxime Oquab; Timothée Darcet; et al. | Dinov2: Learning robust visual features without supervision. Transactions on Machine Learning Research |
| ref-102 | 2023 | Roni Paiss; Ariel Ephrat; et al. | Teaching clip to count to ten |
| ref-103 | 2024 | Kwanyong Park; Kuniaki Saito,; et al. | Weak-to-strong compositional learning from generative models for language-based object detection |
| ref-104 | 2021 | David Patterson; Joseph Gonzalez; et al. | Carbon emissions and large neural network training |
| ref-105 | 2025 | Paul Voigtlaender; Valentin Gabeur; et al. | Conversational image segmentation with Gemini 2.5. https: //developers.googleblog.com/en/conversational-image-segmentation-gemini-2-5/ |
| ref-106 | 2020 | Bryan A Plummer; Kevin J Shih; et al. | Revisiting image-language networks for open-ended phrase detection. IEEE transactions on pattern analysis and machine intelligence, 44(4):2155–2167 |
| ref-107 | 2017 | Jordi Pont-Tuset; Federico Perazzi; et al. | The 2017 davis challenge on video object segmentation |
| ref-108 | 2017 | Jordi Pont-Tuset; Federico Perazzi; et al. | The 2017 davis challenge on video object segmentation |
| ref-109 |  | PySceneDetect Developers | PySceneDetect. https://www.scenedetect.com/ |
| ref-110 | 2022 | Jiyang Qi; Yan Gao; et al. | Occluded video instance segmentation: A benchmark. International Journal of Computer Vision |
| ref-111 | 2021 | Alec Radford; Jong Wook Kim; et al. | Learning transferable visual models from natural language supervision |
| ref-112 | 2023 | Vikram V | Ramaswamy, Sing Yu Lin, Dora Zhao, Aaron B. Adcock, Laurens van der Maaten, Deepti Ghadiyaram, and Olga Russakovsky. Geode: a geographically diverse evaluation dataset for object recognition |
| ref-113 | 2021 | Viresh Ranjan; Udbhav Sharma; et al. | Learning to count everything |
| ref-114 | 2024 | Hanoona Rasheed; Muhammad Maaz; et al. | Glamm: Pixel grounding large multimodal model |
| ref-115 | 2024 | Nikhila Ravi; Valentin Gabeur; et al. | SAM 2: Segment anything in images and videos |
| ref-116 | 2024 | Tianhe Ren; Qing Jiang; et al. | Grounding dino 1.5: Advance the" edge" of open-set object detection |
| ref-117 | 2024 | Tianhe Ren; Shilong Liu; et al. | Grounded sam: Assembling open-world models for diverse visual tasks |
| ref-118 | 2025 | Tianhe Ren; Yihao Chen; et al. | Dino-x: A unified vision model for open-world object detection and understanding |
| ref-119 | 2025 | Peter Robicheaux; Matvei Popov; et al. | Roboflow100-vl: A multi-domain object detection benchmark for vision-language models |
| ref-120 | 2015 | Olga Russakovsky; Jia Deng; et al. | Imagenet large scale visual recognition challenge. International journal of computer vision, 115(3):211–252 |
| ref-121 | 2023 | Chaitanya Ryali; Yuan-Ting Hu; et al. | Hiera: A hierarchical vision transformer without the bells-and-whistles. ICML |
| ref-122 | 2019 | Victor Sanh; Lysandre Debut; et al. | Distilbert, a distilled version of bert: smaller, faster, cheaper and lighter. ArXiv, abs/1910.01108 |
| ref-123 | 2023 | Samuel Schulter; Yumin Suh; et al. | Omnilabel: A challenging benchmark for language-based object detection |
| ref-124 | 2019 | Shuai Shao; Zeming Li; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-125 | 2024 | Yunhang Shen; Chaoyou Fu; et al. | Aligning and prompting everything all at once for universal visual perception |
| ref-126 | 2021 | Jianlin Su; Yu Lu; et al. | Roformer: Enhanced transformer with rotary position embedding |
| ref-127 | 2020 | Peize Sun; Jinkun Cao; et al. | Transtrack: Multiple object tracking with transformer |
| ref-128 | 2024 | Shuyang Sun; Runjia Li; et al. | Clip as rnn: Segment countless visual concepts without training endeavor |
| ref-129 | 2023 | Yucheng Suo; Linchao Zhu,; et al. | Text augmented spatial-aware zero-shot referring image segmentation |
| ref-130 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-131 | 2014 | Denny Vrandečić; Markus Krötzsch | Wikidata: a free collaborative knowledgebase. Commun. ACM, 57(10):78–85 |
| ref-132 | 2025 | Hao Wang; Limeng Qiao; et al. | X-sam: From segment anything to any segmentation |
| ref-133 | 2023 | Haochen Wang; Cilin Yan; et al. | Towards open-vocabulary video instance segmentation |
| ref-134 | 2024 | Peng Wang; Shuai Bai; et al. | Qwen2-vl: Enhancing vision-language model’s perception of the world at any resolution |
| ref-135 | 2025 | Shijie Wang; Dahun Kim; et al. | Learning visual grounding from generative vision and language model |
| ref-136 | 2025 | Yuji Wang; Jingchen Ni; et al. | Iterprime: Zero-shot referring image segmentation with iterative grad-cam refinement and primary word emphasis |
| ref-137 | 2025 | Dante Francisco Wasmuht; Otto Brookes; et al. | The SA-FARI dataset: Segment anything in footage of animals for recognition and identification |
| ref-138 | 2024 | Cong Wei; Yujie Zhong; et al. | Hyperseg: Towards universal visual segmentation with large language model |
| ref-139 | 2017 | Nicolai Wojke; Alex Bewley,; et al. | Simple online and realtime tracking with a deep association metric |
| ref-140 | 2024 | Junfeng Wu; Yi Jiang; et al. | General object foundation model for images and videos at scale |
| ref-141 | 2024 | Junfeng Wu; Yi Jiang; et al. | General object foundation model for images and videos at scale |
| ref-142 | 2024 | Zhuofan Xia; Dongchen Han; et al. | Gsva: Generalized segmentation via multimodal large language models |
| ref-143 | 2025 | Yin Xie; Kaicheng Yang; et al. | Region-based cluster discrimination for visual representation learning |
| ref-144 | 2024 | Hu Xu; Po-Yao Huang; et al. | Altogether: Image captioning via re-aligning alt-text |
| ref-145 | 2024 | Hu Xu; Saining Xie; et al. | Demystifying clip data |
| ref-146 | 2018 | N | Xu, L. Yang, Yuchen Fan, Dingcheng Yue, Yuchen Liang, Jianchao Yang, and Thomas S. Huang. Youtube-vos: A large-scale video object segmentation benchmark. ArXiv, abs/1809.03327 |
| ref-147 | 2023 | Yifan Xu; Mengdan Zhang; et al. | Multi-modal queried object detection in the wild. Advances in Neural Information Processing Systems, 36:4452–4469 |
| ref-148 | 2024 | Cheng-Yen Yang; Hsiang-Wei Huang; et al. | Samurai: Adapting segment anything model for zero-shot visual tracking with motion-aware memory |
| ref-149 | 2023 | Jianwei Yang; Hao Zhang; et al. | Set-of-mark prompting unleashes extraordinary visual grounding in gpt-4v |
| ref-150 | 2022 | Zongxin Yang; Yi Yang | Decoupling features in hierarchical propagation for video object segmentation. Advances in Neural Information Processing Systems, 35:36324–36336 |
| ref-151 | 2021 | Zongxin Yang; Yunchao Wei,; et al. | Associating objects with transformers for video object segmentation. NeurIPS |
| ref-152 | 2025 | Heng Yin; Yuqiang Ren; et al. | Rod-mllm: Towards more reliable object detection in multimodal large language models |
| ref-153 | 2023 | En Yu; Tiancai Wang; et al. | Motrv3: Release-fetch supervision for end-to-end multi-object tracking |
| ref-154 | 2020 | Fisher Yu; Haofeng Chen; et al. | Bdd100k: A diverse driving dataset for heterogeneous multitask learning |
| ref-155 | 2023 | Seonghoon Yu; Paul Hongsuck Seo,; et al. | Zero-shot referring image segmentation with global-local context features |
| ref-156 | 2024 | Seonghoon Yu; Paul Hongsuck Seo,; et al. | Pseudo-ris: Distinctive pseudo-supervision generation for referring image segmentation |
| ref-157 | 2022 | Rowan Zellers; Jiasen Lu; et al. | Merlot reserve: Multimodal neural script knowledge through vision and language and sound |
| ref-158 | 2022 | Fangao Zeng; Bin Dong; et al. | Motr: End-to-end multipleobject tracking with transformer |
| ref-159 | 2022 | Xiaohua Zhai; Alexander Kolesnikov; et al. | Scaling vision transformers |
| ref-160 | 2022 | Hao Zhang; Feng Li; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-161 | 2022 | Haotian Zhang; Pengchuan Zhang; et al. | Glipv2: Unifying localization and vision-language understanding. Advances in Neural Information Processing Systems, 35:36067–36080 |
| ref-162 | 2024 | Tao Zhang; Xiangtai Li; et al. | Omg-llava: Bridging image-level, object-level, pixel-level reasoning and understanding. Advances in neural information processing systems, 37:71737–71767 |
| ref-163 | 2022 | Yifu Zhang; Peize Sun; et al. | Bytetrack: Multi-object tracking by associating every detection box |
| ref-164 | 2024 | Yuxuan Zhang; Tianheng Cheng; et al. | Evf-sam: Early vision-language fusion for text-prompted segment anything model |
| ref-165 | 2024 | Zheng Zhang; Yeyao Ma; et al. | Psalm: Pixelwise segmentation with large multi-modal model |
| ref-166 | 2025 | Zhixiong Zhang; Shuangrui Ding; et al. | Sec: Advancing complex video object segmentation via progressive concept construction |
| ref-167 | 2024 | Shiyu Zhao; Long Zhao; et al. | Generating enhanced negatives for training language-based object detectors |
| ref-168 | 2019 | Bolei Zhou; Hang Zhao; et al. | Semantic understanding of scenes through the ade20k dataset. International Journal of Computer Vision, 127(3):302–321 |
| ref-169 | 2025 | Yang Zhou; Shiyu Zhao; et al. | Led: Llm enhanced open-vocabulary object detection without human curated data generation |
| ref-170 | 2021 | Pengfei Zhu; Longyin Wen; et al. | Detection and tracking meet drones challenge. IEEE Transactions on Pattern Analysis and Machine Intelligence, 44(11):7380–7399 |
| ref-171 | 2020 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-172 | 2023 | Xueyan Zou; Jianwei Yang; et al. | Segment everything everywhere all at once. Advances in neural information processing systems, 36:19769–19782 |

## Citation Analysis Report

#### 总体总结
SAM 3 论文通过整合多个研究脉络，构建了一个统一的概念分割框架。论文以 SAM 2 的视频分割能力为基础，引入 Perception Encoder 作为共享视觉骨干，结合 DETR 系列的端到端检测架构，实现了对任意视觉概念的 promptable 分割。在方法设计上，论文借鉴了开放词汇检测的思路，使模型能够处理训练时未见的概念类别。


#### 关键文献

- [AY-4] Daniel Bolya, 2025: Perception encoder: The best visual embeddings are not at the output of the network (Uncategorized)

- [AY-8] Zhi Cai, 2024: Align-detr: Enhancing end-to-end object detection with aligned loss (Uncategorized)

- [AY-14] Zheng Ding, 2022: Open-vocabulary universal image segmentation with maskclip (Uncategorized)

- [AY-15] Xiuye Gu, 2021: Open-vocabulary object detection via vision and language knowledge distillation (Uncategorized)

- [AY-10] Zhengdong Hu, 2023: DAC-DETR: Divide the attention layers and conquer (Uncategorized)

- [AY-7] Aishwarya Kamath, 2021: Mdetr-modulated detection for end-to-end multi-modal understanding (Uncategorized)

- [AY-18] Feng Liang, 2023: Open-vocabulary semantic segmentation with mask-adapted clip (Uncategorized)

- [AY-11] Yutong Lin, 2023: Detr doesn’t need multi-scale or locality design (Uncategorized)

- [AY-19] Matthias Minderer, 2022: Simple open-vocabulary object detection (Uncategorized)

- [AY-3] Matthias Minderer, 2024: Scaling open-vocabulary object detection (Uncategorized)

- [AY-2] Nikhila Ravi, 2024: SAM 2: Segment anything in images and videos (Uncategorized)

- [AY-41] Hao Zhang, 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection (Uncategorized)

- [AY-12] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection (Uncategorized)



#### 范围
- 章节：Introduction + Related Work
- 行号：11-185

#### 按功能归类


##### Background

- [AY-31] Philipp Bergmann, 2019
  - 标题：Tracking without bells and whistles
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-32] Alex Bewley, 2016
  - 标题：Simple online and realtime tracking
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-9] Bowen Cheng, 2021
  - 标题：Schwing, and Alexander Kirillov. Per-pixel classification is not all you need for semantic segmentation
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-34] Christoph Feichtenhofer, 2017
  - 标题：Detect to track and track to detect
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-6] Agrim Gupta, 2019
  - 标题：Lvis: A dataset for large vocabulary instance segmentation
  - 关键词：dataset, training data, benchmark
  - 总结：论文引用这些数据集工作以说明训练数据来源或评估基准。

- [AY-35] Junjie Jiang, 2025
  - 标题：Sam2mot: A novel paradigm of multi-object tracking by segmentation
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-25] Shilong Liu, 2023
  - 标题：Grounding dino: Marrying dino with grounded pre-training for open-set object detection
  - 关键词：visual grounding, referring expression, phrase localization
  - 总结：论文引用视觉定位工作以展示相关研究脉络。

- [AY-36] Tim Meinhardt, 2022
  - 标题：Trackformer: Multi-object tracking with transformers
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-27] Hanoona Rasheed, 2024
  - 标题：Glamm: Pixel grounding large multimodal model
  - 关键词：visual grounding, referring expression, phrase localization
  - 总结：论文引用视觉定位工作以展示相关研究脉络。

- [AY-37] Peize Sun, 2020
  - 标题：Transtrack: Multiple object tracking with transformer
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-38] Nicolai Wojke, 2017
  - 标题：Simple online and realtime tracking with a deep association metric
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-39] En Yu, 2023
  - 标题：Motrv3: Release-fetch supervision for end-to-end multi-object tracking
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。

- [AY-40] Fangao Zeng, 2022
  - 标题：Motr: End-to-end multipleobject tracking with transformer
  - 关键词：video tracking, multi-object tracking
  - 总结：论文引用这些工作以说明视频跟踪领域的现有方法。



##### Uncategorized

- [AY-4] Daniel Bolya, 2025
  - 标题：Perception encoder: The best visual embeddings are not at the output of the network
  - 关键词：Perception Encoder, visual backbone, feature embeddings
  - 总结：SAM 3 的检测器和跟踪器共享 Perception Encoder 骨干网络，提供对齐的视觉 - 语言输入。

- [AY-8] Zhi Cai, 2024
  - 标题：Align-detr: Enhancing end-to-end object detection with aligned loss
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-33] Jinkun Cao, 2023
  - 标题：Observation-centric sort: Rethinking sort for robust multi-object tracking
  - 关键词：tracking-by-detection, SORT, multi-object tracking
  - 总结：论文将 SAM 3 的跟踪方法与传统的 tracking-by-detection 方法进行对比。

- [AY-5] Nicolas Carion, 2020
  - 标题：End-to-end object detection with transformers
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-21] Gheorghe Comanici, 2025
  - 标题：Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities
  - 关键词：MLLM, multimodal, reasoning
  - 总结：SAM 3 可与 MLLM 结合使用以处理更复杂的语言查询。

- [AY-22] Matt Deitke, 2025
  - 标题：Molmo and pixmo: Open weights and open data for state-of-the-art vision-language models
  - 关键词：MLLM, multimodal, reasoning
  - 总结：SAM 3 可与 MLLM 结合使用以处理更复杂的语言查询。

- [AY-14] Zheng Ding, 2022
  - 标题：Open-vocabulary universal image segmentation with maskclip
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-13] Abhimanyu Dubey, 2024
  - 标题：The llama 3 herd of models
  - 关键词：MLLM, multimodal, reasoning
  - 总结：SAM 3 可与 MLLM 结合使用以处理更复杂的语言查询。

- [AY-15] Xiuye Gu, 2021
  - 标题：Open-vocabulary object detection via vision and language knowledge distillation
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-10] Zhengdong Hu, 2023
  - 标题：DAC-DETR: Divide the attention layers and conquer
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-16] Qing Jiang, 2024
  - 标题：T-rex2: Towards generic object detection via text-visual prompt synergy
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-7] Aishwarya Kamath, 2021
  - 标题：Mdetr-modulated detection for end-to-end multi-modal understanding
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-1] Alexander Kirillov, 2023
  - 标题：Segment anything
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-23] Xin Lai, 2024
  - 标题：Lisa: Reasoning segmentation via large language model
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-24] Chunyuan Li, 2022
  - 标题：Elevater: A benchmark and toolkit for evaluating language-augmented visual models. Advances in Neural Information Processing Systems, 35:9287–9301
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-17] Feng Li, 2023
  - 标题：Visual in-context prompting. 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pp. 12861–12871
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-18] Feng Liang, 2023
  - 标题：Open-vocabulary semantic segmentation with mask-adapted clip
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-11] Yutong Lin, 2023
  - 标题：Detr doesn’t need multi-scale or locality design
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-19] Matthias Minderer, 2022
  - 标题：Simple open-vocabulary object detection
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-3] Matthias Minderer, 2024
  - 标题：Scaling open-vocabulary object detection
  - 关键词：open-vocabulary, zero-shot detection, CLIP
  - 总结：SAM 3 与现有开放词汇检测方法相比，在概念分割任务上实现更好性能。

- [AY-26] Bryan A Plummer, 2020
  - 标题：Revisiting image-language networks for open-ended phrase detection. IEEE transactions on pattern analysis and machine intelligence, 44(4):2155–2167
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-20] Alec Radford, 2021
  - 标题：Learning transferable visual models from natural language supervision
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-2] Nikhila Ravi, 2024
  - 标题：SAM 2: Segment anything in images and videos
  - 关键词：SAM 2, promptable segmentation, video segmentation
  - 总结：SAM 3 继承并扩展了 SAM 2 的架构，将跟踪能力与新的概念分割功能结合。

- [AY-28] Junfeng Wu, 2024
  - 标题：General object foundation model for images and videos at scale
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-29] Yifan Xu, 2023
  - 标题：Multi-modal queried object detection in the wild. Advances in Neural Information Processing Systems, 36:4452–4469
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-41] Hao Zhang, 2022
  - 标题：Dino: Detr with improved denoising anchor boxes for end-to-end object detection
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。

- [AY-30] Tao Zhang, 2024
  - 标题：Omg-llava: Bridging image-level, object-level, pixel-level reasoning and understanding. Advances in neural information processing systems, 37:71737–71767
  - 关键词：related work
  - 总结：该文献在相关工作讨论中被引用。

- [AY-12] Xizhou Zhu, 2020
  - 标题：Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词：DETR, transformer, object detection
  - 总结：SAM 3 的检测器遵循 DETR 范式，使用 transformer 进行端到端物体检测。





#### 时间线分析

##### 早期
2016-2019 年的早期工作建立了视频跟踪和 DETR 检测的基础方法。


- [AY-31] Philipp Bergmann, 2019: Tracking without bells and whistles

- [AY-32] Alex Bewley, 2016: Simple online and realtime tracking

- [AY-34] Christoph Feichtenhofer, 2017: Detect to track and track to detect

- [AY-6] Agrim Gupta, 2019: Lvis: A dataset for large vocabulary instance segmentation

- [AY-39] En Yu, 2023: Motrv3: Release-fetch supervision for end-to-end multi-object tracking




##### 中期
2020-2023 年的中期发展包括 DETR 改进、开放词汇检测、SAM 基础模型和跟踪器架构。


- [AY-8] Zhi Cai, 2024: Align-detr: Enhancing end-to-end object detection with aligned loss

- [AY-33] Jinkun Cao, 2023: Observation-centric sort: Rethinking sort for robust multi-object tracking

- [AY-5] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-9] Bowen Cheng, 2021: Schwing, and Alexander Kirillov. Per-pixel classification is not all you need for semantic segmentation

- [AY-14] Zheng Ding, 2022: Open-vocabulary universal image segmentation with maskclip

- [AY-15] Xiuye Gu, 2021: Open-vocabulary object detection via vision and language knowledge distillation

- [AY-10] Zhengdong Hu, 2023: DAC-DETR: Divide the attention layers and conquer

- [AY-35] Junjie Jiang, 2025: Sam2mot: A novel paradigm of multi-object tracking by segmentation

- [AY-7] Aishwarya Kamath, 2021: Mdetr-modulated detection for end-to-end multi-modal understanding

- [AY-1] Alexander Kirillov, 2023: Segment anything

- [AY-18] Feng Liang, 2023: Open-vocabulary semantic segmentation with mask-adapted clip

- [AY-11] Yutong Lin, 2023: Detr doesn’t need multi-scale or locality design

- [AY-25] Shilong Liu, 2023: Grounding dino: Marrying dino with grounded pre-training for open-set object detection

- [AY-36] Tim Meinhardt, 2022: Trackformer: Multi-object tracking with transformers

- [AY-19] Matthias Minderer, 2022: Simple open-vocabulary object detection

- [AY-3] Matthias Minderer, 2024: Scaling open-vocabulary object detection

- [AY-26] Bryan A Plummer, 2020: Revisiting image-language networks for open-ended phrase detection. IEEE transactions on pattern analysis and machine intelligence, 44(4):2155–2167

- [AY-20] Alec Radford, 2021: Learning transferable visual models from natural language supervision

- [AY-37] Peize Sun, 2020: Transtrack: Multiple object tracking with transformer

- [AY-38] Nicolai Wojke, 2017: Simple online and realtime tracking with a deep association metric

- [AY-40] Fangao Zeng, 2022: Motr: End-to-end multipleobject tracking with transformer

- [AY-41] Hao Zhang, 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection

- [AY-12] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection




##### 近期
2024-2025 年的最新进展涵盖 SAM 2、Perception Encoder、多模态大语言模型和新一代检测跟踪系统。


- [AY-4] Daniel Bolya, 2025: Perception encoder: The best visual embeddings are not at the output of the network

- [AY-21] Gheorghe Comanici, 2025: Gemini 2.5: Pushing the frontier with advanced reasoning, multimodality, long context, and next generation agentic capabilities

- [AY-22] Matt Deitke, 2025: Molmo and pixmo: Open weights and open data for state-of-the-art vision-language models

- [AY-13] Abhimanyu Dubey, 2024: The llama 3 herd of models

- [AY-16] Qing Jiang, 2024: T-rex2: Towards generic object detection via text-visual prompt synergy

- [AY-23] Xin Lai, 2024: Lisa: Reasoning segmentation via large language model

- [AY-24] Chunyuan Li, 2022: Elevater: A benchmark and toolkit for evaluating language-augmented visual models. Advances in Neural Information Processing Systems, 35:9287–9301

- [AY-17] Feng Li, 2023: Visual in-context prompting. 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), pp. 12861–12871

- [AY-27] Hanoona Rasheed, 2024: Glamm: Pixel grounding large multimodal model

- [AY-2] Nikhila Ravi, 2024: SAM 2: Segment anything in images and videos

- [AY-28] Junfeng Wu, 2024: General object foundation model for images and videos at scale

- [AY-29] Yifan Xu, 2023: Multi-modal queried object detection in the wild. Advances in Neural Information Processing Systems, 36:4452–4469

- [AY-30] Tao Zhang, 2024: Omg-llava: Bridging image-level, object-level, pixel-level reasoning and understanding. Advances in neural information processing systems, 37:71737–71767


# DINO: DETR with improved DeNoising anchor boxes for end-to-end object detection (2022)

- Paper ref: 1:HPLZ65Z2
- Title: DINO: DETR with improved DeNoising anchor boxes for end-to-end object detection
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Bochkovskiy, A.; Wang, C.-Y.; et al. | Yolov4: Optimal speed and accuracy of object detection |
| ref-2 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-3 | 2019 | Chen, K.; Pang, J.; et al. | Hybrid task cascade for instance segmentation |
| ref-4 | 2019 | Chen, K.; Wang, J.; et al. | Mmdetection: Open mmlab detection toolbox and benchmark |
| ref-5 | 2016 | Chen, T.; Xu, B.; et al. | Training deep nets with sublinear memory cost |
| ref-6 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic head: Unifying object detection heads with attentions |
| ref-7 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic detr: End-to-end object detection with dynamic attention |
| ref-8 | 2009 | Deng, J.; Dong, W.; et al. | Imagenet: A large-scale hierarchical image database |
| ref-9 | 2018 | Devlin, J.; Chang, M.-W.; et al. | Bert: Pretraining of deep bidirectional transformers for language understanding |
| ref-10 | 2021 | Gao, P.; Zheng, M.; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-11 | 2021 | Ge, Z.; Liu, S.; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-12 | 2017 | He, K.; Gkioxari, G.; et al. | Mask r-cnn |
| ref-13 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-14 | 2021 | Kamath, A.; Singh, M.; et al. | Mdetr – modulated detection for end-to-end multi-modal understanding |
| ref-15 | 2014 | Kingma, D.P.; Ba, J. | Adam: A method for stochastic optimization |
| ref-16 | 2022 | Li, F.; Zhang, H.; et al. | Dndetr: Accelerate detr training by introducing query denoising |
| ref-17 | 2020 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-18 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-19 | 2022 | Liu, S.; Li, F.; et al. | DAB-DETR: Dynamic anchor boxes are better queries for DETR |
| ref-20 | 2021 | Liu, Z.; Hu, H.; et al. | Swin transformer v2: Scaling up capacity and resolution |
| ref-21 | 2021 | Liu, Z.; Lin, Y.; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-22 | 2017 | Loshchilov, I.; Hutter, F. | Decoupled weight decay regularization |
| ref-23 | 2021 | Meng, D.; Chen, X.; et al. | Conditional detr for fast training convergence |
| ref-24 | 2018 | Micikevicius, P.; Narang, S.; et al. | Mixed precision training |
| ref-25 | 2021 | Radford, A.; Kim, J.W.; et al. | Learning transferable visual models from natural language supervision |
| ref-26 | 2017 | Redmon, J.; Farhadi, A. | Yolo9000: better, faster, stronger |
| ref-27 | 2018 | Redmon, J.; Farhadi, A. | Yolov3: An incremental improvement |
| ref-28 | 2015 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-29 | 2017 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-30 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union: A metric and a loss for bounding box regression |
| ref-31 | 2019 | Shao, S.; Li, Z.; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-32 | 2020 | Sun, Z.; Cao, S.; et al. | Rethinking transformer-based set prediction for object detection |
| ref-33 | 2019 | Tian, Z.; Shen, C.; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-34 | 2017 | Vaswani, A.; Shazeer, N.; et al. | Attention is all you need |
| ref-35 | 2021 | Wang, Y.; Zhang, X.; et al. | Anchor detr: Query design for transformer-based detector |
| ref-36 | 2021 | Xu, M.; Zhang, Z.; et al. | End-to-end semi-supervised object detection with soft teacher |
| ref-37 | 2021 | Yao, Z.; Ai, J.; et al. | Efficient detr: Improving end-to-end object detector with dense prior |
| ref-38 | 2021 | Yuan, L.; Chen, D.; et al. | Florence: A new foundation model for computer vision |
| ref-39 | 2021 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 按功能归类

**Background（背景与基础）：**
- DETR [3]：开创性端到端 Transformer 检测器，消除手工组件，建模为集合预测任务
- Faster R-CNN [30]：经典两阶段检测器代表，使用 RPN 生成候选框
- Efficient DETR [39]：通过密集先验改进检测器，选择 top-K 特征增强查询
- Conditional DETR [25]：解耦查询的位置和内容信息，加速训练收敛

**Component（DINO 的组成基础）：**
- Deformable DETR [41]：提出可变形注意力机制和查询选择技术，DINO 直接采用
- DAB-DETR [21]：将查询公式化为 4D 动态锚框，DINO 跟随此表示方法
- DN-DETR [17]：引入去噪训练稳定二分匹配，DINO 扩展为对比去噪
- Swin Transformer [23]：提供层次化 Transformer 骨干，DINO 使用 SwinL 变体
- ResNet [14]：基础卷积骨干网络，DINO 使用 ResNet-50 进行基准实验

**Contrast（对比与超越目标）：**
- DyHead [7]：改进后的经典卷积检测器，COCO 上顶尖性能，DETR 需超越的目标
- HTC++ [4]：另一经典 SOTA 检测器框架，与 DyHead 同为 DINO 超越目标
- SwinV2-G [22]：超大模型 SOTA（30 亿参数，70M 私有数据），DINO 以 1/15 参数量实现更好性能
- Florence [40]：海量数据 SOTA（9 亿图像 - 文本对），DINO 以 1/60 骨干数据 +1/5 检测数据实现更好性能

**Dataset（数据集）：**
- COCO [20]：目标检测标准基准，所有主要实验在此进行
- Objects365 [33]：大规模公开检测数据集（1.7M 图像），DINO 预训练使用

#### 按引用编号列举

- [3] DETR：作为 DETR 类检测器的开创性工作被多次引用，定义查询结构、集合预测范式
- [4] HTC++：作为经典 SOTA 检测器被引用，代表 DINO 需超越的目标
- [7] DyHead：作为经典 SOTA 检测器被引用，与 HTC++ 同为性能对比基线
- [14] ResNet：作为基础骨干网络被引用，用于 DINO 基础实验
- [17] DN-DETR：作为 DINO 的直接基础被频繁引用，去噪训练方法被扩展为对比去噪
- [20] COCO：作为标准基准数据集被引用，所有实验在此进行
- [21] DAB-DETR：作为 DINO 的直接基础被引用，4D 锚框表示被采用
- [22] SwinV2-G：作为 SOTA 对比目标被引用，DINO 以更小模型实现更好性能
- [23] Swin Transformer：作为骨干网络被引用，SwinL 变体用于大规模实验
- [25] Conditional DETR：作为查询结构分析的基础被引用
- [30] Faster R-CNN：作为经典检测器代表被引用，性能对比基线
- [33] Objects365：作为预训练数据集被引用，DINO 实现 SOTA 的关键
- [39] Efficient DETR：作为查询选择技术的早期探索被引用
- [40] Florence：作为海量数据 SOTA 被引用，DINO 以更少数据实现更好性能
- [41] Deformable DETR：作为 DINO 的直接基础被频繁引用，可变形注意力和查询选择被采用


# DETR for crowd pedestrian detection (2021)

- Paper ref: 1:I4ZU2PCY
- Title: DETR for crowd pedestrian detection
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 |  | Wikipedia | Hungarian algorithm |
| ref-2 | 2017 | Bodla, N.; Singh, B.; et al. | Soft-nms–improving object detection with one line of code |
| ref-3 | 2019 | Cai, Z.; Vasconcelos, N. | Cascade r-cnn: High quality object detection and instance segmentation |
| ref-4 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-5 | 2020 | Chi, C.; Zhang, S.; et al. | Relational learning for joint head and human detection |
| ref-6 | 2020 | Chi, C.; Zhang, S.; et al. | Pedhunter: Occlusion robust pedestrian detector in crowded scenes |
| ref-7 | 2017 | Dai, J.; Qi, H.; et al. | Deformable convolutional networks |
| ref-8 | 2011 | Dollar, P.; Wojek, C.; et al. | Pedestrian detection: An evaluation of the state of the art |
| ref-9 | 2019 | Duan, K.; Bai, S.; et al. | Centernet: Keypoint triplets for object detection |
| ref-10 | 2019 | Ghiasi, G.; Lin, T.-Y.; et al. | Nas-fpn: Learning scalable feature pyramid architecture for object detection |
| ref-11 | 2015 | Girshick, R. | Fast r-cnn |
| ref-12 | 2014 | Girshick, R.; Donahue, J.; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-13 | 2017 | He, K.; Gkioxari, G.; et al. | Mask r-cnn |
| ref-14 | 2015 | He, K.; Zhang, X.; et al. | Spatial pyramid pooling in deep convolutional networks for visual recognition |
| ref-15 | 2018 | He, Y.; Zhang, X.; et al. | Softer-nms: Rethinking bounding box regression for accurate object detection |
| ref-16 | 2018 | Hu, H.; Gu, J.; et al. | Relation networks for object detection |
| ref-17 | 2020 | Huang, X.; Ge, Z.; et al. | Nms by representative region: Towards crowded pedestrian detection by proposal pairing |
| ref-18 | 2019 | Huang, Z.; Huang, L.; et al. | Mask scoring r-cnn |
| ref-19 | 2018 | Jiang, B.; Luo, R.; et al. | Acquisition of localization confidence for accurate object detection |
| ref-20 | 2018 | Li, B.; Liu, Y.; et al. | Gradient harmonized single-stage detector |
| ref-21 | 2017 | Lin, T.-Y.; Dollar, P.; et al. | Feature pyramid networks for object detection |
| ref-22 | 2017 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-23 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-24 | 2019 | Liu, S.; Huang, D.; et al. | Adaptive nms: Refining pedestrian detection in a crowd |
| ref-25 | 2016 | Liu, W.; Anguelov, D.; et al. | Ssd: Single shot multibox detector |
| ref-26 | 2018 | Liu, W.; Liao, S.; et al. | Learning efficient single-stage pedestrian detectors by asymptotic localization fitting |
| ref-27 | 2019 | Liu, W.; Liao, S.; et al. | High-level semantic feature detection: A new perspective for pedestrian detection |
| ref-28 | 2019 | Pang, Y.; Xie, J.; et al. | Mask-guided attention network for occluded pedestrian detection |
| ref-29 | 2016 | Redmon, J.; Divvala, S.; et al. | You only look once: Unified, real-time object detection |
| ref-30 | 2015 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-31 | 2018 | Shao, S.; Zhao, Z.; et al. | Crowdhuman: A benchmark for detecting human in a crowd |
| ref-32 | 2018 | Song, T.; Sun, L.; et al. | Small-scale pedestrian detection based on topological line localization and temporal feature aggregation |
| ref-33 | 2016 | Stewart, R.; Andriluka, M.; et al. | End-to-end people detection in crowded scenes |
| ref-34 | 2019 | Tian, Z.; Shen, C.; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-35 | 2017 | Vaswani, A.; Shazeer, N.; et al. | Attention is all you need |
| ref-36 | 2018 | Wang, X.; Xiao, T.; et al. | Repulsion loss: Detecting pedestrians in a crowd |
| ref-37 | 2020 | Xu, Z.; Li, B.; et al. | Beta r-cnn: Looking into pedestrian detection from another perspective |
| ref-38 | 2016 | Zhang, S.; Benenson, R.; et al. | How far are we from solving pedestrian detection? |
| ref-39 | 2017 | Zhang, S.; Benenson, R.; et al. | Citypersons: A diverse dataset for pedestrian detection |
| ref-40 | 2018 | Zhang, S.; Wen, L.; et al. | Occlusion-aware r-cnn: detecting pedestrians in a crowd |
| ref-41 | 2019 | Zhou, X.; Wang, D.; et al. | Objects as points |
| ref-42 | 2019 | Zhu, X.; Hu, H.; et al. | Deformable convnets v2: More deformable, better results |
| ref-43 | 2020 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

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


# DAB-DETR: dynamic anchor boxes are better queries for DETR (2022)

- Paper ref: 1:IY3FMWQM
- Title: DAB-DETR: dynamic anchor boxes are better queries for DETR
- Year: 2022

## Compact References

_No references artifact rows available._

## Citation Analysis Report

#### 总体总结
本文围绕DETR查询设计这一核心问题组织引文脉络。首先用早期卷积检测器（Fast R-CNN、YOLO、Faster R-CNN）和Transformer架构铺出技术背景，说明传统检测器的显著进展以及DETR带来的范式转变。接着将直接改进DETR收敛速度的工作（Sun等人的编码器分析、Conditional DETR、Deformable DETR、Anchor DETR等）并置比较，指出它们都试图让查询更明确关联空间位置但各有局限。最后借几篇关键文献（DETR原论文、Conditional DETR、Anchor DETR、Deformable DETR）把本文的动态锚框查询方法明确定位为在保留标准交叉注意力的同时引入4D锚框和尺寸调制的独特路线。


#### 关键文献

- [AY-2] Nicolas Carion, 2020: End-to-end object detection with transformers (Component)

- [AY-5] Joseph Redmon, 2016: You only look once: Unified, real-time object detection (Contrast)

- [AY-11] Zhuyu Yao, 2021: Efficient detr: Improving end-to-end object detector with dense prior (Contrast)

- [AY-10] Xizhou Zhu, 2021: Deformable detr: Deformable transformers for end-to-end object detection (Contrast)



#### 范围
- 章节: Introduction through Conclusion + Appendix
- 行号: 1-349

#### 按功能归类


##### Background

- [AY-1] Alexey Bochkovskiy, 2020
  - 标题: Yolov4: Optimal speed and accuracy of object detection
  - 关键词: YOLO, convolutional detector, real-time detection
  - 总结: 该工作被用作卷积检测器路线的代表，说明传统检测器在过去十年取得的显著进展

- [AY-3] Zheng Ge, 2021
  - 标题: Yolox: Exceeding yolo series in 2021
  - 关键词: YOLOX, anchor-free, decoupled head
  - 总结: 该工作被用作现代卷积检测器的代表，说明传统方法仍在不断进步

- [AY-4] Ross Girshick, 2015
  - 标题: Fast r-cnn
  - 关键词: Fast R-CNN, two-stage detector, ROI pooling
  - 总结: 该工作被用来代表经典卷积检测器路线，说明过去十年的显著进展

- [AY-6] Shaoqing Ren, 2017
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: YOLO, one-stage detector, real-time
  - 总结: YOLO被用作经典单阶段检测器的代表，说明卷积架构的广泛影响

- [AY-21] Hamid Rezatofighi, 2019
  - 标题: Generalized intersection over union: A metric and a loss for bounding box regression
  - 关键词: Faster R-CNN, region proposal, anchor-based
  - 总结: Faster R-CNN被用作anchor-based检测器的代表，与DETR的anchor-free方法形成对比



##### Component

- [AY-2] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, transformer detector, set prediction
  - 总结: DETR是本文的直接基线，提出了基于Transformer的端到端检测框架，但存在训练收敛慢的问题

- [AY-18] Kaiming He, 2015
  - 标题: Delving deep into rectifiers: Surpassing human-level performance on imagenet classification
  - 关键词: ResNet, residual learning, backbone
  - 总结: ResNet是本文实验中使用的主干网络，提供基础特征提取能力

- [AY-12] Kaiming He, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, deep residual, backbone
  - 总结: 该工作提出深度残差学习，是本文实验中ResNet-101骨干的基础

- [AY-19] Tsung-Yi Lin, 2020
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, class imbalance, dense detection
  - 总结: 该工作提出的focal loss在部分DETR变体中被使用，本文实验设置中也有涉及

- [AY-20] Ilya Loshchilov, 2018
  - 标题: Decoupled weight decay regularization
  - 关键词: AdamW, weight decay, optimizer
  - 总结: AdamW优化器是本文训练过程中使用的优化方法

- [AY-13] Peize Sun, 2021
  - 标题: Sparse r-cnn: End-to-end object detection with learnable proposals
  - 关键词: GIoU, bounding box regression, loss function
  - 总结: GIoU损失是DETR类方法中常用的边界框回归损失

- [AY-9] Yingming Wang, 2021
  - 标题: Anchor detr: Query design for transformer-based detector
  - 关键词: Transformer, self-attention, sequence modeling
  - 总结: Transformer是DETR和本文方法的核心架构，提供注意力计算机制



##### Contrast

- [AY-23] Xiyang Dai, 2021
  - 标题: Dynamic detr: End-to-end object detection with dynamic attention
  - 关键词: dynamic attention, ROI pooling, DETR variant
  - 总结: 该工作使用ROI池化进行特征提取，与本文的软交叉注意力方法形成对比

- [AY-7] Peng Gao, 2021
  - 标题: Fast convergence of detr with spatially modulated co-attention
  - 关键词: spatial modulation, co-attention, Gaussian prior
  - 总结: 该工作通过在交叉注意力中应用预定义高斯图加速训练，但未考虑目标尺度信息

- [AY-8] Depu Meng, 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: DETR analysis, cross-attention, convergence
  - 总结: 该工作分析了DETR慢收敛的原因，指出交叉注意力模块是主要问题

- [AY-5] Joseph Redmon, 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: conditional DETR, reference point, decoupled attention
  - 总结: Conditional DETR通过解耦注意力公式生成基于参考坐标的位置查询，是本文的直接对比基线

- [AY-14] Zhiqing Sun, 2020
  - 标题: Rethinking transformer-based set prediction for object detection
  - 关键词: Sparse R-CNN, learnable proposals, hard ROI align
  - 总结: Sparse R-CNN也直接学习锚框，但放弃了Transformer结构，使用硬ROI对齐进行特征提取

- [AY-15] Zhi Tian, 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: encoder-only, DETR analysis, convergence
  - 总结: 该工作指出交叉注意力模块是DETR慢收敛的主因，但通过移除解码器来加速训练

- [AY-17] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: FCOS, anchor-free, one-stage
  - 总结: FCOS被用作anchor point检测器的代表，与anchor box方法形成对比

- [AY-11] Zhuyu Yao, 2021
  - 标题: Efficient detr: Improving end-to-end object detector with dense prior
  - 关键词: Anchor DETR, 2D anchor points, concurrent work
  - 总结: Anchor DETR是并发工作，也建议直接学习锚点，但忽略了锚框的宽高信息

- [AY-16] Xingyi Zhou, 2019
  - 标题: Objects as points
  - 关键词: Efficient DETR, dense prior, top-K selection
  - 总结: Efficient DETR引入密集预测模块选择top-K位置作为对象查询，将查询与位置信息关联

- [AY-10] Xizhou Zhu, 2021
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, deformable attention, multi-scale
  - 总结: Deformable DETR引入4D锚框和可变形注意力，本文在此基础上提出DAB-Deformable-DETR变体



##### Dataset

- [AY-22] Tsung-Yi Lin, 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, object detection dataset, benchmark
  - 总结: COCO是本文实验的标准数据集，用于训练和评估所有模型





#### 时间线分析

##### 早期
早期工作奠定了卷积检测器的基础（Fast R-CNN、YOLO、Faster R-CNN）以及Transformer架构的提出（Attention is All You Need）。ResNet的残差学习为后续检测器骨干网络提供了标准选择。这些工作建立了目标检测领域的主流卷积范式。


- [AY-4] Ross Girshick, 2015: Fast r-cnn

- [AY-18] Kaiming He, 2015: Delving deep into rectifiers: Surpassing human-level performance on imagenet classification

- [AY-12] Kaiming He, 2016: Deep residual learning for image recognition

- [AY-6] Shaoqing Ren, 2017: Faster r-cnn: Towards real-time object detection with region proposal networks

- [AY-21] Hamid Rezatofighi, 2019: Generalized intersection over union: A metric and a loss for bounding box regression

- [AY-9] Yingming Wang, 2021: Anchor detr: Query design for transformer-based detector




##### 中期
中期工作引入了anchor-free检测思想（FCOS、Objects as Points）以及DETR开创性的Transformer端到端检测范式。同时，GIoU损失、Focal Loss等改进边界回归和类别不平衡的技术被提出。Sun等人分析了DETR慢收敛的原因，为后续改进提供了分析基础。


- [AY-1] Alexey Bochkovskiy, 2020: Yolov4: Optimal speed and accuracy of object detection

- [AY-2] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-22] Tsung-Yi Lin, 2014: Microsoft coco: Common objects in context

- [AY-19] Tsung-Yi Lin, 2020: Focal loss for dense object detection

- [AY-20] Ilya Loshchilov, 2018: Decoupled weight decay regularization

- [AY-8] Depu Meng, 2021: Conditional detr for fast training convergence

- [AY-13] Peize Sun, 2021: Sparse r-cnn: End-to-end object detection with learnable proposals

- [AY-15] Zhi Tian, 2019: Fcos: Fully convolutional one-stage object detection

- [AY-17] Ashish Vaswani, 2017: Attention is all you need




##### 近期
近期工作集中在DETR的快速收敛改进上，包括Conditional DETR的条件空间查询、Deformable DETR的可变形注意力、Anchor DETR的2D锚点学习、Sparse R-CNN的可学习提议、Dynamic DETR的动态注意力、SMCA的空间调制共注意力以及Efficient DETR的密集先验选择。这些工作都试图让DETR查询更明确地与空间位置关联。


- [AY-23] Xiyang Dai, 2021: Dynamic detr: End-to-end object detection with dynamic attention

- [AY-7] Peng Gao, 2021: Fast convergence of detr with spatially modulated co-attention

- [AY-3] Zheng Ge, 2021: Yolox: Exceeding yolo series in 2021

- [AY-5] Joseph Redmon, 2016: You only look once: Unified, real-time object detection

- [AY-14] Zhiqing Sun, 2020: Rethinking transformer-based set prediction for object detection

- [AY-11] Zhuyu Yao, 2021: Efficient detr: Improving end-to-end object detector with dense prior

- [AY-16] Xingyi Zhou, 2019: Objects as points

- [AY-10] Xizhou Zhu, 2021: Deformable detr: Deformable transformers for end-to-end object detection


# Center-based 3D Object Detection and Tracking (2021)

- Paper ref: 1:J6DSFFBH
- Title: Center-based 3D Object Detection and Tracking
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | Mayank Bansal; Alex Krizhevsky; et al. | Chauffeurnet: Learning to drive by imitating the best and synthesizing the worst |
| ref-2 | 2019 | Philipp Bergmann; Tim Meinhardt; et al. | Tracking without bells and whistles |
| ref-3 |  | Keni Bernardin; Alexander Elbs; et al. | Multiple object tracking performance metrics and evaluation in a smart room environment. Citeseer. 5 |
| ref-4 | 2016 | Alex Bewley; Zongyuan Ge; et al. | Simple online and realtime tracking |
| ref-5 | 2020 | Alex Bewley; Pei Sun; et al. | Range conditioned dilated convolutions for scale invariant 3d object detection |
| ref-6 | 2020 | Holger Caesar; Varun Bankiti; et al. | nuscenes: A multimodal dataset for autonomous driving |
| ref-7 | 2020 | Qi Chen; Lin Sun; et al. | Every view counts: Cross-view consistency in 3d object detection with hybrid-cylindrical-spherical voxelization |
| ref-8 | 2020 | Qi Chen; Lin Sun; et al. | Object as hotspots: An anchor-free 3d object detection approach via firing of hotspots |
| ref-9 | 2019 | Yilun Chen; Shu Liu; et al. | Fast point r-cnn |
| ref-10 | 2020 | Hsu-kuang Chiu; Antonio Prioletti; et al. | Probabilistic 3d multi-object tracking for autonomous driving |
| ref-11 | 2017 | Jifeng Dai; Haozhi Qi; et al. | Deformable convolutional networks |
| ref-12 | 2017 | Martin Engelcke; Dushyant Rao; et al. | Vote3deep: Fast object detection in 3d point clouds using efficient convolutional neural networks |
| ref-13 | 2010 | Mark Everingham; Luc Van Gool; et al. | The pascal visual object classes (voc) challenge |
| ref-14 | 2020 | Runzhou Ge; Zhuangzhuang Ding; et al. | Afdet: Anchor free one stage 3d object detection |
| ref-15 | 2012 | Andreas Geiger; Philip Lenz; et al. | Are we ready for autonomous driving? the kitti vision benchmark suite |
| ref-16 | 2015 | Ross Girshick | Fast r-cnn |
| ref-17 | 2014 | Ross Girshick; Jeff Donahue; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-18 | 2018 |  | Benjamin Graham, Martin Engelcke, and Laurens van der Maaten. 3d semantic segmentation with submanifold sparse convolutional networks |
| ref-19 | 2018 | Sylvain Gugger | The 1cycle policy. https://sgugger. github.io/the-1cycle-policy.html |
| ref-20 | 2020 | Chenhang He; Hui Zeng; et al. | Structure aware single-stage 3d object detection from point cloud |
| ref-21 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask r-cnn |
| ref-22 | 2012 | Geoffrey E Hinton; Nitish Srivastava; et al. | Improving neural networks by preventing co-adaptation of feature detectors |
| ref-23 | 2020 | Peiyun Hu; Jason Ziglar; et al. | What you see is what you get: Exploiting visibility for 3d object detection |
| ref-24 | 2020 |  | Rui Huang, Wanyue Zhang, Abhijit Kundu, Caroline Pantofaru, David A Ross, Thomas Funkhouser, and Alireza Fathi. An lstm approach to temporal 3d object detection in lidar point clouds |
| ref-25 | 2015 | Sergey Ioffe; Christian Szegedy | Batch normalization: Accelerating deep network training by reducing internal covariate shift |
| ref-26 | 2018 | Borui Jiang; Ruixuan Luo; et al. | Acquisition of localization confidence for accurate object detection |
| ref-27 | 2019 | H. Karunasekera; H. Wang; et al. | Zhang. Multiple object tracking with attention to appearance, structure, motion and size |
| ref-28 | 2019 | Alex H. Lang; Sourabh Vora; et al. | Pointpillars: Fast encoders for object detection from point clouds |
| ref-29 | 2018 | Hei Law; Jia Deng | Cornernet: Detecting objects as paired keypoints |
| ref-30 | 2019 | Buyu Li; Wanli Ouyang; et al. | Gs3d: An efficient 3d object detection framework for autonomous driving |
| ref-31 | 2019 | Ming Liang; Bin Yang; et al. | Multi-task multi-sensor fusion for 3d object detection |
| ref-32 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-33 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Ssd: Single shot multibox detector |
| ref-34 | 2019 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-35 | 2020 | Mahyar Najibi; Guangda Lai; et al. | Dops: Learning to detect 3d objects and predict their 3d shapes |
| ref-36 | 2019 | Jiquan Ngiam; Benjamin Caine; et al. | Starnet: Targeted computation for object detection in point clouds |
| ref-37 | 2020 | Jonah Philion; Amlan Kar; et al. | Learning to evaluate perception models using planner-centric metrics |
| ref-38 | 2019 | Charles R. Qi; Or Litany; et al. | Deep hough voting for 3d object detection in point clouds |
| ref-39 | 2018 | Charles R Qi; Wei Liu; et al. | Frustum pointnets for 3d object detection from rgb-d data |
| ref-40 | 2017 | Charles R Qi; Hao Su; et al. | Pointnet: Deep learning on point sets for 3d classification and segmentation |
| ref-41 | 2017 | Charles Ruizhongtai Qi; Li Yi; et al. | Pointnet++: Deep hierarchical feature learning on point sets in a metric space |
| ref-42 | 2017 | Joseph Redmon; Ali Farhadi | Yolo9000: better, faster, stronger |
| ref-43 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-44 | 2020 | Shaoshuai Shi; Chaoxu Guo; et al. | Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection |
| ref-45 | 2019 | Shaoshuai Shi; Xiaogang Wang; et al. | Pointrcnn: 3d object proposal generation and detection from point cloud |
| ref-46 | 2020 | Shaoshuai Shi; Zhe Wang; et al. | From points to parts: 3d object detection from point cloud with part-aware and part-aggregation network |
| ref-47 | 2018 | Martin Simony; Stefan Milzy; et al. | Complex-yolo: An euler-region-proposal for real-time 3d object detection on point clouds |
| ref-48 | 2020 | Pei Sun; Henrik Kretzschmar; et al. | Scalability in perception for autonomous driving: An open dataset benchmark |
| ref-49 | 2020 | Sourabh Vora; Alex H Lang; et al. | Pointpainting: Sequential fusion for 3d object detection |
| ref-50 | 2019 | Dequan Wang; Coline Devin; et al. | Monocular plan view networks for autonomous driving |
| ref-51 | 2015 | Dominic Zeng Wang; Ingmar Posner | Voting for voting in online point cloud object detection |
| ref-52 | 2020 | Yue Wang; Alireza Fathi; et al. | Pillarbased object detection for autonomous driving |
| ref-53 | 2020 |  | Xinshuo Weng and Kris Kitani. A Baseline for 3D Multi-Object Tracking |
| ref-54 | 2017 | Nicolai Wojke; Alex Bewley; et al. | Simple online and realtime tracking with a deep association metric |
| ref-55 | 2019 | Kelvin Wong; Shenlong Wang; et al. | Identifying unknown instances for autonomous driving |
| ref-56 | 2018 | Yan Yan; Yuxing Mao; et al. | Second: Sparsely embedded convolutional detection |
| ref-57 | 2018 | Bin Yang; Wenjie Luo; et al. | Pixor: Real-time 3d object detection from point clouds |
| ref-58 | 2019 | Xue Yang; Qingqing Liu; et al. | R3det: Refined single-stage detector with feature refinement for rotating object |
| ref-59 | 2019 | Xue Yang; Jirui Yang; et al. | Scrdet: Towards more robust detection for small, cluttered and rotated objects |
| ref-60 | 2020 |  | Zetong Yang, Yanan Sun, Shu Liu, and Jiaya Jia. 3dssd: Point-based 3d single stage object detector |
| ref-61 | 2019 | Zetong Yang; Yanan Sun; et al. | Std: Sparse-to-dense 3d object detector for point cloud |
| ref-62 | 2020 | Junbo Yin; Jianbing Shen; et al. | Lidar-based online 3d video object detection with graph-based message passing and spatiotemporal transformer attention |
| ref-63 | 2020 | Xingyi Zhou; Vladlen Koltun; et al. | Tracking objects as points |
| ref-64 | 2019 | Xingyi Zhou; Dequan Wang; et al. | Objects as points |
| ref-65 | 2019 | Yin Zhou; Pei Sun; et al. | End-to-end multi-view fusion for 3d object detection in lidar point clouds |
| ref-66 | 2018 | Yin Zhou; Oncel Tuzel | Voxelnet: End-to-end learning for point cloud based 3d object detection |
| ref-67 | 2019 | Benjin Zhu; Zhengkai Jiang; et al. | Class-balanced grouping and sampling for point cloud 3d object detection |
| ref-68 | 2020 | Xinge Zhu; Yuexin Ma; et al. | Ssn: Shape signature networks for multi-class object detection from point clouds |

## Citation Analysis Report

#### 总体总结
本文在引言与相关工作部分通过层次递进的方式组织了引文网络：首先以2D检测的经典路线（R-CNN系列、YOLO、SSD、Focal Loss）建立领域背景，指出2D轴对齐框在3D场景中的局限性；然后系统梳理了3D编码器的演进路线，从Vote3Deep的投票机制到VoxelNet的端到端体素学习，再到SECOND的稀疏卷积加速和PointPillars的柱状编码，展示了从3D卷积到2D鸟瞰图特征的技术收敛趋势；接着聚焦于直接相关的中心点检测路线，重点引用了CenterNet和CenterTrack的工作，将其作为本文方法的直接基础；最后通过对比两阶段检测器（PointRCNN、PV-RCNN）和专用3D跟踪器（卡尔曼滤波方案），凸显本文方法在简洁性和效率上的优势。


#### 关键文献

- [64] Xingyi Zhou, 2019: Objects as points (Baseline)

- [63] Xingyi Zhou, 2020: Tracking objects as points (Baseline)

- [66] Yin Zhou, 2018: Voxelnet: End-to-end learning for point cloud based 3d object detection (Baseline)

- [28] Alex H. Lang, 2019: Pointpillars: Fast encoders for object detection from point clouds (Baseline)

- [44] Shaoshuai Shi, 2020: Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection (Baseline)



#### 范围
- 章节: Introduction + Related Work + Preliminaries
- 行号: 13-51

#### 按功能归类


##### Background

- [1] Mayank Bansal, 2019
  - 标题: Chauffeurnet: Learning to drive by imitating the best and synthesizing the worst
  - 关键词: imitation learning, 自动驾驶系统, 驾驶策略
  - 总结: 本文引用该工作来说明强大的3D感知是许多先进驾驶系统的核心组成部分，以此确立3D检测在自动驾驶中的重要性，为全文研究动机提供背景支撑

- [12] Martin Engelcke, 2017
  - 标题: Vote3deep: Fast object detection in 3d point clouds using efficient convolutional neural networks
  - 关键词: feature voting, voxel-based, 3D检测编码器
  - 总结: 本文引用该工作作为3D检测器编码器演进的代表之一，说明其利用特征中心投票机制在均匀3D体素上高效处理稀疏点云，本文的贡献则聚焦于输出表示层而非编码器

- [20] Chenhang He, 2020
  - 标题: Structure aware single-stage 3d object detection from point cloud
  - 关键词: single-stage 3D检测, 结构感知, point cloud
  - 总结: 本文引用该工作作为从2D检测器演化而来的3D检测器代表之一，用于说明3D检测器的发展脉络；同时用于描述现代3D检测器使用3D编码器将点云量化为规则体的通用架构

- [23] Peiyun Hu, 2020
  - 标题: What you see is what you get: Exploiting visibility for 3d object detection
  - 关键词: visibility-aware, 3D感知, 遮挡处理
  - 总结: 本文引用该工作作为先进3D感知系统的代表之一，用其说明3D检测面临点云稀疏性、输出不对齐全局坐标系、目标尺寸形状多样等挑战

- [31] Ming Liang, 2019
  - 标题: Multi-task multi-sensor fusion for 3d object detection
  - 关键词: multi-sensor fusion, 多任务学习, 3D检测
  - 总结: 本文引用该工作作为3D旋转边界框预测任务的代表性方法之一，在列举3D检测相关工作时被引用

- [39] Charles R Qi, 2018
  - 标题: Frustum pointnets for 3d object detection from rgb-d data
  - 关键词: Frustum PointNets, RGB-D, 视锥体检测
  - 总结: 本文引用该工作作为3D旋转边界框预测任务的代表性方法之一，在列举3D检测相关工作时被引用

- [50] Dequan Wang, 2019
  - 标题: Monocular plan view networks for autonomous driving
  - 关键词: monocular BEV, 俯视图, 单目3D感知
  - 总结: 本文引用该工作作为先进自动驾驶系统的代表之一，说明强大的3D感知是自动驾驶系统的核心组件

- [51] Dominic Zeng Wang, 2015
  - 标题: Voting for voting in online point cloud object detection
  - 关键词: feature-centric voting, 在线检测, 投票机制
  - 总结: 本文引用该工作作为特征中心投票机制的代表，说明Vote3Deep利用该方法在均匀3D体素上高效处理稀疏3D点云

- [52] Yue Wang, 2020
  - 标题: Pillarbased object detection for autonomous driving
  - 关键词: pillar-based, 多视图特征, 自动驾驶
  - 总结: 本文引用该工作作为柱体表示方法演进的代表，说明Pillar-OD结合多视图特征学习更有效的柱体表示

- [58] Xue Yang, 2019
  - 标题: R3det: Refined single-stage detector with feature refinement for rotating object
  - 关键词: 旋转目标检测, R3Det, 特征精炼
  - 总结: 本文引用该工作作为为每个方向分类不同模板会增加计算负担并可能引入大量假阳性的例子，用以论证轴对齐2D框不适合作为自由形态3D目标的代理

- [59] Xue Yang, 2019
  - 标题: Scrdet: Towards more robust detection for small, cluttered and rotated objects
  - 关键词: 旋转目标检测, SCRDet, 小目标检测
  - 总结: 本文引用该工作作为为每个方向分类不同模板会增加计算负担并可能引入大量假阳性的例子，用以论证轴对齐2D框不适合作为自由形态3D目标的代理

- [65] Yin Zhou, 2019
  - 标题: End-to-end multi-view fusion for 3d object detection in lidar point clouds
  - 关键词: MVF, 多视图融合, 端到端学习
  - 总结: 本文引用该工作作为多视图特征融合学习更有效柱体表示的代表，说明MVF结合多视图特征来学习更有效的柱体表示，本文的贡献聚焦于输出表示层而非编码器



##### Baseline

- [2] Philipp Bergmann, 2019
  - 标题: Tracking without bells and whistles
  - 关键词: SORT, 多目标跟踪, online tracking
  - 总结: 本文引用该工作作为可直接用于3D目标跟踪的2D跟踪算法的代表之一，说明2D跟踪算法在3D场景中的适用性，但本文采用了更简单高效的CenterTrack方案

- [4] Alex Bewley, 2016
  - 标题: Simple online and realtime tracking
  - 关键词: SORT, 多目标跟踪, 2D tracking
  - 总结: 本文引用该工作作为可直接用于3D目标跟踪的2D跟踪算法的代表之一，与多个2D跟踪方法一起被引用，用以说明2D跟踪算法的通用性

- [10] Hsu-kuang Chiu, 2020
  - 标题: Probabilistic 3d multi-object tracking for autonomous driving
  - 关键词: 3D跟踪, 卡尔曼滤波, 概率跟踪
  - 总结: 本文引用该工作作为基于3D卡尔曼滤波的专用3D跟踪器代表，说明其虽能更好地利用三维运动信息，但本文采用的基于速度估计和点检测的CenterTrack方案更快更准确

- [27] H. Karunasekera, 2019
  - 标题: Zhang. Multiple object tracking with attention to appearance, structure, motion and size
  - 关键词: MOT, attention-based tracking, 多目标跟踪
  - 总结: 本文引用该工作作为可直接用于3D目标跟踪的2D跟踪算法之一，用以说明2D跟踪算法在3D场景中的适用性

- [28] Alex H. Lang, 2019
  - 标题: Pointpillars: Fast encoders for object detection from point clouds
  - 关键词: PointPillars, pillar编码, 高效3D编码器
  - 总结: 本文引用该工作作为CenterPoint使用的标准Lidar骨干网络之一，PointPillars用柱体表示替代体素计算提升了骨干网络效率；本文在其之上验证了从框表示切换到中心表示法可带来3-4 mAP的提升，最终在多个数据集上取得领先结果

- [44] Shaoshuai Shi, 2020
  - 标题: Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection
  - 关键词: PV-RCNN, 点体素特征集合, two-stage 3D检测
  - 总结: 本文引用该工作作为两阶段3D检测方法中使用RoIAlign在3D空间聚合特征的代表，用以对比说明本文第二阶段仅提取5个表面中心点稀疏特征的高效性；同时作为锚基3D检测器依赖2D Box IoU目标分配的代表，用以说明锚基方法在不同类别和数据集上选择正负阈值的不便

- [45] Shaoshuai Shi, 2019
  - 标题: Pointrcnn: 3d object proposal generation and detection from point cloud
  - 关键词: PointRCNN, 点云提案, two-stage
  - 总结: 本文引用该工作作为3D检测中轴对齐2D框不适合作为自由形态3D目标代理的例子；同时作为两阶段3D检测方法中应用RoIPool/RoIAlign的代表，用以对比说明本文第二阶段更高效；此外还引用其说明基于点的特征提取可支持更高效的两阶段精炼模块

- [46] Shaoshuai Shi, 2020
  - 标题: From points to parts: 3d object detection from point cloud with part-aware and part-aggregation network
  - 关键词: Part-A², 部件感知, part-aggregation
  - 总结: 本文引用该工作作为两阶段3D检测方法中使用RoIPool/RoIAlign的代表，用以对比说明本文第二阶段更高效；同时用其说明基于点的特征提取可设计更高效的两阶段精炼模块

- [53] Xinshuo Weng and Kris Kitani. A Baseline for 3D Multi-Object Tracking
  - 标题: Xinshuo Weng and Kris Kitani. A Baseline for 3D Multi-Object Tracking
  - 关键词: 3D MOT baseline, AB3DMOT, 卡尔曼滤波
  - 总结: 本文引用该工作作为基于3D卡尔曼滤波的专用3D跟踪器代表，说明其虽能更好地利用三维运动信息，但本文采用的基于速度估计和点检测的CenterTrack方案更快更准确

- [54] Nicolai Wojke, 2017
  - 标题: Simple online and realtime tracking with a deep association metric
  - 关键词: DeepSORT, 深度关联, 多目标跟踪
  - 总结: 本文引用该工作作为基于3D卡尔曼滤波的专用3D跟踪器代表，说明其虽能更好地利用三维运动信息，但本文采用的基于速度估计和点检测的CenterTrack方案更快更准确

- [56] Yan Yan, 2018
  - 标题: Second: Sparsely embedded convolutional detection
  - 关键词: SECOND, 稀疏卷积加速, 3D骨干网络
  - 总结: 本文引用该工作作为CenterPoint使用的标准Lidar骨干网络之一，SECOND简化了VoxelNet并加速了稀疏3D卷积；本文在其之上验证了从框表示切换到中心表示法可带来3-4 mAP的提升；同时作为锚基检测器使用2D Box IoU进行目标分配的代表，用以说明该方法在不同类别和数据集上选择正负阈值的不便

- [57] Bin Yang, 2018
  - 标题: Pixor: Real-time 3d object detection from point clouds
  - 关键词: PIXOR, 2D投影, 实时3D检测
  - 总结: 本文引用该工作作为3D检测编码器演进的代表之一，说明其将所有点投影到2D特征图以去除昂贵的3D卷积，本文的贡献聚焦于输出表示层，与任何3D编码器兼容

- [60] Zetong Yang, Yanan Sun, Shu Liu, and Jiaya Jia. 3dssd: Point-based 3d single stage object detector
  - 标题: Zetong Yang, Yanan Sun, Shu Liu, and Jiaya Jia. 3dssd: Point-based 3d single stage object detector
  - 关键词: 3DSSD, point-based single-stage, 3D检测
  - 总结: 本文引用该工作作为3D检测器从2D检测器演化而来的代表之一；同时作为3D旋转边界框预测任务的代表性方法被引用

- [61] Zetong Yang, 2019
  - 标题: Std: Sparse-to-dense 3d object detector for point cloud
  - 关键词: STD, sparse-to-dense, two-stage
  - 总结: 本文引用该工作作为3D旋转边界框预测任务的代表性方法之一；同时作为两阶段3D检测中使用RoIPool/RoIAlign的代表，用以对比说明本文第二阶段更高效

- [63] Xingyi Zhou, 2020
  - 标题: Tracking objects as points
  - 关键词: CenterTrack, 跟踪即点, center-based tracking
  - 总结: 本文引用该工作作为基于中心的检测器代表，说明其直接检测隐式目标中心点而不需要候选框；同时作为3D跟踪方法的直接来源，本文采用其速度估计和点检测跟踪中心的方案，该方案比专用3D跟踪器更快更准确

- [64] Xingyi Zhou, 2019
  - 标题: Objects as points
  - 关键词: CenterNet, 关键点估计, center-based detection
  - 总结: 本文引用该工作作为中心表示法的核心来源，CenterPoint直接借鉴其关键点估计方法，将2D热图检测范式扩展到3D点云检测；其高斯核渲染热图、回归尺寸和局部偏移的机制被本文完整采用

- [66] Yin Zhou, 2018
  - 标题: Voxelnet: End-to-end learning for point cloud based 3d object detection
  - 关键词: VoxelNet, 体素特征编码, 端到端3D检测
  - 总结: 本文引用该工作作为CenterPoint使用的标准Lidar骨干网络之一，VoxelNet使用PointNet在每个体素内生成统一特征表示；本文在其之上验证了从框表示切换到中心表示法可带来3-4 mAP的提升，并在NeurIPS 2020 nuScenes挑战赛中作为多个获胜方案的基础被采用

- [67] Benjin Zhu, 2019
  - 标题: Class-balanced grouping and sampling for point cloud 3d object detection
  - 关键词: CBGS, 类别平衡, 3D检测
  - 总结: 本文引用该工作作为中心表示法带来3-4 mAP提升的验证基准之一，说明该提升在不同的3D骨干网络下均成立



##### Dataset

- [6] Holger Caesar, 2020
  - 标题: nuscenes: A multimodal dataset for autonomous driving
  - 关键词: nuScenes, 多模态数据集, 自动驾驶基准
  - 总结: 本文引用该工作作为模型测试和评估的主要数据集之一，在nuScenes上验证了中心表示法带来的3-4 mAP提升，最终模型取得58.0 mAP和65.5 NDS的检测成绩以及63.8 AMOTA的跟踪成绩

- [15] Andreas Geiger, 2012
  - 标题: Are we ready for autonomous driving? the kitti vision benchmark suite
  - 关键词: KITTI, 视觉基准, 自动驾驶数据集
  - 总结: 本文引用该工作作为3D旋转边界框预测任务的经典数据集之一，在列举3D检测相关数据集时被引用，用于说明3D检测任务的发展脉络

- [48] Pei Sun, 2020
  - 标题: Scalability in perception for autonomous driving: An open dataset benchmark
  - 关键词: Waymo Open Dataset, 大规模数据集, 自动驾驶基准
  - 总结: 本文引用该工作作为模型测试和评估的主要数据集之一，在Waymo上验证了中心表示法带来的3-4 mAP提升，最终模型取得71.8和66.4 level 2 mAPH的车辆和行人检测成绩，以及59.4和56.6 level 2 MOTA的车辆和行人跟踪成绩



##### Contrast

- [8] Qi Chen, 2020
  - 标题: Object as hotspots: An anchor-free 3d object detection approach via firing of hotspots
  - 关键词: anchor-free, hotspot detection, 多点表示
  - 总结: 本文引用该工作作为对比对象，说明其在目标中心区域使用多个点（热关键点）进行表示和回归，而本文每个目标仅使用一个正单元格并采用关键点估计损失，突出了本文方法的简洁性

- [9] Yilun Chen, 2019
  - 标题: Fast point r-cnn
  - 关键词: two-stage 3D检测, ROI特征聚合, point-based
  - 总结: 本文引用该工作作为两阶段3D检测中使用RoIPool/RoIAlign在3D空间聚合ROI特征的代表，用以对比说明本文第二阶段仅从中间特征图提取5个表面中心点的稀疏特征，效率更高且保持了有效性

- [38] Charles R. Qi, 2019
  - 标题: Deep hough voting for 3d object detection in point clouds
  - 关键词: VoteNet, Hough voting, 投票聚类
  - 总结: 本文引用该工作作为对比对象，说明VoteNet通过点特征采样和分组的投票聚类来检测目标，而本文直接在中心点特征上回归3D边界框，无需投票过程，突出了本文方法的简洁性和效率

- [47] Martin Simony, 2018
  - 标题: Complex-yolo: An euler-region-proposal for real-time 3d object detection on point clouds
  - 关键词: Complex-YOLO, 欧拉区域提案, 旋转检测
  - 总结: 本文引用该工作作为3D检测中轴对齐2D框不适合作为自由形态3D目标代理的例子，以及为每个方向分类不同模板会增加计算负担并引入大量假阳性的证据，以此论证中心点表示的优越性

- [55] Kelvin Wong, 2019
  - 标题: Identifying unknown instances for autonomous driving
  - 关键词: point-anchors, 多点表示, 未知实例
  - 总结: 本文引用该工作作为对比对象，说明其在目标中心区域使用多个点（点锚点）进行表示和属性回归，而本文每个目标仅使用一个正单元格并采用关键点估计损失，突出了本文方法的简洁性



##### Historical

- [16] Ross Girshick, 2015
  - 标题: Fast r-cnn
  - 关键词: two-stage detector, Fast R-CNN, 候选框精炼
  - 总结: 本文引用该工作作为RCNN系列两阶段检测器的代表之一，说明其先找类别无关的候选框再分类精炼的范式，以此对比基于中心的检测器不需要候选框的优势，同时用其说明轴对齐2D框不适合作为自由形态3D目标的代理

- [17] Ross Girshick, 2014
  - 标题: Rich feature hierarchies for accurate object detection and semantic segmentation
  - 关键词: R-CNN, 候选区域, 2D检测先驱
  - 总结: 本文引用该工作作为RCNN系列的开创性工作之一，用其说明轴对齐2D边界框作为自由形态3D目标的代理效果不佳，这是2D与3D检测之间思想迁移困难的核心原因

- [21] Kaiming He, 2017
  - 标题: Mask r-cnn
  - 关键词: Mask R-CNN, RoIAlign, 实例分割
  - 总结: 本文引用该工作作为RCNN系列检测器的代表之一，说明3D检测器从2D检测器演化的脉络；同时其RoIAlign方法被两阶段3D检测器直接借鉴用于3D空间特征聚合，但这些方法因处理大量点而导致运行时间过长

- [32] Tsung-Yi Lin, 2017
  - 标题: Focal loss for dense object detection
  - 关键词: Focal Loss, RetinaNet, 类别不平衡
  - 总结: 本文引用该工作作为单阶段检测器的代表，说明其直接查找类别特定候选框的范式，以此对比基于中心的检测器不需要候选框的优势

- [33] Wei Liu, 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: SSD, single-shot, 多框检测
  - 总结: 本文引用该工作作为单阶段检测器的代表之一，说明其直接查找类别特定候选框的范式，以此对比基于中心的检测器不需要候选框的优势

- [42] Joseph Redmon, 2017
  - 标题: Yolo9000: better, faster, stronger
  - 关键词: YOLO, 实时检测, single-stage
  - 总结: 本文引用该工作作为单阶段检测器的代表之一，说明其直接查找类别特定候选框的范式，以此对比基于中心的检测器不需要候选框的优势

- [43] Shaoqing Ren, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, RPN, 两阶段检测
  - 总结: 本文引用该工作作为RCNN系列两阶段检测器的代表，说明其区域提案网络的范式被锚基3D检测器借鉴；同时作为两阶段3D检测中RoIPool/RoIAlign方法来源的引用，以及锚基检测器使用2D Box IoU进行目标分配的代表，用以说明锚基方法在不同类别和数据集上选择正负阈值的不便



##### Component

- [18] Benjamin Graham, Martin Engelcke, and Laurens van der Maaten. 3d semantic segmentation with submanifold sparse convolutional networks
  - 标题: Benjamin Graham, Martin Engelcke, and Laurens van der Maaten. 3d semantic segmentation with submanifold sparse convolutional networks
  - 关键词: submanifold sparse convolution, 3D稀疏卷积, 语义分割
  - 总结: 本文引用该工作作为3D稀疏卷积的代表性方法，说明VoxelNet的检测头使用3D稀疏卷积和2D卷积来产生检测结果

- [40] Charles R Qi, 2017
  - 标题: Pointnet: Deep learning on point sets for 3d classification and segmentation
  - 关键词: PointNet, 点云特征提取, 3D分类分割
  - 总结: 本文引用该工作作为VoxelNet中每个体素内生成统一特征表示的基础网络，以及现代3D检测器中点网络提取体素内点特征的通用方法，是3D点云深度学习的核心组件





#### 时间线分析

##### 早期
早期工作奠定了2D目标检测的基础架构，包括R-CNN系列（R-CNN、Fast R-CNN、Faster R-CNN）确立了区域候选检测范式，SSD开启了单阶段检测路线。在3D感知方面，KITTI数据集提供了首个标准化自动驾驶基准。SORT算法确立了简洁高效的在线多目标跟踪框架。Voting机制和稀疏卷积为后续3D编码器奠定了基础。


- [4] Alex Bewley, 2016: Simple online and realtime tracking

- [15] Andreas Geiger, 2012: Are we ready for autonomous driving? the kitti vision benchmark suite

- [16] Ross Girshick, 2015: Fast r-cnn

- [17] Ross Girshick, 2014: Rich feature hierarchies for accurate object detection and semantic segmentation

- [33] Wei Liu, 2016: Ssd: Single shot multibox detector

- [43] Shaoqing Ren, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [51] Dominic Zeng Wang, 2015: Voting for voting in online point cloud object detection




##### 中期
中期工作将2D检测技术扩展到3D领域，PointNet开创了直接处理点云的深度学习方案，VoxelNet、SECOND建立了体素化3D编码的主流路线，Frustum PointNet探索了RGB-D融合方案，Complex-YOLO尝试了端到端3D检测。Focal Loss提升了密集检测性能，Mask R-CNN将实例分割引入检测框架。更重要的是，CenterNet将目标表示为中心点的思路为本文提供了直接的方法基础，CenterTrack进一步将该思路扩展到跟踪任务。R3det、SCRDet等探索了旋转目标检测。


- [1] Mayank Bansal, 2019: Chauffeurnet: Learning to drive by imitating the best and synthesizing the worst

- [2] Philipp Bergmann, 2019: Tracking without bells and whistles

- [9] Yilun Chen, 2019: Fast point r-cnn

- [12] Martin Engelcke, 2017: Vote3deep: Fast object detection in 3d point clouds using efficient convolutional neural networks

- [18] Benjamin Graham, Martin Engelcke, and Laurens van der Maaten. 3d semantic segmentation with submanifold sparse convolutional networks: Benjamin Graham, Martin Engelcke, and Laurens van der Maaten. 3d semantic segmentation with submanifold sparse convolutional networks

- [21] Kaiming He, 2017: Mask r-cnn

- [27] H. Karunasekera, 2019: Zhang. Multiple object tracking with attention to appearance, structure, motion and size

- [28] Alex H. Lang, 2019: Pointpillars: Fast encoders for object detection from point clouds

- [31] Ming Liang, 2019: Multi-task multi-sensor fusion for 3d object detection

- [32] Tsung-Yi Lin, 2017: Focal loss for dense object detection

- [38] Charles R. Qi, 2019: Deep hough voting for 3d object detection in point clouds

- [39] Charles R Qi, 2018: Frustum pointnets for 3d object detection from rgb-d data

- [40] Charles R Qi, 2017: Pointnet: Deep learning on point sets for 3d classification and segmentation

- [42] Joseph Redmon, 2017: Yolo9000: better, faster, stronger

- [45] Shaoshuai Shi, 2019: Pointrcnn: 3d object proposal generation and detection from point cloud

- [47] Martin Simony, 2018: Complex-yolo: An euler-region-proposal for real-time 3d object detection on point clouds

- [50] Dequan Wang, 2019: Monocular plan view networks for autonomous driving

- [54] Nicolai Wojke, 2017: Simple online and realtime tracking with a deep association metric

- [55] Kelvin Wong, 2019: Identifying unknown instances for autonomous driving

- [56] Yan Yan, 2018: Second: Sparsely embedded convolutional detection

- [57] Bin Yang, 2018: Pixor: Real-time 3d object detection from point clouds

- [58] Xue Yang, 2019: R3det: Refined single-stage detector with feature refinement for rotating object

- [59] Xue Yang, 2019: Scrdet: Towards more robust detection for small, cluttered and rotated objects

- [61] Zetong Yang, 2019: Std: Sparse-to-dense 3d object detector for point cloud

- [64] Xingyi Zhou, 2019: Objects as points

- [65] Yin Zhou, 2019: End-to-end multi-view fusion for 3d object detection in lidar point clouds

- [66] Yin Zhou, 2018: Voxelnet: End-to-end learning for point cloud based 3d object detection

- [67] Benjin Zhu, 2019: Class-balanced grouping and sampling for point cloud 3d object detection




##### 近期
近期工作聚焦于大规模数据集上的性能突破。nuScenes和Waymo数据集提供了更大规模的3D检测基准，推动了领域发展。PV-RCNN结合了点特征与体素特征的优势，PointRCNN和3DSSD探索了纯点云两阶段与单阶段方案。CBGS通过类别平衡分组采样解决了长尾分布问题。MVF和PointPainting探索了多视图和跨模态特征融合。Weng等人的3D跟踪基线确立了卡尔曼滤波方案的参考标准。CenterTrack将目标作为点跟踪的思路进一步验证了中心点表示的有效性。本文在这些工作基础上，将中心点表示系统性地应用于3D检测与跟踪。


- [6] Holger Caesar, 2020: nuscenes: A multimodal dataset for autonomous driving

- [8] Qi Chen, 2020: Object as hotspots: An anchor-free 3d object detection approach via firing of hotspots

- [10] Hsu-kuang Chiu, 2020: Probabilistic 3d multi-object tracking for autonomous driving

- [20] Chenhang He, 2020: Structure aware single-stage 3d object detection from point cloud

- [23] Peiyun Hu, 2020: What you see is what you get: Exploiting visibility for 3d object detection

- [44] Shaoshuai Shi, 2020: Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection

- [46] Shaoshuai Shi, 2020: From points to parts: 3d object detection from point cloud with part-aware and part-aggregation network

- [48] Pei Sun, 2020: Scalability in perception for autonomous driving: An open dataset benchmark

- [52] Yue Wang, 2020: Pillarbased object detection for autonomous driving

- [53] Xinshuo Weng and Kris Kitani. A Baseline for 3D Multi-Object Tracking: Xinshuo Weng and Kris Kitani. A Baseline for 3D Multi-Object Tracking

- [60] Zetong Yang, Yanan Sun, Shu Liu, and Jiaya Jia. 3dssd: Point-based 3d single stage object detector: Zetong Yang, Yanan Sun, Shu Liu, and Jiaya Jia. 3dssd: Point-based 3d single stage object detector

- [63] Xingyi Zhou, 2020: Tracking objects as points


# An end-to-end transformer model for 3D object detection (2021)

- Paper ref: 1:JMWG9XVD
- Title: An end-to-end transformer model for 3D object detection
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2010 | Anarew Aaams; jongmin Baek; et al. | Fast high-dimensional filtering using the permutohedral lattice |
| ref-2 | 2016 | Ba,Jamie Ryan Kiros | Layer normalization |
| ref-3 | 2017 | Boulch,Bertrand Le Saux | Unstructured point cloud semantic labeling using deep segmentation networks |
| ref-4 | 2020 | Carion,Francisco Massa; Synnaeve,Nicolas Usunier | End-toend object detection with transformers.In European Conference on Computer Vision,pages 213-229.Springer, 2020 |
| ref-6 | 2017 | Chen, Huimin Ma; Wan,Bo Li | Multi-view 3d object detection network for autonomous driving |
| ref-8 | 1934 | Boris Delaunay et al | Sur la sphere vide |
| ref-9 | 2018 | Devlin,Ming-Wei Chang | Pre-training of deep bidirectional transformers for language understanding.arXiv preprint arXiv:1810.04805 |
| ref-10 | 2020 | Dosovitskiy,Lucas Beyer; Kolesnikov, Dirk Weissenborn; et al. | An image is worth 16xl6 words: Transformers for image recognition at scale.arXiv preprint arXiv:2010.11929,2020 |
| ref-12 | 2015 | Ben Graham | Sparse 3d convolutional neural networks |
| ref-13 | 2018 | Groh,Patrick Wieschollek | Flex-convolution.In Asian Conference on Computer Vision, pages 105-122 |
| ref-14 | 2020 | Gwak, Christopher B Choy | Generative sparse detection networks for 3d single-shot object detection |
| ref-15 | 2018 | Hermosilla,Tobias Ritschel | Monte carlo convolution for learning on irregular grids |
| ref-16 | 2018 | Hu, Jiayuan Gu; Zhang, Jifeng Dai | Unknown title |
| ref-17 | 2020 | Hu, Bo Yang; Xie, Stefano Rosa; et al. | Randla-net: Efficient semantic segmentation of large-scale point clouds |
| ref-19 | 2018 | Asako Kanezaki，Yasuyuki Matsushita; and Yoshifumi Nishida | Rotationnet: Joint object categorization and pose estimation using multiviews from unsupervised viewpoints |
| ref-21 | 2017 | Klein,Yoon Kim; Deng,Jean Senellart | Opennmt: Open-source toolkit for neural machine translation.arXiv preprint arXiv:1701.02810,2017 |
| ref-22 | 1955 | Harold W Kuhn | The hungarian method for the assignment problem |
| ref-23 | 2019 | Lahoud, Bernard Ghanem | 3d instance segmentation via multi-task metric learning |
| ref-24 | 2018 | Loic Landrieu; Martin Simonovsky | Large-scale point cloud semantic segmentation with superpoint graphs |
| ref-26 | 2017 | Danelljan,Patrik Tosteberg; Bhat, Fahad Shahbaz Khan | Deep projective 3d semantic segmentation |
| ref-27 | 2019 | Li,Matthias Muller | Deepgcns: Can gcns go as deep as cnns?In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 9267-9276,2019 |
| ref-28 | 2018 | Li, Rui Bu; Sun,Wei Wu | Pointcnn: Convolution on x-transformed points |
| ref-29 | 2020 | Liu, Xin Zhao; Huang,Ruolan Hu | Tanet: Robust 3d object detection from point clouds with triple attention |
| ref-30 | 2016 | Ilya Loshchilov; Frank Hutter.Sgdr | Stochastic gradient descent with warm restarts.arXiv preprint arXiv:1608.03983 |
| ref-31 | 2017 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-32 | 2019 | Lu,Dhruv Batra | Vilbert: Pretraining task-agnostic visiolinguistic representations forvision-and-language tasks.arXiv preprint arXiv:1908.02265,2019 |
| ref-33 | 2019 | Beck,Kazuki Irie; Kitza, Wilfried Michel; et al. | Rwth asr systems for librispeech: Hybrid vs attentionw/o data augmentation |
| ref-34 | 2019 | Mao, Xiaogang Wang | Interpolated convolutional networks for 3d point cloud understanding |
| ref-35 | 2015 | Daniel Maturana; Sebastian Scherer | Voxnet:A 3d convolutional neural network for real-time object recognition |
| ref-36 | 2019 | Paigwar, Ozgur Erkent | Attentional pointnet for 3d-object detection in point clouds |
| ref-37 | 2020 | Pan, Zhuofan Xia; Song,Li Erran Li | 3d object detection with pointformer |
| ref-38 | 2018 | Parmar,Ashish Vaswani; Uszkoreit,Lukasz Kaiser; et al. | Image transformer |
| ref-39 | 2019 | Paszke,Sam Gross; Massa,Adam Lerer; et al. | Pytorch: An imperative style, high-performance deep learning library |
| ref-41 | 2016 | TPham, Markus Eich | Geometrically consistent plane extraction for dense indoor 3d maps segmentation |
| ref-44 | 2017 | Qi,Hao Su | Pointnet: Deep learning on point sets for 3d classification and segmentation.In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 652-660, 2017 |
| ref-45 | 2017 | Qi,Li Yi | In Advances in neural information processing systems, pages 5099-5108,2017 |
| ref-46 | 2018 | Radford, Karthik Narasimhan | Improving language understanding by generative pre-training |
| ref-47 | 2015 | Ren, Kaiming He | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-48 | 2019 | Rezatofighi,Nathan Tsoi; Gwak,Amir Sadeghian | Generalized intersection over union |
| ref-49 | 2017 | Riegler,Ali Osman Ulusoy | Octnet: Learning deep 3d representations at high resolutions |
| ref-50 | 2020 | Shi, Chaoxu Guo; Jiang,Zhe Wang; et al. | Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection.In Proceedings of the IEEE/CVF Conference on Computer Vision and Patern Recognition, pages 10529-10538,2020 |
| ref-51 | 2019 | Shi, Xiaogang Wang | Pointrcnn: 3d object proposal generation and detection from point cloud |
| ref-52 | 2018 | Simony,Stefan Milzy | Complex-yolo: An euler-region-proposal for real-time 3d object detection on point clouds |
| ref-53 | 2015 | Song,Samuel P Lichtenberg | Sun rgb-d: A rgb-d scene understanding benchmark suite.In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 567-576,2015 |
| ref-54 | 2014 | Shuran Song; Jianxiong Xiao | Sliding shapes for 3d object detection in depth images |
| ref-55 | 2016 | Shuran Song; Jianxiong Xiao | Deep sliding shapes for amodal 3d object detection in rgb-d images.In The IEEE Conference on Computer Vision and Pattern Recognition (CVPR), June 2016 |
| ref-56 | 2017 | Song,Fisher Yu; Zeng,Angel X Chang | Semantic scene completion from a single depth image |
| ref-57 | 2014 | Srivastava, Geoffrey Hinton; Krizhevsky,Ilya Sutskever | Dropout: a simple way to prevent neural networks from overfitting |
| ref-58 | 2016 | Stewart,Mykhaylo Andriluka | End-to-end people detection in crowded scenes.In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 2325-2333,2016 |
| ref-59 | 2018 | Su, Varun Jampani; Sun, Subhransu Maji; et al. | Splatnet: Sparse lattice networks for point cloud processing |
| ref-60 | 2015 | Su, Subhransu Maji | Multi-view convolutional neural networks for 3d shape recognition |
| ref-61 | 2019 | Su, Xizhou Zhu; Cao, Bin Li; et al. | Vl-bert: Pre-training of generic visuallinguistic representations |
| ref-62 | 2019 | Xu,Jacob Kahn; Likhomanenko, Edouard Grave; et al. | End-to-end asr: from supervised to semi-supervised learning with modern architectures.arXiv preprint arXiv:1911.08460,2019 |
| ref-63 | 2019 | Hao Tan; Mohit Bansal.Lxmert | Learning crossmodality encoder representations from transformers.arXiv preprint arXiv:1908.07490 |
| ref-65 | 2018 | Tatarchenko,Jaesik Park | Tangent convolutions for dense prediction in 3d |
| ref-66 | 2017 | Tchapmi, Christopher Choy; Armeni, JunYoung Gwak | Segcloud: Semantic segmentation of 3d point clouds |
| ref-68 | 2017 | Vaswani,Noam Shazeer; Parmar, Jakob Uszkoreit; et al. | Attention is all you need |
| ref-69 | 2018 | Verma, Edmond Boyer | Feastnet: Feature-steered graph convolutions for 3d shape analysis |
| ref-71 | 2018 | Wang, Babak Samari | Local spectral graph convolution for point set feature learning |
| ref-72 | 2015 | Dominic Zeng Wang; Ingmar Posner | Voting for voting in online point cloud object detection |
| ref-75 | 2019 | Wang, Shu Liu; Shen, Chunhua Shen | Associatively segmenting instances and semantics in point clouds.InProceedings of the IEEE Conference on Computer Vision and Pattern Recognition,pages 4096- 4105,2019 |
| ref-76 | 2020 | Wang,Alireza Fathi; Kundu, David Ross; et al. | Pillar-based object detection for autonomous driving.arXiv preprint arXiv:2007.10323,2020 |
| ref-77 | 2019 | Sun, Ziwei Liu; Sarma, Michael M Bronstein | Acm Transactions On Graphics (tog),38(5):1-12,2019 |
| ref-78 | 2019 | Wu, Zhongang Qi | Pointconv: Deep convolutional networks on 3d point clouds |
| ref-79 | 2015 | Wu, Shuran Song; Khosla,Fisher Yu | A deep representation for volumetric shapes.In Proceedingsof the Conference on Computer Vision and Pattern Recognition (CVPR |
| ref-80 | 2018 | Xu, Tianqi Fan; Xu,Long Zeng | Spidercnn:Deep learning on point sets with parameterized convolutional filters |
| ref-81 | 2018 | Yan, Yuxing Mao | Second: Sparsely embedded convolutional detection |
| ref-82 | 2018 | Yang,Wenjie Luo | Pixor: Realtime 3d object detection from point clouds.In Proceedings of the IEEE conference on Computer Vision and Patern Recognition, pages 7652-7660,2018 |
| ref-84 | 2020 | Yang,Yanan Sun | 3dssd: Point-based 3d single stage object detector |
| ref-86 | 2020 | Yin, Jianbing Shen; Guan,Dingfu Zhou | Unknown title |
| ref-87 | 2019 | Wenxiao Zhang; Chunxia Xiao | Pcan: 3d attention map learning using contextual information for point cloud based retrieval |
| ref-88 | 2021 | Zhang,Rohit Girdhar | Self-supervised pretraining of 3d features on any point-cloud |
| ref-89 | 2020 | Zhang,Bo Sun | H3dnet: 3d object detection using hybrid geometric primitives.In Proceedings of the European Conference on Computer Vision (ECCV),2020 |
| ref-90 | 2019 | Zhao,Li Jiang | Pointweb: Enhancing local neighborhood features for point cloud processing |
| ref-91 | 2020 | Zhao,Li Jiang; Jia,Philip Torr | Point transformer |
| ref-93 | 2020 | Zhu, Yuexin Ma; Wang,Yan Xu | Ssn: Shape signature networks for multi-class object detection from point clouds.In Proceedings of the European Conference on Computer Vision (ECCV),2020 |

## Citation Analysis Report

#### 总体总结
本节先用早期点云处理与Transformer架构工作铺出技术背景，再把直接集合预测与基于后处理的检测路线并置比较，最后借几篇关键Transformer与匹配式检测文献把3DETR的方法路线明确出来。整体引文组织呈现从基础架构到具体应用的收敛脉络。


#### 关键文献

- [4] Carion,Francisco Massa, 2020: End-toend object detection with transformers.In European Conference on Computer Vision,pages 213-229.Springer, 2020 (Baseline)

- [68] Vaswani,Noam Shazeer, 2017: Attention is all you need (Historical)

- [43] Qi,Wei Liu, 2018: In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 918-927,2018 (Background)

- [45] Qi,Li Yi, 2017: In Advances in neural information processing systems, pages 5099-5108,2017 (Background)



#### 范围
- 章节: Introduction + Related Work
- 行号: 11-40

#### 按功能归类


##### Background

- [1] Anarew Aaams, 2010
  - 标题: Fast high-dimensional filtering using the permutohedral lattice
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [3] Boulch,Bertrand Le Saux, 2017
  - 标题: Unstructured point cloud semantic labeling using deep segmentation networks
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [5] Lei,Qingyu Song, 2020
  - 标题: In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition,pages 392-401,2020
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [8] Boris Delaunay et al, 1934
  - 标题: Sur la sphere vide
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [10] Dosovitskiy,Lucas Beyer, 2020
  - 标题: An image is worth 16xl6 words: Transformers for image recognition at scale.arXiv preprint arXiv:2010.11929,2020
  - 关键词: transformer, vision, image recognition
  - 总结: 该工作被用来Transformer在视觉领域的应用相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [11] Engelmann,Martin Bokeloh, 2020
  - 标题: In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 9031-9040,2020
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [12] Ben Graham, 2015
  - 标题: Sparse 3d convolutional neural networks
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [13] Groh,Patrick Wieschollek, 2018
  - 标题: Flex-convolution.In Asian Conference on Computer Vision, pages 105-122
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [15] Hermosilla,Tobias Ritschel, 2018
  - 标题: Monte carlo convolution for learning on irregular grids
  - 关键词: voxel, grid, 3D representation
  - 总结: 该工作被用来基于体素/网格的3D表示相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [16] Hu, Jiayuan Gu, 2018
  - 标题: Unknown title
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [17] Hu, Bo Yang, 2020
  - 标题: Randla-net: Efficient semantic segmentation of large-scale point clouds
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [18] Jiang, Hengshuang Zhao, 2019
  - 标题: In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 10433-10441, 2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [19] Asako Kanezaki，Yasuyuki Matsushita, 2018
  - 标题: Rotationnet: Joint object categorization and pose estimation using multiviews from unsupervised viewpoints
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [23] Lahoud, Bernard Ghanem, 2019
  - 标题: 3d instance segmentation via multi-task metric learning
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [24] Loic Landrieu, 2018
  - 标题: Large-scale point cloud semantic segmentation with superpoint graphs
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [25] Lang, Sourabh Vora, 2019
  - 标题: In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 12697-12705,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [26] Danelljan,Patrik Tosteberg, 2017
  - 标题: Deep projective 3d semantic segmentation
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [27] Li,Matthias Muller, 2019
  - 标题: Deepgcns: Can gcns go as deep as cnns?In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 9267-9276,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [28] Li, Rui Bu, 2018
  - 标题: Pointcnn: Convolution on x-transformed points
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [33] Beck,Kazuki Irie, 2019
  - 标题: Rwth asr systems for librispeech: Hybrid vs attentionw/o data augmentation
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [34] Mao, Xiaogang Wang, 2019
  - 标题: Interpolated convolutional networks for 3d point cloud understanding
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [38] Parmar,Ashish Vaswani, 2018
  - 标题: Image transformer
  - 关键词: transformer, vision, image recognition
  - 总结: 该工作被用来Transformer在视觉领域的应用相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [40] Pham, Thanh Nguyen, 2019
  - 标题: In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 8827-8836,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [41] TPham, Markus Eich, 2016
  - 标题: Geometrically consistent plane extraction for dense indoor 3d maps segmentation
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [42] Qi, Or Litany, 2019
  - 标题: In Proceedings of the International Conference on Computer Vision (ICCV),2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [43] Qi,Wei Liu, 2018
  - 标题: In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 918-927,2018
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [45] Qi,Li Yi, 2017
  - 标题: In Advances in neural information processing systems, pages 5099-5108,2017
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [47] Ren, Kaiming He, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [49] Riegler,Ali Osman Ulusoy, 2017
  - 标题: Octnet: Learning deep 3d representations at high resolutions
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [56] Song,Fisher Yu, 2017
  - 标题: Semantic scene completion from a single depth image
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [59] Su, Varun Jampani, 2018
  - 标题: Splatnet: Sparse lattice networks for point cloud processing
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [60] Su, Subhransu Maji, 2015
  - 标题: Multi-view convolutional neural networks for 3d shape recognition
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [62] Xu,Jacob Kahn, 2019
  - 标题: End-to-end asr: from supervised to semi-supervised learning with modern architectures.arXiv preprint arXiv:1911.08460,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [63] Hao Tan, 2019
  - 标题: Learning crossmodality encoder representations from transformers.arXiv preprint arXiv:1908.07490
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [64] Tancik,Pratul P, 2020
  - 标题: Srinivasan, Ben Mildenhall, Sara Fridovich-Keil,Nithin Raghavan, Utkarsh Singhal,Ravi Ramamoorthi,Jonathan T.Barron,and Ren Ng
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [65] Tatarchenko,Jaesik Park, 2018
  - 标题: Tangent convolutions for dense prediction in 3d
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [66] Tchapmi, Christopher Choy, 2017
  - 标题: Segcloud: Semantic segmentation of 3d point clouds
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [67] Thomas,Charles R Qi, 2019
  - 标题: In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 6411-6420,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [69] Verma, Edmond Boyer, 2018
  - 标题: Feastnet: Feature-steered graph convolutions for 3d shape analysis
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [70] Vora,Alex H Lang, 2020
  - 标题: In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 4604-4612, 2020
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [72] Dominic Zeng Wang, 2015
  - 标题: Voting for voting in online point cloud object detection
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [73] Wang, Yuchun Huang, 2019
  - 标题: In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 10296-10305,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [74] Wang,Ross Girshick, 2018
  - 标题: In Proceedings of the IEEE conference on computer vision and patern recognition, pages 7794-7803,2018
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [75] Wang, Shu Liu, 2019
  - 标题: Associatively segmenting instances and semantics in point clouds.InProceedings of the IEEE Conference on Computer Vision and Pattern Recognition,pages 4096- 4105,2019
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [76] Wang,Alireza Fathi, 2020
  - 标题: Pillar-based object detection for autonomous driving.arXiv preprint arXiv:2007.10323,2020
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [77] Sun, Ziwei Liu, 2019
  - 标题: Acm Transactions On Graphics (tog),38(5):1-12,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [78] Wu, Zhongang Qi, 2019
  - 标题: Pointconv: Deep convolutional networks on 3d point clouds
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [81] Yan, Yuxing Mao, 2018
  - 标题: Second: Sparsely embedded convolutional detection
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [83] Yang,Qiang Zhang, 2019
  - 标题: In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 3323-3332,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [85] Yi,Wang Zhao, 2019
  - 标题: In Proceedings of the IEEEConferenceon Computer Vision and Pattern Recognition,pages 3947-3956,2019
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [86] Yin, Jianbing Shen, 2020
  - 标题: Unknown title
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [87] Wenxiao Zhang, 2019
  - 标题: Pcan: 3d attention map learning using contextual information for point cloud based retrieval
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [91] Zhao,Li Jiang, 2020
  - 标题: Point transformer
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [92] Yin Zhou, 2018
  - 标题: In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 4490-4499,2018
  - 关键词: 3D detection
  - 总结: 该工作被用来3D视觉基础相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [93] Zhu, Yuexin Ma, 2020
  - 标题: Ssn: Shape signature networks for multi-class object detection from point clouds.In Proceedings of the European Conference on Computer Vision (ECCV),2020
  - 关键词: point cloud, architecture, feature learning
  - 总结: 该工作被用来点云处理架构相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。



##### Baseline

- [4] Carion,Francisco Massa, 2020
  - 标题: End-toend object detection with transformers.In European Conference on Computer Vision,pages 213-229.Springer, 2020
  - 关键词: DETR, set prediction, 2D detection
  - 总结: 作为关键文献，该工作直接启发了3DETR的核心设计决策。原文通过对比该工作的方法，明确了自身方法的创新点。

- [6] Chen, Huimin Ma, 2017
  - 标题: Multi-view 3d object detection network for autonomous driving
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [14] Gwak, Christopher B Choy, 2020
  - 标题: Generative sparse detection networks for 3d single-shot object detection
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [29] Liu, Xin Zhao, 2020
  - 标题: Tanet: Robust 3d object detection from point clouds with triple attention
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [35] Daniel Maturana, 2015
  - 标题: Voxnet:A 3d convolutional neural network for real-time object recognition
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [37] Pan, Zhuofan Xia, 2020
  - 标题: 3d object detection with pointformer
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [50] Shi, Chaoxu Guo, 2020
  - 标题: Pv-rcnn: Pointvoxel feature set abstraction for 3d object detection.In Proceedings of the IEEE/CVF Conference on Computer Vision and Patern Recognition, pages 10529-10538,2020
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [51] Shi, Xiaogang Wang, 2019
  - 标题: Pointrcnn: 3d object proposal generation and detection from point cloud
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [52] Simony,Stefan Milzy, 2018
  - 标题: Complex-yolo: An euler-region-proposal for real-time 3d object detection on point clouds
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [54] Shuran Song, 2014
  - 标题: Sliding shapes for 3d object detection in depth images
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [55] Shuran Song, 2016
  - 标题: Deep sliding shapes for amodal 3d object detection in rgb-d images.In The IEEE Conference on Computer Vision and Pattern Recognition (CVPR), June 2016
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [82] Yang,Wenjie Luo, 2018
  - 标题: Pixor: Realtime 3d object detection from point clouds.In Proceedings of the IEEE conference on Computer Vision and Patern Recognition, pages 7652-7660,2018
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [84] Yang,Yanan Sun, 2020
  - 标题: 3dssd: Point-based 3d single stage object detector
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [89] Zhang,Bo Sun, 2020
  - 标题: H3dnet: 3d object detection using hybrid geometric primitives.In Proceedings of the European Conference on Computer Vision (ECCV),2020
  - 关键词: 3D detection, point cloud, bounding box
  - 总结: 该工作被用来3D目标检测方法相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。



##### Historical

- [9] Devlin,Ming-Wei Chang, 2018
  - 标题: Pre-training of deep bidirectional transformers for language understanding.arXiv preprint arXiv:1810.04805
  - 关键词: transformer, NLP, pre-training
  - 总结: 该工作被用来NLP中的Transformer应用相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [32] Lu,Dhruv Batra, 2019
  - 标题: Vilbert: Pretraining task-agnostic visiolinguistic representations forvision-and-language tasks.arXiv preprint arXiv:1908.02265,2019
  - 关键词: transformer, NLP, pre-training
  - 总结: 该工作被用来NLP中的Transformer应用相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [36] Paigwar, Ozgur Erkent, 2019
  - 标题: Attentional pointnet for 3d-object detection in point clouds
  - 关键词: PointNet, point cloud, feature learning
  - 总结: 作为关键文献，该工作直接启发了3DETR的核心设计决策。原文通过对比该工作的方法，明确了自身方法的创新点。

- [44] Qi,Hao Su, 2017
  - 标题: Pointnet: Deep learning on point sets for 3d classification and segmentation.In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 652-660, 2017
  - 关键词: PointNet, point cloud, feature learning
  - 总结: 作为关键文献，该工作直接启发了3DETR的核心设计决策。原文通过对比该工作的方法，明确了自身方法的创新点。

- [46] Radford, Karthik Narasimhan, 2018
  - 标题: Improving language understanding by generative pre-training
  - 关键词: transformer, NLP, pre-training
  - 总结: 该工作被用来NLP中的Transformer应用相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [61] Su, Xizhou Zhu, 2019
  - 标题: Vl-bert: Pre-training of generic visuallinguistic representations
  - 关键词: transformer, NLP, pre-training
  - 总结: 该工作被用来NLP中的Transformer应用相关的论证，支撑原文在引言和相关工作中建立技术背景和方法对比。

- [68] Vaswani,Noam Shazeer, 2017
  - 标题: Attention is all you need
  - 关键词: transformer, self-attention, original architecture
  - 总结: 作为关键文献，该工作直接启发了3DETR的核心设计决策。原文通过对比该工作的方法，明确了自身方法的创新点。


# MOTR: end-to-end multiple-object tracking with transformer (2022)

- Paper ref: 1:KSM65VAD
- Title: MOTR: end-to-end multiple-object tracking with transformer
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2022 | CodaLab Competition - CVPR 2020 BDD100K multiple object tracking challenge, July 2022. | //competitions.codalab.org/competitions/24910.](https://competitions.codalab.org/competitions/24910) Accessed 19 Jul 2022 |
| ref-2 | 2019 | Bergmann, P.; Meinhardt, T.; et al. | Tracking without bells and whistles |
| ref-3 | 2016 | Bewley, A.; Ge, Z.; et al. | Simple online and realtime tracking |
| ref-4 | 2017 | Bochinski, E.; Eiselein, V.; et al. | High-speed tracking-by-detection without using image information |
| ref-5 | 2020 | Camgoz, N.; Koller, O.; et al. | Sign language transformers: Joint end-to-end sign language recognition and translation |
| ref-6 | 2020 | Carion, N.; Massa, F.; et al. | Endto-end object detection with transformers |
| ref-7 | 2020 | Chang, X.; Zhang, W.; et al. | End-to-end multispeaker speech recognition with transformer |
| ref-8 | 2021 | Chu, P.; Wang, J.; et al. | TransMOT: spatial-temporal graph transformer for multiple object tracking |
| ref-9 | 2021 | Dosovitskiy, A.; et al. | An image is worth 16 x 16 words: transformers for image recognition at scale |
| ref-10 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-11 | 1955 | Kuhn, H. | The Hungarian method for the assignment problem |
| ref-12 | 2016 | Leal-Taix´e, L.; Canton-Ferrer, C.; et al. | Learning by tracking: Siamese CNN for robust target association |
| ref-13 | 2019 | Li, N.; Liu, S.; et al. | Neural speech synthesis with transformer network |
| ref-14 | 2017 | Lin, T.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-15 | 2014 | Lin, T.; Y., et al.; et al. | Microsoft coco: common objects in context |
| ref-16 | 2021 | Liu, Z.; et al. | Swin transformer: hierarchical vision transformer using shifted windows |
| ref-17 | 2020 | Luiten, J.; et al. | HOTA: a higher order metric for evaluating multi-object tracking |
| ref-18 | 2021 | Meinhardt, T.; Kirillov, A.; et al. | TrackFormer: multiobject tracking with transformers |
| ref-19 | 2016 | Milan, A.; Leal-Taix´e, L.; et al. | Mot16: a benchmark for multi-object tracking |
| ref-20 | 2021 | Pang, J.; et al. | Quasi-dense similarity learning for multiple object tracking |
| ref-21 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union: a metric and a loss for bounding box regression |
| ref-22 | 2017 | Schulter, S.; Vernaza, P.; et al. | Deep network flow for multiobject tracking |
| ref-23 | 2018 | Shao, S.; et al. | CrowdHuman: a benchmark for detecting human in a crowd |
| ref-24 | 2018 | Sharma, S.; Ansari, J.; et al. | Beyond pixels: leveraging geometry and shape cues for online multi-object tracking |
| ref-25 | 2016 | Shi, B.; Bai, X.; et al. | An end-to-end trainable neural network for image-based sequence recognition and its application to scene text recognition |
| ref-26 | 2020 | Shuai, B.; Berneshawi, A.; et al. | Multi-object tracking with Siamese track-RCNN |
| ref-27 | 2022 | Stadler, D.; Beyerer, J. | Modelling ambiguous assignments for multi-person tracking in crowds |
| ref-28 | 2021 | Sun, P.; et al. | DanceTrack: multi-object tracking in uniform appearance and diverse motion |
| ref-29 | 2020 | Sun, P.; et al. | TransTrack: multiple-object tracking with transformer |
| ref-30 | 2014 | Sutskever, I.; Vinyals, O.; et al. | Sequence to sequence learning with neural networks |
| ref-31 | 2017 | Vaswani, A.; et al. | Attention is all you need |
| ref-32 | 2021 | Wang, Q.; Zheng, Y.; et al. | Multiple object tracking with correlation learning |
| ref-33 | 2021 | Wang, S.; Sheng, H.; et al. | A general recurrent tracking framework without real data |
| ref-34 | 2018 | Wang, X.; Girshick, R.; et al. | Non-local neural networks |
| ref-35 | 2021 | Wang, Y.; Kitani, K.; et al. | Joint object detection and multi-object tracking with graph neural networks |
| ref-36 | 2021 | Wang, Y.; et al. | End-to-end video instance segmentation with transformers |
| ref-37 | 2020 | Wang, Z.; Zheng, L.; et al. | Towards real-time multi-object tracking |
| ref-38 | 1995 | Welch, G.; Bishop, G.; et al. | An introduction to the kalman filter (1995) |
| ref-39 | 2017 | Wojke, N.; Bewley, A.; et al. | Simple online and realtime tracking with a deep association metric |
| ref-40 | 2021 | Wu, J.; Cao, J.; et al. | Track to detect and segment: an online multi-object tracker |
| ref-41 | 2020 | Yu, F.; et al. | Bdd100k: a diverse driving dataset for heterogeneous multitask learning |
| ref-42 | 2021 | Zhang, Y.; et al. | ByteTrack: multi-object tracking by associating every detection box |
| ref-43 | 2021 | Zhang, Y.; Wang, C.; et al. | FairMOT: on the fairness of detection and re-identification in multiple object tracking |
| ref-44 | 2020 | Zhou, X.; Koltun, V.; et al. | Tracking objects as points |
| ref-45 | 2020 | Zhu, X.; Su, W.; et al. | Deformable DETR: deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 按功能归类
- Background: [5], [7], [9], [12], [13], [16], [22], [24], [25], [34], [36]
- Baseline: [2], [3], [4], [8], [26], [37], [39], [43]
- Contrast: [18], [29], [42]
- Component: [6], [45]
- Dataset: [28]
- Historical: [11], [30], [31], [38]


# Faster R-CNN: towards real-time object detection with region proposal networks (2017)

- Paper ref: 1:M3AU5AC9
- Title: Faster R-CNN: towards real-time object detection with region proposal networks
- Year: 2017

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2014 | He, K.; Zhang, X.; et al. | Spatial pyramid pooling in deep convolutional networks for visual recognition |
| ref-2 | 2015 | Girshick, R. | Fast R-CNN |
| ref-3 | 2015 | Simonyan, K.; Zisserman, A. | Very deep convolutional networks for large-scale image recognition |
| ref-4 | 2013 | Uijlings, J. R.; van de Sande, K. E.; et al. | Selective search for object recognition |
| ref-5 | 2014 | Girshick, R.; Donahue, J.; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-6 | 2014 | Zitnick, C. L.; Dollar, P. | Edge boxes: Locating object proposals from edges |
| ref-7 | 2015 | Long, J.; Shelhamer, E.; et al. | Fully convolutional networks for semantic segmentation |
| ref-8 | 2010 | Felzenszwalb, P. F.; Girshick, R. B.; et al. | Object detection with discriminatively trained part-based models |
| ref-9 | 2014 | Sermanet, P.; Eigen, D.; et al. | Overfeat: Integrated recognition, localization and detection using convolutional networks |
| ref-10 | 2015 | Ren, S.; He, K.; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-11 | 2007 | Everingham, M.; Van Gool, L.; et al. | The PASCAL Visual Object Classes Challenge Results |
| ref-12 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft COCO: Common objects in context |
| ref-13 | 2015 | Song, S.; Xiao, J. | Deep sliding shapes for amodal 3d object detection in RGB-D images |
| ref-14 | 2015 | Zhu, J.; Chen, X.; et al. | DeePM: A deep part-based model for object detection and semantic part localization |
| ref-15 | 2015 | Dai, J.; He, K.; et al. | Instance-aware semantic segmentation via multi-task network cascades |
| ref-16 | 2015 | Johnson, J.; Karpathy, A.; et al. | Densecap: Fully convolutional localization networks for dense captioning |
| ref-17 | 2015 | Kislyuk, D.; Liu, Y.; et al. | Human curation and convnets: Powering item-to-item recommendations on pinterest |
| ref-18 | 2015 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-19 | 2014 | Hosang, J.; Benenson, R.; et al. | How good are detection proposals, really? |
| ref-20 | 2015 | Hosang, J.; Benenson, R.; et al. | What makes for effective detection proposals? |
| ref-21 | 2015 | Chavali, N.; Agrawal, H.; et al. | Object-proposal evaluation protocol is 'gameable' |
| ref-22 | 2012 | Carreira, J.; Sminchisescu, C. | CPMC: Automatic object segmentation using constrained parametric min-cuts |
| ref-23 | 2014 | Arbelaez, P.; Pont-Tuset, J.; et al. | Multiscale combinatorial grouping |
| ref-24 | 2012 | Alexe, B.; Deselaers, T.; et al. | Measuring the objectness of image windows |
| ref-25 | 2013 | Szegedy, C.; Toshev, A.; et al. | Deep neural networks for object detection |
| ref-26 | 2014 | Erhan, D.; Szegedy, C.; et al. | Scalable object detection using deep neural networks |
| ref-27 | 2015 | Szegedy, C.; Reed, S.; et al. | Scalable, high-quality object detection |
| ref-28 | 2015 | Pinheiro, P. O.; Collobert, R.; et al. | Learning to segment object candidates |
| ref-29 | 2015 | Dai, J.; He, K.; et al. | Convolutional feature masking for joint object and stuff segmentation |
| ref-30 | 2015 | Ren, S.; He, K.; et al. | Object detection networks on convolutional feature maps |
| ref-31 | 2015 | Chorowski, J. K.; Bahdanau, D.; et al. | Attention-based models for speech recognition |
| ref-32 | 2014 | Zeiler, M. D.; Fergus, R. | Visualizing and understanding convolutional neural networks |
| ref-33 | 2010 | Nair, V.; Hinton, G. E. | Rectified linear units improve restricted Boltzmann machines |
| ref-34 | 2015 | Szegedy, C.; Liu, W.; et al. | Going deeper with convolutions |
| ref-35 | 1989 | LeCun, Y. | Backpropagation applied to handwritten zip code recognition |
| ref-36 | 2015 | Russakovsky, O. | ImageNet Large Scale Visual Recognition Challenge |
| ref-37 | 2012 | Krizhevsky, A.; Sutskever, I.; et al. | Imagenet classification with deep convolutional neural networks |
| ref-38 | 2014 | Jia, Y.; Shelhamer, E.; et al. | Caffe: Convolutional architecture for fast feature embedding |
| ref-39 | 2015 | Lenc, K.; Vedaldi, A. | R-CNN minus R |
| ref-40 | 2012 | Hoiem, D.; Chodpathumwan, Y.; et al. | Diagnosing error in object detectors |

## Citation Analysis Report

#### 按功能归类

**Background（背景文献）:**
- [5] R-CNN：作为基于区域的 CNN 检测方法的开创性工作，主要作为分类器使用
- [19], [20], [21]：物体提议方法的综合调查和比较文献
- [30]：反向传播基础方法

**Baseline（基线方法）:**
- [4] Selective Search：最流行的区域提议方法，但 CPU 实现速度比检测网络慢一个数量级（2 秒/图像）
- [6] EdgeBoxes：提供提议质量和速度的最佳权衡（0.2 秒/图像），但区域提议步骤仍消耗与检测网络相当的运行时间

**Contrast（对比方法）:**
- [8] DPM：使用图像/特征金字塔处理多尺度，与本文基于锚框的方案形成对比
- [9] OverFeat：使用全连接层预测边界框坐标用于单物体定位，与本文全卷积方案不同
- [26], [27] MultiBox：使用 k-means 生成 800 个锚框，不具有平移不变性，不共享提议和检测网络特征

**Component（技术组件）:**
- [1] SPPnet：通过共享卷积减少检测网络运行时间的关键进展
- [2] Fast R-CNN：本文方法的直接基础，RPN 设计用于与 Fast R-CNN 共享卷积特征
- [3] VGG-16：实验中使用的主要深度 backbone 网络（13 个可共享卷积层）
- [7] FCN：全卷积网络概念被用于 RPN 设计
- [32] ZF 网络：实验中使用的另一 backbone 网络（5 个可共享卷积层）
- [38] Caffe：实现框架

**Dataset（数据集）:**
- [11] PASCAL VOC：主要评估基准之一
- [12] MS COCO：主要评估基准之一，用于验证大规模多类别检测

**Tooling（工具/后续工作）:**
- [18] ResNet：用于 ILSVRC 和 COCO 2015 竞赛冠军方案，证明 RPN 可从更深网络受益

#### 按引用编号列举

- [1] SPPnet：本文定位为通过共享卷积减少检测网络运行时间的关键进展，是 Faster R-CNN 方法的重要技术基础
- [2] Fast R-CNN：本文方法的直接基础，RPN 设计用于与 Fast R-CNN 共享卷积特征，形成统一检测网络
- [3] VGG-16：作为实验中使用的主要深度 backbone 网络之一
- [4] Selective Search：作为主要对比基线，速度慢（2 秒/图像）
- [5] R-CNN：作为基于区域的 CNN 检测方法的开创性工作
- [6] EdgeBoxes：提供质量和速度最佳权衡但仍消耗大量时间
- [7] FCN：用于 RPN 设计的全卷积网络概念
- [8] DPM：使用图像金字塔的对比方法
- [9] OverFeat：使用全连接层的对比方法
- [12] MS COCO：主要评估数据集
- [18] ResNet：竞赛冠军方案使用的更深网络
- [19-21]：物体提议方法综述
- [26-27] MultiBox：不具平移不变性的对比方法
- [32] ZF 网络：实验用 backbone
- [37-38]：训练参数和实现框架


# Polar-Based Aortic Segmentation in 3D CTA Dissection Data Using a Piecewise Constant Curvature Model (2014)

- Paper ref: 1:M5KCQ9G3
- Title: Polar-Based Aortic Segmentation in 3D CTA Dissection Data Using a Piecewise Constant Curvature Model
- Year: 2014

## Compact References

_No references artifact rows available._

## Citation Analysis Report

_No citation analysis report available._


# Exploiting DINOv3-Based Self-Supervised Features for Robust Few-Shot Medical Image Segmentation (2026)

- Paper ref: 1:M68XPFA9
- Title: Exploiting DINOv3-Based Self-Supervised Features for Robust Few-Shot Medical Image Segmentation
- Year: 2026

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2026 | Xu, G.; Udupa, J.K.; et al. | References section (OCR-corrupted; individual entries could not be reliably separated) |

## Citation Analysis Report

#### 总体总结
本文先以U-Net及其卷积变体铺出医学图像分割的技术背景，再将Transformer架构引入该领域作为对比路线，最后借DINO系列自监督视觉基础模型把方法路线明确到利用预训练特征进行少样本分割。由于参考文献文本严重OCR损坏，引文分析受到较大限制。


#### 关键文献

- [1] Xu, G., 2026: References section (OCR-corrupted; individual entries could not be reliably separated) (Background)



#### 范围
- 章节: Introduction + Related Works + Discussion
- 行号: 14-293

#### 按功能归类


##### Background

- [1] Xu, G., 2026
  - 标题: References section (OCR-corrupted; individual entries could not be reliably separated)
  - 关键词: 医学图像分割, U-Net, 自监督学习, 视觉基础模型
  - 总结: 本文通过引用这些文献建立医学图像分割领域的技术脉络，从U-Net及其变体到Transformer架构再到自监督学习基础模型（如DINO系列），为引出本文基于DINOv3特征的少样本分割方法做技术铺垫。由于参考文献文本严重OCR损坏，无法进行逐条精细化语义分析。





#### 时间线分析

##### 早期
早期医学图像分割工作以U-Net及其卷积变体为主，奠定了编码器-解码器架构的基础。

- 该时段没有可列举的代表文献。



##### 中期
中期工作将Transformer引入医学分割，平衡局部特征提取与全局上下文建模。

- 该时段没有可列举的代表文献。



##### 近期
近期工作以自监督视觉基础模型（如DINO系列）为核心，利用大规模预训练特征提升少样本场景下的分割性能。本文引用的文献主要集中在此脉络。


- [1] Xu, G., 2026: References section (OCR-corrupted; individual entries could not be reliably separated)


# D-FINE: Redefine Regression Task in DETRs as Fine-grained Distribution Refinement (2024)

- Paper ref: 1:MERSIDHN
- Title: D-FINE: Redefine Regression Task in DETRs as Fine-grained Distribution Refinement
- Year: 2024

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2022 | Elahe Arani; Shruthi Gowda; et al. | A comprehensive study of real-time object detection networks across multiple domains: A survey |
| ref-2 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-3 | 2023 | Jiahao Chang; Shuo Wang; et al. | Detrdistill: A universal knowledge distillation framework for detr-families |
| ref-4 | 2017 | Guobin Chen; Wongun Choi; et al. | Learning efficient object detection models with knowledge distillation |
| ref-5 | 2022 | Qiang Chen; Xiaokang Chen; et al. | Group detr: Fast training convergence with decoupled one-to-many label assignment |
| ref-6 | 2022 | Qiang Chen; Jian Wang; et al. | Group detr v2: Strong object detector with encoder-decoder pretraining, 2022b |
| ref-7 | 2022 | Qiang Chen; Jian Wang; et al. | Group detr v2: Strong object detector with encoderdecoder pretraining |
| ref-8 | 2024 | Qiang Chen; Xiangbo Su; et al. | Lw-detr: A transformer replacement to yolo for real-time detection |
| ref-9 | 2019 | Jiwoong Choi; Dayoung Chun; et al. | Gaussian YOLOv3: An accurate and fast object detector using localization uncertainty for autonomous driving |
| ref-10 | 2021 | Cheng Cui; Ruoyu Guo; et al. | Beyond self-supervision: A simple yet effective network distillation alternative to improve backbones, 2021 |
| ref-11 | 2021 | Xing Dai; Zeren Jiang; et al. | General instance distillation for object detection |
| ref-12 | 2021 | Zheng Ge; Songtao Liu; et al. | Yolox: Exceeding yolo series in 2021 |
| ref-13 | 2015 | Ross Girshick | Fast R-CNN |
| ref-14 | 2023 | Jocher Glenn | Yolov8 |
| ref-15 | 2024 | Jocher Glenn | Yolo11 |
| ref-16 | 2021 | Jianyuan Guo; Kai Han; et al. | Distilling object detectors via decoupled features |
| ref-17 | 2015 | Geoffrey Hinton; Oriol Vinyals; et al. | Distilling the knowledge in a neural network |
| ref-18 | 2022 | Feng Li; Hao Zhang; et al. | Dn-detr: Accelerate detr training by introducing query denoising |
| ref-19 | 2017 | Quanquan Li; Shengying Jin; et al. | Mimicking very efficient network for object detection |
| ref-20 | 2020 | Xiang Li; Wenhai Wang; et al. | Generalized Focal Loss: learning qualified and distributed bounding boxes for dense object detection |
| ref-21 | 2021 | Xiang Li; Wenhai Wang; et al. | Generalized focal loss v2: Learning reliable localization quality estimation for dense object detection |
| ref-22 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Lawrence Zitnick |
| ref-23 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft coco: Common objects in context |
| ref-24 | 2021 | Shilong Liu; Feng Li; et al. | Dabdetr: Dynamic anchor boxes are better queries for detr |
| ref-25 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Berg |
| ref-26 | 2024 | Wenyu Lv; Yian Zhao; et al. | Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer, 2024 |
| ref-27 | 2022 | Chengqi Lyu; Wenwei Zhang; et al. | Rtmdet: An empirical study of designing real-time object detectors |
| ref-28 | 2021 | Depu Meng; Xiaokang Chen; et al. | Conditional detr for fast training convergence |
| ref-29 | 2020 | Seyed Iman Mirzadeh; Mehrdad Farajtabar; et al. | Improved knowledge distillation via teacher assistant |
| ref-30 | 2020 | Heqian Qiu; Hongliang Li; et al. | Offset bin classification network for accurate object detection |
| ref-31 | 2016 | Joseph Redmon; Santosh Divvala; et al. | You only look once: Unified, real-time object detection |
| ref-32 | 2016 | Joseph Redmon; Santosh Divvala; et al. | You only look once: Unified, real-time object detection |
| ref-33 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-34 | 2015 | Adriana Romero; Nicolas Ballas; et al. | Fitnets: Hints for thin deep nets |
| ref-35 | 2015 | Olga Russakovsky; Jia Deng; et al. | Imagenet large scale visual recognition challenge |
| ref-36 | 2019 | Shuai Shao; Zeming Li; et al. | Objects365: A large-scale, high-quality dataset for object detection |
| ref-37 | 2021 | Wonchul Son; Jaemin Na; et al. | Densely guided knowledge distillation using multiple teacher assistants |
| ref-38 | 2019 | Zhi Tian; Chunhua Shen; et al. | FCOS: Fully convolutional one-stage object detection |
| ref-39 | 2024 | Ao Wang; Hui Chen; et al. | Yolov10: Real-time end-to-end object detection |
| ref-40 | 2023 | Chengcheng Wang; Wei He; et al. | Gold-yolo: Efficient object detector via gather-and-distribute mechanism |
| ref-41 | 2024 | Chien-Yao Wang and Hong-Yuan Mark Liao | YOLOv9: Learning what you want to learn using programmable gradient information |
| ref-42 | 2023 | Chien-Yao Wang; Alexey Bochkovskiy; et al. | Yolov7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors |
| ref-43 | 2019 | Tao Wang; Li Yuan; et al. | Distilling object detectors with fine-grained feature imitation |
| ref-44 | 2022 | Yingming Wang; Xiangyu Zhang; et al. | Anchor detr: Query design for transformer-based detector |
| ref-45 | 2024 | Yu Wang; Xin Li; et al. | Kd-detr: Knowledge distillation for detection transformer with consistent distillation points sampling |
| ref-46 | 2017 | Sergey Zagoruyko and Nikos Komodakis | Paying more attention to attention: Improving the performance of convolutional neural networks via attention transfer |
| ref-47 | 2022 | Hao Zhang; Feng Li; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-48 | 2019 | Linfeng Zhang; Jiebo Song; et al. | Be your own teacher: Improve the performance of convolutional neural networks via self distillation |
| ref-49 | 2021 | Linfeng Zhang; Chenglong Bao; et al. | Self-distillation: Towards efficient and compact neural networks |
| ref-50 | 2024 | Yian Zhao; Wenyu Lv; et al. | Detrs beat yolos on real-time object detection |
| ref-51 | 2022 | Zhaohui Zheng; Rongguang Ye; et al. | Localization distillation for dense object detection |
| ref-52 | 2020 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 总体总结
D-FINE 的参考文献围绕三条主线展开：（1）实时目标检测器的演进：从经典的两阶段/单阶段检测器（Faster R-CNN、SSD、YOLO）到基于 Transformer 的端到端检测（DETR 及其变体），再到实时 DETR（RT-DETR、LW-DETR）和无 NMS 的 YOLOv10，文献呈现出追求速度与精度平衡的清晰脉络；（2）基于分布的边界框回归：从传统的 Dirac delta 固定坐标预测，到 GFocal 引入概率分布建模定位不确定性，再到 D-FINE 进一步将其发展为迭代式细粒度分布细化，体现了从粗到精的回归范式转变；（3）知识蒸馏在检测任务中的应用：从传统的 Logit 模仿和特征模仿，到更有效的定位蒸馏（LD），最终发展为 D-FINE 的全局最优定位自蒸馏（GO-LSD），实现了低开销的高效知识迁移。论文的关键创新在于将这三条主线有机整合，以 FDR 解决回归不确定性问题，以 GO-LSD 解决蒸馏效率问题，同时辅以轻量级架构优化，最终在各项指标上超越了现有最先进方法。


#### 关键文献

- [AY-2] Nicolas Carion, 2020: End-to-end object detection with transformers (Uncategorized)

- [AY-16] Geoffrey Hinton, 2015: Distilling the knowledge in a neural network (Uncategorized)

- [AY-17] Xiang Li, 2020: Generalized Focal Loss: learning qualified and distributed bounding boxes for dense object detection (Uncategorized)

- [AY-10] Ao Wang, 2024: Yolov10: Real-time end-to-end object detection (Uncategorized)

- [AY-13] Yian Zhao, 2024: Detrs beat yolos on real-time object detection (Uncategorized)

- [AY-22] Zhaohui Zheng, 2022: Localization distillation for dense object detection (Uncategorized)



#### 范围
- 章节: 1 INTRODUCTION
- 行号: 1-186

#### 按功能归类


##### Background

- [AY-1] Elahe Arani, 2022
  - 标题: A comprehensive study of real-time object detection networks across multiple domains: A survey
  - 关键词: 实时检测, 应用需求, 综述
  - 总结: 作为背景综述文献，支撑实时目标检测广泛需求的论点。



##### Uncategorized

- [AY-2] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, Transformer, 匈牙利匹配, 端到端检测
  - 总结: 作为核心技术基础文献，为本文基于DETR系列的改进提供架构起点。

- [AY-31] Jiahao Chang, 2023
  - 标题: Detrdistill: A universal knowledge distillation framework for detr-families
  - 关键词: DETR蒸馏, 知识蒸馏框架
  - 总结: 作为DETR系列蒸馏的已有工作，用于对比说明本文方法的创新点。

- [AY-32] Guobin Chen, 2017
  - 标题: Learning efficient object detection models with knowledge distillation
  - 关键词: 知识蒸馏, 目标检测, 早期工作
  - 总结: 作为检测领域知识蒸馏的早期代表性工作被引用。

- [AY-24] Qiang Chen, 2022
  - 标题: Group detr: Fast training convergence with decoupled one-to-many label assignment
  - 关键词: Group DETR, 标签分配, 训练收敛
  - 总结: 作为DETR训练优化的代表性变体被引用。

- [AY-3] Qiang Chen, 2024
  - 标题: Lw-detr: A transformer replacement to yolo for real-time detection
  - 关键词: LW-DETR, 实时检测, 实验对比, 预训练方案
  - 总结: 作为重要的实时DETR竞品，在实验中进行了性能对比，并参考了其预训练协议。

- [AY-27] Jiwoong Choi, 2019
  - 标题: Gaussian YOLOv3: An accurate and fast object detector using localization uncertainty for autonomous driving
  - 关键词: Gaussian YOLO, 定位不确定性, 分布检测
  - 总结: 作为基于分布进行边界框建模的早期工作被引用。

- [AY-33] Xing Dai, 2021
  - 标题: General instance distillation for object detection
  - 关键词: 特征模仿, 实例蒸馏, 检测蒸馏
  - 总结: 作为特征模仿蒸馏的代表性工作被引用。

- [AY-28] Zheng Ge, 2021
  - 标题: Yolox: Exceeding yolo series in 2021
  - 关键词: YOLOX, anchor-free, 无锚框检测
  - 总结: 作为anchor-free检测架构的代表性文献被引用。

- [AY-15] Ross Girshick, 2015
  - 标题: Fast R-CNN
  - 关键词: Fast R-CNN, IoU损失, 边界框回归
  - 总结: 作为边界框回归损失设计的经典基础文献被引用。

- [AY-4] Jocher Glenn, 2023
  - 标题: Yolov8
  - 关键词: YOLOv8, 实验对比, 训练协议
  - 总结: 作为YOLO系列的重要版本，在实验中进行了性能对比并参考了其训练策略。

- [AY-5] Jocher Glenn, 2024
  - 标题: Yolo11
  - 关键词: YOLO11, 实验对比, 竞品
  - 总结: 作为最新的YOLO系列版本，在实验中进行性能对标。

- [AY-34] Jianyuan Guo, 2021
  - 标题: Distilling object detectors via decoupled features
  - 关键词: 解耦特征, 检测蒸馏
  - 总结: 作为解耦蒸馏策略的代表性工作被引用。

- [AY-16] Geoffrey Hinton, 2015
  - 标题: Distilling the knowledge in a neural network
  - 关键词: 知识蒸馏, KL散度, Hinton, 基础理论
  - 总结: 作为知识蒸馏领域的奠基性文献，为本文蒸馏方法提供理论基础。

- [AY-6] Feng Li, 2022
  - 标题: Dn-detr: Accelerate detr training by introducing query denoising
  - 关键词: DN-DETR, 去噪查询, 实验对比, FDR
  - 总结: 作为DETR改进变体，验证了本文方法在该架构上的适用性。

- [AY-35] Quanquan Li, 2017
  - 标题: Mimicking very efficient network for object detection
  - 关键词: logit模仿, 检测蒸馏
  - 总结: 作为logit层面蒸馏的代表性工作被引用。

- [AY-17] Xiang Li, 2020
  - 标题: Generalized Focal Loss: learning qualified and distributed bounding boxes for dense object detection
  - 关键词: GFocal, 分布焦点损失, 分布建模, 边界框
  - 总结: 作为分布式边界框建模的核心基础文献，为本文的细粒度分布精化方法提供了直接灵感。

- [AY-29] Xiang Li, 2021
  - 标题: Generalized focal loss v2: Learning reliable localization quality estimation for dense object detection
  - 关键词: GFocal v2, 分布焦点损失
  - 总结: 作为GFocal系列的后续工作被引用。

- [AY-23] Tsung-Yi Lin, 2014
  - 标题: Lawrence Zitnick
  - 关键词: COCO, 数据集, 评估基准
  - 总结: 作为实验评估的标准数据集文献被引用。

- [AY-7] Shilong Liu, 2021
  - 标题: Dabdetr: Dynamic anchor boxes are better queries for detr
  - 关键词: DAB-DETR, 动态锚框, 实验对比, FDR
  - 总结: 作为DETR改进变体，验证了本文方法在该架构上的适用性。

- [AY-18] Wei Liu, 2016
  - 标题: Berg
  - 关键词: SSD, 单阶段检测, 经典方法
  - 总结: 作为单阶段检测器的经典代表被引用。

- [AY-41] Wenyu Lv, 2024
  - 标题: Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer, 2024
  - 关键词: RT-DETR v2, 训练策略, bag-of-freebies
  - 总结: 作为训练策略优化的参考文献，为本文的训练流程设计提供了指导。

- [AY-19] Chengqi Lyu, 2022
  - 标题: Rtmdet: An empirical study of designing real-time object detectors
  - 关键词: RTMDet, 实时检测, 实验对比
  - 总结: 作为实时检测器的竞品在实验中进行性能对比。

- [AY-25] Depu Meng, 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: Conditional DETR, 条件查询, 训练收敛
  - 总结: 作为DETR训练加速的变体方法被引用。

- [AY-36] Seyed Iman Mirzadeh, 2020
  - 标题: Improved knowledge distillation via teacher assistant
  - 关键词: teacher assistant, 知识蒸馏, 中间层
  - 总结: 作为知识蒸馏策略的改进方案被引用。

- [AY-30] Heqian Qiu, 2020
  - 标题: Offset bin classification network for accurate object detection
  - 关键词: 偏移箱分类, 边界框建模
  - 总结: 作为分布式边界框回归的相关方法被引用。

- [AY-8] Joseph Redmon, 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: YOLO, 单阶段检测, 开创性工作
  - 总结: 作为单阶段目标检测的奠基性文献被引用。

- [AY-20] Shaoqing Ren, 2015
  - 标题: Faster R-CNN: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, 两阶段检测, RPN
  - 总结: 作为两阶段检测器的经典代表被引用。

- [AY-37] Adriana Romero, 2015
  - 标题: Fitnets: Hints for thin deep nets
  - 关键词: FitNets, 特征提示, 特征模仿
  - 总结: 作为特征模仿蒸馏的基础文献被引用。

- [AY-9] Shuai Shao, 2019
  - 标题: Objects365: A large-scale, high-quality dataset for object detection
  - 关键词: Objects365, 预训练, 大规模数据集
  - 总结: 作为模型预训练所使用的数据集文献被引用。

- [AY-38] Wonchul Son, 2021
  - 标题: Densely guided knowledge distillation using multiple teacher assistants
  - 关键词: 密集引导, 知识蒸馏
  - 总结: 作为知识蒸馏的改进方法被引用。

- [AY-21] Zhi Tian, 2019
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: FCOS, anchor-free, 全卷积检测
  - 总结: 作为anchor-free检测架构的代表性文献被引用。

- [AY-10] Ao Wang, 2024
  - 标题: Yolov10: Real-time end-to-end object detection
  - 关键词: YOLOv10, NMS-free, 实验对比, 端到端检测
  - 总结: 作为主要的竞品之一，在实验中进行了广泛的性能对比分析。

- [AY-11] Chengcheng Wang, 2023
  - 标题: Gold-yolo: Efficient object detector via gather-and-distribute mechanism
  - 关键词: Gold-YOLO, gather-and-distribute, 实验对比
  - 总结: 作为高效YOLO变体在实验中进行性能对标。

- [AY-42] Chien-Yao Wang and Hong-Yuan Mark Liao, 2024
  - 标题: YOLOv9: Learning what you want to learn using programmable gradient information
  - 关键词: YOLOv9, 可编程梯度, 实验对比
  - 总结: 作为YOLO系列的最新版本之一在实验中进行性能对比。

- [AY-39] Tao Wang, 2019
  - 标题: Distilling object detectors with fine-grained feature imitation
  - 关键词: 细粒度特征, 特征模仿, 检测蒸馏
  - 总结: 作为细粒度特征蒸馏的相关工作被引用。

- [AY-26] Yingming Wang, 2022
  - 标题: Anchor detr: Query design for transformer-based detector
  - 关键词: Anchor DETR, 查询设计, Transformer检测
  - 总结: 作为DETR查询优化的代表性工作被引用。

- [AY-12] Hao Zhang, 2022
  - 标题: Dino: Detr with improved denoising anchor boxes for end-to-end object detection
  - 关键词: DINO, 去噪锚框, 实验对比, FDR
  - 总结: 作为DETR改进变体，验证了本文方法在该架构上的适用性。

- [AY-40] Linfeng Zhang, 2019
  - 标题: Be your own teacher: Improve the performance of convolutional neural networks via self distillation
  - 关键词: 自蒸馏, CNN性能提升
  - 总结: 作为自蒸馏策略的代表性工作被引用。

- [AY-13] Yian Zhao, 2024
  - 标题: Detrs beat yolos on real-time object detection
  - 关键词: RT-DETR, 实时检测, 基线模型, DETR
  - 总结: 作为本文方法的核心基线架构，RT-DETR是本文改进和对比的主要对象。

- [AY-22] Zhaohui Zheng, 2022
  - 标题: Localization distillation for dense object detection
  - 关键词: 定位蒸馏, LD, GO-LSD, 密集检测
  - 总结: 作为定位蒸馏的开创性工作，直接启发了本文GO-LSD模块的设计。

- [AY-14] Xizhou Zhu, 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, 可变形注意力, 实验对比, FDR
  - 总结: 作为DETR的重要变体，验证了本文方法在该架构上的适用性。





#### 时间线分析

##### 早期
早期研究奠定了目标检测与知识蒸馏的基础：包括两阶段检测器（Faster R-CNN）、单阶段检测器（SSD、YOLO）、以及知识蒸馏的开创性工作（Hinton 蒸馏、FitNets）。这些工作为 D-FINE 的定位回归和蒸馏策略提供了理论支撑。


- [AY-15] Ross Girshick, 2015: Fast R-CNN

- [AY-16] Geoffrey Hinton, 2015: Distilling the knowledge in a neural network

- [AY-23] Tsung-Yi Lin, 2014: Lawrence Zitnick

- [AY-18] Wei Liu, 2016: Berg

- [AY-8] Joseph Redmon, 2016: You only look once: Unified, real-time object detection

- [AY-20] Shaoqing Ren, 2015: Faster R-CNN: Towards real-time object detection with region proposal networks

- [AY-37] Adriana Romero, 2015: Fitnets: Hints for thin deep nets




##### 中期
中期工作聚焦于基于分布的边界框回归、DETR 系列变体和定位蒸馏：包括 GFocal 系列将概率分布引入目标检测，DETR 及其变体（Deformable DETR、DN-DETR、DAB-DETR、Anchor DETR、Conditional DETR）推动端到端检测发展，以及定位蒸馏（LD）证明定位知识迁移的有效性。


- [AY-2] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-27] Jiwoong Choi, 2019: Gaussian YOLOv3: An accurate and fast object detector using localization uncertainty for autonomous driving

- [AY-33] Xing Dai, 2021: General instance distillation for object detection

- [AY-28] Zheng Ge, 2021: Yolox: Exceeding yolo series in 2021

- [AY-34] Jianyuan Guo, 2021: Distilling object detectors via decoupled features

- [AY-6] Feng Li, 2022: Dn-detr: Accelerate detr training by introducing query denoising

- [AY-35] Quanquan Li, 2017: Mimicking very efficient network for object detection

- [AY-17] Xiang Li, 2020: Generalized Focal Loss: learning qualified and distributed bounding boxes for dense object detection

- [AY-29] Xiang Li, 2021: Generalized focal loss v2: Learning reliable localization quality estimation for dense object detection

- [AY-7] Shilong Liu, 2021: Dabdetr: Dynamic anchor boxes are better queries for detr

- [AY-41] Wenyu Lv, 2024: Rt-detrv2: Improved baseline with bag-of-freebies for real-time detection transformer, 2024

- [AY-19] Chengqi Lyu, 2022: Rtmdet: An empirical study of designing real-time object detectors

- [AY-25] Depu Meng, 2021: Conditional detr for fast training convergence

- [AY-36] Seyed Iman Mirzadeh, 2020: Improved knowledge distillation via teacher assistant

- [AY-30] Heqian Qiu, 2020: Offset bin classification network for accurate object detection

- [AY-9] Shuai Shao, 2019: Objects365: A large-scale, high-quality dataset for object detection

- [AY-21] Zhi Tian, 2019: FCOS: Fully convolutional one-stage object detection

- [AY-39] Tao Wang, 2019: Distilling object detectors with fine-grained feature imitation

- [AY-26] Yingming Wang, 2022: Anchor detr: Query design for transformer-based detector




##### 近期
近期研究集中在实时 DETR 检测器（RT-DETR、LW-DETR）和无 NMS 的 YOLO 系列（YOLOv8、YOLOv9、YOLOv10、YOLO11），以及 DETR 蒸馏框架。D-FINE 在此基础上整合 FDR 和 GO-LSD，全面超越这些最新方法。


- [AY-1] Elahe Arani, 2022: A comprehensive study of real-time object detection networks across multiple domains: A survey

- [AY-31] Jiahao Chang, 2023: Detrdistill: A universal knowledge distillation framework for detr-families

- [AY-32] Guobin Chen, 2017: Learning efficient object detection models with knowledge distillation

- [AY-24] Qiang Chen, 2022: Group detr: Fast training convergence with decoupled one-to-many label assignment

- [AY-3] Qiang Chen, 2024: Lw-detr: A transformer replacement to yolo for real-time detection

- [AY-4] Jocher Glenn, 2023: Yolov8

- [AY-5] Jocher Glenn, 2024: Yolo11

- [AY-38] Wonchul Son, 2021: Densely guided knowledge distillation using multiple teacher assistants

- [AY-10] Ao Wang, 2024: Yolov10: Real-time end-to-end object detection

- [AY-11] Chengcheng Wang, 2023: Gold-yolo: Efficient object detector via gather-and-distribute mechanism

- [AY-42] Chien-Yao Wang and Hong-Yuan Mark Liao, 2024: YOLOv9: Learning what you want to learn using programmable gradient information

- [AY-12] Hao Zhang, 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection

- [AY-40] Linfeng Zhang, 2019: Be your own teacher: Improve the performance of convolutional neural networks via self distillation

- [AY-13] Yian Zhao, 2024: Detrs beat yolos on real-time object detection

- [AY-22] Zhaohui Zheng, 2022: Localization distillation for dense object detection

- [AY-14] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection


# DN-DETR: accelerate DETR training by introducing query DeNoising (2022)

- Paper ref: 1:NXLIGKF5
- Title: DN-DETR: accelerate DETR training by introducing query DeNoising
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-2 | 2021 | Chen, T.; Saxena, S.; et al. | Pix2seq: A language modeling framework for object detection |
| ref-3 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic detr: End-to-end object detection with dynamic attention |
| ref-4 | 2021 | Dai, X.; Chen, Y.; et al. | Dynamic detr: End-to-end object detection with dynamic attention |
| ref-5 | 2021 | Fenoaltea, E.M.; Baybusinov, I.B.; et al. | The stable marriage problem: An interdisciplinary review from the physicist's perspective |
| ref-6 | 2021 | Gao, P.; Zheng, M.; et al. | Fast convergence of detr with spatially modulated co-attention |
| ref-7 | 2014 | Girshick, R.; Donahue, J.; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-8 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-9 | 2018 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-10 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-11 | 2022 | Liu, S.; Li, F.; et al. | DAB-DETR: Dynamic anchor boxes are better queries for DETR |
| ref-12 | 2021 | Meng, D.; Chen, X.; et al. | Conditional detr for fast training convergence |
| ref-13 | 2016 | Redmon, J.; Farhadi, A. | Yolo9000: Better, faster, stronger |
| ref-14 | 2018 | Redmon, J.; Farhadi, A. | Yolov3: An incremental improvement |
| ref-15 | 2017 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-16 | 2020 | Sun, Z.; Cao, S.; et al. | Rethinking transformer-based set prediction for object detection |
| ref-17 | 2017 | Vaswani, A.; Shazeer, N.; et al. | Attention is all you need |
| ref-18 | 2021 | Wang, Y.; Zhang, X.; et al. | Anchor detr: Query design for transformer-based detector |
| ref-19 | 2021 | Yao, Z.; Ai, J.; et al. | Efficient detr: Improving end-to-end object detector with dense prior |
| ref-20 | 2021 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 总体总结
原文先用经典CNN检测器（R-CNN、Faster R-CNN、YOLO）和Transformer架构铺出技术背景，引出DETR作为首个端到端集合预测检测器及其慢收敛问题。接着梳理了近期从架构层面改进DETR训练效率的路线（改进cross-attention、查询解耦、锚框化、可变形注意力），指出鲜有工作关注二分图匹配这一核心组件。然后借稳定匹配理论支撑关于匹配不稳定性的核心论点，并通过对比TSP-RCNN的不同结论来凸显自身分析角度的独特性。最后将DETR、DAB-DETR和Deformable DETR等关键文献串联为本文方法的技术谱系，借实验对比将去噪训练定位为一个填补现有方法空白的新训练范式。


#### 关键文献

- [1] Carion, N., 2020: End-to-end object detection with transformers (Uncategorized)

- [11] Liu, S., 2022: DAB-DETR: Dynamic anchor boxes are better queries for DETR (Uncategorized)

- [19] Yao, Z., 2021: Efficient detr: Improving end-to-end object detector with dense prior (Uncategorized)

- [15] Ren, S., 2017: Faster r-cnn: Towards real-time object detection with region proposal networks (Uncategorized)

- [5] Fenoaltea, E.M., 2021: The stable marriage problem: An interdisciplinary review from the physicist's perspective (Uncategorized)

- [16] Sun, Z., 2020: Rethinking transformer-based set prediction for object detection (Uncategorized)



#### 范围
- 章节: Introduction + Related Work + Why Denoising + DN-DETR + Experiment + Conclusion
- 行号: 13-242

#### 按功能归类


##### Uncategorized

- [1] Carion, N., 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, transformer detection, baseline
  - 总结: 该工作是本文的核心研究对象。原文通过分析DETR的二分图匹配机制揭示其收敛缓慢的原因，并在此基础上提出去噪训练方案。实验中也以DETR作为主要对比基线。

- [3] Dai, X., 2021
  - 标题: Dynamic detr: End-to-end object detection with dynamic attention
  - 关键词: dynamic decoder, DETR variant, efficiency
  - 总结: 该工作被用来展示一类通过改进decoder架构（动态注意力）来加速DETR训练的路线，与本文从去噪角度出发的方法形成对比。

- [4] Dai, X., 2021
  - 标题: Dynamic detr: End-to-end object detection with dynamic attention
  - 关键词: dynamic encoder, 1x comparison, multi-scale
  - 总结: 该工作在实验中被用作12 epoch设置下的性能对比基线，原文同时指出其采用了动态编码器和5尺度特征，因此对比不完全公平但仍作为参考。

- [5] Fenoaltea, E.M., 2021
  - 标题: The stable marriage problem: An interdisciplinary review from the physicist's perspective
  - 关键词: stable marriage, matching instability, theory
  - 总结: 该工作被用来从理论上支撑原文关于二分图匹配不稳定性的核心论点，说明匈牙利匹配在随机优化过程中可能产生剧烈变化。

- [6] Gao, P., 2021
  - 标题: Fast convergence of detr with spatially modulated co-attention
  - 关键词: co-attention, spatial modulation, fast convergence
  - 总结: 该工作被引用为DETR加速路线中的一类方法——通过空间调制的协同注意力机制提高cross-attention效率，与本文的去噪方法路线不同。

- [8] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, backbone, residual learning
  - 总结: 该工作被引用为实验中使用的ResNet骨干网络的来源论文，属于实验设置的基础引用。

- [9] Lin, T.-Y., 2018
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, classification loss, dense detection
  - 总结: 该工作被用来支撑DN-DETR中类别预测的损失函数设计，直接用于标签去噪的focal loss计算。

- [11] Liu, S., 2022
  - 标题: DAB-DETR: Dynamic anchor boxes are better queries for DETR
  - 关键词: DAB-DETR, anchor box query, baseline architecture
  - 总结: 该工作是DN-DETR的直接基线架构。原文在其基础上添加标签嵌入和去噪任务，实验对比中也在完全相同设置下证明+1.9 AP的提升。

- [12] Meng, D., 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: conditional DETR, content-position decoupling, query design
  - 总结: 该工作被引用为decoder查询改进路线中的重要工作——通过内容和位置的解耦来提高cross-attention效率，与本文从去噪角度解决问题的方法不同。

- [15] Ren, S., 2017
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, two-stage detection, performance baseline
  - 总结: 该工作被用来从多个角度支撑论证：在Introduction中与DETR对比训练效率，在实验中作为传统检测器的性能标杆，说明DN-DETR在更短训练时间下可超越它。

- [16] Sun, Z., 2020
  - 标题: Rethinking transformer-based set prediction for object detection
  - 关键词: Hungarian loss analysis, teacher-student, convergence
  - 总结: 该工作被用来引出一个与本文不同的结论。原文通过展示有效的去噪解决方案，反驳了'匈牙利损失不是慢收敛主因'的观点，从不同角度得出了更有效的解决路径。

- [17] Vaswani, A., 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, self-attention, foundational
  - 总结: 该工作被用来追溯DETR所依赖的Transformer架构的起源，帮助读者理解DETR方法的技术根基。

- [18] Wang, Y., 2021
  - 标题: Anchor detr: Query design for transformer-based detector
  - 关键词: anchor DETR, reference point query, DETR variant
  - 总结: 该工作被引用为将查询与空间位置关联的早期工作之一——直接使用2D参考点作为查询，与DAB-DETR的4D锚框和本文的去噪方法形成方法谱系。

- [19] Yao, Z., 2021
  - 标题: Efficient detr: Improving end-to-end object detector with dense prior
  - 关键词: efficient DETR, RPN, dense prior
  - 总结: 该工作被引用为通过区域提议网络来增强DETR查询效率的路线，属于decoder查询改进谱系的一部分。

- [20] Zhu, X., 2021
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: deformable DETR, deformable attention, multi-scale
  - 总结: 该工作在方法论述中被作为DETR变体的重要代表，在实验中被扩展为DN-Deformable-DETR以证明去噪训练可迁移到其他DETR类方法并取得48.6 AP的最佳结果。



##### Contrast

- [2] Chen, T., 2021
  - 标题: Pix2seq: A language modeling framework for object detection
  - 关键词: noise object, Pix2seq, contrast
  - 总结: 原文引用该工作作为对比，强调自身方法在动机和目标设定上的不同：Pix2seq的噪声用于延迟EOS，而本文的噪声用于绕过匹配学习重建。



##### Historical

- [7] Girshick, R., 2014
  - 标题: Rich feature hierarchies for accurate object detection and semantic segmentation
  - 关键词: R-CNN, two-stage detection, historical
  - 总结: 该工作被用来追溯两阶段检测器的起源，作为CNN检测器发展史的一部分来为DETR的出现提供背景。

- [13] Redmon, J., 2016
  - 标题: Yolo9000: Better, faster, stronger
  - 关键词: YOLO, one-stage detection, historical
  - 总结: 该工作被用来代表单阶段检测器路线，作为经典CNN检测器分类体系的一部分。

- [14] Redmon, J., 2018
  - 标题: Yolov3: An incremental improvement
  - 关键词: YOLOv3, one-stage detection, incremental
  - 总结: 该工作被用来补充单阶段检测器的发展脉络，作为CNN检测器背景的一部分。



##### Dataset

- [10] Lin, T.-Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, dataset, evaluation benchmark
  - 总结: 该工作定义了实验评估的数据集和协议，是原文所有实验结果的基准来源。


# UP-DETR: Unsupervised Pre-Training for Object Detection With Transformers (2021)

- Paper ref: 1:P5NLH47E
- Title: UP-DETR: Unsupervised Pre-Training for Object Detection With Transformers
- Year: 2021

## Compact References

_No references artifact rows available._

## Citation Analysis Report

## 引用分析
当前阶段尚未完成具体的引用映射与语义分析，后续步骤将基于 citation_scope 完成对被引文献的识别与归类。


# Panoptic SegFormer: delving deeper into panoptic segmentation with transformers (2022)

- Paper ref: 1:RPRBE2QN
- Title: Panoptic SegFormer: delving deeper into panoptic segmentation with transformers
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko | End-toend object detection with transformers |
| ref-2 | 2021 | Huiyu Wang,Yukun Zhu,Hartwig Adam,Alan Yuille,and Liang-Chieh Chen | Max-deeplab: End-to-end panoptic segmentation with mask transformers |
| ref-3 | 2021 | Bowen Cheng,Alexander G Schwing,and Alexander Kirillov | Per-pixel classification is not all you need for semantic segmentation |
| ref-4 | 2021 | Wenwei Zhang， Jiangmiao Pang， Kai Chen， and Chen Change Loy.K-Net:Towards unified image segmentation | In NeurIPS,2021 |
| ref-5 | 2021 | Wenhai Wang,Enze Xie,Xiang Li, Deng-Ping Fan,Kaitao Song,Ding Liang,Tong Lu,Ping Luo,and Ling Shao | Pvtv2: Improved baselines with pyramid vision transformer |
| ref-6 | 2019 | Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar | Panoptic segmentation |
| ref-7 | 2019 | Alexander Kirillov,Ross Girshick,Kaiming He,and Piotr Dollar | Panoptic feature pyramid networks.In CVPR, 2019 |
| ref-8 |  | Navaneeth Bodla,Bharat Singh，Rama Chellappa,and Larry S Davis | Soft-nms-improving object detection with one line of code |
| ref-9 | 2017 | In Proceedings of the IEEE international conference on computer vision, pages 5561-5569,2017 | 1 |
| ref-10 | 2019 | Yuwen Xiong,Renjie Liao,Hengshuang Zhao,Rui Hu,Min Bai,Ersin Yumer,and Raquel Urtasun | Upsnet:A unifed panoptic segmentation network |
| ref-11 | 2017 | Tsung-Yi Lin,Piotr Dollar,Ross Girshick,Kaiming He, Bharath Hariharan,and Serge Belongie.Feature pyramid networks for object detection.In CVPR,2017.1 | Tsung-Yi Lin,Piotr Dollar,Ross Girshick,Kaiming He, Bharath Hariharan,and Serge Belongie.Feature pyramid networks for ob |
| ref-12 | 2014 | Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan,Piotr Dollar, and C Lawrence Zitnick.Microsoft coco | Common objects in context.In ECCV,2014. 2, 5 |
| ref-13 | 2020 | Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-14 | 2021 | Yuxin Fang, Shusheng Yang, Xinggang Wang, Yu Li, Chen Fang,Ying Shan, Bin Feng,and Wenyu Liu | Instances as queries |
| ref-15 | 2019 | Kai Chen,Jiangmiao Pang,Jiaqi Wang,Yu Xiong,Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jianping Shi, Wanli Ouyang, et al | Hybrid task cascade for instance segmentation |
| ref-16 | 2020 | Ujwal Bonde,Pablo F Alcantarilla,and Stefan Leutenegger | Towards bounding-box free panoptic segmentation |
| ref-17 | 2020 | Qizhu Li, Xiaojuan Qi,and Philip HS Tor | Unifying training and inference for panoptic segmentation |
| ref-18 | 2020 | Bowen Cheng, Maxwell D Collins, Yukun Zhu, Ting Liu, Thomas S Huang,Hartwig Adam,and Liang-Chieh Chen | Panoptic-deeplab: A simple,strong,and fast baseline for bottom-up panoptic segmentation |
| ref-19 | 2019 | Tien-Ju Yang,Maxwell D Collins,Yukun Zhu,Jyh-Jing Hwang,Ting Liu, Xiao Zhang,Vivienne Sze, George Papandreou,and Liang-Chieh Chen.Deeperlab | Single-shot image parser. arXiv:1902.05093,2019.2 |
| ref-20 | 2019 | Naiyu Gao, Yanhu Shan, Yupei Wang, Xin Zhao, Yinan Yu, Ming Yang,and Kaiqi Huang | SSAP: Single-shot instance segmentation with affinity pyramid |
| ref-21 | 2019 | Yanwei Li, Xinze Chen, Zheng Zhu,Lingxi Xie,Guan Huang,Dalong Du,and Xingang Wang | Attention-guided unified network for panoptic segmentation |
| ref-22 | 2021 | 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia | Fully convolutional networks for panoptic segmentation |
| ref-23 | 2020 | Zhi Tian,Chunhua Shen,and Hao Chen | Conditional convolutions for instance segmentation |
| ref-24 | 2016 | Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun | Deep residual learning for image recognition |
| ref-25 | 2017 | Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin | Attention is all you need |
| ref-26 | 2021 | Bin Dong,Fangao Zeng, Tiancai Wang,Xiangyu Zhang,and Yichen Wei | Solq: Segmenting objects by learning queries |
| ref-27 | 2015 | Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-28 | 2017 | Tsung-Yi Lin,Priya Goyal, Ross Girshick, Kaiming He,and Piotr Dollar | Focal loss for dense object detection |
| ref-29 | 2020 | Xinlong Wang,Rufeng Zhang,Tao Kong,Lei Li,and Chunhua Shen | SOLOv2: Dynamic and fast instance segmentation |
| ref-30 | 2020 | Xinlong Wang, Tao Kong, Chunhua Shen, Yuning Jiang,and Lei Li | Solo: Segmenting objects by locations |
| ref-31 | 2016 | Russell Stewart,Mykhaylo Andriluka,and Andrew Y Ng | End-to-end people detection in crowded scenes.In CVPR, 2016.4 |
| ref-32 | 1955 | Harold W Kuhn | The hungarian method for the assignment problem |
| ref-33 | 2021 | Muzammal Naseer, Kanchana Ranasinghe,Salman Khan, Munawar Hayat,Fahad Shahbaz Khan,and Ming-Hsuan Yang． Intriguing properties of vision transformers.arXiv preprint arXiv | 2105.10497,2021. 8 |
| ref-34 | 2016 | Fausto Milletari, Nassir Navab,and Seyed-Ahmad Ahmadi | V-net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-35 | 2017 | Bolei Zhou,Hang Zhao,Xavier Puig,Sanja Fidler,Adela Barriuso,and Antonio Torralba.Scene_parsing through ade2Ok dataset.In Proceedings of the IEEE conference on computer vision and patern recognition, pages 633-641, 2017.5,6 | Bolei Zhou,Hang Zhao,Xavier Puig,Sanja Fidler,Adela Barriuso,and Antonio Torralba.Scene_parsing through ade2Ok dataset.I |
| ref-36 | 2021 | Ze Liu,Yutong Lin，Yue Cao,Han Hu,Yixuan Wei, Zheng Zhang, Stephen Lin, and Baining Guo | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-37 | 2019 | Chongsong Chen,Jiawei Ren，Daisheng_ Jin， Zhongang Cai, Cunjun Yu, Bairun Wang, Mingyuan Zhang,and Jinyi Wu.Joint coco and mapillary workshop at iccv 2019: Coco panoptic segmentation challenge track technical report: Panoptic htc with class-guided fusion | SHR,56(84.1):67-2 |
| ref-38 | 2021 | Yanwei Li, Hengshuang Zhao,Xiaojuan Qi, Yukang Chen, Lu Qi,Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia | Fully convolutional networks for panoptic segmentation with point-based supervision |
| ref-39 |  | Yangxin Wu, Gengwei Zhang, Yiming Gao, Xiajun Deng, Ke Gong, Xiaodan Liang,and Liang Lin | Bidirectional graph reasoning network for panoptic segmentation |
| ref-40 | 2020 | In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition,pages 9080-9089,2020 | 6 |
| ref-41 | 2020 | Yangxin Wu, Gengwei Zhang, Hang Xu, Xiaodan Liang,and Liang Lin | Auto-panoptic: Cooperative multi-component architecture search for panoptic segmentation |
| ref-42 |  | Ningning Ma, Xiangyu Zhang,Hai-Tao Zheng,and Jian Sun | Shufflenet v2: Practical guidelines for efficient cnn architecture design |
| ref-43 | 2018 | In Proceedings of the European conference on computer vision (ECCV), pages 116-131,2018 | 6 |
| ref-44 | 2017 | Kaiming He,Georgia Gkioxari,Piotr Dollar,and Ross Girshick.Mask R-CNN | In ICCV,2017 |
| ref-45 |  | Bowen Cheng,Ross Girshick,Piotr Dollar,Alexander C Berg,and Alexander Kirillov.Boundary iou | Improving object-centric image segmentation evaluation |
| ref-46 | 2021 | In Proceedingsof the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 15334-15342,2021 | 6,7 |
| ref-47 |  | Christoph Kamann and Carsten Rother | Christoph Kamann and Carsten Rother |
| ref-48 | 2020 | Benchmarking the robustness of semantic segmentation models.In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 8828-8838,2020 | 8 |
| ref-49 | 2021 | Enze Xie,Wenhai Wang, Zhiding Yu,Anima Anandkumar, Jose M Alvarez,and Ping Luo | Segformer: Simple and efficient design for semantic segmentation with transformers |
| ref-50 | 2021 | Srinadh Bhojanapalli,Ayan Chakrabarti,Daniel Glasner, Daliang Li, Thomas Unterthiner,and Andreas Veit | Understanding robustness of transformers for image clasification |

## Citation Analysis Report

#### 总体总结
在 Introduction 与 Related Work 范围内，原文先用 panoptic segmentation 的任务定义和早期组合式 pipeline 说明问题背景，再把 DETR、Max-Deeplab、MaskFormer、K-Net、Panoptic FCN 等近期统一/端到端路线并置比较，最后将本文定位为对 DETR 式 transformer panoptic segmentation 的深入改造：用 Deformable DETR 解决多尺度效率与收敛问题，用 query decoupling 回应 things/stuff 同一 query set 的干扰问题，用 mask-wise merging 反衬 pixel-wise argmax 与传统后处理的局限。整体引用组织不是简单罗列 SOTA，而是围绕“从子任务组合到 query/transformer 统一，再到保留 things/stuff 差异的任务特定统一”这条论证线展开。


#### 关键文献

- [1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko, 2020: End-toend object detection with transformers (Baseline)

- [3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov, 2021: Per-pixel classification is not all you need for semantic segmentation (Baseline)

- [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar, 2019: Panoptic segmentation (Historical)

- [12] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai, 2020: Deformable detr: Deformable transformers for end-to-end object detection (Component)

- [2] 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia, 2021: Fully convolutional networks for panoptic segmentation (Baseline)

- [24] Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin, 2017: Attention is all you need (Historical)



#### 范围
- 章节: Introduction + Related Work
- 行号: 9-34

#### 按功能归类


##### Baseline

- [1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko, 2020
  - 标题: End-toend object detection with transformers
  - 关键词: DETR, set prediction, transformer detector, panoptic head
  - 总结: 原文把 DETR 作为核心基线和问题来源，用它说明端到端 transformer 检测器虽能减少手工流程，但在全景分割中暴露出收敛慢、mask 边界粗和 things/stuff 处理不当等限制。

- [3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov, 2021
  - 标题: Per-pixel classification is not all you need for semantic segmentation
  - 关键词: MaskFormer, query-based segmentation, pixel decoder, semantic segmentation
  - 总结: 该工作被用来说明已有方法已经尝试用 queries 统一分割，但仍依赖额外 pixel decoder 和有限分辨率特征；原文借此突出本文在 mask decoder 与 query decoupling 上的差异。

- [7] Alexander Kirillov,Ross Girshick,Kaiming He,and Piotr Dollar, 2019
  - 标题: Panoptic feature pyramid networks.In CVPR, 2019
  - 关键词: Panoptic FPN, feature pyramid, two-branch pipeline, baseline
  - 总结: 该工作被用来说明传统 panoptic segmentation 往往依赖子任务组合，原文借此铺垫本文希望减少复杂代理任务流程的动机。

- [9] Yuwen Xiong,Renjie Liao,Hengshuang Zhao,Rui Hu,Min Bai,Ersin Yumer,and Raquel Urtasun, 2019
  - 标题: Upsnet:A unifed panoptic segmentation network
  - 关键词: UPSNet, unified network, panoptic segmentation, surrogate tasks
  - 总结: 该工作被用于描述传统统一网络路线的进展与局限：它降低开销但仍围绕实例/语义两个子任务组合，而本文希望从 query/transformer 层面统一处理。

- [13] Yuxin Fang, Shusheng Yang, Xinggang Wang, Yu Li, Chen Fang,Ying Shan, Bin Feng,and Wenyu Liu, 2021
  - 标题: Instances as queries
  - 关键词: QueryInst, instance segmentation, queries, end-to-end
  - 总结: 该引用帮助原文把 Panoptic SegFormer 放入 broader query-based detection/segmentation 脉络，并支撑其实例分割对比对象。

- [14] Kai Chen,Jiangmiao Pang,Jiaqi Wang,Yu Xiong,Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jianping Shi, Wanli Ouyang, et al, 2019
  - 标题: Hybrid task cascade for instance segmentation
  - 关键词: HTC, instance segmentation, strong baseline, comparison
  - 总结: 该工作主要提供实例分割强基线背景，原文借它说明本文不是只优化 panoptic 输出，thing branch 也能与成熟实例分割方法竞争。

- [17] Bowen Cheng, Maxwell D Collins, Yukun Zhu, Ting Liu, Thomas S Huang,Hartwig Adam,and Liang-Chieh Chen, 2020
  - 标题: Panoptic-deeplab: A simple,strong,and fast baseline for bottom-up panoptic segmentation
  - 关键词: Panoptic-DeepLab, bottom-up, panoptic segmentation, baseline
  - 总结: 该引用用于说明非 transformer/query 路线也能做强全景分割，原文借它强调传统 surrogate sub-task 设计的复杂性与本文路线的差异。

- [2] 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia, 2021
  - 标题: Fully convolutional networks for panoptic segmentation
  - 关键词: Panoptic FCN, top-down meets bottom-up, two-branch, unified framework
  - 总结: 该引用在相关工作中承担直接对比作用：原文承认它简化了 panoptic pipeline，同时用它引出本文从 queries 和 transformer decoder 层面处理 things/stuff 的路线。



##### Contrast

- [4] Wenwei Zhang， Jiangmiao Pang， Kai Chen， and Chen Change Loy.K-Net:Towards unified image segmentation, 2021
  - 标题: In NeurIPS,2021
  - 关键词: K-Net, dynamic kernels, unified segmentation, concurrent work
  - 总结: 该引用用于对比统一 kernel 思路与本文 query decoupling 思路：原文承认两者都关注统一分割，但用它反衬本文保留 things/stuff 差异化处理的立场。

- [8] Soft-nms-improving object detection with one line of code
  - 标题: Soft-nms-improving object detection with one line of code
  - 关键词: Soft-NMS, post-processing, detection heuristic, NMS
  - 总结: 该引用主要作为后处理启发式代表，原文用它衬托 DETR 与本文这类端到端路线希望减少手工 pipeline 的目标。

- [26] Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: Faster R-CNN, region proposal, handcrafted components, detector
  - 总结: 该引用用于对照传统检测流程，原文通过它说明 DETR 及本文继承的端到端路线如何摆脱 proposal/anchor/NMS 等组件。



##### Component

- [5] Wenhai Wang,Enze Xie,Xiang Li, Deng-Ping Fan,Kaitao Song,Ding Liang,Tong Lu,Ping Luo,and Ling Shao, 2021
  - 标题: Pvtv2: Improved baselines with pyramid vision transformer
  - 关键词: PVTv2, backbone, pyramid transformer, efficiency
  - 总结: 该工作被用作 backbone 选择与效率论证的一部分，帮助原文说明框架性能不只依赖单一大型 backbone。

- [12] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai, 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, deformable attention, multi-scale features, convergence
  - 总结: 该工作是本文重要组件来源，原文用它解释为什么 Panoptic SegFormer 可以处理多尺度高分辨率特征并减少 DETR 式训练成本。

- [22] Zhi Tian,Chunhua Shen,and Hao Chen, 2020
  - 标题: Conditional convolutions for instance segmentation
  - 关键词: CondInst, conditional convolution, instance segmentation, two-branch
  - 总结: 该引用用于解释被比较方法 Panoptic FCN 的结构背景，不是本文直接组件，而是帮助原文梳理统一分割路线的来源。

- [23] Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, backbone, feature maps, mask prediction
  - 总结: 该引用主要作为基础 backbone 来源，原文借它说明 DETR/MaskFormer 这类方法在低分辨率特征上做 mask prediction 的限制。

- [27] Tsung-Yi Lin,Priya Goyal, Ross Girshick, Kaiming He,and Piotr Dollar, 2017
  - 标题: Focal loss for dense object detection
  - 关键词: Focal loss, classification loss, dense detection, training
  - 总结: 该引用既作为传统检测技术背景，也为本文 loss function 中的 classification loss 提供组件来源。



##### Historical

- [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar, 2019
  - 标题: Panoptic segmentation
  - 关键词: panoptic segmentation, things and stuff, benchmark, task definition
  - 总结: 该引用承担任务定义和历史起点功能，原文借它解释 things/stuff 的差异，并说明早期 baseline 直接组合 instance 与 semantic segmentation 输出。

- [24] Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin, 2017
  - 标题: Attention is all you need
  - 关键词: Transformer, self-attention, computational complexity, feature resolution
  - 总结: 该工作被用作 transformer 技术基础和复杂度论据，原文借它解释为什么需要 deformable attention 来处理多尺度高分辨率特征。



##### Dataset

- [11] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan,Piotr Dollar, and C Lawrence Zitnick.Microsoft coco, 2014
  - 标题: Common objects in context.In ECCV,2014. 2, 5
  - 关键词: COCO, dataset, panoptic benchmark, evaluation
  - 总结: 该引用支撑实验环境说明，原文借 COCO 的标准数据和指标比较本文与 DETR、MaskFormer、K-Net 等方法。



##### Background

- [15] Ujwal Bonde,Pablo F Alcantarilla,and Stefan Leutenegger, 2020
  - 标题: Towards bounding-box free panoptic segmentation
  - 关键词: box-free, panoptic segmentation, holistic scene understanding
  - 总结: 该引用用于扩展 panoptic segmentation 相关工作背景，帮助原文说明本文面对的是一个已有多种建模选择的任务谱系。

- [16] Qizhu Li, Xiaojuan Qi,and Philip HS Tor, 2020
  - 标题: Unifying training and inference for panoptic segmentation
  - 关键词: training inference, panoptic segmentation, unification
  - 总结: 该引用补充了全景分割领域中流程统一的研究方向，原文借它铺垫本文进一步统一 things/stuff 表示但保留差异化 query 设计。

- [18] Tien-Ju Yang,Maxwell D Collins,Yukun Zhu,Jyh-Jing Hwang,Ting Liu, Xiao Zhang,Vivienne Sze, George Papandreou,and Liang-Chieh Chen.Deeperlab, 2019
  - 标题: Single-shot image parser. arXiv:1902.05093,2019.2
  - 关键词: single-shot parsing, panoptic segmentation, scene parsing
  - 总结: 该引用提供传统图像解析/全景分割背景，原文用它说明 prior methods 往往围绕 separate sub-tasks 组织模型。

- [19] Naiyu Gao, Yanhu Shan, Yupei Wang, Xin Zhao, Yinan Yu, Ming Yang,and Kaiqi Huang, 2019
  - 标题: SSAP: Single-shot instance segmentation with affinity pyramid
  - 关键词: SSAP, instance segmentation, affinity pyramid, sub-task
  - 总结: 该工作用于补充传统 instance segmentation 背景，原文借它说明先解子任务再组合的路线会带来额外复杂度。

- [25] Bin Dong,Fangao Zeng, Tiancai Wang,Xiangyu Zhang,and Yichen Wei, 2021
  - 标题: Solq: Segmenting objects by learning queries
  - 关键词: SOLQ, object queries, segmentation, end-to-end
  - 总结: 该引用用于扩展端到端/query-based 方法背景，原文借它把 DETR 之后的相关工作作为本文的技术环境。





#### 时间线分析

##### 早期
早期引用主要奠定本文综述范围中的任务、数据和检测基础：COCO 提供评测环境，Transformer/self-attention 与 ResNet 提供架构背景，Faster R-CNN、Soft-NMS 和 Focal Loss 则代表传统检测器及其训练/后处理组件。


- [8] Soft-nms-improving object detection with one line of code: Soft-nms-improving object detection with one line of code

- [11] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan,Piotr Dollar, and C Lawrence Zitnick.Microsoft coco, 2014: Common objects in context.In ECCV,2014. 2, 5

- [23] Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun, 2016: Deep residual learning for image recognition

- [24] Ashish Vaswani, Noam Shazeer,Niki Parmar, Jakob Uszkoreit,Llion Jones,Aidan N Gomez, Lukasz Kaiser,and Illia Polosukhin, 2017: Attention is all you need

- [26] Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [27] Tsung-Yi Lin,Priya Goyal, Ross Girshick, Kaiming He,and Piotr Dollar, 2017: Focal loss for dense object detection




##### 中期
中期引用集中在全景分割任务成形和传统组合式 pipeline 的发展上，包括 panoptic segmentation 定义、Panoptic FPN/UPSNet/AUNet/DeepLab 系列，以及 instance/semantic 子任务路线。这些文献帮助原文说明 surrogate sub-tasks 与 handcrafted pipelines 的复杂性。


- [6] Alexander Kirillov,Kaiming He,Ross Girshick,Carsten Rother,and Piotr Dollar, 2019: Panoptic segmentation

- [7] Alexander Kirillov,Ross Girshick,Kaiming He,and Piotr Dollar, 2019: Panoptic feature pyramid networks.In CVPR, 2019

- [9] Yuwen Xiong,Renjie Liao,Hengshuang Zhao,Rui Hu,Min Bai,Ersin Yumer,and Raquel Urtasun, 2019: Upsnet:A unifed panoptic segmentation network

- [14] Kai Chen,Jiangmiao Pang,Jiaqi Wang,Yu Xiong,Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jianping Shi, Wanli Ouyang, et al, 2019: Hybrid task cascade for instance segmentation

- [18] Tien-Ju Yang,Maxwell D Collins,Yukun Zhu,Jyh-Jing Hwang,Ting Liu, Xiao Zhang,Vivienne Sze, George Papandreou,and Liang-Chieh Chen.Deeperlab, 2019: Single-shot image parser. arXiv:1902.05093,2019.2

- [19] Naiyu Gao, Yanhu Shan, Yupei Wang, Xin Zhao, Yinan Yu, Ming Yang,and Kaiqi Huang, 2019: SSAP: Single-shot instance segmentation with affinity pyramid




##### 近期
近期引用直接收束到本文的方法脉络：DETR、Deformable DETR、MaskFormer、Max-Deeplab、K-Net、Panoptic FCN、CondInst、QueryInst/SOLQ 和 PVTv2 等共同构成 transformer/query-based segmentation 与更统一 panoptic framework 的对比对象和组件来源。


- [1] Nicolas Carion,Francisco Massa, Gabriel Synnaeve,Nicolas Usunier, Alexander Kirillov,and Sergey Zagoruyko, 2020: End-toend object detection with transformers

- [3] Bowen Cheng,Alexander G Schwing,and Alexander Kirillov, 2021: Per-pixel classification is not all you need for semantic segmentation

- [4] Wenwei Zhang， Jiangmiao Pang， Kai Chen， and Chen Change Loy.K-Net:Towards unified image segmentation, 2021: In NeurIPS,2021

- [5] Wenhai Wang,Enze Xie,Xiang Li, Deng-Ping Fan,Kaitao Song,Ding Liang,Tong Lu,Ping Luo,and Ling Shao, 2021: Pvtv2: Improved baselines with pyramid vision transformer

- [12] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai, 2020: Deformable detr: Deformable transformers for end-to-end object detection

- [13] Yuxin Fang, Shusheng Yang, Xinggang Wang, Yu Li, Chen Fang,Ying Shan, Bin Feng,and Wenyu Liu, 2021: Instances as queries

- [15] Ujwal Bonde,Pablo F Alcantarilla,and Stefan Leutenegger, 2020: Towards bounding-box free panoptic segmentation

- [16] Qizhu Li, Xiaojuan Qi,and Philip HS Tor, 2020: Unifying training and inference for panoptic segmentation

- [17] Bowen Cheng, Maxwell D Collins, Yukun Zhu, Ting Liu, Thomas S Huang,Hartwig Adam,and Liang-Chieh Chen, 2020: Panoptic-deeplab: A simple,strong,and fast baseline for bottom-up panoptic segmentation

- [2] 2 [21] Yanwei Li, Hengshuang Zhao, Xiaojuan Qi, Liwei Wang, Zeming Li, Jian Sun,and Jiaya Jia, 2021: Fully convolutional networks for panoptic segmentation

- [22] Zhi Tian,Chunhua Shen,and Hao Chen, 2020: Conditional convolutions for instance segmentation

- [25] Bin Dong,Fangao Zeng, Tiancai Wang,Xiangyu Zhang,and Yichen Wei, 2021: Solq: Segmenting objects by learning queries


# Accelerating DETR convergence via semantic-aligned matching (2022)

- Paper ref: 1:S86GB385
- Title: Accelerating DETR convergence via semantic-aligned matching
- Year: 2022

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 |  | Luca Bertineto; Jack Valmadre; et al. | Fully-convolutional siamese networks for object tracking |
| ref-2 |  | Zhaowei Cai and Nuno Vasconcelos | Cascade R-CNN: Delving into high quality object detection |
| ref-3 |  | Nicolas Carion; Francisco Massa; et al. | End-toend object detection with transformers |
| ref-4 |  | Xin Chen; Bin Yan; et al. | Transformer tracking |
| ref-5 |  | Dahjung Chung; Khalid Tahboub; et al. | A two stream siamese convolutional neural network for person re-identification |
| ref-6 |  | Zhigang Dai; Bolun Cai; et al. | UP-DETR: Unsupervised pre-training for object detection with transformers |
| ref-7 |  | Jia Deng，Wei Dong; Richard Socher; et al. | ImageNet: A large-scale hierarchical image database |
| ref-8 |  | Xingping Dong and Jianbing Shen | Triplet loss in siamese network for object tracking |
| ref-9 |  | Qi Fan; Wei Zhuo; et al. | Fewshot object detection with attention-RPN and multi-relation detector |
| ref-10 | 2021 | Peng Gao; Minghang Zheng; et al. | Fast convergence of DETR with spatially modulated co-attention |
| ref-11 |  | Anfeng He; Chong Luo; et al. | A twofold siamese network for real-time object tracking |
| ref-12 |  | Kaiming He; Georgia Gkioxari; et al. | Mask R-CNN |
| ref-13 |  | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-14 |  | Shuting He; Hao Luo; et al. | TransReID: Transformer-based object reidentification |
| ref-15 |  | Ting-I Hsieh; Yi-Chen Lo; et al. | One-shot object detection with co-attention and co-excitation |
| ref-16 | 2018 | Han Hu; Jiayuan Gu; et al. | Relation networks for object detection |
| ref-17 |  | Bingyi Kang; Zhuang Liu; et al. | Few-shot object detection via feature reweighting |
| ref-18 |  | Diederik P Kingma and Jimmy Ba | Adam: A method for stochastic optimization |
| ref-19 |  | Gregory Koch; Richard Zemel; et al. | Siamese neural networks for one-shot image recognition |
| ref-20 | 2019 | Bo Li; Wei Wu; et al. | SiamRPN++: Evolution of siamese visual tracking with very deep networks |
| ref-21 |  | Bo Li; Junjie Yan; et al. | High performance visual tracking with siamese region proposal network |
| ref-22 |  | YulinLi; Jianfeng He; et al. | Diverse part discovery: Occluded person re-identification with part-aware transformer |
| ref-23 | 2021 | Minghui Liao; Pengyuan Lyu; et al. | Mask TextSpotter: An end-toend trainable neural network for spoting text with arbitrary shapes |
| ref-24 | 2017 | Tsung-Yi Lin; Piotr Dollar; et al. | Feature pyramid networks for object detection |
| ref-25 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-26 |  | Tsung-YiLin; Michael Maire; et al. | Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context |
| ref-27 | 2020 | Li Liu; Wanli Ouyang; et al. | Deep learning for generic object detection: A survey |
| ref-28 |  | Songtao Liu; Di Huang; et al. | Receptive field block net for accurate and fast object detection |
| ref-29 | 2016 | Wei Liu; Dragomir Anguelov; et al. | SSD: Single shot multibox detector |
| ref-30 | 2019 | Ilya Loshchilov and Frank Huttr | Decoupled weight decay regularization |
| ref-31 | 2021 | Depu Meng， Xiaokang Chen， Zejia Fan; Gang Zeng; et al. | Conditional DETR for fast training convergence |
| ref-32 |  | Jiangmiao Pang; Kai Chen; et al. | Libra R-CNN: Towards balanced learning for object detection |
| ref-33 |  | Juan-Manuel Perez-Rua; Xiatian Zhu， TimothyM Hospedales，and Tao Xiang | Incremental few-shot object detection |
| ref-34 |  | Joseph Redmon and Ali Farhadi | YOLO 9000: Better, faster, stronger |
| ref-35 |  | Shaoqing Ren; Kaiming He; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-36 | 2015 | Florian Schroff; Dmitry Kalenichenko; et al. | FaceNet: A unified embedding for face recognition and clustering |
| ref-37 | 2017 | Yantao Shen; Tong Xiao; et al. | Learning deep neural networks for vehicle Re-ID with visual-spatio-temporal path proposals |
| ref-38 |  | Jake Snell; Kevin Swersky; et al. | Prototypical networks for few-shot learning |
| ref-39 |  | Lingxue Song; Dihong Gong; et al. | Occlusion robust face recognition based on mask learning with pairwise differential siamese network |
| ref-40 |  | Flood Sung; Yongxin Yang; et al. | Learning to compare: Relation network for few-shot learning |
| ref-41 |  | Ran Tao; Efstratios Gavves; et al. | Siamese instance search for tracking |
| ref-42 |  | Zhi Tian; Chunhua Shen; et al. | FCOS: Fully convolutional one-stage object detection |
| ref-43 |  | Lachlan Tychsen-Smith and Lars Petersson | Improving object localization with fitness NMS and bounded IoU loss |
| ref-44 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Gomez,L.Kaiser,and Illia Polosukhin. Attention is all you need.In NeurIPS,2017．2,3, |
| ref-45 | 2020 | Paul Voigtlaender; Jonathon Luiten; et al. | Siam R-CNN: Visual tracking by re-detection |
| ref-46 | 2021 | Ning Wang，Wengang Zhou; Jie Wang; et al. | Transformer meets tracker:Exploiting temporal context for robust visual tracking |
| ref-47 | 2018 | Lin Wu; Yang Wang; et al. | Where-andwhen to look:Deep siamese attention networks for videobased person re-identification |
| ref-48 |  | Yang Xiao and Renaud Marlet | Few-shot object detection and viewpoint estimation for objects in the wild |
| ref-49 | 2021 | Chuhui Xue; Shijian Lu; et al. | I2C2W: Image-to-character-to-word transformers for accurate scene text recognition |
| ref-50 | 2019 | Xiaopeng Yan; Ziliang Chen; et al. | Meta R-CNN: Towards general solver for instance-level low-shot learning |
| ref-51 | 2021 | Fangao Zeng; Bin Dong; et al. | MOTR: End-to-end Multiple-Object tracking with TRansformer |
| ref-52 | 213 | Gongjie Zhang; Kaiwen Cui; et al. | PNPDet: Efficient few-shot detection without forgetting via plug-and-play sub-networks. In WACV, |
| ref-53 |  | Gongjie Zhang; Shijian Lu; et al. | IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024, |
| ref-54 |  | Gongjie Zhang; Zhipeng Luo; et al. | Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation |
| ref-55 |  | Jingyi Zhang; Jiaxing Huang; et al. | DA-DETR:Domain adaptive detection transformer by hybrid attention |
| ref-56 |  | Shifeng Zhang; Longyin Wen; et al. | Single-shot refinement neural network for object detection |
| ref-57 |  | Zhipeng Zhang and Houwen Peng | Deeper and wider siamese networks for real-time visual tracking． |
| ref-58 |  | Meng Zheng; Srikrishna Karanam; et al. | Re-identification with consistent attentive siamese networks |
| ref-59 |  | Changqing Zhou; Zhipeng Luo; et al. | PTTR: Relational 3D point cloud object tracking with transformer |
| ref-60 | 2019 | Xingyi Zhou; Dequan Wang; et al. | Objects as points |
| ref-61 |  | Xingyi Zhou; Jiacheng Zhuo; et al. | Bottom-up object detection by grouping extreme and center points |
| ref-62 |  | Xizhou Zhu; Weijie Su; et al. | Deformable DETR:Deformable transformers for end-to-end object detection |
| ref-63 |  | Zheng Zhu; Qiang Wang; et al. | Distractor-aware siamese networks for visual object tracking |

## Citation Analysis Report

#### 总体总结
引言与相关工作部分的引文组织遵循清晰的技术叙事脉络：首先用早期目标检测与Siamese架构工作铺出技术背景，再把DETR的慢收敛问题与现有解决方案并置比较，最后借Siamese匹配与注意力机制相关文献把本文的语义对齐匹配路线明确出来。整体引用策略是先铺技术背景、再比较主流检测范式、最后引出本文路线。


#### 关键文献

- [3] End-toend object detection with transformers: End-toend object detection with transformers (Background)

- [11] A twofold siamese network for real-time object tracking: A twofold siamese network for real-time object tracking (Background)

- [31] Depu Meng， Xiaokang Chen， Zejia Fan, 2021: Conditional DETR for fast training convergence (Component)

- [32] Libra R-CNN: Towards balanced learning for object detection: Libra R-CNN: Towards balanced learning for object detection (Historical)

- [47] Ning Wang，Wengang Zhou, 2021: Transformer meets tracker:Exploiting temporal context for robust visual tracking (Background)



#### 范围
- 章节: Introduction + Related Work
- 行号: 11-35

#### 按功能归类


##### Background

- [1] Fully-convolutional siamese networks for object tracking
  - 标题: Fully-convolutional siamese networks for object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [3] End-toend object detection with transformers
  - 标题: End-toend object detection with transformers
  - 关键词: 目标检测背景, background, transformer
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [4] Transformer tracking
  - 标题: Transformer tracking
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [5] A two stream siamese convolutional neural network for person re-identification
  - 标题: A two stream siamese convolutional neural network for person re-identification
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [8] Triplet loss in siamese network for object tracking
  - 标题: Triplet loss in siamese network for object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [9] Fewshot object detection with attention-RPN and multi-relation detector
  - 标题: Fewshot object detection with attention-RPN and multi-relation detector
  - 关键词: 目标检测背景, background, attention
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [10] Peng Gao, 2021
  - 标题: Fast convergence of DETR with spatially modulated co-attention
  - 关键词: 相关研究工作, background, attention
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [11] A twofold siamese network for real-time object tracking
  - 标题: A twofold siamese network for real-time object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [14] TransReID: Transformer-based object reidentification
  - 标题: TransReID: Transformer-based object reidentification
  - 关键词: 行人重识别, background, transformer
  - 总结: 该工作被用来交代行人重识别的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [15] One-shot object detection with co-attention and co-excitation
  - 标题: One-shot object detection with co-attention and co-excitation
  - 关键词: 目标检测背景, background, attention
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [16] Han Hu, 2018
  - 标题: Relation networks for object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [17] Few-shot object detection via feature reweighting
  - 标题: Few-shot object detection via feature reweighting
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [19] Siamese neural networks for one-shot image recognition
  - 标题: Siamese neural networks for one-shot image recognition
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [20] Bo Li, 2019
  - 标题: SiamRPN++: Evolution of siamese visual tracking with very deep networks
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [21] High performance visual tracking with siamese region proposal network
  - 标题: High performance visual tracking with siamese region proposal network
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [22] Diverse part discovery: Occluded person re-identification with part-aware transformer
  - 标题: Diverse part discovery: Occluded person re-identification with part-aware transformer
  - 关键词: 行人重识别, background, transformer
  - 总结: 该工作被用来交代行人重识别的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [23] Minghui Liao, 2021
  - 标题: Mask TextSpotter: An end-toend trainable neural network for spoting text with arbitrary shapes
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [27] Li Liu, 2020
  - 标题: Deep learning for generic object detection: A survey
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [28] Receptive field block net for accurate and fast object detection
  - 标题: Receptive field block net for accurate and fast object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [29] Wei Liu, 2016
  - 标题: SSD: Single shot multibox detector
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [33] Incremental few-shot object detection
  - 标题: Incremental few-shot object detection
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [34] YOLO 9000: Better, faster, stronger
  - 标题: YOLO 9000: Better, faster, stronger
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [36] Florian Schroff, 2015
  - 标题: FaceNet: A unified embedding for face recognition and clustering
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [38] Yantao Shen, 2017
  - 标题: Learning deep neural networks for vehicle Re-ID with visual-spatio-temporal path proposals
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [39] Prototypical networks for few-shot learning
  - 标题: Prototypical networks for few-shot learning
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [41] Learning to compare: Relation network for few-shot learning
  - 标题: Learning to compare: Relation network for few-shot learning
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [42] Siamese instance search for tracking
  - 标题: Siamese instance search for tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [43] FCOS: Fully convolutional one-stage object detection
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [44] Improving object localization with fitness NMS and bounded IoU loss
  - 标题: Improving object localization with fitness NMS and bounded IoU loss
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [45] Ashish Vaswani, 2017
  - 标题: Gomez,L.Kaiser,and Illia Polosukhin. Attention is all you need.In NeurIPS,2017．2,3,
  - 关键词: 相关研究工作, background, attention
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [46] Paul Voigtlaender, 2020
  - 标题: Siam R-CNN: Visual tracking by re-detection
  - 关键词: Siamese匹配架构, background
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [47] Ning Wang，Wengang Zhou, 2021
  - 标题: Transformer meets tracker:Exploiting temporal context for robust visual tracking
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [48] Lin Wu, 2018
  - 标题: Where-andwhen to look:Deep siamese attention networks for videobased person re-identification
  - 关键词: Siamese匹配架构, background, attention, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [49] Few-shot object detection and viewpoint estimation for objects in the wild
  - 标题: Few-shot object detection and viewpoint estimation for objects in the wild
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [50] Chuhui Xue, 2021
  - 标题: I2C2W: Image-to-character-to-word transformers for accurate scene text recognition
  - 关键词: 相关研究工作, background, transformer
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [52] Fangao Zeng, 2021
  - 标题: MOTR: End-to-end Multiple-Object tracking with TRansformer
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [53] Gongjie Zhang, 213
  - 标题: PNPDet: Efficient few-shot detection without forgetting via plug-and-play sub-networks. In WACV,
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [54] IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,
  - 标题: IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [55] Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation
  - 标题: Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation
  - 关键词: 少样本学习, background
  - 总结: 该工作被用来交代少样本学习的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [57] Single-shot refinement neural network for object detection
  - 标题: Single-shot refinement neural network for object detection
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [58] Deeper and wider siamese networks for real-time visual tracking．
  - 标题: Deeper and wider siamese networks for real-time visual tracking．
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [59] Re-identification with consistent attentive siamese networks
  - 标题: Re-identification with consistent attentive siamese networks
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [60] PTTR: Relational 3D point cloud object tracking with transformer
  - 标题: PTTR: Relational 3D point cloud object tracking with transformer
  - 关键词: Siamese匹配架构, background, transformer
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [61] Xingyi Zhou, 2019
  - 标题: Objects as points
  - 关键词: 相关研究工作, background
  - 总结: 该工作被用来交代相关研究工作的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [62] Bottom-up object detection by grouping extreme and center points
  - 标题: Bottom-up object detection by grouping extreme and center points
  - 关键词: 目标检测背景, background
  - 总结: 该工作被用来交代目标检测背景的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [64] Distractor-aware siamese networks for visual object tracking
  - 标题: Distractor-aware siamese networks for visual object tracking
  - 关键词: Siamese匹配架构, background, siamese
  - 总结: 该工作被用来交代Siamese匹配架构的技术背景，帮助原文把自身方法放回相关技术谱系中。



##### Historical

- [2] Cascade R-CNN: Delving into high quality object detection
  - 标题: Cascade R-CNN: Delving into high quality object detection
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [32] Libra R-CNN: Towards balanced learning for object detection
  - 标题: Libra R-CNN: Towards balanced learning for object detection
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [35] Faster R-CNN: Towards real-time object detection with region proposal networks
  - 标题: Faster R-CNN: Towards real-time object detection with region proposal networks
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [51] Xiaopeng Yan, 2019
  - 标题: Meta R-CNN: Towards general solver for instance-level low-shot learning
  - 关键词: 两阶段检测器, historical
  - 总结: 该工作被用来交代两阶段检测器的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [56] DA-DETR:Domain adaptive detection transformer by hybrid attention
  - 标题: DA-DETR:Domain adaptive detection transformer by hybrid attention
  - 关键词: Transformer架构, historical, transformer, attention
  - 总结: 该工作被用来交代Transformer架构的技术背景，帮助原文把自身方法放回相关技术谱系中。



##### Dataset

- [26] Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context
  - 标题: Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context
  - 关键词: 数据集与评估, dataset
  - 总结: 该工作被用来交代数据集与评估的技术背景，帮助原文把自身方法放回相关技术谱系中。



##### Component

- [31] Depu Meng， Xiaokang Chen， Zejia Fan, 2021
  - 标题: Conditional DETR for fast training convergence
  - 关键词: DETR收敛加速方案, component
  - 总结: 该工作被用来交代DETR收敛加速方案的技术背景，帮助原文把自身方法放回相关技术谱系中。

- [63] Deformable DETR:Deformable transformers for end-to-end object detection
  - 标题: Deformable DETR:Deformable transformers for end-to-end object detection
  - 关键词: DETR收敛加速方案, component, transformer
  - 总结: 该工作被用来交代DETR收敛加速方案的技术背景，帮助原文把自身方法放回相关技术谱系中。





#### 时间线分析

##### 早期
早期工作主要奠定了目标检测的基础框架与Siamese匹配架构的思想，包括Faster R-CNN等两阶段检测器、ResNet骨干网络以及早期注意力机制。


- [26] Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context: Belongie,Lubomir D. Bourdev,Ross B.Girshick, James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: Common objects in context

- [19] Siamese neural networks for one-shot image recognition: Siamese neural networks for one-shot image recognition

- [35] Faster R-CNN: Towards real-time object detection with region proposal networks: Faster R-CNN: Towards real-time object detection with region proposal networks

- [36] Florian Schroff, 2015: FaceNet: A unified embedding for face recognition and clustering

- [1] Fully-convolutional siamese networks for object tracking: Fully-convolutional siamese networks for object tracking

- [29] Wei Liu, 2016: SSD: Single shot multibox detector

- [42] Siamese instance search for tracking: Siamese instance search for tracking

- [5] A two stream siamese convolutional neural network for person re-identification: A two stream siamese convolutional neural network for person re-identification

- [34] YOLO 9000: Better, faster, stronger: YOLO 9000: Better, faster, stronger

- [38] Yantao Shen, 2017: Learning deep neural networks for vehicle Re-ID with visual-spatio-temporal path proposals

- [39] Prototypical networks for few-shot learning: Prototypical networks for few-shot learning

- [45] Ashish Vaswani, 2017: Gomez,L.Kaiser,and Illia Polosukhin. Attention is all you need.In NeurIPS,2017．2,3,

- [2] Cascade R-CNN: Delving into high quality object detection: Cascade R-CNN: Delving into high quality object detection

- [8] Triplet loss in siamese network for object tracking: Triplet loss in siamese network for object tracking

- [11] A twofold siamese network for real-time object tracking: A twofold siamese network for real-time object tracking

- [16] Han Hu, 2018: Relation networks for object detection

- [21] High performance visual tracking with siamese region proposal network: High performance visual tracking with siamese region proposal network

- [28] Receptive field block net for accurate and fast object detection: Receptive field block net for accurate and fast object detection




##### 中期
中期工作把目标检测推向更成熟的深度学习路线，包括单阶段检测器、特征金字塔、Focal Loss等关键技术，以及Transformer在视觉任务中的初步应用。


- [41] Learning to compare: Relation network for few-shot learning: Learning to compare: Relation network for few-shot learning

- [44] Improving object localization with fitness NMS and bounded IoU loss: Improving object localization with fitness NMS and bounded IoU loss

- [48] Lin Wu, 2018: Where-andwhen to look:Deep siamese attention networks for videobased person re-identification

- [57] Single-shot refinement neural network for object detection: Single-shot refinement neural network for object detection

- [64] Distractor-aware siamese networks for visual object tracking: Distractor-aware siamese networks for visual object tracking

- [15] One-shot object detection with co-attention and co-excitation: One-shot object detection with co-attention and co-excitation

- [17] Few-shot object detection via feature reweighting: Few-shot object detection via feature reweighting

- [20] Bo Li, 2019: SiamRPN++: Evolution of siamese visual tracking with very deep networks

- [32] Libra R-CNN: Towards balanced learning for object detection: Libra R-CNN: Towards balanced learning for object detection

- [43] FCOS: Fully convolutional one-stage object detection: FCOS: Fully convolutional one-stage object detection

- [51] Xiaopeng Yan, 2019: Meta R-CNN: Towards general solver for instance-level low-shot learning

- [54] IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,: IEEE Transactions on Geoscience and Remote Sensing,57(12):10015-10024,

- [58] Deeper and wider siamese networks for real-time visual tracking．: Deeper and wider siamese networks for real-time visual tracking．

- [59] Re-identification with consistent attentive siamese networks: Re-identification with consistent attentive siamese networks

- [61] Xingyi Zhou, 2019: Objects as points

- [62] Bottom-up object detection by grouping extreme and center points: Bottom-up object detection by grouping extreme and center points

- [3] End-toend object detection with transformers: End-toend object detection with transformers

- [9] Fewshot object detection with attention-RPN and multi-relation detector: Fewshot object detection with attention-RPN and multi-relation detector




##### 近期
近期工作则更直接地收束到本文所处的方法脉络，包括DETR及其变体、Siamese跟踪器以及少样本检测等前沿方向。


- [27] Li Liu, 2020: Deep learning for generic object detection: A survey

- [33] Incremental few-shot object detection: Incremental few-shot object detection

- [46] Paul Voigtlaender, 2020: Siam R-CNN: Visual tracking by re-detection

- [49] Few-shot object detection and viewpoint estimation for objects in the wild: Few-shot object detection and viewpoint estimation for objects in the wild

- [4] Transformer tracking: Transformer tracking

- [10] Peng Gao, 2021: Fast convergence of DETR with spatially modulated co-attention

- [14] TransReID: Transformer-based object reidentification: TransReID: Transformer-based object reidentification

- [22] Diverse part discovery: Occluded person re-identification with part-aware transformer: Diverse part discovery: Occluded person re-identification with part-aware transformer

- [23] Minghui Liao, 2021: Mask TextSpotter: An end-toend trainable neural network for spoting text with arbitrary shapes

- [31] Depu Meng， Xiaokang Chen， Zejia Fan, 2021: Conditional DETR for fast training convergence

- [47] Ning Wang，Wengang Zhou, 2021: Transformer meets tracker:Exploiting temporal context for robust visual tracking

- [50] Chuhui Xue, 2021: I2C2W: Image-to-character-to-word transformers for accurate scene text recognition

- [52] Fangao Zeng, 2021: MOTR: End-to-end Multiple-Object tracking with TRansformer

- [53] Gongjie Zhang, 213: PNPDet: Efficient few-shot detection without forgetting via plug-and-play sub-networks. In WACV,

- [55] Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation: Meta-DETR:Image-level few-shot object detection with inter-class correlation exploitation

- [56] DA-DETR:Domain adaptive detection transformer by hybrid attention: DA-DETR:Domain adaptive detection transformer by hybrid attention

- [63] Deformable DETR:Deformable transformers for end-to-end object detection: Deformable DETR:Deformable transformers for end-to-end object detection

- [60] PTTR: Relational 3D point cloud object tracking with transformer: PTTR: Relational 3D point cloud object tracking with transformer


# RF-DETR: neural architecture search for real-time detection transformers (2025)

- Paper ref: 1:SZ3GNWT9
- Title: RF-DETR: neural architecture search for real-time detection transformers
- Year: 2025

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2023 | Lucas Beyer; Pavel Izmailov; et al. | Flexivit: One model for all patch sizes. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp |
| ref-2 | 2019 | Daniel Bolya; Chong Zhou; et al. | Yolact: Real-time instance segmentation. In Proceedings of the IEEE/CVF international conference on computer vision, pp |
| ref-3 | 2018 | Han Cai; Tianyao Chen; et al. | Efficient architecture search by network transformation |
| ref-4 | 2018 | Han Cai; Ligeng Zhu,; et al. | Proxylessnas: Direct neural architecture search on target task and hardware |
| ref-5 | 2019 | Han Cai; Chuang Gan; et al. | Once-for-all: Train one network and specialize it for efficient deployment |
| ref-6 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers. In European conference on computer vision, pp. 213–229 |
| ref-7 | 2019 | Kai Chen; Jiangmiao Pang; et al. | Hybrid task cascade for instance segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-8 | 2024 | Qiang Chen; Xiangbo Su; et al. | Lw-detr: A transformer replacement to yolo for real-time detection |
| ref-9 | 2024 | Qiang Chen; Xiangbo Su; et al. | Lw-detr: a transformer replacement to yolo for real-time detection |
| ref-10 | 2024 | Tianheng Cheng; Lin Song; et al. | Yolo-world: Real-time open-vocabulary object detection. In Proc. IEEE Conf |
| ref-11 | 2015 | M | Everingham, S. M. A. Eslami, L. Van Gool, C. K. I. Williams, J. Winn, and A. Zisserman. The pascal visual object classes challenge: A retrospective |
| ref-12 | 2009 | Pedro F Felzenszwalb; Ross B Girshick; et al. | Object detection with discriminatively trained part-based models |
| ref-13 | 2025 | Shenghao Fu; Qize Yang; et al. | Llmdet: Learning strong open-vocabulary object detectors under the supervision of large language models. In Proceedings of the Computer Vision and Pattern Recognition Conference, pp |
| ref-14 | 2019 | Golnaz Ghiasi; Tsung-Yi Lin,; et al. | Nas-fpn: Learning scalable feature pyramid architecture for object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-15 | 2023 | Junjie He; Pengyu Li; et al. | Fastinst: A simple query-based model for real-time instance segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-16 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask r-cnn. In ´ Proceedings of the IEEE international conference on computer vision, pp |
| ref-17 |  |  | Glenn Jocher, Jing Qiu, and Ayush Chaurasia. |
| ref-18 | 2023 | Ultralytics YOLO, January 2023 | Ultralytics YOLO, January 2023. URL https: //docs.ultralytics.com/models/yolov8. |
| ref-19 |  |  | Glenn Jocher, Jing Qiu, and Ayush Chaurasia. |
| ref-20 | 2024 | Ultralytics YOLO, January 2024 | URL docs |
| ref-21 | 2024 | Mehar Khurana; Neehar Peri; et al. | Shelf-supervised multi-modal pretraining for 3d object detection |
| ref-22 | 2023 | Feng Li; Hao Zhang; et al. | Mask dino: Towards a unified transformer-based framework for object detection and segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-23 | 2022 | Liunian Harold Li; Pengchuan Zhang; et al. | Grounded language-image pre-training. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp |
| ref-24 | 2014 | Tsung-Yi Lin, Michael Maire, Serge J | Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C. Lawrence Zitnick. Microsoft COCO: common objects in context |
| ref-25 | 2022 | Shilong Liu; Feng Li; et al. | Dab-detr: Dynamic anchor boxes are better queries for detr |
| ref-26 | 2023 | Shilong Liu; Zhaoyang Zeng; et al. | Grounding dino: Marrying dino with grounded pre-training for open-set object detection |
| ref-27 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Ssd: Single shot multibox detector |
| ref-28 | 2023 | Yechi Ma; Neehar Peri; et al. | Longtailed 3d detection via 2d late fusion |
| ref-29 | 2021 | Depu Meng; Xiaokang Chen; et al. | Conditional detr for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp |
| ref-30 | 2023 | Maxime Oquab; Timothee Darcet; et al. | Dinov2: Learning robust visual features without supervision |
| ref-31 | 2024 | Aljosa Osep; Tim Meinhardt; et al. | Better call sal: Towards learning to segment anything in lidar |
| ref-32 | 2024 | Yansong Peng; Hebei Li; et al. | D-fine: Redefine regression task in detrs as fine-grained distribution refinement |
| ref-33 | 2023 | Neehar Peri; Achal Dave; et al. | Towards long-tailed 3d detection |
| ref-34 | 2024 | Nikhila Ravi; Valentin Gabeur; et al. | Sam 2: Segment anything in images and videos. arXiv preprint arXiv:2408.00714, 2024 |
| ref-35 | 2019 | Esteban Real; Alok Aggarwal; et al. | Regularized evolution for image classifier architecture search. In Proceedings of the aaai conference on artificial intelligence, volume 33, pp |
| ref-36 | 2016 | Joseph Redmon; Santosh Divvala; et al. | You only look once: Unified, real-time object detection. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp |
| ref-37 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-38 | 2025 | Peter Robicheaux; Matvei Popov; et al. | Roboflow100-vl: A multi-domain object detection benchmark for visionlanguage models |
| ref-39 | 2015 | Olga Russakovsky; Jia Deng; et al. | Imagenet large scale visual recognition challenge |
| ref-40 |  | Shuai Shao; Zeming Li; et al. | Shuai Shao, Zeming Li, Tianyuan Zhang, Chao Peng, Gang Yu, Xiangyu Zhang, Jing Li, and Jian Sun. Obj |
| ref-41 | 2019 | In 2019 IEEE/CVF International Conference on Computer Vision (ICCV), pp | 8429–8438, 2019. doi: 10.1109/ICCV |
| ref-42 | 2025 | Oriane Simeoni; Huy V Vo; et al. | Dinov3 |
| ref-43 | 2014 | Nitish Srivastava, Geoffrey E | Hinton, Alex Krizhevsky, Ilya Sutskever, and Ruslan Salakhutdinov. Dropout: a simple way to prevent neural networks from overfitting. J. Mach. Learn |
| ref-44 | 2025 | Ayca Takmaz; Cristiano Saltori; et al. | Towards Learning to Complete Anything in Lidar |
| ref-45 | 2019 | Mingxing Tan; Quoc Le | Efficientnet: Rethinking model scaling for convolutional neural networks. In International conference on machine learning, pp. 6105–6114 |
| ref-46 | 2019 | Mingxing Tan; Bo Chen; et al. | Mnasnet: Platform-aware neural architecture search for mobile. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-47 | 2020 | Mingxing Tan; Ruoming Pang,; et al. | Efficientdet: Scalable and efficient object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-48 | 2023 | Chien-Yao Wang; Alexey Bochkovskiy,; et al. | Yolov7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-49 | 2024 | Chien-Yao Wang; I-Hau Yeh,; et al. | Yolov9: Learning what you want to learn using programmable gradient information. In European conference on computer vision, pp. 1–21 |
| ref-50 | 2019 | Bichen Wu; Xiaoliang Dai; et al. | Fbnet: Hardware-aware efficient convnet design via differentiable neural architecture search. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-51 | 2024 | Yifan Xu; Mengdan Zhang; et al. | Multi-modal queried object detection in the wild |
| ref-52 | 2023 | Xiaoju Ye | calflops: a flops and params calculate tool for neural networks in pytorch framework, 2023 |
| ref-53 | 2022 | Hao Zhang; Feng Li; et al. | Dino: Detr with improved denoising anchor boxes for end-to-end object detection |
| ref-54 | 2022 | Xinyu Zhang; Jiahui Chen; et al. | Cae v2: Context autoencoder with clip target |
| ref-55 | 2024 | Yian Zhao; Wenyu Lv; et al. | Detrs beat yolos on real-time object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp |
| ref-56 | 2022 | Xingyi Zhou; Rohit Girdhar; et al. | Detecting ¨ twenty-thousand classes using image-level supervision. In European Conference on Computer Vision, pp. 350–368 |
| ref-57 | 2020 | Xizhou Zhu; Weijie Su; et al. | Deformable detr: Deformable transformers for end-to-end object detection |
| ref-58 | 2016 | Barret Zoph; Quoc V Le | Neural architecture search with reinforcement learning |
| ref-59 | 2018 | Barret Zoph; Vijay Vasudevan; et al. | Learning transferable architectures for scalable image recognition. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp |

## Citation Analysis Report

#### 总体总结
本节先用早期检测器（YOLO、SSD、Faster R-CNN）和 NAS 开创性工作（NASNet、OFA）铺出技术背景，再把 DETR 系列方法（原始 DETR、DAB-DETR、Deformable DETR、DINO、RT-DETR、LW-DETR）与开放词汇检测器（GroundingDINO、GLIP、Detic）并置比较，最后借 D-FINE、SAM2 和 RF100-VL 等近期关键文献把 RF-DETR 的方法路线明确出来。整体引文组织呈现从经典检测范式到 Transformer 架构再到权重共享 NAS 的技术演进脉络。


#### 关键文献

- [AY-9] Han Cai, 2019: Once-for-all: Train one network and specialize it for efficient deployment (Uncategorized)

- [AY-19] Nicolas Carion, 2020: End-to-end object detection with transformers. In European conference on computer vision, pp. 213–229 (Historical)

- [AY-13] Qiang Chen, 2024: Lw-detr: A transformer replacement to yolo for real-time detection (Baseline)

- [AY-46] Shenghao Fu, 2025: Llmdet: Learning strong open-vocabulary object detectors under the supervision of large language models. In Proceedings of the Computer Vision and Pattern Recognition Conference, pp (Baseline)

- [AY-29] Mehar Khurana, 2024: Shelf-supervised multi-modal pretraining for 3d object detection (Uncategorized)



#### 范围
- 章节: Introduction + Related Works + Method + Experiments + Conclusion + Appendices
- 行号: 1-112

#### 按功能归类


##### Uncategorized

- [AY-43] Lucas Beyer, 2023
  - 标题: Flexivit: One model for all patch sizes. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp
  - 关键词: FlexiVIT, patch size, interpolation
  - 总结: 原文采用 FlexiVIT 风格变换在训练期间插值不同 patch size，作为 NAS 搜索空间的关键组件。

- [AY-39] Daniel Bolya, 2019
  - 标题: Yolact: Real-time instance segmentation. In Proceedings of the IEEE/CVF international conference on computer vision, pp
  - 关键词: instance segmentation, real-time, YOLACT
  - 总结: 原文受 YOLACT 启发添加轻量级实例分割头，用于联合预测高质量分割掩码。

- [AY-9] Han Cai, 2019
  - 标题: Once-for-all: Train one network and specialize it for efficient deployment
  - 关键词: OFA, weight-sharing, once-for-all
  - 总结: 本文受 OFA 启发，在训练期间变化图像分辨率和 patch size 等模型输入，是核心技术灵感来源。

- [AY-20] Kai Chen, 2019
  - 标题: Hybrid task cascade for instance segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: HTC, two-stage, instance segmentation
  - 总结: 作为两阶段检测器的代表被引用，用于对比实时检测器的精度-延迟权衡。

- [AY-1] Tianheng Cheng, 2024
  - 标题: Yolo-world: Real-time open-vocabulary object detection. In Proc. IEEE Conf
  - 关键词: YOLO-World, open-vocabulary, zero-shot
  - 总结: 作为开放词汇检测器的代表，用于说明 VLM 在常见类别上的零样本性能。

- [AY-2] Pedro F Felzenszwalb, 2009
  - 标题: Object detection with discriminatively trained part-based models
  - 关键词: DAB-DETR, anchor boxes
  - 总结: 作为 DETR 变体被引用，展示早期 DETR 改进工作。

- [AY-10] Golnaz Ghiasi, 2019
  - 标题: Nas-fpn: Learning scalable feature pyramid architecture for object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: SSD, single-stage
  - 总结: 作为单阶段检测器的代表，用于说明历史精度-延迟权衡。

- [AY-45] Junjie He, 2023
  - 标题: Fastinst: A simple query-based model for real-time instance segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: 3D detection, multi-modal
  - 总结: 作为多模态预训练在下游任务中的应用被引用。

- [AY-21] Kaiming He, 2017
  - 标题: Mask r-cnn. In ´ Proceedings of the IEEE international conference on computer vision, pp
  - 关键词: Conditional DETR, denoising
  - 总结: 作为 DETR 快速收敛的改进方法被引用。

- [AY-29] Mehar Khurana, 2024
  - 标题: Shelf-supervised multi-modal pretraining for 3d object detection
  - 关键词: SAM2, segment anything, pseudo-labeling
  - 总结: 本文用 SAM2 伪标注 Objects365 用于预训练分割和检测头。

- [AY-22] Shilong Liu, 2022
  - 标题: Dab-detr: Dynamic anchor boxes are better queries for detr
  - 关键词: RF100-VL, benchmark, multi-domain
  - 总结: 本文使用 RF100-VL 评估泛化到真实世界数据集的能力，是关键评估基准。

- [AY-4] Shilong Liu, 2023
  - 标题: Grounding dino: Marrying dino with grounded pre-training for open-set object detection
  - 关键词: ImageNet, ILSVRC
  - 总结: 作为大规模视觉识别基准被引用。

- [AY-23] Wei Liu, 2016
  - 标题: Ssd: Single shot multibox detector
  - 关键词: Objects365, pre-training
  - 总结: 本文在 Objects365 上用 SAM2 伪标注进行预训练。

- [AY-31] Yechi Ma, 2023
  - 标题: Longtailed 3d detection via 2d late fusion
  - 关键词: DINOv3, EMA scheduler
  - 总结: 与 DINOv3 并发观察到 cosine 调度的局限性问题。

- [AY-24] Depu Meng, 2021
  - 标题: Conditional detr for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp
  - 关键词: dropout, regularization
  - 总结: 用于类比权重共享 NAS 的"架构增强"正则化效果类似于 dropout。

- [AY-38] Maxime Oquab, 2023
  - 标题: Dinov2: Learning robust visual features without supervision
  - 关键词: LiDAR, completion
  - 总结: 作为 LiDAR 补全相关工作被引用。

- [AY-6] Shaoqing Ren, 2015
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: multi-modal, quered detection
  - 总结: 作为多模态检测相关工作被引用。

- [AY-7] Peter Robicheaux, 2025
  - 标题: Roboflow100-vl: A multi-domain object detection benchmark for visionlanguage models
  - 关键词: CalFLOPs, benchmarking
  - 总结: 用于对比 FLOPs 基准测试工具的可靠性。

- [AY-34] Olga Russakovsky, 2015
  - 标题: Imagenet large scale visual recognition challenge
  - 关键词: DINO, denoising, DETR
  - 总结: 作为改进的 DETR 方法被引用，展示去噪锚框技术。

- [AY-44] Oriane Simeoni, 2025
  - 标题: Dinov3
  - 关键词: Detic, long-tail, image-level supervision
  - 总结: 作为使用 ImageNet 级监督提升长尾检测的 VLM 方法被引用。

- [AY-42] Nitish Srivastava, Geoffrey E, 2014
  - 标题: Hinton, Alex Krizhevsky, Ilya Sutskever, and Ruslan Salakhutdinov. Dropout: a simple way to prevent neural networks from overfitting. J. Mach. Learn
  - 关键词: Deformable DETR, deformable attention
  - 总结: 作为可变形注意力在 DETR 中的应用被引用。

- [AY-12] Mingxing Tan, 2020
  - 标题: Efficientdet: Scalable and efficient object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-26] Chien-Yao Wang, 2023
  - 标题: Yolov7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-16] Bichen Wu, 2019
  - 标题: Fbnet: Hardware-aware efficient convnet design via differentiable neural architecture search. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-36] Yifan Xu, 2024
  - 标题: Multi-modal queried object detection in the wild
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-27] Hao Zhang, 2022
  - 标题: Dino: Detr with improved denoising anchor boxes for end-to-end object detection
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-8] Yian Zhao, 2024
  - 标题: Detrs beat yolos on real-time object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-37] Xingyi Zhou, 2022
  - 标题: Detecting ¨ twenty-thousand classes using image-level supervision. In European Conference on Computer Vision, pp. 350–368
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-28] Xizhou Zhu, 2020
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-17] Barret Zoph, 2016
  - 标题: Neural architecture search with reinforcement learning
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。

- [AY-18] Barret Zoph, 2018
  - 标题: Learning transferable architectures for scalable image recognition. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp
  - 关键词: general
  - 总结: 该文献在当前综述范围中被引用以支撑相关技术论述。



##### Historical

- [AY-14] Han Cai, 2018
  - 标题: Efficient architecture search by network transformation
  - 关键词: NAS, network transformation, early work
  - 总结: 作为 NAS 技术发展脉络的早期工作被引用。

- [AY-19] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers. In European conference on computer vision, pp. 213–229
  - 关键词: DETR, transformer, object detection
  - 总结: 作为 DETR 架构的开创性工作被引用，是本文方法的技术起点。

- [AY-40] Feng Li, 2023
  - 标题: Mask dino: Towards a unified transformer-based framework for object detection and segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp
  - 关键词: regularized evolution, NAS
  - 总结: 作为 NAS 进化方法被引用。

- [AY-30] Liunian Harold Li, 2022
  - 标题: Grounded language-image pre-training. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp
  - 关键词: YOLO, real-time
  - 总结: 作为单阶段实时检测器的开创性工作被引用。

- [AY-3] Tsung-Yi Lin, Michael Maire, Serge J, 2014
  - 标题: Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C. Lawrence Zitnick. Microsoft COCO: common objects in context
  - 关键词: Faster R-CNN, region proposal
  - 总结: 作为两阶段检测器的代表被引用。

- [AY-32] Aljosa Osep, 2024
  - 标题: Better call sal: Towards learning to segment anything in lidar
  - 关键词: EfficientNet, model scaling
  - 总结: 作为模型缩放方法的代表被引用。

- [AY-5] Yansong Peng, 2024
  - 标题: D-fine: Redefine regression task in detrs as fine-grained distribution refinement
  - 关键词: MnasNet, platform-aware
  - 总结: 作为平台感知 NAS 的代表被引用。

- [AY-33] Neehar Peri, 2023
  - 标题: Towards long-tailed 3d detection
  - 关键词: EfficientDet, scalable detection
  - 总结: 作为高效目标检测的代表被引用。

- [AY-25] Joseph Redmon, 2016
  - 标题: You only look once: Unified, real-time object detection. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp
  - 关键词: FBNet, differentiable NAS
  - 总结: 作为可微分 NAS 的代表被引用。

- [AY-35] Ayca Takmaz, 2025
  - 标题: Towards Learning to Complete Anything in Lidar
  - 关键词: NAS, reinforcement learning
  - 总结: 作为 NAS 使用强化学习的开创性工作被引用。

- [AY-11] Mingxing Tan, 2019
  - 标题: Efficientnet: Rethinking model scaling for convolutional neural networks. In International conference on machine learning, pp. 6105–6114
  - 关键词: NAS, transferable architectures
  - 总结: 作为 NAS 学习可迁移架构的工作被引用。



##### Baseline

- [AY-13] Qiang Chen, 2024
  - 标题: Lw-detr: A transformer replacement to yolo for real-time detection
  - 关键词: LW-DETR, real-time, DETR
  - 总结: 作为本文 RF-DETR 的直接改进基线，本文在其架构基础上进行现代化改造。

- [AY-46] Shenghao Fu, 2025
  - 标题: Llmdet: Learning strong open-vocabulary object detectors under the supervision of large language models. In Proceedings of the Computer Vision and Pattern Recognition Conference, pp
  - 关键词: GroundingDINO, open-vocabulary, VLM
  - 总结: 作为开放词汇检测器的主要对比基线，在 RF100-VL 上与 RF-DETR 比较性能。

- [AY-41] Nikhila Ravi, 2024
  - 标题: Sam 2: Segment anything in images and videos. arXiv preprint arXiv:2408.00714, 2024
  - 关键词: YOLOv7, bag-of-freebies
  - 总结: 作为 YOLO 系列的实时检测器被引用。

- [AY-15] Esteban Real, 2019
  - 标题: Regularized evolution for image classifier architecture search. In Proceedings of the aaai conference on artificial intelligence, volume 33, pp
  - 关键词: YOLOv9, PGI
  - 总结: 作为 YOLO 系列的最新检测器被引用。





#### 时间线分析

##### 早期
早期工作奠定了目标检测、NAS 和 Transformer 的基础。包括 YOLO、SSD、Faster R-CNN 等经典检测器，以及 NASNet、OFA 等 NAS 开创性工作，还有 DETR 的提出将 Transformer 引入目标检测。


- [AY-39] Daniel Bolya, 2019: Yolact: Real-time instance segmentation. In Proceedings of the IEEE/CVF international conference on computer vision, pp

- [AY-14] Han Cai, 2018: Efficient architecture search by network transformation

- [AY-9] Han Cai, 2019: Once-for-all: Train one network and specialize it for efficient deployment

- [AY-20] Kai Chen, 2019: Hybrid task cascade for instance segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-2] Pedro F Felzenszwalb, 2009: Object detection with discriminatively trained part-based models

- [AY-10] Golnaz Ghiasi, 2019: Nas-fpn: Learning scalable feature pyramid architecture for object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-21] Kaiming He, 2017: Mask r-cnn. In ´ Proceedings of the IEEE international conference on computer vision, pp

- [AY-3] Tsung-Yi Lin, Michael Maire, Serge J, 2014: Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C. Lawrence Zitnick. Microsoft COCO: common objects in context

- [AY-23] Wei Liu, 2016: Ssd: Single shot multibox detector

- [AY-15] Esteban Real, 2019: Regularized evolution for image classifier architecture search. In Proceedings of the aaai conference on artificial intelligence, volume 33, pp

- [AY-25] Joseph Redmon, 2016: You only look once: Unified, real-time object detection. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp

- [AY-6] Shaoqing Ren, 2015: Faster r-cnn: Towards real-time object detection with region proposal networks

- [AY-34] Olga Russakovsky, 2015: Imagenet large scale visual recognition challenge

- [AY-42] Nitish Srivastava, Geoffrey E, 2014: Hinton, Alex Krizhevsky, Ilya Sutskever, and Ruslan Salakhutdinov. Dropout: a simple way to prevent neural networks from overfitting. J. Mach. Learn

- [AY-11] Mingxing Tan, 2019: Efficientnet: Rethinking model scaling for convolutional neural networks. In International conference on machine learning, pp. 6105–6114

- [AY-16] Bichen Wu, 2019: Fbnet: Hardware-aware efficient convnet design via differentiable neural architecture search. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-17] Barret Zoph, 2016: Neural architecture search with reinforcement learning

- [AY-18] Barret Zoph, 2018: Learning transferable architectures for scalable image recognition. In Proceedings of the IEEE conference on computer vision and pattern recognition, pp




##### 中期
中期工作将 Transformer 和 NAS 推向成熟。包括 DETR 变体（DAB-DETR、Conditional DETR、Deformable DETR、DINO）、实时 DETR（RT-DETR、LW-DETR）、开放词汇检测器（GroundingDINO、GLIP、Detic）以及实例分割方法（MaskDINO、YOLACT、FastInst）。


- [AY-43] Lucas Beyer, 2023: Flexivit: One model for all patch sizes. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp

- [AY-19] Nicolas Carion, 2020: End-to-end object detection with transformers. In European conference on computer vision, pp. 213–229

- [AY-45] Junjie He, 2023: Fastinst: A simple query-based model for real-time instance segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-40] Feng Li, 2023: Mask dino: Towards a unified transformer-based framework for object detection and segmentation. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-30] Liunian Harold Li, 2022: Grounded language-image pre-training. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pp

- [AY-22] Shilong Liu, 2022: Dab-detr: Dynamic anchor boxes are better queries for detr

- [AY-4] Shilong Liu, 2023: Grounding dino: Marrying dino with grounded pre-training for open-set object detection

- [AY-31] Yechi Ma, 2023: Longtailed 3d detection via 2d late fusion

- [AY-24] Depu Meng, 2021: Conditional detr for fast training convergence. In Proceedings of the IEEE/CVF international conference on computer vision, pp

- [AY-38] Maxime Oquab, 2023: Dinov2: Learning robust visual features without supervision

- [AY-33] Neehar Peri, 2023: Towards long-tailed 3d detection

- [AY-12] Mingxing Tan, 2020: Efficientdet: Scalable and efficient object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-26] Chien-Yao Wang, 2023: Yolov7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp

- [AY-27] Hao Zhang, 2022: Dino: Detr with improved denoising anchor boxes for end-to-end object detection

- [AY-37] Xingyi Zhou, 2022: Detecting ¨ twenty-thousand classes using image-level supervision. In European Conference on Computer Vision, pp. 350–368

- [AY-28] Xizhou Zhu, 2020: Deformable detr: Deformable transformers for end-to-end object detection




##### 近期
近期工作直接收束到本文方法路线。包括 D-FINE 作为最新实时检测器基线，YOLOv8/v9 作为 YOLO 系列最新代表，SAM2 用于伪标注，RF100-VL 作为评估基准，以及 DINOv3 并发发现。


- [AY-13] Qiang Chen, 2024: Lw-detr: A transformer replacement to yolo for real-time detection

- [AY-1] Tianheng Cheng, 2024: Yolo-world: Real-time open-vocabulary object detection. In Proc. IEEE Conf

- [AY-46] Shenghao Fu, 2025: Llmdet: Learning strong open-vocabulary object detectors under the supervision of large language models. In Proceedings of the Computer Vision and Pattern Recognition Conference, pp

- [AY-29] Mehar Khurana, 2024: Shelf-supervised multi-modal pretraining for 3d object detection

- [AY-32] Aljosa Osep, 2024: Better call sal: Towards learning to segment anything in lidar

- [AY-5] Yansong Peng, 2024: D-fine: Redefine regression task in detrs as fine-grained distribution refinement

- [AY-41] Nikhila Ravi, 2024: Sam 2: Segment anything in images and videos. arXiv preprint arXiv:2408.00714, 2024

- [AY-7] Peter Robicheaux, 2025: Roboflow100-vl: A multi-domain object detection benchmark for visionlanguage models

- [AY-44] Oriane Simeoni, 2025: Dinov3

- [AY-35] Ayca Takmaz, 2025: Towards Learning to Complete Anything in Lidar

- [AY-36] Yifan Xu, 2024: Multi-modal queried object detection in the wild

- [AY-8] Yian Zhao, 2024: Detrs beat yolos on real-time object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pp


# DINOv3 (2025)

- Paper ref: 1:TWR6CC4I
- Title: DINOv3
- Year: 2025

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2025 | Unknown | Unknown title |
| ref-2 | 2025 | Unknown | Unknown title |
| ref-3 | 2025 | Unknown | Unknown title |
| ref-4 | 2025 | Unknown | Unknown title |
| ref-5 | 2025 | Unknown | Unknown title |
| ref-6 | 2025 | Unknown | Unknown title |
| ref-7 | 2025 | Unknown | Unknown title |
| ref-8 | 2025 | Unknown | Unknown title |
| ref-9 | 2025 | Unknown | Unknown title |
| ref-10 | 2025 | Unknown | Unknown title |
| ref-11 | 2025 | Unknown | Unknown title |
| ref-12 | 2025 | Unknown | Unknown title |
| ref-13 | 2025 | Unknown | Unknown title |
| ref-14 | 2025 | Unknown | Unknown title |
| ref-15 | 2025 | Unknown | Unknown title |
| ref-16 | 2025 | Unknown | Unknown title |
| ref-17 | 2025 | Unknown | Unknown title |
| ref-18 | 2025 | Unknown | Unknown title |
| ref-19 | 2025 | Unknown | Unknown title |
| ref-20 | 2025 | Unknown | Unknown title |
| ref-21 | 2025 | Unknown | Unknown title |
| ref-22 | 2025 | Unknown | Unknown title |
| ref-23 | 2025 | Unknown | Unknown title |
| ref-24 | 2025 | Unknown | Unknown title |
| ref-25 | 2025 | Unknown | Unknown title |
| ref-26 | 2025 | Unknown | Unknown title |
| ref-27 | 2025 | Unknown | Unknown title |
| ref-28 | 2025 | Unknown | Unknown title |
| ref-29 | 2025 | Unknown | Unknown title |
| ref-30 | 2025 | Unknown | Unknown title |
| ref-31 | 2025 | Unknown | Unknown title |
| ref-32 | 2025 | Unknown | Unknown title |
| ref-33 | 2025 | Unknown | Unknown title |
| ref-34 | 2025 | Unknown | Unknown title |
| ref-35 | 2025 | Unknown | Unknown title |
| ref-36 | 2025 | Unknown | Unknown title |
| ref-37 | 2025 | Unknown | Unknown title |
| ref-38 | 2025 | Unknown | Unknown title |
| ref-39 | 2025 | Unknown | Unknown title |
| ref-40 | 2025 | Unknown | Unknown title |
| ref-41 | 2025 | Unknown | Unknown title |
| ref-42 | 2025 | Unknown | Unknown title |
| ref-43 | 2025 | Unknown | Unknown title |
| ref-44 | 2025 | Unknown | Unknown title |
| ref-45 | 2025 | Unknown | Unknown title |
| ref-46 | 2025 | Unknown | Unknown title |
| ref-47 | 2025 | Unknown | Unknown title |
| ref-48 | 2025 | Unknown | Unknown title |
| ref-49 | 2025 | Unknown | Unknown title |
| ref-50 | 2025 | Unknown | Unknown title |
| ref-51 | 2025 | Unknown | Unknown title |
| ref-52 | 2025 | Unknown | Unknown title |
| ref-53 | 2025 | Unknown | Unknown title |
| ref-54 | 2025 | Unknown | Unknown title |
| ref-55 | 2025 | Unknown | Unknown title |
| ref-56 | 2025 | Unknown | Unknown title |
| ref-57 | 2025 | Unknown | Unknown title |
| ref-58 | 2025 | Unknown | Unknown title |
| ref-59 | 2025 | Unknown | Unknown title |
| ref-60 | 2025 | Unknown | Unknown title |
| ref-61 | 2025 | Unknown | Unknown title |
| ref-62 | 2025 | Unknown | Unknown title |
| ref-63 | 2025 | Unknown | Unknown title |
| ref-64 | 2025 | Unknown | Unknown title |
| ref-65 | 2025 | Unknown | Unknown title |
| ref-66 | 2025 | Unknown | Unknown title |
| ref-67 | 2025 | Unknown | Unknown title |
| ref-68 | 2025 | Unknown | Unknown title |
| ref-69 | 2025 | Unknown | Unknown title |
| ref-70 | 2025 | Unknown | Unknown title |
| ref-71 | 2025 | Unknown | Unknown title |
| ref-72 | 2025 | Unknown | Unknown title |
| ref-73 | 2025 | Unknown | Unknown title |
| ref-74 | 2025 | Unknown | Unknown title |
| ref-75 | 2025 | Unknown | Unknown title |
| ref-76 | 2025 | Unknown | Unknown title |
| ref-77 | 2025 | Unknown | Unknown title |
| ref-78 | 2025 | Unknown | Unknown title |
| ref-79 | 2025 | Unknown | Unknown title |
| ref-80 | 2025 | Unknown | Unknown title |
| ref-81 | 2025 | Unknown | Unknown title |
| ref-82 | 2025 | Unknown | Unknown title |
| ref-83 | 2025 | Unknown | Unknown title |
| ref-84 | 2025 | Unknown | Unknown title |
| ref-85 | 2025 | Unknown | Unknown title |
| ref-86 | 2025 | Unknown | Unknown title |
| ref-87 | 2025 | Unknown | Unknown title |
| ref-88 | 2025 | Unknown | Unknown title |
| ref-89 | 2025 | Unknown | Unknown title |
| ref-90 | 2025 | Unknown | Unknown title |
| ref-91 | 2025 | Unknown | Unknown title |
| ref-92 | 2025 | Unknown | Unknown title |
| ref-93 | 2025 | Unknown | Unknown title |
| ref-94 | 2025 | Unknown | Unknown title |
| ref-95 | 2025 | Unknown | Unknown title |
| ref-96 | 2025 | Unknown | Unknown title |
| ref-97 | 2025 | Unknown | Unknown title |
| ref-98 | 2025 | Unknown | Unknown title |
| ref-99 | 2025 | Unknown | Unknown title |
| ref-100 | 2025 | Unknown | Unknown title |
| ref-101 | 2025 | Unknown | Unknown title |
| ref-102 | 2025 | Unknown | Unknown title |
| ref-103 | 2025 | Unknown | Unknown title |
| ref-104 | 2025 | Unknown | Unknown title |
| ref-105 | 2025 | Unknown | Unknown title |
| ref-106 | 2025 | Unknown | Unknown title |
| ref-107 | 2025 | Unknown | Unknown title |
| ref-108 | 2025 | Unknown | Unknown title |
| ref-109 | 2025 | Unknown | Unknown title |
| ref-110 | 2025 | Unknown | Unknown title |
| ref-111 | 2025 | Unknown | Unknown title |
| ref-112 | 2025 | Unknown | Unknown title |
| ref-113 | 2025 | Unknown | Unknown title |
| ref-114 | 2025 | Unknown | Unknown title |
| ref-115 | 2025 | Unknown | Unknown title |
| ref-116 | 2025 | Unknown | Unknown title |
| ref-117 | 2025 | Unknown | Unknown title |
| ref-118 | 2025 | Unknown | Unknown title |
| ref-119 | 2025 | Unknown | Unknown title |
| ref-120 | 2025 | Unknown | Unknown title |
| ref-121 | 2025 | Unknown | Unknown title |
| ref-122 | 2025 | Unknown | Unknown title |
| ref-123 | 2025 | Unknown | Unknown title |
| ref-124 | 2025 | Unknown | Unknown title |
| ref-125 | 2025 | Unknown | Unknown title |
| ref-126 | 2025 | Unknown | Unknown title |
| ref-127 | 2025 | Unknown | Unknown title |
| ref-128 | 2025 | Unknown | Unknown title |
| ref-129 | 2025 | Unknown | Unknown title |
| ref-130 | 2025 | Unknown | Unknown title |
| ref-131 | 2025 | Unknown | Unknown title |
| ref-132 | 2025 | Unknown | Unknown title |
| ref-133 | 2025 | Unknown | Unknown title |
| ref-134 | 2025 | Unknown | Unknown title |
| ref-135 | 2025 | Unknown | Unknown title |
| ref-136 | 2025 | Unknown | Unknown title |
| ref-137 | 2025 | Unknown | Unknown title |
| ref-138 | 2025 | Unknown | Unknown title |
| ref-139 | 2025 | Unknown | Unknown title |
| ref-140 | 2025 | Unknown | Unknown title |
| ref-141 | 2025 | Unknown | Unknown title |
| ref-142 | 2025 | Unknown | Unknown title |
| ref-143 | 2025 | Unknown | Unknown title |
| ref-144 | 2025 | Unknown | Unknown title |
| ref-145 | 2025 | Unknown | Unknown title |
| ref-146 | 2025 | Unknown | Unknown title |
| ref-147 | 2025 | Unknown | Unknown title |
| ref-148 | 2025 | Unknown | Unknown title |
| ref-149 | 2025 | Unknown | Unknown title |
| ref-150 | 2025 | Unknown | Unknown title |
| ref-151 | 2025 | Unknown | Unknown title |
| ref-152 | 2025 | Unknown | Unknown title |
| ref-153 | 2025 | Unknown | Unknown title |
| ref-154 | 2025 | Unknown | Unknown title |
| ref-155 | 2025 | Unknown | Unknown title |
| ref-156 | 2025 | Unknown | Unknown title |
| ref-157 | 2025 | Unknown | Unknown title |
| ref-158 | 2025 | Unknown | Unknown title |
| ref-159 | 2025 | Unknown | Unknown title |
| ref-160 | 2025 | Unknown | Unknown title |
| ref-161 | 2025 | Unknown | Unknown title |
| ref-162 | 2025 | Unknown | Unknown title |
| ref-163 | 2025 | Unknown | Unknown title |
| ref-164 | 2025 | Unknown | Unknown title |
| ref-165 | 2025 | Unknown | Unknown title |
| ref-166 | 2025 | Unknown | Unknown title |
| ref-167 | 2025 | Unknown | Unknown title |
| ref-168 | 2025 | Unknown | Unknown title |
| ref-169 | 2025 | Unknown | Unknown title |
| ref-170 | 2025 | Unknown | Unknown title |
| ref-171 | 2025 | Unknown | Unknown title |
| ref-172 | 2025 | Unknown | Unknown title |
| ref-173 | 2025 | Unknown | Unknown title |
| ref-174 | 2025 | Unknown | Unknown title |
| ref-175 | 2025 | Unknown | Unknown title |
| ref-176 | 2025 | Unknown | Unknown title |
| ref-177 | 2025 | Unknown | Unknown title |
| ref-178 | 2025 | Unknown | Unknown title |
| ref-179 | 2025 | Unknown | Unknown title |
| ref-180 | 2025 | Unknown | Unknown title |
| ref-181 | 2025 | Unknown | Unknown title |
| ref-182 | 2025 | Unknown | Unknown title |
| ref-183 | 2025 | Unknown | Unknown title |
| ref-184 | 2025 | Unknown | Unknown title |
| ref-185 | 2025 | Unknown | Unknown title |
| ref-186 | 2025 | Unknown | Unknown title |
| ref-187 | 2025 | Unknown | Unknown title |
| ref-188 | 2025 | Unknown | Unknown title |
| ref-189 | 2025 | Unknown | Unknown title |
| ref-190 | 2025 | Unknown | Unknown title |
| ref-191 | 2025 | Unknown | Unknown title |
| ref-192 | 2025 | Unknown | Unknown title |
| ref-193 | 2025 | Unknown | Unknown title |
| ref-194 | 2025 | Unknown | Unknown title |
| ref-195 | 2025 | Unknown | Unknown title |
| ref-196 | 2025 | Unknown | Unknown title |
| ref-197 | 2025 | Unknown | Unknown title |
| ref-198 | 2025 | Unknown | Unknown title |
| ref-199 | 2025 | Unknown | Unknown title |
| ref-200 | 2025 | Unknown | Unknown title |
| ref-201 | 2025 | Unknown | Unknown title |
| ref-202 | 2025 | Unknown | Unknown title |
| ref-203 | 2025 | Unknown | Unknown title |
| ref-204 | 2025 | Unknown | Unknown title |
| ref-205 | 2025 | Unknown | Unknown title |
| ref-206 | 2025 | Unknown | Unknown title |
| ref-207 | 2025 | Unknown | Unknown title |
| ref-208 | 2025 | Unknown | Unknown title |
| ref-209 | 2025 | Unknown | Unknown title |
| ref-210 | 2025 | Unknown | Unknown title |
| ref-211 | 2025 | Unknown | Unknown title |
| ref-212 | 2025 | Unknown | Unknown title |
| ref-213 | 2025 | Unknown | Unknown title |
| ref-214 | 2025 | Unknown | Unknown title |
| ref-215 | 2025 | Unknown | Unknown title |
| ref-216 | 2025 | Unknown | Unknown title |
| ref-217 | 2025 | Unknown | Unknown title |
| ref-218 | 2025 | Unknown | Unknown title |
| ref-219 | 2025 | Unknown | Unknown title |
| ref-220 | 2025 | Unknown | Unknown title |
| ref-221 | 2025 | Unknown | Unknown title |
| ref-222 | 2025 | Unknown | Unknown title |
| ref-223 | 2025 | Unknown | Unknown title |
| ref-224 | 2025 | Unknown | Unknown title |
| ref-225 | 2025 | Unknown | Unknown title |
| ref-226 | 2025 | Unknown | Unknown title |
| ref-227 | 2025 | Unknown | Unknown title |
| ref-228 | 2025 | Unknown | Unknown title |
| ref-229 | 2025 | Unknown | Unknown title |
| ref-230 | 2025 | Unknown | Unknown title |
| ref-231 | 2025 | Unknown | Unknown title |
| ref-232 | 2025 | Unknown | Unknown title |
| ref-233 | 2025 | Unknown | Unknown title |
| ref-234 | 2025 | Unknown | Unknown title |
| ref-235 | 2025 | Unknown | Unknown title |
| ref-236 | 2025 | Unknown | Unknown title |
| ref-237 | 2025 | Unknown | Unknown title |
| ref-238 | 2025 | Unknown | Unknown title |
| ref-239 | 2025 | Unknown | Unknown title |
| ref-240 | 2025 | Unknown | Unknown title |
| ref-241 | 2025 | Unknown | Unknown title |
| ref-242 | 2025 | Unknown | Unknown title |
| ref-243 | 2025 | Unknown | Unknown title |
| ref-244 | 2025 | Unknown | Unknown title |
| ref-245 | 2025 | Unknown | Unknown title |
| ref-246 | 2025 | Unknown | Unknown title |
| ref-247 | 2025 | Unknown | Unknown title |
| ref-248 | 2025 | Unknown | Unknown title |

## Citation Analysis Report

#### 总体总结
No citation analysis available



#### 范围
- 章节: Introduction + Related Work
- 行号: 13-105

#### 按功能归类


##### Background

- [1] Unknown, 2025
  - 标题: Unknown title
  - 关键词: [无]
  - 总结: No citation analysis available


# Per-Pixel Classification is Not All You Need for Semantic Segmentation (2021)

- Paper ref: 1:USRNFHXP
- Title: Per-Pixel Classification is Not All You Need for Semantic Segmentation
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2016 | COCO + Places Challenges | COCO + Places Challenges 2017 |
| ref-2 | 2014 | Pablo Arbeláez; Jordi Pont-Tuset; et al. | Multiscale combinatorial grouping |
| ref-3 | 2018 | Holger Caesar; Jasper Uijlings; et al. | COCO-Stuff: Thing and stuff classes in context |
| ref-4 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-to-end object detection with transformers |
| ref-5 | 2012 | Joao Carreira; Rui Caseiro; et al. | Semantic segmentation with second-order pooling |
| ref-6 | 2011 | Joao Carreira; Cristian Sminchisescu | CPMC: Automatic object segmentation using constrained parametric min-cuts |
| ref-7 | 2018 | Liang-Chieh Chen; George Papandreou; et al. | DeepLab: Semantic image segmentation with deep convolutional nets, atrous convolution, and fully connected CRFs |
| ref-8 | 2017 | Liang-Chieh Chen; George Papandreou; et al. | Rethinking atrous convolution for semantic image segmentation |
| ref-9 | 2018 | Liang-Chieh Chen; Yukun Zhu; et al. | Encoder-decoder with atrous separable convolution for semantic image segmentation |
| ref-10 | 2019 | Bowen Cheng; Liang-Chieh Chen; et al. | SPGNet: Semantic prediction guidance for scene parsing |
| ref-11 | 2020 | Bowen Cheng; Maxwell D Collins; et al. | Panoptic-DeepLab: A simple, strong, and fast baseline for bottom-up panoptic segmentation |
| ref-12 | 2017 | François Chollet | Xception: Deep learning with depthwise separable convolutions |
| ref-13 | 1997 | Dorin Comaniciu; Peter Meer | Robust Analysis of Feature Spaces: Color Image Segmentation |
| ref-14 | 2020 | MMSegmentation Contributors | MMSegmentation: OpenMMLab semantic segmentation toolbox and benchmark |
| ref-15 | 2016 | Marius Cordts; Mohamed Omran; et al. | The Cityscapes dataset for semantic urban scene understanding |
| ref-16 | 2015 | Jifeng Dai; Kaiming He; et al. | Convolutional feature masking for joint object and stuff segmentation |
| ref-17 | 2021 | Alexey Dosovitskiy; Lucas Beyer; et al. | An image is worth 16x16 words: Transformers for image recognition at scale |
| ref-18 | 2015 | Mark Everingham; SM Ali Eslami; et al. | The PASCAL visual object classes challenge: A retrospective |
| ref-19 | 2019 | Jun Fu; Jing Liu; et al. | Dual attention network for scene segmentation |
| ref-20 | 2014 | Bharath Hariharan; Pablo Arbeláez; et al. | Simultaneous detection and segmentation |
| ref-21 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask R-CNN |
| ref-22 | 2016 | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-23 | 2019 | Zilong Huang; Xinggang Wang; et al. | CCNet: Criss-cross attention for semantic segmentation |
| ref-24 | 2019 | Alexander Kirillov; Kaiming He; et al. | Panoptic segmentation |
| ref-25 | 2000 | Scott Konishi; Alan Yuille | Statistical Cues for Domain Specific Image Segmentation with Performance Analysis |
| ref-26 | 2017 | Tsung-Yi Lin; Piotr Dollár; et al. | Feature pyramid networks for object detection |
| ref-27 | 2017 | Tsung-Yi Lin; Priya Goyal; et al. | Focal loss for dense object detection |
| ref-28 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft COCO: Common objects in context |
| ref-29 | 2021 | Ze Liu; Yutong Lin; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-30 | 2015 | Jonathan Long; Evan Shelhamer; et al. | Fully convolutional networks for semantic segmentation |
| ref-31 | 2019 | Ilya Loshchilov; Frank Hutter | Decoupled weight decay regularization |
| ref-32 | 2018 | Ningning Ma; Xiangyu Zhang; et al. | ShuffleNet V2: Practical guidelines for efficient cnn architecture design |
| ref-33 | 2016 | Fausto Milletari; Nassir Navab; et al. | V-Net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-34 | 2017 | Gerhard Neuhold; Tobias Ollmann; et al. | The mapillary vistas dataset for semantic understanding of street scenes |
| ref-35 | 2015 | Olga Russakovsky; Jia Deng; et al. | Berg, and Li Fei-Fei |
| ref-36 | 2000 | Jianbo Shi; Jitendra Malik | Normalized Cuts and Image Segmentation |
| ref-37 | 2021 | Robin Strudel; Ricardo Garcia; et al. | Segmenter: Transformer for semantic segmentation |
| ref-38 | 2020 | Andrew Tao; Karan Sapra; et al. | Hierarchical multi-scale attention for semantic segmentation |
| ref-39 | 2020 | Zhi Tian; Chunhua Shen; et al. | Conditional convolutions for instance segmentation |
| ref-40 | 2013 | Jasper RR Uijlings; Koen EA Van De Sande; et al. | Selective search for object recognition |
| ref-41 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-42 | 2021 | Huiyu Wang; Yukun Zhu; et al. | MaX-DeepLab: End-to-end panoptic segmentation with mask transformers |
| ref-43 | 2018 | Xiaolong Wang; Ross Girshick; et al. | Non-local neural networks |
| ref-44 | 2020 | Xinlong Wang; Rufeng Zhang; et al. | SOLOv2: Dynamic and fast instance segmentation |
| ref-45 | 2018 | Yuxin Wu; Kaiming He | Group normalization |
| ref-46 | 2019 | Yuxin Wu; Alexander Kirillov; et al. | Detectron2 |
| ref-47 | 2020 | Yangxin Wu; Gengwei Zhang; et al. | Bidirectional graph reasoning network for panoptic segmentation |
| ref-48 | 2020 | Yangxin Wu; Gengwei Zhang; et al. | Auto-panoptic: Cooperative multi-component architecture search for panoptic segmentation |
| ref-49 | 2018 | Tete Xiao; Yingcheng Liu; et al. | Unified perceptual parsing for scene understanding |
| ref-50 | 2020 | Yuhui Yuan; Xilin Chen; et al. | Object-contextual representations for semantic segmentation |
| ref-51 | 2021 | Yuhui Yuan; Lang Huang; et al. | OCNet: Object context for semantic segmentation |
| ref-52 | 2017 | Hengshuang Zhao; Jianping Shi; et al. | Pyramid scene parsing network |
| ref-53 | 2021 | Sixiao Zheng; Jiachen Lu; et al. | Rethinking semantic segmentation from a sequence-to-sequence perspective with transformers |
| ref-54 | 2016 | Bolei Zhou; Hang Zhao; et al. | Scene parsing challenge 2016 |
| ref-55 | 2017 | Bolei Zhou; Hang Zhao; et al. | Scene parsing through ADE20K dataset |

## Citation Analysis Report

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


# Mask R-CNN (2017)

- Paper ref: 1:UVI9ULI2
- Title: Mask R-CNN
- Year: 2017

## Compact References

_No references artifact rows available._

## Citation Analysis Report

_No citation analysis report available._


# Does DINOv3 Set a New Medical Vision Standard? Benchmarking 2D and 3D Classification, Segmentation, and Registration (2026)

- Paper ref: 1:UW8ZLVA6
- Title: Does DINOv3 Set a New Medical Vision Standard? Benchmarking 2D and 3D Classification, Segmentation, and Registration
- Year: 2026

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2022 | OpenAI | Chatgpt |
| ref-2 | 2020 | J. Kaplan; S. McCandlish; et al. | Scaling laws for neural language models |
| ref-3 | 2022 | I. M. Alabdulmohsin; B. Neyshabur; et al. | Revisiting neural scaling laws in language and vision |
| ref-4 | 2023 | Z. Xie; Z. Zhang; et al. | On data scaling in masked image modeling |
| ref-5 | 2024 | A. El-Nouby; M. Klein; et al. | Scalable pre-training of large autoregressive image models |
| ref-6 | 2025 | J. Pan; B. Jian; et al. | Beyond benchmarks: Dynamic, automatic and systematic red-teaming agents for trustworthy medical language models |
| ref-7 | 2025 | J. Pan; C. Liu; et al. | Medvlm-r1: Incentivizing medical reasoning capability of vision-language models (vlms) via reinforcement learning |
| ref-8 | 2025 | D. Fan; S. Tong; et al. | Scaling language-free visual representation learning |
| ref-9 | 2023 | M. Oquab; T. Darcet; et al. | Dinov2: Learning robust visual features without supervision |
| ref-10 | 2021 | M. Caron; H. Touvron; et al. | Emerging properties in self-supervised vision transformers |
| ref-11 | 2025 | O. Siméoni; H. V. Vo; et al. | Dinov3 |
| ref-12 | 2025 | S. Yang; H. Wang; et al. | Segdino: An efficient design for medical and natural image segmentation with dino-v3 |
| ref-13 | 2025 | Y. Li; Y. Wu; et al. | Meddinov3: How to adapt vision foundation models for medical image segmentation? |
| ref-14 | 2017 | X. Wang; Y. Peng; et al. | Chestx-ray8: Hospital-scale chest x-ray database and benchmarks on weakly-supervised classification and localization of common thorax diseases |
| ref-15 | 2024 | M. Y. Lu; B. Chen; et al. | A visual-language foundation model for computational pathology |
| ref-16 | 2024 | I. E. Hamamci; S. Er; et al. | Developing generalist foundation models from a multimodal dataset for 3d computed tomography |
| ref-17 | 2023 | S. Zhang; Y. Xu; et al. | Largescale domain-specific pretraining for biomedical vision-language processing |
| ref-18 | 2018 | A. Stein; C. Wu; et al. | RSNA pneumonia detection challenge |
| ref-19 | 2022 | F. Wang; Y. Zhou; et al. | Multi-granularity cross-modal alignment for generalized medical visual representation learning |
| ref-20 | 2017 | B. E. Bejnordi; M. Veta; et al. | Diagnostic assessment of deep learning algorithms for detection of lymph node metastases in women with breast cancer |
| ref-21 | 2018 | P. Bandi; O. Geessink; et al. | From detection of individual metastases to classification of lymph node status at the patient level: the camelyon17 challenge |
| ref-22 | 2025 | L. Cai; S. Huang; et al. | Attrimil: Revisiting attention-based multiple instance learning for whole-slide pathological image classification from a perspective of instance attributes |
| ref-23 | 2021 | F. Xu; C. Zhu; et al. | Predicting axillary lymph node metastasis in early breast cancer using deep learning on primary tumor biopsy slides |
| ref-24 | 2021 | M. Y. Lu; D. F. Williamson; et al. | Data-efficient and weakly supervised computational pathology on whole-slide images |
| ref-25 | 2021 | P. H. Smedsrud; V. Thambawita; et al. | Kvasir-Capsule, a video capsule endoscopy dataset |
| ref-26 | 2022 | Z. Wang; B. Lu; et al. | Autolaparo: A new dataset of integrated multi-tasks for image-guided surgical automation in laparoscopic hysterectomy |
| ref-27 | 2019 | S. Leclerc; E. Smistad; et al. | Deep learning for segmentation using an open large-scale dataset in 2d echocardiography |
| ref-28 | 2020 | M. Allan; S. Kondo; et al. | 2018 robotic scene segmentation challenge |
| ref-29 | 2020 | C. González; L. Bravo-Sánchez; et al. | Isinet: an instance-based approach for surgical instrument segmentation |
| ref-30 | 2020 | S. Ali; B. Braden; et al. | Endoscopy disease detection and segmentation (edd2020) |
| ref-31 | 2025 | G. Müller-Franzes; F. Khader; et al. | Medical slice transformer for improved diagnosis and explainability on 3d medical images with dinov2 |
| ref-32 | 2022 | M. Antonelli; A. Reinke; et al. | The medical segmentation decathlon |
| ref-33 | 2024 | L. Wu; J. Zhuang; et al. | Voco: A simple-yet-effective volume contrastive learning framework for 3d medical image analysis |
| ref-34 | 2016 | CREMI | Miccai challenge on circuit reconstruction from electron microscopy images |
| ref-35 | 2015 | N. Kasthuri; K. J. Hayworth; et al. | Saturated reconstruction of a volume of neocortex |
| ref-36 | 2022 | K. T. Gatidis S | A whole-body fdg-pet/ct dataset with manually annotated tumor lesions (fdg-pet-ct-lesions) |
| ref-37 | 2022 | V. Oreiller; V. Andrearczyk; et al. | Head and neck tumor segmentation in pet/ct: the hecktor challenge |
| ref-38 | 2018 | O. Bernard; A. Lalande; et al. | Deep learning techniques for automatic mri cardiac multi-structures segmentation and diagnosis: Is the problem solved? |
| ref-39 | 2018 | M. Ilse; J. Tomczak; et al. | Attention-based deep multiple instance learning |
| ref-40 | 2018 | J. Funke; F. Tschopp; et al. | Large scale image segmentation with structured loss based deep learning for connectome reconstruction |
| ref-41 | 2024 | X. Song; X. Xu; et al. | Dino-reg: General purpose image encoder for training-free multi-modal deformable medical image registration |
| ref-42 | 2013 | J. Nunez-Iglesias; R. Kennedy; et al. | Machine learning of hierarchical clustering to segment 2d and 3d images |
| ref-43 | 2015 | I. Arganda-Carreras; S. C. Turaga; et al. | Crowdsourcing the creation of image segmentation algorithms for connectomics |
| ref-44 | 2024 | R. J. Chen; T. Ding; et al. | Towards a general-purpose foundation model for computational pathology |
| ref-45 | 2016 | K. He; X. Zhang; et al. | Deep residual learning for image recognition |
| ref-46 | 2025 | J. Joseph; S. N. George; et al. | Vapcaps: A novel variance-based attention network with imbalance aware loss for better pathology detection in video capsule endoscopy |
| ref-47 | 2026 | Y. Li; G. Zhao; et al. | Stsanet: Spatial temporal-self-aggregation network for surgical phase recognition |
| ref-48 | 2022 | A. Srivastava; S. Chanda; et al. | Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation |
| ref-49 | 2022 | A. Trockman; J. Kolter | Patches are all you need? |
| ref-50 | 2022 | S. d’Ascoli; H. Touvron; et al. | Convit: Improving vision transformers with soft convolutional inductive biases |
| ref-51 | 2022 | X. Dong; J. Bao; et al. | Cswin transformer: A general vision transformer backbone with cross-shaped windows |
| ref-52 | 2022 | A. Srivastava; N. Tomar; et al. | Video capsule endoscopy classification using focal modulation guided convolutional neural network |
| ref-53 | 2021 | A. Vats; M. Pedersen; et al. | Learning more for free - a multi task learning approach for improved pathology classification in capsule endoscopy |
| ref-54 | 2021 | O. Yet; T. Rassem; et al. | Improved attentive pairwise interaction (api-net) for finegrained image classification |
| ref-55 | 2018 | Y. Jin; Q. Dou; et al. | Sv-rcnet: Workflow recognition from surgical videos using recurrent convolutional network |
| ref-56 | 2021 | Y. Jin; Y. Long; et al. | Temporal memory relation network for workflow recognition from surgical video |
| ref-57 | 2021 | X. Gao; Y. Jin; et al. | Trans-svnet: Accurate phase recognition from surgical videos via hybrid embedding aggregation transformer |
| ref-58 | 2025 | Y. Liu; M. Boels; et al. | Lovit: Long video transformer for surgical phase recognition |
| ref-59 | 2024 | J. Yu; A. Wang; et al. | Sam 2 in robotic surgery: An empirical evaluation for robustness and generalization in surgical video segmentation |
| ref-60 | 2015 | O. Ronneberger; P. Fischer; et al. | U-net: Convolutional networks for biomedical image segmentation |
| ref-61 | 2018 | A. A. Shvets; A. Rakhlin; et al. | Automatic instrument segmentation in robotassisted surgery using deep learning |
| ref-62 | 2019 | Y. Jin; K. Cheng; et al. | Incorporating temporal prior from motion flow for instrument segmentation in minimally invasive surgery video |
| ref-63 | 2022 | A. Wang; M. Islam; et al. | Rethinking surgical instrument segmentation: A background image can be all you need |
| ref-64 | 2021 | M. Islam; V. Vibashan; et al. | St-mtl: Spatio-temporal multitask learning model to predict scanpath while tracking instruments in robotic surgery |
| ref-65 | 2020 | M. Islam; V. Vibashan; et al. | Ap-mtl: Attention pruned multi-task learning model for real-time instrument detection and segmentation in robot-assisted surgery |
| ref-66 | 2022 | L. Seenivasan; S. Mitheran; et al. | Global-reasoned multi-task learning model for surgical scene understanding |
| ref-67 | 2022 | Z. Zhao; Y. Jin; et al. | Trasetr: track-to-segment transformer with contrastive query for instance-level instrument segmentation in robotic surgery |
| ref-68 | 2023 | B. Baby; D. Thapar; et al. | From forks to forceps: A new framework for instance segmentation of surgical instruments |
| ref-69 | 2023 | A. Kirillov; E. Mintun; et al. | Segment anything |
| ref-70 | 2024 | N. Ravi; V. Gabeur; et al. | Sam 2: Segment anything in images and videos |
| ref-71 | 2021 | J. Chen; Y. Lu; et al. | Transunet: Transformers make strong encoders for medical image segmentation |
| ref-72 | 2021 | C.-H. Huang; H.-Y. Wu; et al. | Hardnet-mseg: A simple encoder-decoder polyp segmentation neural network that achieves over 0.9 mean dice and 86 fps |
| ref-73 | 2022 | A. Hatamizadeh; V. Nath; et al. | Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images |
| ref-74 | 2023 | Q. Chang; D. Ahmad; et al. | Esfpnet: efficient deep learning architecture for real-time lesion segmentation in autofluorescence bronchoscopic video |
| ref-75 | 2022 | F. Tang; Q. Huang; et al. | Duat: Dual-aggregation transformer network for medical image segmentation |
| ref-76 | 2022 | E. Sanderson; B. J. Matuszewski | Fcn-transformer feature fusion for polyp segmentation |
| ref-77 | 2022 | A. Srivastava; D. Jha; et al. | Msrf-net: A multi-scale residual fusion network for biomedical image segmentation |
| ref-78 | 2021 | A. Srivastava; S. Chanda; et al. | Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation |
| ref-79 | 2023 | D. Bo; W. Wenhai; et al. | Polyp-pvt: Polyp segmentation with pyramidvision transformers |
| ref-80 | 2022 | G.-P. Ji; G. Xiao; et al. | Video polyp segmentation: A deep learning perspective |
| ref-81 | 2025 | Y. Pang; Y. Long; et al. | Endoscopic adaptive transformer for enhanced polyp segmentation in endoscopic imaging |
| ref-82 | 2024 | I. E. Hamamci; S. Er; et al. | Developing generalist foundation models from a multimodal dataset for 3d computed tomography |
| ref-83 | 2021 | R. L. Draelos; D. Dov; et al. | Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes |
| ref-84 | 2021 | F. Isensee; P. F. Jaeger; et al. | nnu-net: a self-configuring method for deep learning-based biomedical image segmentation |
| ref-85 | 2016 | Ö. Çiçek; A. Abdulkadir; et al. | 3d u-net: learning dense volumetric segmentation from sparse annotation |
| ref-86 | 2016 | F. Milletari; N. Navab; et al. | V-net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-87 | 2022 | A. Hatamizadeh; Y. Tang; et al. | Unetr: transformers for 3d medical image segmentation |
| ref-88 | 2022 | K. He; X. Chen; et al. | Masked autoencoders are scalable vision learners |
| ref-89 | 2020 | T. Chen; S. Kornblith; et al. | A simple framework for contrastive learning of visual representations |
| ref-90 | 2021 | X. Chen; S. Xie; et al. | An empirical study of training self-supervised vision transformers |
| ref-91 | 2020 | M. Caron; I. Misra; et al. | Unsupervised learning of visual features by contrasting cluster assignments |
| ref-92 | 2020 | J.-B. Grill; F. Strub; et al. | Bootstrap your own latent: A new approach to self-supervised learning |
| ref-93 | 2016 | Ö. Çiçek; A. Abdulkadir; et al. | 3d u-net: learning dense volumetric segmentation from sparse annotation |
| ref-94 | 2016 | F. Milletari; N. Navab; et al. | V-net: Fully convolutional neural networks for volumetric medical image segmentation |
| ref-95 | 2017 | K. Lee; J. Zung; et al. | Superhuman accuracy on the snemi3d connectomics challenge |
| ref-96 | 2022 | W. Huang; S. Deng; et al. | Learning to model pixel-embedded affinity for homogeneous instance segmentation |
| ref-97 | 2023 | R. Sun; N. Luo; et al. | Appearance prompt vision transformer for connectome reconstruction |
| ref-98 | 2023 | A. Sheridan; T. M. Nguyen; et al. | Local shape descriptors for neuron segmentation |
| ref-99 | 2024 | X. Liu; M. Cai; et al. | Cross-dimension affinity distillation for 3d em neuron segmentation |
| ref-100 | 2021 | Y. Tang; D. Yang; et al. | Self-supervised pre-training of swin transformers for 3d medical image analysis |
| ref-101 | 2024 | T. Liu; Q. Bai; et al. | Vsmtrans: A hybrid paradigm integrating self-attention and convolution for 3d medical image segmentation |
| ref-102 | 2024 | A. M. Shaker; M. Maaz; et al. | Unetr++: delving into efficient and accurate 3d medical image segmentation |
| ref-103 | 2025 | C. Li | U-kan makes strong backbone for medical image segmentation and generation |
| ref-104 | 2022 | Z. Xing; L. Yu; et al. | Nestedformer: Nested modality-aware transformer for brain tumor segmentation |
| ref-105 | 2023 | Z. Wang; Y. Hong | A2fseg: Adaptive multi-modal fusion network for medical image segmentation |
| ref-106 | 2023 | J. Shi | H-denseformer: An efficient hybrid densely connected transformer for multimodal tumor segmentation |
| ref-107 | 2019 | G. Balakrishnan; A. Zhao; et al. | Voxelmorph: a learning framework for deformable medical image registration |
| ref-108 | 2021 | H. Siebert; L. Hansen; et al. | Fast 3d registration with accurate optimisation and little learning for learn2reg 2021 |
| ref-109 | 2024 | N. Dey; B. Billot; et al. | Learning general-purpose biomedical volume representations using randomized synthesis |
| ref-110 | 2025 | D. Bolya; P.-Y. Huang; et al. | Perception encoder: The best visual embeddings are not at the output of the network |
| ref-111 | 2022 | E. J. Hu; Y. Shen; et al. | Lora: Low-rank adaptation of large language models |
| ref-112 | 2024 | J. Ma; Y. He; et al. | Segment anything in medical images |
| ref-113 | 2025 | Y. Zhang; P. Hager; et al. | Towards cardiac mri foundation models: Comprehensive visual-tabular representations for whole-heart assessment and beyond |
| ref-114 | 2024 | Y. Zhang; C. Chen; et al. | Whole heart 3d+ t representation learning through sparse 2d cardiac mr images |
| ref-115 | 2025 | B. Jian; J. Pan; et al. | Timeflow: Longitudinal brain image registration and aging progression analysis |
| ref-116 | 2025 | N. Bubeck; S. Shit; et al. | Latent interpolation learning using diffusion models for cardiac volume reconstruction |

## Citation Analysis Report

#### 总体总结
本文的引文组织遵循清晰的研究叙事：先从早期自监督学习与缩放规律出发建立技术背景（[1][2][9][10]），再将直接集合预测与基于后处理的医学检测/分割路线并置比较（[84][60][85][86][69][70]），最后借DINOv3[11]及其近期医学适配探索（[12][13]）把本文的多模态评测方法路线明确出来。整个引文网络横跨7种医学模态、14个数据集，覆盖分类、分割、配准三大任务，展现出从通用视觉基础模型到医学专用方法的张力与互补。


#### 关键文献

- [2] J. Kaplan, 2020: Scaling laws for neural language models (Historical)

- [10] M. Caron, 2021: Emerging properties in self-supervised vision transformers (Historical)

- [11] O. Siméoni, 2025: Dinov3 (Background)

- [12] S. Yang, 2025: Segdino: An efficient design for medical and natural image segmentation with dino-v3 (Background)

- [13] Y. Li, 2025: Meddinov3: How to adapt vision foundation models for medical image segmentation? (Background)

- [14] X. Wang, 2017: Chestx-ray8: Hospital-scale chest x-ray database and benchmarks on weakly-supervised classification and localization of common thorax diseases (Dataset)

- [18] A. Stein, 2018: RSNA pneumonia detection challenge (Dataset)

- [85] Ö. Çiçek, 2016: 3d u-net: learning dense volumetric segmentation from sparse annotation (Background)

- [83] R. L. Draelos, 2021: Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes (Background)



#### 范围
- 章节: Motivation + Benchmark Setup + Task Adaptation + Experiments + Findings
- 行号: 18-328

#### 按功能归类


##### Historical

- [1] OpenAI, 2022
  - 标题: Chatgpt
  - 关键词: LLM, foundation model, self-supervised
  - 总结: 原文引用Chatgpt以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [2] J. Kaplan, 2020
  - 标题: Scaling laws for neural language models
  - 关键词: scaling laws, neural language, foundation model
  - 总结: 原文引用Scaling laws for neural language models以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [3] I. M. Alabdulmohsin, 2022
  - 标题: Revisiting neural scaling laws in language and vision
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Revisiting neural scaling laws in language and vision以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [9] M. Oquab, 2023
  - 标题: Dinov2: Learning robust visual features without supervision
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Dinov2: Learning robust visual features without supervision以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [10] M. Caron, 2021
  - 标题: Emerging properties in self-supervised vision transformers
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Emerging properties in self-supervised vision transformers以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [31] G. Müller-Franzes, 2025
  - 标题: Medical slice transformer for improved diagnosis and explainability on 3d medical images with dinov2
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Medical slice transformer for improved diagnosis and explainability on 3d medical images with dinov2以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [33] L. Wu, 2024
  - 标题: Voco: A simple-yet-effective volume contrastive learning framework for 3d medical image analysis
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Voco: A simple-yet-effective volume contrastive learning framework for 3d medical image analysis以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [67] Z. Zhao, 2022
  - 标题: Trasetr: track-to-segment transformer with contrastive query for instance-level instrument segmentation in robotic surgery
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Trasetr: track-to-segment transformer with contrastive query for instance-level instrument segmentation in robotic surgery以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [88] K. He, 2022
  - 标题: Masked autoencoders are scalable vision learners
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Masked autoencoders are scalable vision learners以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [89] T. Chen, 2020
  - 标题: A simple framework for contrastive learning of visual representations
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用A simple framework for contrastive learning of visual representations以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [90] X. Chen, 2021
  - 标题: An empirical study of training self-supervised vision transformers
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用An empirical study of training self-supervised vision transformers以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [92] J.-B. Grill, 2020
  - 标题: Bootstrap your own latent: A new approach to self-supervised learning
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Bootstrap your own latent: A new approach to self-supervised learning以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。

- [100] Y. Tang, 2021
  - 标题: Self-supervised pre-training of swin transformers for 3d medical image analysis
  - 关键词: self-supervised, visual representation, pre-training
  - 总结: 原文引用Self-supervised pre-training of swin transformers for 3d medical image analysis以追溯当前方法的技术谱系，为DINOv3的自监督视觉表征能力提供历史参照。



##### Background

- [4] Z. Xie, 2023
  - 标题: On data scaling in masked image modeling
  - 关键词: scaling, pre-training
  - 总结: 原文引用On data scaling in masked image modeling以支撑关于On data scaling in masked image modeling 缩放规律的技术论证和背景说明。

- [5] A. El-Nouby, 2024
  - 标题: Scalable pre-training of large autoregressive image models
  - 关键词: scalable, pre-training
  - 总结: 原文引用Scalable pre-training of large autoregressive image models以支撑关于Scalable pre-training of large autoregressive image models的技术论证和背景说明。

- [6] J. Pan, 2025
  - 标题: Beyond benchmarks: Dynamic, automatic and systematic red-teaming agents for trustworthy medical language models
  - 关键词: medical, foundation model
  - 总结: 原文引用Beyond benchmarks: Dynamic, automatic and systematic red-teaming agents for trustworthy medical language models以支撑关于Beyond benchmarks: Dynamic, automatic and systematic red-teaming agents for trustworthy medical language models 医学视觉背景的技术论证和背景说明。

- [7] J. Pan, 2025
  - 标题: Medvlm-r1: Incentivizing medical reasoning capability of vision-language models (vlms) via reinforcement learning
  - 关键词: medical, foundation model
  - 总结: 原文引用Medvlm-r1: Incentivizing medical reasoning capability of vision-language models (vlms) via reinforcement learning以支撑关于Medvlm-r1: Incentivizing medical reasoning capability of vision-language models (vlms) via reinforcement learning 医学视觉背景的技术论证和背景说明。

- [8] D. Fan, 2025
  - 标题: Scaling language-free visual representation learning
  - 关键词: scaling, pre-training
  - 总结: 原文引用Scaling language-free visual representation learning以支撑关于Scaling language-free visual representation learning 缩放规律的技术论证和背景说明。

- [11] O. Siméoni, 2025
  - 标题: Dinov3
  - 关键词: DINOv3, self-supervised, vision foundation model, ViT
  - 总结: 原文引用Dinov3以支撑关于DINOv3 自监督视觉基础模型的技术论证和背景说明。

- [12] S. Yang, 2025
  - 标题: Segdino: An efficient design for medical and natural image segmentation with dino-v3
  - 关键词: DINOv3, medical, adaptation
  - 总结: 原文引用Segdino: An efficient design for medical and natural image segmentation with dino-v3以支撑关于Segdino: An efficient design for medical and natural image segmentation with dino-v3 DINOv3医学适配工作的技术论证和背景说明。

- [13] Y. Li, 2025
  - 标题: Meddinov3: How to adapt vision foundation models for medical image segmentation?
  - 关键词: DINOv3, medical, adaptation
  - 总结: 原文引用Meddinov3: How to adapt vision foundation models for medical image segmentation?以支撑关于Meddinov3: How to adapt vision foundation models for medical image segmentation? DINOv3医学适配工作的技术论证和背景说明。

- [15] M. Y. Lu, 2024
  - 标题: A visual-language foundation model for computational pathology
  - 关键词: medical, foundation model
  - 总结: 原文引用A visual-language foundation model for computational pathology以支撑关于A visual-language foundation model for computational pathology 医学视觉背景的技术论证和背景说明。

- [17] S. Zhang, 2023
  - 标题: Largescale domain-specific pretraining for biomedical vision-language processing
  - 关键词: medical, foundation model
  - 总结: 原文引用Largescale domain-specific pretraining for biomedical vision-language processing以支撑关于Largescale domain-specific pretraining for biomedical vision-language processing 医学视觉背景的技术论证和背景说明。

- [19] F. Wang, 2022
  - 标题: Multi-granularity cross-modal alignment for generalized medical visual representation learning
  - 关键词: medical, foundation model
  - 总结: 原文引用Multi-granularity cross-modal alignment for generalized medical visual representation learning以支撑关于Multi-granularity cross-modal alignment for generalized medical visual representation learning 医学视觉背景的技术论证和背景说明。

- [20] B. E. Bejnordi, 2017
  - 标题: Diagnostic assessment of deep learning algorithms for detection of lymph node metastases in women with breast cancer
  - 关键词: diagnostic, assessment
  - 总结: 原文引用Diagnostic assessment of deep learning algorithms for detection of lymph node metastases in women with breast cancer以支撑关于Diagnostic assessment of deep learning algorithms for detection of lymph node metastases in women with breast cancer的技术论证和背景说明。

- [23] F. Xu, 2021
  - 标题: Predicting axillary lymph node metastasis in early breast cancer using deep learning on primary tumor biopsy slides
  - 关键词: predicting, axillary, lymph
  - 总结: 原文引用Predicting axillary lymph node metastasis in early breast cancer using deep learning on primary tumor biopsy slides以支撑关于Predicting axillary lymph node metastasis in early breast cancer using deep learning on primary tumor biopsy slides的技术论证和背景说明。

- [24] M. Y. Lu, 2021
  - 标题: Data-efficient and weakly supervised computational pathology on whole-slide images
  - 关键词: medical, foundation model
  - 总结: 原文引用Data-efficient and weakly supervised computational pathology on whole-slide images以支撑关于Data-efficient and weakly supervised computational pathology on whole-slide images 医学视觉背景的技术论证和背景说明。

- [29] C. González, 2020
  - 标题: Isinet: an instance-based approach for surgical instrument segmentation
  - 关键词: isinet:, instance-based
  - 总结: 原文引用Isinet: an instance-based approach for surgical instrument segmentation以支撑关于Isinet: an instance-based approach for surgical instrument segmentation的技术论证和背景说明。

- [30] S. Ali, 2020
  - 标题: Endoscopy disease detection and segmentation (edd2020)
  - 关键词: endoscopy, disease, detection
  - 总结: 原文引用Endoscopy disease detection and segmentation (edd2020)以支撑关于Endoscopy disease detection and segmentation (edd2020)的技术论证和背景说明。

- [32] M. Antonelli, 2022
  - 标题: The medical segmentation decathlon
  - 关键词: medical, foundation model
  - 总结: 原文引用The medical segmentation decathlon以支撑关于The medical segmentation decathlon 医学视觉背景的技术论证和背景说明。

- [35] N. Kasthuri, 2015
  - 标题: Saturated reconstruction of a volume of neocortex
  - 关键词: saturated, reconstruction
  - 总结: 原文引用Saturated reconstruction of a volume of neocortex以支撑关于Saturated reconstruction of a volume of neocortex的技术论证和背景说明。

- [38] O. Bernard, 2018
  - 标题: Deep learning techniques for automatic mri cardiac multi-structures segmentation and diagnosis: Is the problem solved?
  - 关键词: deep, learning, techniques
  - 总结: 原文引用Deep learning techniques for automatic mri cardiac multi-structures segmentation and diagnosis: Is the problem solved?以支撑关于Deep learning techniques for automatic mri cardiac multi-structures segmentation and diagnosis: Is the problem solved?的技术论证和背景说明。

- [40] J. Funke, 2018
  - 标题: Large scale image segmentation with structured loss based deep learning for connectome reconstruction
  - 关键词: large, scale, image
  - 总结: 原文引用Large scale image segmentation with structured loss based deep learning for connectome reconstruction以支撑关于Large scale image segmentation with structured loss based deep learning for connectome reconstruction的技术论证和背景说明。

- [42] J. Nunez-Iglesias, 2013
  - 标题: Machine learning of hierarchical clustering to segment 2d and 3d images
  - 关键词: machine, learning
  - 总结: 原文引用Machine learning of hierarchical clustering to segment 2d and 3d images以支撑关于Machine learning of hierarchical clustering to segment 2d and 3d images的技术论证和背景说明。

- [43] I. Arganda-Carreras, 2015
  - 标题: Crowdsourcing the creation of image segmentation algorithms for connectomics
  - 关键词: crowdsourcing, creation
  - 总结: 原文引用Crowdsourcing the creation of image segmentation algorithms for connectomics以支撑关于Crowdsourcing the creation of image segmentation algorithms for connectomics的技术论证和背景说明。

- [44] R. J. Chen, 2024
  - 标题: Towards a general-purpose foundation model for computational pathology
  - 关键词: medical, foundation model
  - 总结: 原文引用Towards a general-purpose foundation model for computational pathology以支撑关于Towards a general-purpose foundation model for computational pathology 医学视觉背景的技术论证和背景说明。

- [45] K. He, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: deep, residual, learning
  - 总结: 原文引用Deep residual learning for image recognition以支撑关于Deep residual learning for image recognition的技术论证和背景说明。

- [47] Y. Li, 2026
  - 标题: Stsanet: Spatial temporal-self-aggregation network for surgical phase recognition
  - 关键词: stsanet:, spatial, temporal-self-aggregation
  - 总结: 原文引用Stsanet: Spatial temporal-self-aggregation network for surgical phase recognition以支撑关于Stsanet: Spatial temporal-self-aggregation network for surgical phase recognition的技术论证和背景说明。

- [48] A. Srivastava, 2022
  - 标题: Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation
  - 关键词: gmsrf-net:, improved
  - 总结: 原文引用Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation以支撑关于Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation的技术论证和背景说明。

- [49] A. Trockman, 2022
  - 标题: Patches are all you need?
  - 关键词: patches
  - 总结: 原文引用Patches are all you need?以支撑关于Patches are all you need?的技术论证和背景说明。

- [50] S. d’Ascoli, 2022
  - 标题: Convit: Improving vision transformers with soft convolutional inductive biases
  - 关键词: convit:, improving, vision
  - 总结: 原文引用Convit: Improving vision transformers with soft convolutional inductive biases以支撑关于Convit: Improving vision transformers with soft convolutional inductive biases的技术论证和背景说明。

- [51] X. Dong, 2022
  - 标题: Cswin transformer: A general vision transformer backbone with cross-shaped windows
  - 关键词: cswin, transformer:
  - 总结: 原文引用Cswin transformer: A general vision transformer backbone with cross-shaped windows以支撑关于Cswin transformer: A general vision transformer backbone with cross-shaped windows的技术论证和背景说明。

- [52] A. Srivastava, 2022
  - 标题: Video capsule endoscopy classification using focal modulation guided convolutional neural network
  - 关键词: video, capsule, endoscopy
  - 总结: 原文引用Video capsule endoscopy classification using focal modulation guided convolutional neural network以支撑关于Video capsule endoscopy classification using focal modulation guided convolutional neural network的技术论证和背景说明。

- [53] A. Vats, 2021
  - 标题: Learning more for free - a multi task learning approach for improved pathology classification in capsule endoscopy
  - 关键词: medical, foundation model
  - 总结: 原文引用Learning more for free - a multi task learning approach for improved pathology classification in capsule endoscopy以支撑关于Learning more for free - a multi task learning approach for improved pathology classification in capsule endoscopy 医学视觉背景的技术论证和背景说明。

- [54] O. Yet, 2021
  - 标题: Improved attentive pairwise interaction (api-net) for finegrained image classification
  - 关键词: improved, attentive, pairwise
  - 总结: 原文引用Improved attentive pairwise interaction (api-net) for finegrained image classification以支撑关于Improved attentive pairwise interaction (api-net) for finegrained image classification的技术论证和背景说明。

- [55] Y. Jin, 2018
  - 标题: Sv-rcnet: Workflow recognition from surgical videos using recurrent convolutional network
  - 关键词: sv-rcnet:, workflow, recognition
  - 总结: 原文引用Sv-rcnet: Workflow recognition from surgical videos using recurrent convolutional network以支撑关于Sv-rcnet: Workflow recognition from surgical videos using recurrent convolutional network的技术论证和背景说明。

- [56] Y. Jin, 2021
  - 标题: Temporal memory relation network for workflow recognition from surgical video
  - 关键词: temporal, memory, relation
  - 总结: 原文引用Temporal memory relation network for workflow recognition from surgical video以支撑关于Temporal memory relation network for workflow recognition from surgical video的技术论证和背景说明。

- [57] X. Gao, 2021
  - 标题: Trans-svnet: Accurate phase recognition from surgical videos via hybrid embedding aggregation transformer
  - 关键词: trans-svnet:, accurate, phase
  - 总结: 原文引用Trans-svnet: Accurate phase recognition from surgical videos via hybrid embedding aggregation transformer以支撑关于Trans-svnet: Accurate phase recognition from surgical videos via hybrid embedding aggregation transformer的技术论证和背景说明。

- [58] Y. Liu, 2025
  - 标题: Lovit: Long video transformer for surgical phase recognition
  - 关键词: lovit:, long, video
  - 总结: 原文引用Lovit: Long video transformer for surgical phase recognition以支撑关于Lovit: Long video transformer for surgical phase recognition的技术论证和背景说明。

- [60] O. Ronneberger, 2015
  - 标题: U-net: Convolutional networks for biomedical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用U-net: Convolutional networks for biomedical image segmentation以支撑关于U-net: Convolutional networks for biomedical image segmentation 医学视觉背景的技术论证和背景说明。

- [61] A. A. Shvets, 2018
  - 标题: Automatic instrument segmentation in robotassisted surgery using deep learning
  - 关键词: automatic, instrument, segmentation
  - 总结: 原文引用Automatic instrument segmentation in robotassisted surgery using deep learning以支撑关于Automatic instrument segmentation in robotassisted surgery using deep learning的技术论证和背景说明。

- [62] Y. Jin, 2019
  - 标题: Incorporating temporal prior from motion flow for instrument segmentation in minimally invasive surgery video
  - 关键词: incorporating, temporal, prior
  - 总结: 原文引用Incorporating temporal prior from motion flow for instrument segmentation in minimally invasive surgery video以支撑关于Incorporating temporal prior from motion flow for instrument segmentation in minimally invasive surgery video的技术论证和背景说明。

- [63] A. Wang, 2022
  - 标题: Rethinking surgical instrument segmentation: A background image can be all you need
  - 关键词: rethinking, surgical, instrument
  - 总结: 原文引用Rethinking surgical instrument segmentation: A background image can be all you need以支撑关于Rethinking surgical instrument segmentation: A background image can be all you need的技术论证和背景说明。

- [64] M. Islam, 2021
  - 标题: St-mtl: Spatio-temporal multitask learning model to predict scanpath while tracking instruments in robotic surgery
  - 关键词: st-mtl:, spatio-temporal, multitask
  - 总结: 原文引用St-mtl: Spatio-temporal multitask learning model to predict scanpath while tracking instruments in robotic surgery以支撑关于St-mtl: Spatio-temporal multitask learning model to predict scanpath while tracking instruments in robotic surgery的技术论证和背景说明。

- [65] M. Islam, 2020
  - 标题: Ap-mtl: Attention pruned multi-task learning model for real-time instrument detection and segmentation in robot-assisted surgery
  - 关键词: ap-mtl:, attention, pruned
  - 总结: 原文引用Ap-mtl: Attention pruned multi-task learning model for real-time instrument detection and segmentation in robot-assisted surgery以支撑关于Ap-mtl: Attention pruned multi-task learning model for real-time instrument detection and segmentation in robot-assisted surgery的技术论证和背景说明。

- [66] L. Seenivasan, 2022
  - 标题: Global-reasoned multi-task learning model for surgical scene understanding
  - 关键词: global-reasoned, multi-task, learning
  - 总结: 原文引用Global-reasoned multi-task learning model for surgical scene understanding以支撑关于Global-reasoned multi-task learning model for surgical scene understanding的技术论证和背景说明。

- [68] B. Baby, 2023
  - 标题: From forks to forceps: A new framework for instance segmentation of surgical instruments
  - 关键词: from, forks
  - 总结: 原文引用From forks to forceps: A new framework for instance segmentation of surgical instruments以支撑关于From forks to forceps: A new framework for instance segmentation of surgical instruments的技术论证和背景说明。

- [72] C.-H. Huang, 2021
  - 标题: Hardnet-mseg: A simple encoder-decoder polyp segmentation neural network that achieves over 0.9 mean dice and 86 fps
  - 关键词: hardnet-mseg:, simple
  - 总结: 原文引用Hardnet-mseg: A simple encoder-decoder polyp segmentation neural network that achieves over 0.9 mean dice and 86 fps以支撑关于Hardnet-mseg: A simple encoder-decoder polyp segmentation neural network that achieves over 0.9 mean dice and 86 fps的技术论证和背景说明。

- [74] Q. Chang, 2023
  - 标题: Esfpnet: efficient deep learning architecture for real-time lesion segmentation in autofluorescence bronchoscopic video
  - 关键词: esfpnet:, efficient, deep
  - 总结: 原文引用Esfpnet: efficient deep learning architecture for real-time lesion segmentation in autofluorescence bronchoscopic video以支撑关于Esfpnet: efficient deep learning architecture for real-time lesion segmentation in autofluorescence bronchoscopic video的技术论证和背景说明。

- [75] F. Tang, 2022
  - 标题: Duat: Dual-aggregation transformer network for medical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用Duat: Dual-aggregation transformer network for medical image segmentation以支撑关于Duat: Dual-aggregation transformer network for medical image segmentation 医学视觉背景的技术论证和背景说明。

- [76] E. Sanderson, 2022
  - 标题: Fcn-transformer feature fusion for polyp segmentation
  - 关键词: fcn-transformer, feature, fusion
  - 总结: 原文引用Fcn-transformer feature fusion for polyp segmentation以支撑关于Fcn-transformer feature fusion for polyp segmentation的技术论证和背景说明。

- [77] A. Srivastava, 2022
  - 标题: Msrf-net: A multi-scale residual fusion network for biomedical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用Msrf-net: A multi-scale residual fusion network for biomedical image segmentation以支撑关于Msrf-net: A multi-scale residual fusion network for biomedical image segmentation 医学视觉背景的技术论证和背景说明。

- [78] A. Srivastava, 2021
  - 标题: Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation
  - 关键词: gmsrf-net:, improved
  - 总结: 原文引用Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation以支撑关于Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation的技术论证和背景说明。

- [79] D. Bo, 2023
  - 标题: Polyp-pvt: Polyp segmentation with pyramidvision transformers
  - 关键词: polyp-pvt:, polyp, segmentation
  - 总结: 原文引用Polyp-pvt: Polyp segmentation with pyramidvision transformers以支撑关于Polyp-pvt: Polyp segmentation with pyramidvision transformers的技术论证和背景说明。

- [80] G.-P. Ji, 2022
  - 标题: Video polyp segmentation: A deep learning perspective
  - 关键词: video, polyp, segmentation:
  - 总结: 原文引用Video polyp segmentation: A deep learning perspective以支撑关于Video polyp segmentation: A deep learning perspective的技术论证和背景说明。

- [81] Y. Pang, 2025
  - 标题: Endoscopic adaptive transformer for enhanced polyp segmentation in endoscopic imaging
  - 关键词: endoscopic, adaptive, transformer
  - 总结: 原文引用Endoscopic adaptive transformer for enhanced polyp segmentation in endoscopic imaging以支撑关于Endoscopic adaptive transformer for enhanced polyp segmentation in endoscopic imaging的技术论证和背景说明。

- [83] R. L. Draelos, 2021
  - 标题: Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes
  - 关键词: machine-learning-based, multiple, abnormality
  - 总结: 原文引用Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes以支撑关于Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes的技术论证和背景说明。

- [85] Ö. Çiçek, 2016
  - 标题: 3d u-net: learning dense volumetric segmentation from sparse annotation
  - 关键词: u-net:, learning
  - 总结: 原文引用3d u-net: learning dense volumetric segmentation from sparse annotation以支撑关于3d u-net: learning dense volumetric segmentation from sparse annotation的技术论证和背景说明。

- [86] F. Milletari, 2016
  - 标题: V-net: Fully convolutional neural networks for volumetric medical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用V-net: Fully convolutional neural networks for volumetric medical image segmentation以支撑关于V-net: Fully convolutional neural networks for volumetric medical image segmentation 医学视觉背景的技术论证和背景说明。

- [91] M. Caron, 2020
  - 标题: Unsupervised learning of visual features by contrasting cluster assignments
  - 关键词: unsupervised, learning
  - 总结: 原文引用Unsupervised learning of visual features by contrasting cluster assignments以支撑关于Unsupervised learning of visual features by contrasting cluster assignments的技术论证和背景说明。

- [93] Ö. Çiçek, 2016
  - 标题: 3d u-net: learning dense volumetric segmentation from sparse annotation
  - 关键词: u-net:, learning
  - 总结: 原文引用3d u-net: learning dense volumetric segmentation from sparse annotation以支撑关于3d u-net: learning dense volumetric segmentation from sparse annotation的技术论证和背景说明。

- [94] F. Milletari, 2016
  - 标题: V-net: Fully convolutional neural networks for volumetric medical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用V-net: Fully convolutional neural networks for volumetric medical image segmentation以支撑关于V-net: Fully convolutional neural networks for volumetric medical image segmentation 医学视觉背景的技术论证和背景说明。

- [96] W. Huang, 2022
  - 标题: Learning to model pixel-embedded affinity for homogeneous instance segmentation
  - 关键词: learning, model
  - 总结: 原文引用Learning to model pixel-embedded affinity for homogeneous instance segmentation以支撑关于Learning to model pixel-embedded affinity for homogeneous instance segmentation的技术论证和背景说明。

- [97] R. Sun, 2023
  - 标题: Appearance prompt vision transformer for connectome reconstruction
  - 关键词: appearance, prompt, vision
  - 总结: 原文引用Appearance prompt vision transformer for connectome reconstruction以支撑关于Appearance prompt vision transformer for connectome reconstruction的技术论证和背景说明。

- [98] A. Sheridan, 2023
  - 标题: Local shape descriptors for neuron segmentation
  - 关键词: local, shape, descriptors
  - 总结: 原文引用Local shape descriptors for neuron segmentation以支撑关于Local shape descriptors for neuron segmentation的技术论证和背景说明。

- [99] X. Liu, 2024
  - 标题: Cross-dimension affinity distillation for 3d em neuron segmentation
  - 关键词: cross-dimension, affinity, distillation
  - 总结: 原文引用Cross-dimension affinity distillation for 3d em neuron segmentation以支撑关于Cross-dimension affinity distillation for 3d em neuron segmentation的技术论证和背景说明。

- [101] T. Liu, 2024
  - 标题: Vsmtrans: A hybrid paradigm integrating self-attention and convolution for 3d medical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用Vsmtrans: A hybrid paradigm integrating self-attention and convolution for 3d medical image segmentation以支撑关于Vsmtrans: A hybrid paradigm integrating self-attention and convolution for 3d medical image segmentation 医学视觉背景的技术论证和背景说明。

- [103] C. Li, 2025
  - 标题: U-kan makes strong backbone for medical image segmentation and generation
  - 关键词: medical, foundation model
  - 总结: 原文引用U-kan makes strong backbone for medical image segmentation and generation以支撑关于U-kan makes strong backbone for medical image segmentation and generation 医学视觉背景的技术论证和背景说明。

- [104] Z. Xing, 2022
  - 标题: Nestedformer: Nested modality-aware transformer for brain tumor segmentation
  - 关键词: nestedformer:, nested, modality-aware
  - 总结: 原文引用Nestedformer: Nested modality-aware transformer for brain tumor segmentation以支撑关于Nestedformer: Nested modality-aware transformer for brain tumor segmentation的技术论证和背景说明。

- [105] Z. Wang, 2023
  - 标题: A2fseg: Adaptive multi-modal fusion network for medical image segmentation
  - 关键词: medical, foundation model
  - 总结: 原文引用A2fseg: Adaptive multi-modal fusion network for medical image segmentation以支撑关于A2fseg: Adaptive multi-modal fusion network for medical image segmentation 医学视觉背景的技术论证和背景说明。

- [106] J. Shi, 2023
  - 标题: H-denseformer: An efficient hybrid densely connected transformer for multimodal tumor segmentation
  - 关键词: h-denseformer:, efficient
  - 总结: 原文引用H-denseformer: An efficient hybrid densely connected transformer for multimodal tumor segmentation以支撑关于H-denseformer: An efficient hybrid densely connected transformer for multimodal tumor segmentation的技术论证和背景说明。

- [109] N. Dey, 2024
  - 标题: Learning general-purpose biomedical volume representations using randomized synthesis
  - 关键词: medical, foundation model
  - 总结: 原文引用Learning general-purpose biomedical volume representations using randomized synthesis以支撑关于Learning general-purpose biomedical volume representations using randomized synthesis 医学视觉背景的技术论证和背景说明。



##### Dataset

- [14] X. Wang, 2017
  - 标题: Chestx-ray8: Hospital-scale chest x-ray database and benchmarks on weakly-supervised classification and localization of common thorax diseases
  - 关键词: chestx-ray8:, hospital-scale, chest
  - 总结: 原文将Chestx-ray8: Hospital-scale chest x-ray database and benchmarks on weakly-supervised classification and localization of common thorax diseases作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [16] I. E. Hamamci, 2024
  - 标题: Developing generalist foundation models from a multimodal dataset for 3d computed tomography
  - 关键词: developing, generalist, foundation
  - 总结: 原文将Developing generalist foundation models from a multimodal dataset for 3d computed tomography作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [18] A. Stein, 2018
  - 标题: RSNA pneumonia detection challenge
  - 关键词: rsna, pneumonia, detection
  - 总结: 原文将RSNA pneumonia detection challenge作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [21] P. Bandi, 2018
  - 标题: From detection of individual metastases to classification of lymph node status at the patient level: the camelyon17 challenge
  - 关键词: from, detection
  - 总结: 原文将From detection of individual metastases to classification of lymph node status at the patient level: the camelyon17 challenge作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [25] P. H. Smedsrud, 2021
  - 标题: Kvasir-Capsule, a video capsule endoscopy dataset
  - 关键词: kvasir-capsule,, video
  - 总结: 原文将Kvasir-Capsule, a video capsule endoscopy dataset作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [26] Z. Wang, 2022
  - 标题: Autolaparo: A new dataset of integrated multi-tasks for image-guided surgical automation in laparoscopic hysterectomy
  - 关键词: autolaparo:
  - 总结: 原文将Autolaparo: A new dataset of integrated multi-tasks for image-guided surgical automation in laparoscopic hysterectomy作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [27] S. Leclerc, 2019
  - 标题: Deep learning for segmentation using an open large-scale dataset in 2d echocardiography
  - 关键词: deep, learning
  - 总结: 原文将Deep learning for segmentation using an open large-scale dataset in 2d echocardiography作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [28] M. Allan, 2020
  - 标题: 2018 robotic scene segmentation challenge
  - 关键词: 2018, robotic, scene
  - 总结: 原文将2018 robotic scene segmentation challenge作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [34] CREMI, 2016
  - 标题: Miccai challenge on circuit reconstruction from electron microscopy images
  - 关键词: miccai, challenge
  - 总结: 原文将Miccai challenge on circuit reconstruction from electron microscopy images作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [36] K. T. Gatidis S, 2022
  - 标题: A whole-body fdg-pet/ct dataset with manually annotated tumor lesions (fdg-pet-ct-lesions)
  - 关键词: whole-body, fdg-pet/ct
  - 总结: 原文将A whole-body fdg-pet/ct dataset with manually annotated tumor lesions (fdg-pet-ct-lesions)作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [37] V. Oreiller, 2022
  - 标题: Head and neck tumor segmentation in pet/ct: the hecktor challenge
  - 关键词: head, neck
  - 总结: 原文将Head and neck tumor segmentation in pet/ct: the hecktor challenge作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [82] I. E. Hamamci, 2024
  - 标题: Developing generalist foundation models from a multimodal dataset for 3d computed tomography
  - 关键词: developing, generalist, foundation
  - 总结: 原文将Developing generalist foundation models from a multimodal dataset for 3d computed tomography作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。

- [95] K. Lee, 2017
  - 标题: Superhuman accuracy on the snemi3d connectomics challenge
  - 关键词: superhuman, accuracy
  - 总结: 原文将Superhuman accuracy on the snemi3d connectomics challenge作为评测基准之一，用于测试DINOv3特征在该数据集对应的医学模态和任务上的零样本迁移能力。



##### Component

- [22] L. Cai, 2025
  - 标题: Attrimil: Revisiting attention-based multiple instance learning for whole-slide pathological image classification from a perspective of instance attributes
  - 关键词: attrimil:, revisiting, attention-based
  - 总结: 原文采用Attrimil: Revisiting attention-based multiple instance learning for whole-slide pathological image classification from a perspective of instance attributes提出的方法作为Attrimil: Revisiting attention-based multiple instance learning for whole-slide pathological image classification from a perspective of instance attributes 方法组件的技术实现手段，用于特征处理、配准优化或后处理流程。

- [39] M. Ilse, 2018
  - 标题: Attention-based deep multiple instance learning
  - 关键词: attention-based, deep, multiple
  - 总结: 原文采用Attention-based deep multiple instance learning提出的方法作为Attention-based deep multiple instance learning 方法组件的技术实现手段，用于特征处理、配准优化或后处理流程。

- [41] X. Song, 2024
  - 标题: Dino-reg: General purpose image encoder for training-free multi-modal deformable medical image registration
  - 关键词: dino-reg:, general, purpose
  - 总结: 原文采用Dino-reg: General purpose image encoder for training-free multi-modal deformable medical image registration提出的方法作为Dino-reg: General purpose image encoder for training-free multi-modal deformable medical image registration 方法组件的技术实现手段，用于特征处理、配准优化或后处理流程。

- [46] J. Joseph, 2025
  - 标题: Vapcaps: A novel variance-based attention network with imbalance aware loss for better pathology detection in video capsule endoscopy
  - 关键词: vapcaps:, novel
  - 总结: 原文采用Vapcaps: A novel variance-based attention network with imbalance aware loss for better pathology detection in video capsule endoscopy提出的方法作为Vapcaps: A novel variance-based attention network with imbalance aware loss for better pathology detection in video capsule endoscopy 方法组件的技术实现手段，用于特征处理、配准优化或后处理流程。

- [108] H. Siebert, 2021
  - 标题: Fast 3d registration with accurate optimisation and little learning for learn2reg 2021
  - 关键词: fast, registration
  - 总结: 原文采用Fast 3d registration with accurate optimisation and little learning for learn2reg 2021提出的方法作为Fast 3d registration with accurate optimisation and little learning for learn2reg 2021 方法组件的技术实现手段，用于特征处理、配准优化或后处理流程。



##### Baseline

- [59] J. Yu, 2024
  - 标题: Sam 2 in robotic surgery: An empirical evaluation for robustness and generalization in surgical video segmentation
  - 关键词: sam 2 in robotic surgery: an e
  - 总结: 原文将Sam 2 in robotic surgery: An empirical evaluation for robustness and generalization in surgical video segmentation作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [69] A. Kirillov, 2023
  - 标题: Segment anything
  - 关键词: segment, anything
  - 总结: 原文将Segment anything作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [70] N. Ravi, 2024
  - 标题: Sam 2: Segment anything in images and videos
  - 关键词: segment
  - 总结: 原文将Sam 2: Segment anything in images and videos作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [71] J. Chen, 2021
  - 标题: Transunet: Transformers make strong encoders for medical image segmentation
  - 关键词: transunet:, transformers, make
  - 总结: 原文将Transunet: Transformers make strong encoders for medical image segmentation作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [73] A. Hatamizadeh, 2022
  - 标题: Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images
  - 关键词: swin, unetr:
  - 总结: 原文将Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [84] F. Isensee, 2021
  - 标题: nnu-net: a self-configuring method for deep learning-based biomedical image segmentation
  - 关键词: nnu-net:, self-configuring
  - 总结: 原文将nnu-net: a self-configuring method for deep learning-based biomedical image segmentation作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [87] A. Hatamizadeh, 2022
  - 标题: Unetr: transformers for 3d medical image segmentation
  - 关键词: unetr:, transformers
  - 总结: 原文将Unetr: transformers for 3d medical image segmentation作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [102] A. M. Shaker, 2024
  - 标题: Unetr++: delving into efficient and accurate 3d medical image segmentation
  - 关键词: unetr++:, delving, into
  - 总结: 原文将Unetr++: delving into efficient and accurate 3d medical image segmentation作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。

- [107] G. Balakrishnan, 2019
  - 标题: Voxelmorph: a learning framework for deformable medical image registration
  - 关键词: voxelmorph:, learning
  - 总结: 原文将Voxelmorph: a learning framework for deformable medical image registration作为对比基线方法，通过与DINOv3的定量比较来评估自然图像预训练特征在医学领域的竞争力。





#### 时间线分析

##### 早期
早期工作奠定了基础建模思想与任务定义，包括大语言模型缩放规律（LLM[1]、Scaling Laws[2]）、自监督视觉表征学习（DINO[10]、SimCLR[89]、MoCo-v3[90]、BYOL[92]）、早期医学图像分割架构（U-Net[60]、3D U-Net[85]、V-Net[86]）以及经典配准与特征方法（VoxelMorph[107]、MIND[108]）。这些工作确立了自监督学习、医学图像分析和变形配准的技术起点。


- [2] J. Kaplan, 2020: Scaling laws for neural language models

- [14] X. Wang, 2017: Chestx-ray8: Hospital-scale chest x-ray database and benchmarks on weakly-supervised classification and localization of common thorax diseases

- [18] A. Stein, 2018: RSNA pneumonia detection challenge

- [20] B. E. Bejnordi, 2017: Diagnostic assessment of deep learning algorithms for detection of lymph node metastases in women with breast cancer

- [21] P. Bandi, 2018: From detection of individual metastases to classification of lymph node status at the patient level: the camelyon17 challenge

- [27] S. Leclerc, 2019: Deep learning for segmentation using an open large-scale dataset in 2d echocardiography

- [28] M. Allan, 2020: 2018 robotic scene segmentation challenge

- [29] C. González, 2020: Isinet: an instance-based approach for surgical instrument segmentation

- [30] S. Ali, 2020: Endoscopy disease detection and segmentation (edd2020)

- [34] CREMI, 2016: Miccai challenge on circuit reconstruction from electron microscopy images

- [35] N. Kasthuri, 2015: Saturated reconstruction of a volume of neocortex

- [38] O. Bernard, 2018: Deep learning techniques for automatic mri cardiac multi-structures segmentation and diagnosis: Is the problem solved?

- [39] M. Ilse, 2018: Attention-based deep multiple instance learning

- [40] J. Funke, 2018: Large scale image segmentation with structured loss based deep learning for connectome reconstruction

- [42] J. Nunez-Iglesias, 2013: Machine learning of hierarchical clustering to segment 2d and 3d images

- [43] I. Arganda-Carreras, 2015: Crowdsourcing the creation of image segmentation algorithms for connectomics

- [45] K. He, 2016: Deep residual learning for image recognition

- [55] Y. Jin, 2018: Sv-rcnet: Workflow recognition from surgical videos using recurrent convolutional network

- [60] O. Ronneberger, 2015: U-net: Convolutional networks for biomedical image segmentation

- [61] A. A. Shvets, 2018: Automatic instrument segmentation in robotassisted surgery using deep learning

- [62] Y. Jin, 2019: Incorporating temporal prior from motion flow for instrument segmentation in minimally invasive surgery video

- [65] M. Islam, 2020: Ap-mtl: Attention pruned multi-task learning model for real-time instrument detection and segmentation in robot-assisted surgery

- [85] Ö. Çiçek, 2016: 3d u-net: learning dense volumetric segmentation from sparse annotation

- [86] F. Milletari, 2016: V-net: Fully convolutional neural networks for volumetric medical image segmentation

- [89] T. Chen, 2020: A simple framework for contrastive learning of visual representations

- [91] M. Caron, 2020: Unsupervised learning of visual features by contrasting cluster assignments

- [92] J.-B. Grill, 2020: Bootstrap your own latent: A new approach to self-supervised learning

- [93] Ö. Çiçek, 2016: 3d u-net: learning dense volumetric segmentation from sparse annotation

- [94] F. Milletari, 2016: V-net: Fully convolutional neural networks for volumetric medical image segmentation

- [95] K. Lee, 2017: Superhuman accuracy on the snemi3d connectomics challenge

- [107] G. Balakrishnan, 2019: Voxelmorph: a learning framework for deformable medical image registration




##### 中期
中期工作将自监督学习和基础模型范式推向成熟。DINOv2[9]展示了更强的自监督视觉特征；BiomedCLIP[17]和CT-CLIP[82]等医学领域基础模型尝试用大规模数据预训练缩小域偏移；nnU-Net[84]建立了医学分割的金标准基线；多项端到端手术阶段识别和息肉分割方法（ISINet[29]、Polyp-PVT[79]、STSANet[47]）将特定任务推向更高精度。SAM[69]和SAM 2[70]则引入了prompt-based分割新范式。


- [1] OpenAI, 2022: Chatgpt

- [3] I. M. Alabdulmohsin, 2022: Revisiting neural scaling laws in language and vision

- [4] Z. Xie, 2023: On data scaling in masked image modeling

- [9] M. Oquab, 2023: Dinov2: Learning robust visual features without supervision

- [10] M. Caron, 2021: Emerging properties in self-supervised vision transformers

- [17] S. Zhang, 2023: Largescale domain-specific pretraining for biomedical vision-language processing

- [19] F. Wang, 2022: Multi-granularity cross-modal alignment for generalized medical visual representation learning

- [23] F. Xu, 2021: Predicting axillary lymph node metastasis in early breast cancer using deep learning on primary tumor biopsy slides

- [24] M. Y. Lu, 2021: Data-efficient and weakly supervised computational pathology on whole-slide images

- [25] P. H. Smedsrud, 2021: Kvasir-Capsule, a video capsule endoscopy dataset

- [26] Z. Wang, 2022: Autolaparo: A new dataset of integrated multi-tasks for image-guided surgical automation in laparoscopic hysterectomy

- [32] M. Antonelli, 2022: The medical segmentation decathlon

- [36] K. T. Gatidis S, 2022: A whole-body fdg-pet/ct dataset with manually annotated tumor lesions (fdg-pet-ct-lesions)

- [37] V. Oreiller, 2022: Head and neck tumor segmentation in pet/ct: the hecktor challenge

- [48] A. Srivastava, 2022: Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation

- [49] A. Trockman, 2022: Patches are all you need?

- [50] S. d’Ascoli, 2022: Convit: Improving vision transformers with soft convolutional inductive biases

- [51] X. Dong, 2022: Cswin transformer: A general vision transformer backbone with cross-shaped windows

- [52] A. Srivastava, 2022: Video capsule endoscopy classification using focal modulation guided convolutional neural network

- [53] A. Vats, 2021: Learning more for free - a multi task learning approach for improved pathology classification in capsule endoscopy

- [54] O. Yet, 2021: Improved attentive pairwise interaction (api-net) for finegrained image classification

- [56] Y. Jin, 2021: Temporal memory relation network for workflow recognition from surgical video

- [57] X. Gao, 2021: Trans-svnet: Accurate phase recognition from surgical videos via hybrid embedding aggregation transformer

- [63] A. Wang, 2022: Rethinking surgical instrument segmentation: A background image can be all you need

- [64] M. Islam, 2021: St-mtl: Spatio-temporal multitask learning model to predict scanpath while tracking instruments in robotic surgery

- [66] L. Seenivasan, 2022: Global-reasoned multi-task learning model for surgical scene understanding

- [67] Z. Zhao, 2022: Trasetr: track-to-segment transformer with contrastive query for instance-level instrument segmentation in robotic surgery

- [68] B. Baby, 2023: From forks to forceps: A new framework for instance segmentation of surgical instruments

- [69] A. Kirillov, 2023: Segment anything

- [71] J. Chen, 2021: Transunet: Transformers make strong encoders for medical image segmentation

- [72] C.-H. Huang, 2021: Hardnet-mseg: A simple encoder-decoder polyp segmentation neural network that achieves over 0.9 mean dice and 86 fps

- [73] A. Hatamizadeh, 2022: Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images

- [74] Q. Chang, 2023: Esfpnet: efficient deep learning architecture for real-time lesion segmentation in autofluorescence bronchoscopic video

- [75] F. Tang, 2022: Duat: Dual-aggregation transformer network for medical image segmentation

- [76] E. Sanderson, 2022: Fcn-transformer feature fusion for polyp segmentation

- [77] A. Srivastava, 2022: Msrf-net: A multi-scale residual fusion network for biomedical image segmentation

- [78] A. Srivastava, 2021: Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation

- [79] D. Bo, 2023: Polyp-pvt: Polyp segmentation with pyramidvision transformers

- [80] G.-P. Ji, 2022: Video polyp segmentation: A deep learning perspective

- [83] R. L. Draelos, 2021: Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes

- [84] F. Isensee, 2021: nnu-net: a self-configuring method for deep learning-based biomedical image segmentation

- [87] A. Hatamizadeh, 2022: Unetr: transformers for 3d medical image segmentation

- [88] K. He, 2022: Masked autoencoders are scalable vision learners

- [90] X. Chen, 2021: An empirical study of training self-supervised vision transformers

- [96] W. Huang, 2022: Learning to model pixel-embedded affinity for homogeneous instance segmentation

- [97] R. Sun, 2023: Appearance prompt vision transformer for connectome reconstruction

- [98] A. Sheridan, 2023: Local shape descriptors for neuron segmentation

- [100] Y. Tang, 2021: Self-supervised pre-training of swin transformers for 3d medical image analysis

- [104] Z. Xing, 2022: Nestedformer: Nested modality-aware transformer for brain tumor segmentation

- [105] Z. Wang, 2023: A2fseg: Adaptive multi-modal fusion network for medical image segmentation

- [106] J. Shi, 2023: H-denseformer: An efficient hybrid densely connected transformer for multimodal tumor segmentation

- [108] H. Siebert, 2021: Fast 3d registration with accurate optimisation and little learning for learn2reg 2021




##### 近期
近期工作直接收束到本文的方法路线。DINOv3[11]将自监督ViT扩展至70亿参数，是本文核心评测对象；SegDINO[12]和MedDINOv3[13]探索了DINOv3在医学分割上的适配；同时多篇2024-2026年文献（如U-KAN[103]、LoViT[58]、Anatomix[109]、APViT[97]、CAD[99]）代表了配准、分割和EM分析的最新进展。


- [5] A. El-Nouby, 2024: Scalable pre-training of large autoregressive image models

- [6] J. Pan, 2025: Beyond benchmarks: Dynamic, automatic and systematic red-teaming agents for trustworthy medical language models

- [7] J. Pan, 2025: Medvlm-r1: Incentivizing medical reasoning capability of vision-language models (vlms) via reinforcement learning

- [8] D. Fan, 2025: Scaling language-free visual representation learning

- [11] O. Siméoni, 2025: Dinov3

- [12] S. Yang, 2025: Segdino: An efficient design for medical and natural image segmentation with dino-v3

- [13] Y. Li, 2025: Meddinov3: How to adapt vision foundation models for medical image segmentation?

- [15] M. Y. Lu, 2024: A visual-language foundation model for computational pathology

- [16] I. E. Hamamci, 2024: Developing generalist foundation models from a multimodal dataset for 3d computed tomography

- [22] L. Cai, 2025: Attrimil: Revisiting attention-based multiple instance learning for whole-slide pathological image classification from a perspective of instance attributes

- [31] G. Müller-Franzes, 2025: Medical slice transformer for improved diagnosis and explainability on 3d medical images with dinov2

- [33] L. Wu, 2024: Voco: A simple-yet-effective volume contrastive learning framework for 3d medical image analysis

- [41] X. Song, 2024: Dino-reg: General purpose image encoder for training-free multi-modal deformable medical image registration

- [44] R. J. Chen, 2024: Towards a general-purpose foundation model for computational pathology

- [46] J. Joseph, 2025: Vapcaps: A novel variance-based attention network with imbalance aware loss for better pathology detection in video capsule endoscopy

- [47] Y. Li, 2026: Stsanet: Spatial temporal-self-aggregation network for surgical phase recognition

- [58] Y. Liu, 2025: Lovit: Long video transformer for surgical phase recognition

- [59] J. Yu, 2024: Sam 2 in robotic surgery: An empirical evaluation for robustness and generalization in surgical video segmentation

- [70] N. Ravi, 2024: Sam 2: Segment anything in images and videos

- [81] Y. Pang, 2025: Endoscopic adaptive transformer for enhanced polyp segmentation in endoscopic imaging

- [82] I. E. Hamamci, 2024: Developing generalist foundation models from a multimodal dataset for 3d computed tomography

- [99] X. Liu, 2024: Cross-dimension affinity distillation for 3d em neuron segmentation

- [101] T. Liu, 2024: Vsmtrans: A hybrid paradigm integrating self-attention and convolution for 3d medical image segmentation

- [102] A. M. Shaker, 2024: Unetr++: delving into efficient and accurate 3d medical image segmentation

- [103] C. Li, 2025: U-kan makes strong backbone for medical image segmentation and generation

- [109] N. Dey, 2024: Learning general-purpose biomedical volume representations using randomized synthesis


# Efficient DETR: improving end-to-end object detector with dense prior (2021)

- Paper ref: 1:VHBU3NI6
- Title: Efficient DETR: improving end-to-end object detector with dense prior
- Year: 2021

## Compact References

_No references artifact rows available._

## Citation Analysis Report

_No citation analysis report available._


# Rethinking detection based table structure recognition for visually rich document images (2025)

- Paper ref: 1:VI9JURUB
- Title: Rethinking detection based table structure recognition for visually rich document images
- Year: 2025

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2019 | Adiga, D.; Bhat, S. A.; et al. | Table structure recognition based on cell relationship, a bottom-up approach |
| ref-2 | 2023 | Bacea, D.-S.; Oniga, F. | Single stage architecture for improved accuracy realtime object detection on mobile devices |
| ref-3 | 2018 | Cai, Z.; Vasconcelos, N. | Cascade r-cnn: Delving into high quality object detection |
| ref-4 | 2020 | Carion, N.; Massa, F.; et al. | End-to-end object detection with transformers |
| ref-5 | 2019 | Chen, K.; Wang, J.; et al. | MMDetection: Open mmlab detection toolbox and benchmark |
| ref-6 | 2023 | Chen, F.; Zhang, H.; et al. | Enhanced training of query-based object detection via selective query recollection |
| ref-7 | 2019 | Chi, Z.; Huang, H.; et al. | Complicated table structure recognition |
| ref-8 | 2017 | Chollet, F. | Xception: Deep learning with depthwise separable convolutions |
| ref-9 | 2017 | Dai, J.; Qi, H.; et al. | Deformable convolutional networks |
| ref-10 | 2009 | Deng, J.; Dong, W.; et al. | Imagenet: A largescale hierarchical image database |
| ref-11 | 2022 | Ding, X.; Zhang, X.; et al. | Scaling up your kernels to 31x31: Revisiting large kernel design in cnns |
| ref-12 | 2023 | Fernandes, J.; Xiao, B.; et al. | Tablestrrec: framework for table structure recognition in data sheet images |
| ref-13 | 2022 | Guo, M.-H.; Lu, C.-Z.; et al. | Segnext: Rethinking convolutional attention design for semantic segmentation |
| ref-14 | 2021 | Hashmi, K. A.; Stricker, D.; et al. | Guided table structure recognition through anchor optimization |
| ref-15 | 2017 | He, K.; Gkioxari, G.; et al. | Mask r-cnn |
| ref-16 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-17 | 2022 | Hong, Q.; Liu, F.; et al. | Dynamic sparse r-cnn |
| ref-18 | 2017 | Howard, A. G.; Zhu, M.; et al. | Mobilenets: Efficient convolutional neural networks for mobile vision applications |
| ref-19 | 2021 | Hu, P.; Wang, W.; et al. | Touching text line segmentation combined local baseline and connected component for uchen tibetan historical documents |
| ref-20 | 2023 | Huang, Y.; Lu, N.; et al. | Improving table structure recognition with visual-alignment sequential coordinate modeling |
| ref-21 | 2015 | Ioffe, S. | Batch normalization: Accelerating deep network training by reducing internal covariate shift |
| ref-22 | 2022 | JaidedA, I. | Easyocr |
| ref-23 | 1991 | Krogh, A.; Hertz, J. | A simple weight decay can improve generalization |
| ref-24 | 2021 | Kuang, Z.; Sun, H.; et al. | Mmocr: A comprehensive toolbox for text detection, recognition and understanding |
| ref-25 | 2022 | Li, C.; Li, L.; et al. | Yolov6: A singlestage object detection framework for industrial applications |
| ref-26 | 2022 | Li, X.-H.; Yin, F.; et al. | Table structure recognition and form parsing by end-to-end object detection and relation parsing |
| ref-27 | 2017 | Lin, T.-Y.; Girshick, R.; et al. | Feature pyramid networks for object detection |
| ref-28 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft coco: Common objects in context |
| ref-29 | 2022 | Liu, H.; Li, X.; et al. | Neural collaborative graph machines for table structure recognition |
| ref-30 | 2020 | Liu, Z.; Mao, H.; et al. | A convnet for the 2020s |
| ref-31 | 2021 | Lu, N.; Yu, W.; et al. | Master: Multiaspect non-local network for scene text recognition |
| ref-32 | 2023 | Ly, N. T.; Takasu, A. | An end-to-end multi-task learning model for image-based table recognition |
| ref-33 | 2023 | Ma, C.; Lin, W.; et al. | Robust table detection and structure recognition from heterogeneous document images |
| ref-34 | 2017 | Mendes, J.; Saraiva, J. | Tabula: A language to model spreadsheet tables |
| ref-35 | 2023 | Mondal, A.; Agarwal, M.; et al. | Dataset agnostic document object detection |
| ref-36 | 2022 | Nassar, A.; Livathinos, N.; et al. | Tableformer: Table structure understanding with transformers |
| ref-37 | 2023 | Nguyen, N. Q.; Le, A. D.; et al. | Formerge: Recover spanning cells in complex table structure using transformer network |
| ref-38 | 2013 | Pascanu, R. | On the difficulty of training recurrent neural networks |
| ref-39 | 2020 | Prasad, D.; Gadpal, A.; et al. | Cascadetabnet: An approach for end to end table detection and structure recognition from imagebased documents |
| ref-40 | 2021 | Qiao, L.; Li, Z.; et al. | Lgpma: Complicated table structure recognition with local and global pyramid mask alignment |
| ref-41 | 2019 | Rastan, R.; Paik, H.-Y.; et al. | Texus: A unified framework for extracting and understanding tables in pdf documents |
| ref-42 | 2015 | Ren, S.; He, K.; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-43 | 2023 | Ren, T.; Liu, S.; et al. | Detrex: Benchmarking detection transformers |
| ref-44 | 2017 | Schreiber, S.; Agne, S.; et al. | Deepdesrt: Deep learning for detection and structure recognition of tables in document images |
| ref-45 | 2023 | Shen, H.; Gao, X.; et al. | Divide rows and conquer cells: Towards structure recognition for large tables |
| ref-46 | 2019 | Siddiqui, S. A.; Fateh, I. A.; et al. | Deeptabstr: Deep learning based table structure recognition |
| ref-47 | 2018 | Siddiqui, S. A.; Malik, M. I.; et al. | Decnt: Deep deformable cnn for table detection |
| ref-48 | 2022 | Singer-Vine, J. | Pdfplumber |
| ref-49 | 2021 | Smock, B.; Pesala, R. | Table transformer |
| ref-50 | 2022 | Smock, B.; Pesala, R.; et al. | Pubtables-1 m: Towards comprehensive table extraction from unstructured documents |
| ref-51 | 2023 | Smock, B.; Pesala, R.; et al. | Aligning benchmark datasets for table structure recognition |
| ref-52 | 2021 | Sun, P.; Jiang, Y.; et al. | What makes for end-to-end object detection? In International conference on machine learning (pp |
| ref-53 | 2021 | Sun, P.; Zhang, R.; et al. | Sparse r-cnn: End-to-end object detection with learnable proposals |
| ref-54 | 2019 | Tensmeyer, C.; Morariu, V. I.; et al. | Deep splitting and merging for table structure decomposition |
| ref-55 | 2019 | Tian, Z.; Shen, C.; et al. | Fcos: Fully convolutional one-stage object detection |
| ref-56 | 2017 | Vaswani, A.; Shazeer, N.; et al. | Attention is all you need |
| ref-57 | 2023 | Wang, C.-Y.; Bochkovskiy, A.; et al. | YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors |
| ref-58 | 2023 | Wang, J.; Lin, W.; et al. | Robust table structure recognition with dynamic queries enhanced detection transformer |
| ref-59 | 2019 | Wu, Y.; Kirillov, A.; et al. | Detectron2 |
| ref-60 | 2023 | Wu, X.; Ma, T.; et al. | Drfn: A unified framework for complex document layout analysis |
| ref-61 | 2023 | Wu, X.; Xiao, L.; et al. | Cross-domain document layout analysis using document style guide |
| ref-62 | 2022 | Xiao, B.; Akkaya, Y.; et al. | Efficient information sharing in ict supply chain social network via table structure recognition |
| ref-63 | 2023 | Xiao, B.; Akkaya, Y.; et al. | Multi-modal ocr system for the ict global supply chain |
| ref-64 | 2022 | Xiao, B.; Simsek, M.; et al. | Handling big tabular data of ict supply chains: a multi-task, machine-interpretable approach |
| ref-65 | 2023 | Xiao, B.; Simsek, M.; et al. | Revisiting table detection datasets for visually rich documents |
| ref-66 | 2023 | Xiao, B.; Simsek, M.; et al. | Table detection for visually rich document images |
| ref-67 | 2021 | Xue, W.; Yu, B.; et al. | Tgrnet: A table graph reconstruction network for table structure recognition |
| ref-68 | 2021 | Ye, J.; Qi, X.; et al. | Pingan-vcgroup’s solution for icdar 2021 competition on scientific literature parsing task b: Table recognition to html |
| ref-69 | 2023 | Yu, F.; Huang, J.; et al. | An effective method for figures and tables detection in academic literature |
| ref-70 | 2023 | Zhang, S.; Wang, X.; et al. | Dense distinct query for end-to-end object detection |
| ref-71 | 2022 | Zhang, Z.; Zhang, J.; et al. | Split, embed and merge: An accurate table structure recognizer |
| ref-72 | 2021 | Zheng, X.; Burdick, D.; et al. | Global table extractor (gte): A framework for joint table identification and cell structure recognition using visual context |
| ref-73 | 2020 | Zhong, X.; ShafieiBavani, E.; et al. | Image-based table recognition: data, model, and evaluation |
| ref-74 | 2021 | Zhu, X.; Su, W.; et al. | Deformable detr: Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 总体总结
在 Introduction 与 Related work 中，原文先用 PDF/文档解析工具和文档图像分析工作说明真实表格结构抽取的应用背景，再把 TSR 研究划分为 image-to-sequence、graph-based 与 detection-based 三条路线。随后，作者将 Cascade R-CNN、DETR、Sparse R-CNN、PubTables1M、COCO/TEDS 等关键引用组织成一条更聚焦的论证：检测式 TSR 的瓶颈不只是模型精度，而是完整组件定义、多标签同框、proposal 生成、检测指标与结构指标错配共同造成的。最后，相关工作引用被用来为本文的三项改造铺垫依据，即单标签化 formulation、RPN 参数调整，以及局部特征与长程依赖的联合建模。


#### 关键文献

- [AY-22] Cai, Z., 2018: Cascade r-cnn: Delving into high quality object detection (Baseline)

- [AY-23] Carion, N., 2020: End-to-end object detection with transformers (Baseline)

- [AY-24] Dai, J., 2017: Deformable convolutional networks (Component)

- [AY-1] Fernandes, J., 2023: Tablestrrec: framework for table structure recognition in data sheet images (Baseline)

- [AY-26] Lin, T.-Y., 2014: Microsoft coco: Common objects in context (Dataset)

- [AY-28] Smock, B., 2022: Pubtables-1 m: Towards comprehensive table extraction from unstructured documents (Dataset)

- [AY-37] Vaswani, A., 2017: Attention is all you need (Historical)

- [AY-17] Zhong, X., 2020: Image-based table recognition: data, model, and evaluation (Dataset)



#### 范围
- 章节: Introduction + Related work
- 行号: 20-68

#### 按功能归类


##### Background

- [AY-39] Adiga, D., 2019
  - 标题: Table structure recognition based on cell relationship, a bottom-up approach
  - 关键词: TSR, cell relationship, prior work
  - 总结: 原文使用《Table structure recognition based on cell relationship, a bottom-up approach》来支撑“早期 cell-relationship TSR 路线”这一论述位置。具体作用是：原文在 Related work 中把它列为近年来 TSR 研究之一，用来铺出 TSR 方法族谱。

- [AY-31] Bacea, D.-S., 2023
  - 标题: Single stage architecture for improved accuracy realtime object detection on mobile devices
  - 关键词: one-stage detector, mobile detection, YOLO context
  - 总结: 原文使用《Single stage architecture for improved accuracy realtime object detection on mobile devices》来支撑“一阶段目标检测器”这一论述位置。具体作用是：原文借它和 YOLO 系列一起说明一阶段检测器把 proposal、分类和回归整合到单一网络中。

- [AY-35] Chen, F., 2023
  - 标题: Enhanced training of query-based object detection via selective query recollection
  - 关键词: query recollection, DETR series, training
  - 总结: 原文使用《Enhanced training of query-based object detection via selective query recollection》来支撑“query-based detector 训练改良”这一论述位置。具体作用是：原文在介绍 DETR 系列阶段职责不平衡时引用它，说明 query recollection 属于近期 query-based detector 改良。

- [AY-36] Hong, Q., 2022
  - 标题: Dynamic sparse r-cnn
  - 关键词: Sparse R-CNN variant, NMS, assignment
  - 总结: 原文使用《Dynamic sparse r-cnn》来支撑“Dynamic Sparse R-CNN”这一论述位置。具体作用是：原文在 end-to-end detector 脉络中提到它，说明 DETR 类方法可通过 many-to-one assignment 和 NMS 扩展。

- [AY-2] Hu, P., 2021
  - 标题: Touching text line segmentation combined local baseline and connected component for uchen tibetan historical documents
  - 关键词: document analysis, text line segmentation, historical documents
  - 总结: 原文使用《Touching text line segmentation combined local baseline and connected component for uchen tibetan historical documents》来支撑“文档图像分析任务”这一论述位置。具体作用是：原文在引言中把它作为 document analysis 的相关任务示例，说明 TSR 位于更广的文档理解应用背景中。

- [AY-4] Li, C., 2022
  - 标题: Yolov6: A singlestage object detection framework for industrial applications
  - 关键词: YOLO, one-stage detector, industrial detection
  - 总结: 原文使用《Yolov6: A singlestage object detection framework for industrial applications》来支撑“YOLOv6 一阶段检测”这一论述位置。具体作用是：原文用它和其他 YOLO 文献共同说明一阶段检测器的代表路线与实时检测背景。

- [AY-29] Sun, P., 2021
  - 标题: What makes for end-to-end object detection? In International conference on machine learning (pp
  - 关键词: one-to-one assignment, NMS, end-to-end detection
  - 总结: 原文使用《What makes for end-to-end object detection? In International conference on machine learning (pp》来支撑“end-to-end object detection 成因分析”这一论述位置。具体作用是：原文用它说明 one-to-one label assignment 有助于 end-to-end detector，但不足以完全移除 NMS。

- [AY-32] Tian, Z., 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: FCOS, one-stage, detector taxonomy
  - 总结: 原文使用《Fcos: Fully convolutional one-stage object detection》来支撑“FCOS 一阶段检测器”这一论述位置。具体作用是：原文用它作为 one-stage detector 代表，帮助区分 one-stage 与 two-stage 检测范式。

- [AY-33] Wang, C.-Y., 2023
  - 标题: YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors
  - 关键词: YOLOv7, real-time detection, one-stage
  - 总结: 原文使用《YOLOv7: Trainable bag-offreebies sets new state-of-the-art for real-time object detectors》来支撑“YOLOv7 实时检测”这一论述位置。具体作用是：原文将它列入 YOLO 系列，说明一阶段检测器在实时目标检测中的代表性。

- [AY-12] Wu, X., 2023
  - 标题: Drfn: A unified framework for complex document layout analysis
  - 关键词: document layout, visually rich documents, deep learning
  - 总结: 原文使用《Drfn: A unified framework for complex document layout analysis》来支撑“文档版面分析”这一论述位置。具体作用是：原文在引言中把它作为 document layout analysis 代表，说明文档图像通常先被转化为视觉理解任务。

- [AY-15] Yu, F., 2023
  - 标题: An effective method for figures and tables detection in academic literature
  - 关键词: table detection, academic literature, document images
  - 总结: 原文使用《An effective method for figures and tables detection in academic literature》来支撑“学术文献图表检测”这一论述位置。具体作用是：原文在引言中把它作为 Table Detection 代表，说明 TSR 前置任务和文档图像检测背景。

- [AY-34] Zhang, S., 2023
  - 标题: Dense distinct query for end-to-end object detection
  - 关键词: dense queries, DDQ, end-to-end detection
  - 总结: 原文使用《Dense distinct query for end-to-end object detection》来支撑“Dense Distinct Queries”这一论述位置。具体作用是：原文用它说明 DETR/query 路线中 dense queries 与 one-to-one assignment 的优化问题及 DDQ 改良。



##### Baseline

- [AY-22] Cai, Z., 2018
  - 标题: Cascade r-cnn: Delving into high quality object detection
  - 关键词: Cascade R-CNN, two-stage detection, RPN
  - 总结: 原文使用《Cascade r-cnn: Delving into high quality object detection》来支撑“Cascade R-CNN 两阶段检测器”这一论述位置。具体作用是：原文把它作为典型 two-stage detector 和本文改造对象，用来说明 RPN、proposal 与多标签同框问题的限制。

- [AY-23] Carion, N., 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, set prediction, transformer detector
  - 总结: 原文使用《End-to-end object detection with transformers》来支撑“DETR / transformer-based end-to-end 检测”这一论述位置。具体作用是：原文用它界定 transformer-based detection models，并与 Cascade R-CNN 对比其处理多标签检测的潜力。

- [AY-1] Fernandes, J., 2023
  - 标题: Tablestrrec: framework for table structure recognition in data sheet images
  - 关键词: detection-based TSR, TableStrRec, information loss
  - 总结: 原文使用《Tablestrrec: framework for table structure recognition in data sheet images》来支撑“TableStrRec 检测式 TSR”这一论述位置。具体作用是：原文把它作为 detection-based TSR 代表，用来说明只定义部分表格组件会造成 header 信息缺失或 formulation 过简。

- [AY-25] Hashmi, K. A., 2021
  - 标题: Guided table structure recognition through anchor optimization
  - 关键词: anchor optimization, detection TSR, Column Header
  - 总结: 原文使用《Guided table structure recognition through anchor optimization》来支撑“anchor optimization TSR”这一论述位置。具体作用是：原文把它列为检测模型加后处理的 TSR 既有工作，并指出这类方法常未定义 Column Header。

- [AY-3] Huang, Y., 2023
  - 标题: Improving table structure recognition with visual-alignment sequential coordinate modeling
  - 关键词: image-to-sequence, visual alignment, coordinate decoder
  - 总结: 原文使用《Improving table structure recognition with visual-alignment sequential coordinate modeling》来支撑“VAST / visual-alignment image-to-sequence TSR”这一论述位置。具体作用是：原文用它代表 image-to-sequence TSR 中关注 cell bounding box 精度和视觉对齐损失的路线。

- [AY-40] Liu, H., 2022
  - 标题: Neural collaborative graph machines for table structure recognition
  - 关键词: graph-based TSR, relation modeling, table cells
  - 总结: 原文使用《Neural collaborative graph machines for table structure recognition》来支撑“协同图机器 TSR”这一论述位置。具体作用是：原文在 graph-based TSR 综述中引用它，说明图建模路线可用于表格结构关系恢复。

- [AY-5] Ly, N. T., 2023
  - 标题: An end-to-end multi-task learning model for image-based table recognition
  - 关键词: multi-task TSR, HTML generation, cell recognition
  - 总结: 原文使用《An end-to-end multi-task learning model for image-based table recognition》来支撑“MTL-TabNet 多任务 image-based TSR”这一论述位置。具体作用是：原文把它作为 image-to-sequence TSR 代表，说明多解码器同时处理 cell box、内容识别和 HTML 生成。

- [AY-6] Ma, C., 2023
  - 标题: Robust table detection and structure recognition from heterogeneous document images
  - 关键词: grid CNN, separator prediction, heterogeneous documents
  - 总结: 原文使用《Robust table detection and structure recognition from heterogeneous document images》来支撑“RobustTabNet / heterogeneous documents”这一论述位置。具体作用是：原文在 graph/grid 路线中引用它，说明先预测行列分隔线再用 Grid CNN 合并单元格的做法。

- [AY-8] Nassar, A., 2022
  - 标题: Tableformer: Table structure understanding with transformers
  - 关键词: TableFormer, transformer TSR, baseline
  - 总结: 原文使用《Tableformer: Table structure understanding with transformers》来支撑“TableFormer transformer TSR”这一论述位置。具体作用是：原文在引言中把它列为 TSR 研究代表，用来显示 image-to-sequence / transformer TSR 已经是重要对比路线。

- [AY-44] Nguyen, N. Q., 2023
  - 标题: Formerge: Recover spanning cells in complex table structure using transformer network
  - 关键词: spanning cells, transformer, complex tables
  - 总结: 原文使用《Formerge: Recover spanning cells in complex table structure using transformer network》来支撑“FOR MERGE / spanning cell 恢复”这一论述位置。具体作用是：原文在 graph-based 或 grid-based 综述中引用它，说明 transformer network 可用于复杂表格 spanning cell 恢复。

- [AY-9] Qiao, L., 2021
  - 标题: Lgpma: Complicated table structure recognition with local and global pyramid mask alignment
  - 关键词: LGPMA, mask alignment, cell matching
  - 总结: 原文使用《Lgpma: Complicated table structure recognition with local and global pyramid mask alignment》来支撑“LGPMA 局部/全局金字塔 mask 对齐”这一论述位置。具体作用是：原文把它作为 graph-based TSR 的代表，用来说明 cell localization、matching 和 empty-cell merging 管线。

- [AY-42] Schreiber, S., 2017
  - 标题: Deepdesrt: Deep learning for detection and structure recognition of tables in document images
  - 关键词: DeepDeSRT, table detection, structure recognition
  - 总结: 原文使用《Deepdesrt: Deep learning for detection and structure recognition of tables in document images》来支撑“DeepDeSRT 检测与结构识别”这一论述位置。具体作用是：原文把它放在早期 TSR 研究列表中，用来代表深度学习检测表格并识别结构的基础路线。

- [AY-20] Shen, H., 2023
  - 标题: Divide rows and conquer cells: Towards structure recognition for large tables
  - 关键词: large tables, error accumulation, two-step decoding
  - 总结: 原文使用《Divide rows and conquer cells: Towards structure recognition for large tables》来支撑“大表格 row/cell 分治识别”这一论述位置。具体作用是：原文在 image-to-sequence TSR 中引用它，说明大尺寸输入下自回归解码存在错误累积，DRCC 用两步解码缓解。

- [AY-27] Siddiqui, S. A., 2019
  - 标题: Deeptabstr: Deep learning based table structure recognition
  - 关键词: DeepTabStR, row-column detection, information loss
  - 总结: 原文使用《Deeptabstr: Deep learning based table structure recognition》来支撑“DeepTabStR 检测式 TSR”这一论述位置。具体作用是：原文用它作为 detection-based TSR 的早期代表，并指出仅检测 row/column 会导致 spanning/header 信息丢失。

- [AY-45] Tensmeyer, C., 2019
  - 标题: Deep splitting and merging for table structure decomposition
  - 关键词: split-and-merge, grid cells, table decomposition
  - 总结: 原文使用《Deep splitting and merging for table structure decomposition》来支撑“SPLERGE split-and-merge TSR”这一论述位置。具体作用是：原文在 grid-based 路线中引用它，说明先预测 row/column projections 再 merge grid cells 的方法。

- [AY-13] Xiao, B., 2022
  - 标题: Efficient information sharing in ict supply chain social network via table structure recognition
  - 关键词: prior TSR work, ICT supply chain, detection formulation
  - 总结: 原文使用《Efficient information sharing in ict supply chain social network via table structure recognition》来支撑“作者前作中的 ICT 供应链 TSR”这一论述位置。具体作用是：原文把它作为 detection-based TSR 相关前作之一，并在 formulation 讨论中说明其简化组件定义的局限。

- [AY-46] Xue, W., 2021
  - 标题: Tgrnet: A table graph reconstruction network for table structure recognition
  - 关键词: graph reconstruction, logical location, GCN
  - 总结: 原文使用《Tgrnet: A table graph reconstruction network for table structure recognition》来支撑“TGRNet 图重建 TSR”这一论述位置。具体作用是：原文在 graph-based 方法中引用它，说明通过 cell detection 与 logical location prediction 共同重建表格结构。

- [AY-21] Ye, J., 2021
  - 标题: Pingan-vcgroup’s solution for icdar 2021 competition on scientific literature parsing task b: Table recognition to html
  - 关键词: ICDAR, table to HTML, competition
  - 总结: 原文使用《Pingan-vcgroup’s solution for icdar 2021 competition on scientific literature parsing task b: Table recognition to html》来支撑“ICDAR 表格识别竞赛方案”这一论述位置。具体作用是：原文引用它作为 TSR 研究和表格转 HTML 任务的代表工作，用来补充已有方法谱系。

- [AY-47] Zhang, Z., 2022
  - 标题: Split, embed and merge: An accurate table structure recognizer
  - 关键词: segmentation, embedder, grid merging
  - 总结: 原文使用《Split, embed and merge: An accurate table structure recognizer》来支撑“SEM split-embed-merge TSR”这一论述位置。具体作用是：原文在 grid-based 方法中引用它，说明 segmentation、Embedder 和 Merger 网络可用于 grid element 合并。

- [AY-16] Zheng, X., 2021
  - 标题: Global table extractor (gte): A framework for joint table identification and cell structure recognition using visual context
  - 关键词: GTE, visual context, TSR dataset
  - 总结: 原文使用《Global table extractor (gte): A framework for joint table identification and cell structure recognition using visual context》来支撑“GTE 视觉上下文表格抽取”这一论述位置。具体作用是：原文在引言和 Related work 中把它作为 TSR/表格识别代表，并在实验贡献中关联 FinTabNet。

- [AY-38] Zhu, X., 2021
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, transformer detector, multi-scale attention
  - 总结: 原文使用《Deformable detr: Deformable transformers for end-to-end object detection》来支撑“Deformable DETR”这一论述位置。具体作用是：原文把它列为 transformer-based detection model 的变体，用来界定本文比较的 end-to-end detector 家族。



##### Dataset

- [AY-30] Chi, Z., 2019
  - 标题: Complicated table structure recognition
  - 关键词: SciTSR, TSR dataset, evaluation
  - 总结: 原文使用《Complicated table structure recognition》来支撑“SciTSR 表格结构识别数据集”这一论述位置。具体作用是：原文既在引言中把它列为 TSR 代表研究，也在贡献和实验设置中用它作为主要评测数据集。

- [AY-26] Lin, T.-Y., 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, mAP, object detection metric
  - 总结: 原文使用《Microsoft coco: Common objects in context》来支撑“COCO 检测基准”这一论述位置。具体作用是：原文借 COCO 说明常规检测框架默认参数和 mAP/IoU 评价来源，并强调这些设置不一定适合 TSR。

- [AY-28] Smock, B., 2022
  - 标题: Pubtables-1 m: Towards comprehensive table extraction from unstructured documents
  - 关键词: PubTables1M, six components, multi-label detection
  - 总结: 原文使用《Pubtables-1 m: Towards comprehensive table extraction from unstructured documents》来支撑“PubTables1M 六类表格组件定义”这一论述位置。具体作用是：原文反复引用它作为信息完整但多标签同框的关键 formulation，对本文 pseudo-class 单标签改写最直接。

- [AY-17] Zhong, X., 2020
  - 标题: Image-based table recognition: data, model, and evaluation
  - 关键词: PubTabNet, TEDS, HTML sequence
  - 总结: 原文使用《Image-based table recognition: data, model, and evaluation》来支撑“PubTabNet 数据、模型与评价”这一论述位置。具体作用是：原文用它定义 PubTabNet / TEDS 相关背景，并作为 image-based table recognition 的关键基准。



##### Component

- [AY-24] Dai, J., 2017
  - 标题: Deformable convolutional networks
  - 关键词: deformable convolution, local features, TEDS mismatch
  - 总结: 原文使用《Deformable convolutional networks》来支撑“deformable convolution”这一论述位置。具体作用是：原文引用它说明 deformable convolution 可改善局部特征，但也用它引出单独优化检测边界可能损害 TEDS 的风险。

- [AY-43] He, K., 2017
  - 标题: Mask r-cnn
  - 关键词: Mask R-CNN, segmentation, cell localization
  - 总结: 原文使用《Mask r-cnn》来支撑“Mask R-CNN / instance segmentation 基础”这一论述位置。具体作用是：原文在 graph-based TSR 中用它说明 LGPMA 等方法可把 cell localization 表述为检测或分割问题。

- [AY-41] Lu, N., 2021
  - 标题: Master: Multiaspect non-local network for scene text recognition
  - 关键词: MASTER, scene text, encoder-decoder
  - 总结: 原文使用《Master: Multiaspect non-local network for scene text recognition》来支撑“MASTER 场景文本识别架构”这一论述位置。具体作用是：原文说明 TableMaster 继承 MASTER 的 transformer 场景文本生成架构，用来定位 image-to-sequence TSR 的模型来源。



##### Tooling

- [AY-18] JaidedA, I., 2022
  - 标题: Easyocr
  - 关键词: OCR, tooling, text extraction
  - 总结: 原文使用《Easyocr》来支撑“EasyOCR 工具”这一论述位置。具体作用是：原文在说明部分 image-to-sequence TSR 需要或规避外部 OCR 工具时引用它，作为 OCR 工具依赖的例子。

- [AY-19] Kuang, Z., 2021
  - 标题: Mmocr: A comprehensive toolbox for text detection, recognition and understanding
  - 关键词: MMOCR, OCR toolbox, text recognition
  - 总结: 原文使用《Mmocr: A comprehensive toolbox for text detection, recognition and understanding》来支撑“MMOCR 工具箱”这一论述位置。具体作用是：原文将它与 EasyOCR 一起作为 OCR / text detection 工具示例，说明端到端 TSR 尝试减少外部 OCR 依赖。

- [AY-7] Mendes, J., 2017
  - 标题: Tabula: A language to model spreadsheet tables
  - 关键词: PDF parsing, table extraction, tool limitation
  - 总结: 原文使用《Tabula: A language to model spreadsheet tables》来支撑“Tabula PDF 表格抽取”这一论述位置。具体作用是：原文在引言中引用它说明传统 PDF 表格解析工具能抽取文本和表格，但难以处理复杂结构和扫描图像。

- [AY-10] Rastan, R., 2019
  - 标题: Texus: A unified framework for extracting and understanding tables in pdf documents
  - 关键词: PDF tables, table extraction, visual context
  - 总结: 原文使用《Texus: A unified framework for extracting and understanding tables in pdf documents》来支撑“TexUS PDF 表格抽取框架”这一论述位置。具体作用是：原文在引言中用它说明直接解析 PDF 的工具/系统仍难以覆盖复杂结构和扫描文档。

- [AY-11] Singer-Vine, J., 2022
  - 标题: Pdfplumber
  - 关键词: PDF parsing, pdfplumber, table extraction
  - 总结: 原文使用《Pdfplumber》来支撑“pdfplumber PDF 表格工具”这一论述位置。具体作用是：原文把它作为直接解析 PDF 表格的工具例子，用于界定传统解析方法在复杂结构和扫描文档上的不足。

- [AY-14] Xiao, B., 2023
  - 标题: Multi-modal ocr system for the ict global supply chain
  - 关键词: OCR, multimodal system, text extraction
  - 总结: 原文使用《Multi-modal ocr system for the ict global supply chain》来支撑“多模态 OCR 系统”这一论述位置。具体作用是：原文用它说明部分端到端 TSR 或图像表格处理仍与 OCR/text extraction 工具链相关。



##### Historical

- [AY-37] Vaswani, A., 2017
  - 标题: Attention is all you need
  - 关键词: transformer, attention, sequence modeling
  - 总结: 原文使用《Attention is all you need》来支撑“Transformer 架构”这一论述位置。具体作用是：原文多处引用它作为 image-to-sequence TSR、DETR 和 transformer-based detectors 的共同技术背景。


# Mask DINO: towards a unified transformer-based framework for object detection and segmentation (2023)

- Paper ref: 1:VQ2WLIDR
- Title: Mask DINO: towards a unified transformer-based framework for object detection and segmentation
- Year: 2023

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-toend object detection with transformers.In European conference on computer vision, pages 213-229 |
| ref-2 | 2019 | Kai Chen; Jiangmiao Pang; et al. | Hybrid task cascade for instance segmentation |
| ref-3 | 2022 | Bowen Cheng; Ishan Misra; et al. | Schwing,Alexander Kirillov,and Rohit Girdhar |
| ref-4 | 2021 | Bowen Cheng; Alexander G | Schwing,and Alexander Kirillov.Per-Pixel Clasification is Not Al You Need for Semantic Segmentation |
| ref-5 | 2016 | Marius Cordts; Mohamed Omran; et al. | The cityscapes dataset for semantic urban scene understanding |
| ref-6 | 2021 | Xianzhi Du; Barret Zoph; et al. | Simple training strategies and model scaling for object detection. arXiv preprint arXiv:2107 |
| ref-7 | 2021 | Yuxin Fang; Shusheng Yang; et al. | Instances as queries |
| ref-8 | 2021 | Golnaz Ghiasi; Yin Cui; et al. | Simple copy-paste is a strong data augmentation method for instance segmentation |
| ref-9 | 2017 | Kaiming He; Georgia Gkioxari; et al. | Mask r-cnn.In Proceedings of the IEEE international conference on computer vision,pages 2961-2969, |
| ref-10 | 2016 | Kaiming He; Xiangyu Zhang; et al. | Deep residual learning for image recognition |
| ref-11 | 2022 | Jitesh Jain; Jiachen Li; et al. | OneFormer: One Transformer to Rule Universal Image Segmentation.arXiv preprint arXiv:2211 |
| ref-12 | 2021 | Jitesh Jain; Anukriti Singh; et al. | SeMask: Semantically Masked Transformers for Semantic Segmentation. arXiv preprint arXiv:2112 |
| ref-13 | 2019 | Alexander Kirillov; Ross Girshick; et al. | Panoptic feature pyramid networks.In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 6399-6408, |
| ref-14 | 2019 | Alexander Kirillov; Kaiming He; et al. | Panoptic segmentation |
| ref-15 | 2022 | Feng Li; Hao Zhang; et al. | DN-DETR: Accelerate DETR Training by Introducing Query DeNoising. arXiv preprint arXiv:2203 |
| ref-16 | 2021 | Zhiqi Li; Wenhai Wang; et al. | Panoptic SegFormer. arXiv preprint arXiv:2109 |
| ref-17 | 2014 | Tsung-Yi Lin; Michael Maire; et al. | Microsoft COCO: Common objects in context |
| ref-18 | 2022 | Shilong Liu; Feng Li; et al. | DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR. arXiv preprint arXiv:2201 |
| ref-19 | 2021 | Ze Liu; Han Hu; et al. | Swin Transformer V2: Scaling Up Capacity and Resolution. arXiv preprint arXiv:2111 |
| ref-20 | 2021 | Ze Liu; Yutong Lin; et al. | Swin transformer: Hierarchical vision transformer using shifted windows |
| ref-21 | 2015 | Jonathan Long; Evan Shelhamer; et al. | Fully convolutional networks for semantic segmentation |
| ref-22 | 2021 | Depu Meng，Xiaokang Chen， Zejia Fan; Gang Zeng; et al. | Conditional DETR for Fast Training Convergence. arXiv preprint arXiv:2108 |
| ref-23 | 2022 | Zipeng Qin; Jianbo Liu; et al. | Pyramid Fusion Transformer for Semantic Segmentation.arXiv preprint arXiv:2201 |
| ref-24 | 2015 | Shaoqing Ren; Kaiming He; et al. | Faster r-cnn: Towards real-time object detection with region proposal networks |
| ref-25 | 2015 | Olaf Ronneberger; Philipp Fischer; et al. | U-net: Convolutional networks for biomedical image segmentation |
| ref-26 |  | Shuai Shao; Zeming Li; et al. | Objects365:A large-scale, high-quality dataset for object detection |
| ref-27 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Attention is all you need |
| ref-28 | 2021 | Huiyu Wang; Yukun Zhu; et al. | Max-deeplab: End-to-end panoptic segmentation with mask transformers |
| ref-29 | 2021 | Yingming Wang; Xiangyu Zhang; et al. | Anchor detr: Query design for transformer-based detector. arXiv preprint arXiv:2109 |
| ref-30 | 2019 | Yuwen Xiong; Renjie Liao; et al. | [Unknown title] |
| ref-31 | 2021 | Mengde Xu; Zheng Zhang; et al. | End-toend semi-supervised object detection with soft teacher |
| ref-32 | 2022 | Hao Zhang; Feng Li; et al. | DINO: DETR withImproved DeNoising Anchor Boxes for End-to-End Ob-ject Detection. arXiv preprint arXiv:2203 |
| ref-33 | 2021 | Wenwei Zhang; Jiangmiao Pang; et al. | K-net: Towards unified image segmentation |
| ref-34 | 2017 | Bolei Zhou; Hang Zhao; et al. | Scene parsing through ade20k dataset |
| ref-35 | 2021 | Xizhou Zhu; Weijie Su; et al. | Deformable detr:Deformable transformers for end-to-end object detection |

## Citation Analysis Report

#### 总体总结
本文在引言和相关工作部分通过清晰的研究脉络组织文献：首先介绍物体检测和图像分割的基础概念及传统 CNN 方法（如 Faster R-CNN、Mask R-CNN、FCN），说明这些方法针对特定任务设计、缺乏泛化能力；然后引入 DETR 类 Transformer 模型的发展，包括 DETR、DAB-DETR、DN-DETR 到 DINO 的技术演进路线，以及 MaskFormer、Mask2Former 等统一分割架构的出现；最后指出当前 Transformer 模型中检测和分割最佳模型仍然分离的问题，引出本文开发统一架构的动机。文章通过对比 CNN 时代成功统一的模型（如 Mask R-CNN、HTC）与 Transformer 时代专用模型的局限，论证了开发统一 Transformer 框架的必要性和可行性。


#### 关键文献

- [1] Nicolas Carion, 2020: End-toend object detection with transformers.In European conference on computer vision, pages 213-229 (Background)

- [3] Bowen Cheng, 2022: Schwing,Alexander Kirillov,and Rohit Girdhar (Uncategorized)

- [32] Hao Zhang, 2022: DINO: DETR withImproved DeNoising Anchor Boxes for End-to-End Ob-ject Detection. arXiv preprint arXiv:2203 (Uncategorized)



#### 范围
- 章节：Introduction + Related Work
- 行号：16-39

#### 按功能归类


##### Background

- [1] Nicolas Carion, 2020
  - 标题：End-toend object detection with transformers.In European conference on computer vision, pages 213-229
  - 关键词：DETR, transformer detector, end-to-end detection
  - 总结：本文引用 DETR 作为基于 Transformer 的检测器的起点，说明其集合预测目标和消除手工设计模块的优势，但指出其分割性能不足。

- [14] Alexander Kirillov, 2019
  - 标题：Panoptic segmentation
  - 关键词：panoptic segmentation, unified segmentation, stuff and things
  - 总结：本文引用全景分割原始论文来定义任务：统一实例和语义分割，预测每个物体或背景段的掩码。

- [21] Jonathan Long, 2015
  - 标题：Fully convolutional networks for semantic segmentation
  - 关键词：FCN, semantic segmentation, pixel-wise classification
  - 总结：本文引用 FCN 作为语义分割的经典 CNN 方法，说明其仅能进行像素级分类的局限性。

- [24] Shaoqing Ren, 2015
  - 标题：Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词：Faster R-CNN, object detection, region proposal
  - 总结：本文引用 Faster R-CNN 作为经典 CNN 检测器的代表，说明传统方法针对特定任务设计、缺乏泛化能力。

- [25] Olaf Ronneberger, 2015
  - 标题：U-net: Convolutional networks for biomedical image segmentation
  - 关键词：U-Net, biomedical segmentation, encoder-decoder
  - 总结：在 Related Work 中作为仅能进行语义分割的 CNN 方法被引用。

- [27] Ashish Vaswani, 2017
  - 标题：Attention is all you need
  - 关键词：Transformer, attention mechanism, sequence modeling
  - 总结：本文引用原始 Transformer 论文作为基础架构背景，说明 DETR 类模型的技术来源。



##### Uncategorized

- [2] Kai Chen, 2019
  - 标题：Hybrid task cascade for instance segmentation
  - 关键词：HTC, instance segmentation, CNN-based unified model
  - 总结：本文用 HTC 作为 CNN 基线，展示传统方法在任务统一方面的局限性（仅支持实例分割）。

- [3] Bowen Cheng, 2022
  - 标题：Schwing,Alexander Kirillov,and Rohit Girdhar
  - 关键词：Mask2Former, universal segmentation, masked attention
  - 总结：本文详细分析 Mask2Former 的架构局限（不适合检测），并作为主要对比基线展示 Mask DINO 的优势。

- [4] Bowen Cheng, 2021
  - 标题：Schwing,and Alexander Kirillov.Per-Pixel Clasification is Not Al You Need for Semantic Segmentation
  - 关键词：MaskFormer, per-pixel classification, mask classification
  - 总结：本文引用 MaskFormer 作为统一分割架构的早期工作，Mask2Former 在其基础上引入 masked attention。

- [7] Yuxin Fang, 2021
  - 标题：Instances as queries
  - 关键词：instances as queries, query-based detection
  - 总结：在 Related Work 中作为基于查询的检测方法被引用。

- [9] Kaiming He, 2017
  - 标题：Mask r-cnn.In Proceedings of the IEEE international conference on computer vision,pages 2961-2969,
  - 关键词：Mask R-CNN, instance segmentation, ROI Align
  - 总结：本文引用 Mask R-CNN 作为 CNN 基线，说明其仅能处理实例分割的局限性。

- [12] Jitesh Jain, 2021
  - 标题：SeMask: Semantically Masked Transformers for Semantic Segmentation. arXiv preprint arXiv:2112
  - 关键词：SeMask, semantic segmentation, masked transformer
  - 总结：在 Related Work 中作为语义分割的专用方法被引用。

- [13] Alexander Kirillov, 2019
  - 标题：Panoptic feature pyramid networks.In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 6399-6408,
  - 关键词：panoptic FPN, panoptic segmentation
  - 总结：在 Related Work 中作为全景分割的专用方法被引用，说明其性能不如专用实例/语义分割模型。

- [15] Feng Li, 2022
  - 标题：DN-DETR: Accelerate DETR Training by Introducing Query DeNoising. arXiv preprint arXiv:2203
  - 关键词：DN-DETR, query denoising, training acceleration
  - 总结：本文引用 DN-DETR 作为 DINO 去噪训练的来源，Mask DINO 继承了这一技术并扩展到掩码预测。

- [18] Shilong Liu, 2022
  - 标题：DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR. arXiv preprint arXiv:2201
  - 关键词：DAB-DETR, dynamic anchor boxes, 4D queries
  - 总结：本文引用 DAB-DETR 作为 DINO 动态锚框公式的来源，Mask DINO 继承并使用锚框指导交叉注意力。

- [23] Zipeng Qin, 2022
  - 标题：Pyramid Fusion Transformer for Semantic Segmentation.arXiv preprint arXiv:2201
  - 关键词：pyramid fusion, semantic segmentation
  - 总结：在 Related Work 中作为语义分割的 Transformer 方法被引用。

- [28] Huiyu Wang, 2021
  - 标题：Max-deeplab: End-to-end panoptic segmentation with mask transformers
  - 关键词：Max-DeepLab, panoptic segmentation, mask transformer
  - 总结：在 Related Work 中作为统一分割的方法被引用。

- [32] Hao Zhang, 2022
  - 标题：DINO: DETR withImproved DeNoising Anchor Boxes for End-to-End Ob-ject Detection. arXiv preprint arXiv:2203
  - 关键词：DINO, DETR improvement, denoising anchor boxes
  - 总结：本文基于 DINO 框架扩展 Mask DINO，继承其锚框公式、去噪训练、查询选择等核心组件并扩展到分割任务。

- [33] Wenwei Zhang, 2021
  - 标题：K-net: Towards unified image segmentation
  - 关键词：K-Net, unified segmentation, kernel-based
  - 总结：在 Related Work 中作为统一实例、全景、语义分割的方法被引用。

- [35] Xizhou Zhu, 2021
  - 标题：Deformable detr:Deformable transformers for end-to-end object detection
  - 关键词：Deformable DETR, deformable attention, sparse sampling
  - 总结：本文引用 Deformable DETR 作为 DINO 使用多尺度特征和稀疏注意力的技术来源，Mask DINO 继承这一设计。



##### Dataset

- [26] Objects365:A large-scale, high-quality dataset for object detection
  - 标题：Objects365:A large-scale, high-quality dataset for object detection
  - 关键词：Objects365, detection dataset, pre-training
  - 总结：本文使用 Objects365 进行_detection_预训练，展示 Mask DINO 可通过统一框架从大规模检测数据中受益于所有分割任务。


# Conditional DETR for fast training convergence (2021)

- Paper ref: 1:W4CDLU28
- Title: Conditional DETR for fast training convergence
- Year: 2021

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2020 | Bochkovskiy, A.; Wang, C.-Y.; et al. | YOLOv4: Optimal speed and accuracy of object detection |
| ref-2 | 2018 | Zhaowei Cai and Nuno Vasconcelos | Cascade R-CNN: delving into high quality object detection |
| ref-3 | 2020 | Nicolas Carion; Francisco Massa; et al. | End-toend object detection with transformers |
| ref-4 | 2020 | Yinpeng Chen; Xiyang Dai; et al. | Dynamic convolution: Attention over convolution kernels |
| ref-5 | 2020 | Zhigang Dai; Bolun Cai; et al. | UP-DETR:unsupervised pre-training for object detection with transformers |
| ref-6 | 2019 | Kaiwen Duan; Song Bai; et al. | Centernet: Keypoint triplets for object detection |
| ref-7 | 2021 | Peng Gao; Minghang Zheng; et al. | Fast convergence of DETR with spatially modulated co-attention |
| ref-8 | 2021 | Zigang Geng; Ke Sun; et al. | Bottom-up human pose estimation via disentangled keypoint regression |
| ref-9 | 2015 | Ross B.Girshick | Fast R-CNN |
| ref-10 | 2010 | Glorot, X.; Bengio, Y. | Understanding the difficulty of training deep feedforward neural networks |
| ref-11 | 2019 | Guo, M.; Zhang, Y.; et al. | Gaussian transformer: A lightweight approach for natural language inference |
| ref-12 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-13 | 2018 | Jie Hu; Li Shen; et al. | Gather-excite: Exploiting feature context in convolutional neural networks |
| ref-14 | 2018 | Jie Hu; Li Shen; et al. | Squeeze-and-excitation networks |
| ref-15 | 2015 | Lichao Huang; Yi Yang; et al. | Densebox:Unifying landmark localization with end to end object detection |
| ref-16 | 2016 | Jia, X.; De Brabandere, B.; et al. | Dynamic filter networks |
| ref-17 | 2020 | Guolin Ke; Di He; et al. | Rethinking positional encoding in language pre-training |
| ref-18 | 2020 | Jaeyoung Kim; Mostafa El-Khamy; et al. | TGSA: transformer with gaussian-weighted self-attention for speech enhancement |
| ref-19 | 2019 | Kong, T.; Sun, F.; et al. | FoveaBox: Beyond anchor-based object detector |
| ref-20 | 1995 | Kuhn, H.W. | The hungarian method for the assignment problem |
| ref-21 | 2020 | Hei Law; Yun Teng; et al. | Cornernet-lite: Efficient keypoint based object detection |
| ref-22 | 2019 | Li, Y.; Chen, Y.; et al. | Scale-aware trident networks for object detection |
| ref-23 | 2020 | Lin, T.-Y.; Goyal, P.; et al. | Focal loss for dense object detection |
| ref-24 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft COCO: Common objects in context |
| ref-25 | 2016 | Wei Liu; Dragomir Anguelov; et al. | Reed, Cheng-Yang Fu,and Alexander C. Berg. SSD: single shot multibox detector |
| ref-26 | 2016 | Liu, W.; Anguelov, D.; et al. | SSD: Single shot multibox detector |
| ref-27 | 2017 | Loshchilov, I.; Hutter, F. | Fixing weight decay regularization in Adam |
| ref-28 | 2019 | Jiangmiao Pang; Kai Chen; et al. | Libra R-CNN: towards balanced learning for object detection |
| ref-29 | 2016 | Joseph Redmon; Santosh Kumar Divvala; et al. | You only look once: Unified,real-time object detection |
| ref-30 | 2017 | Joseph Redmon and Ali Farhadi | YOLO90OO: beter, faster, stronger |
| ref-31 | 2018 | Joseph Redmon and Ali Farhadi | Yolov3: An incremental improvement |
| ref-32 | 2017 | Shaoqing Ren; Kaiming He; et al. | Girshick,and Jian Sun. Faster R-CNN: towards real-time object detection with region proposal networks |
| ref-33 | 2019 | Ren, S.; He, K.; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-34 | 2019 | Rezatofighi, H.; Tsoi, N.; et al. | Generalized intersection over union: A metric and a loss for bounding box regression |
| ref-35 | 2019 | Sun, K.; Xiao, B.; et al. | Deep high-resolution representation learning for human pose estimation |
| ref-36 | 2020 | Sun, Z.; Cao, S.; et al. | Rethinking transformer-based set prediction for object detection |
| ref-37 | 2020 | Tian, Z.; Shen, C.; et al. | Conditional convolutions for instance segmentation |
| ref-38 | 2019 | Tian, Z.; Shen, C.; et al. | FCOS: Fully convolutional one-stage object detection |
| ref-39 | 2017 | Ashish Vaswani; Noam Shazeer; et al. | Gomez,Lukasz Kaiser,and Illia Polosukhin. Attention is all you need |
| ref-40 | 2017 | Vaswani, A.; Shazeer, N.; et al. | Attention is all you need |
| ref-41 | 2019 | Wang, J.; Sun, K.; et al. | Deep high-resolution representation learning for visual recognition |
| ref-42 | 2021 | Yifan Xu; Weijian Xu; et al. | Line segment detection using transformers without edges |
| ref-43 | 2019 | Brandon Yang; Gabriel Bender; et al. | Condconv: Conditionally parameterized convolutions for effcient inference |
| ref-44 | 2021 | Changqian Yu; Bin Xiao; et al. | Lite-hrnet:A lightweight high-resolution network |
| ref-45 | 2019 | Yang, G.; Bender, B.; et al. | CondConv: Conditionally parameterized convolutions for efficient inference |
| ref-46 | 2021 | Yu, C.; Xiao, B.; et al. | Lite-HRNet: A lightweight high-resolution network |
| ref-47 | 2016 | Yu, J.; Jiang, Y.; et al. | UnitBox: An advanced object detection network |
| ref-48 | 2019 | Xingyi Zhou; Dequan Wang; et al. | Objects as points |
| ref-49 | 2019 | Xingyi Zhou; Jiacheng Zhuo; et al. | Botom-up object detection by grouping extreme and center points |
| ref-50 | 2020 | Chenchen Zhu; Fangyi Chen; et al. | Soft anchor-point object detection |
| ref-51 | 2020 | Zhu, C.; Chen, F.; et al. | Soft anchor-point object detection |
| ref-52 | 2020 | Zhu, C.; He, Y.; et al. | Feature selective anchor-free module for single-shot object detection |

## Citation Analysis Report

#### 总体总结
本文在引言与相关工作部分采用三层递进的文献组织策略：首先用大量anchor-based与anchor-free检测器工作铺陈出目标检测领域的两条主流范式，强调它们都依赖精心设计的初始猜测（anchor boxes或object centers）；接着引入DETR [3]作为消除手工组件的新路线，同时指出其训练收敛慢的核心问题；最后通过对比三类解决方案——deformable DETR的稀疏注意力、TSP的交叉注意力消除、以及本文的条件式交叉注意力——明确自身的技术定位。同期工作SMCA [7]作为重要的对照文献进一步凸显了本文方法的可学习衰减机制相对于手工高斯设计的优势。此外，条件卷积（CondConv、CondInst、SENet等）和注意力衰减（Gaussian Transformer、T-GSA）两条技术支线为本文的条件空间查询方案提供了方法论支撑。


#### 关键文献

- [3] Nicolas Carion, 2020: End-toend object detection with transformers (Uncategorized)

- [53] Zhu, C., 2020: Feature selective anchor-free module for single-shot object detection (Uncategorized)

- [7] Peng Gao, 2021: Fast convergence of DETR with spatially modulated co-attention (Uncategorized)

- [37] Sun, Z., 2020: Rethinking transformer-based set prediction for object detection (Uncategorized)



#### 范围
- 章节: Introduction + Related Work
- 行号: 13-49

#### 按功能归类


##### Uncategorized

- [1] Bochkovskiy, A., 2020
  - 标题: YOLOv4: Optimal speed and accuracy of object detection
  - 关键词: anchor-based, one-stage detector, YOLO
  - 总结: 该文作为anchor-based检测器的代表被引用，原文借此展示大多数现有检测方法依赖精心设计的初始猜测（anchor boxes或object centers），从而引出DETR消除手工组件的价值。

- [2] Zhaowei Cai and Nuno Vasconcelos, 2018
  - 标题: Cascade R-CNN: delving into high quality object detection
  - 关键词: anchor-based, R-CNN, cascade
  - 总结: 作为anchor-based检测器代表被引用，用来展示现有方法依赖手工设计的组件（如anchor），与DETR的端到端方案形成对比。

- [3] Nicolas Carion, 2020
  - 标题: End-toend object detection with transformers
  - 关键词: DETR, transformer, object detection, baseline
  - 总结: DETR是本文的直接改进对象。原文引用[3]来介绍DETR的基本架构（transformer编解码器用于目标检测），引用其positional embedding消融实验说明内容嵌入的关键作用（ motivation），并在收敛曲线图中与之直接比较。这是本文最关键的参考文献。

- [4] Yinpeng Chen, 2020
  - 标题: Dynamic convolution: Attention over convolution kernels
  - 关键词: dynamic convolution, conditional kernel, input-dependent
  - 总结: 作为条件/动态卷积相关工作的代表被引用，原文借此将自身条件空间查询方案置于更广泛的"从输入学习参数"研究脉络中。

- [7] Peng Gao, 2021
  - 标题: Fast convergence of DETR with spatially modulated co-attention
  - 关键词: SMCA, concurrent work, Gaussian modulation, DETR variant
  - 总结: SMCA是与本文高度相关的同期工作。原文引用[7]来对比两者的技术差异——SMCA使用手工设计的高斯衰减，而本文采用可学习的条件空间查询。这是关键对比文献。

- [9] Ross B.Girshick, 2015
  - 标题: Fast R-CNN
  - 关键词: R-CNN, anchor-based, two-stage
  - 总结: 作为anchor-based检测器谱系中的一环被引用，用来展示现有方法对精心设计的初始猜测的依赖。

- [11] Guo, M., 2019
  - 标题: Gaussian transformer: A lightweight approach for natural language inference
  - 关键词: Gaussian transformer, attention attenuation, NLI
  - 总结: 作为使用高斯函数衰减注意力权重的相关工作被引用，原文借此说明自身方法采用可学习形式而非人工设计高斯方差的区别。

- [13] Jie Hu, 2018
  - 标题: Gather-excite: Exploiting feature context in convolutional neural networks
  - 关键词: channel-wise weight, gather-excite, feature context
  - 总结: 作为从输入学习通道权重的代表方法被引用，用来丰富"从输入学习参数"这一研究脉络的背景。

- [14] Jie Hu, 2018
  - 标题: Squeeze-and-excitation networks
  - 关键词: SENet, squeeze-and-excitation, channel attention
  - 总结: 作为通道注意力机制的开创性工作被引用，为"从输入学习参数"的研究脉络提供背景。

- [15] Lichao Huang, 2015
  - 标题: Densebox:Unifying landmark localization with end to end object detection
  - 关键词: anchor-free, landmark localization, end-to-end
  - 总结: 作为anchor-free检测器的一个实例被引用，用来展示anchor-free路线的多样性。

- [16] Jia, X., 2016
  - 标题: Dynamic filter networks
  - 关键词: dynamic filter, input-dependent kernel, conditional convolution
  - 总结: 作为条件卷积的开创性工作被引用，原文借此将自身条件空间查询方案置于从输入学习核权重的大框架下。

- [17] Guolin Ke, 2020
  - 标题: Rethinking positional encoding in language pre-training
  - 关键词: TUPE, spatial attention, positional encoding, pre-training
  - 总结: 作为同时使用空间和内容成分计算注意力的相关工作被引用，原文借此说明自身方案在该方向上的独特性——重点在于可学习的注意力衰减机制。

- [18] Jaeyoung Kim, 2020
  - 标题: TGSA: transformer with gaussian-weighted self-attention for speech enhancement
  - 关键词: Gaussian attention, speech enhancement, T-GSA
  - 总结: 作为高斯加权自注意力的代表工作被引用，原文借此展示注意力衰减机制在多个领域（NLI、语音增强）的应用潜力。

- [19] Kong, T., 2019
  - 标题: FoveaBox: Beyond anchor-based object detector
  - 关键词: anchor-free, FoveaBox
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [22] Hei Law, 2020
  - 标题: Cornernet-lite: Efficient keypoint based object detection
  - 关键词: anchor-free, CornerNet, keypoint
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [23] Li, Y., 2019
  - 标题: Scale-aware trident networks for object detection
  - 关键词: anchor-free, trident networks, scale-aware
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [24] Lin, T.-Y., 2020
  - 标题: Focal loss for dense object detection
  - 关键词: anchor-based, RetinaNet, focal loss, one-stage
  - 总结: 作为anchor-based one-stage检测器的代表被引用。

- [26] Wei Liu, 2016
  - 标题: Reed, Cheng-Yang Fu,and Alexander C. Berg. SSD: single shot multibox detector
  - 关键词: anchor-based, SSD, one-stage
  - 总结: 作为anchor-based检测器的代表方法被引用。

- [28] Loshchilov, I., 2017
  - 标题: Fixing weight decay regularization in Adam
  - 关键词: anchor-free
  - 总结: 该条目在anchor-free检测器列表的上下文中被检测到，但实际文献为AdamW优化器，可能存在mention-reference映射偏差。

- [29] Jiangmiao Pang, 2019
  - 标题: Libra R-CNN: towards balanced learning for object detection
  - 关键词: anchor-based, Libra R-CNN, balanced learning
  - 总结: 作为anchor-based检测器的代表方法被引用。

- [30] Joseph Redmon, 2016
  - 标题: You only look once: Unified,real-time object detection
  - 关键词: anchor-free, YOLO, one-stage, pioneering
  - 总结: 作为anchor-free检测器的开创性工作被引用。

- [31] Joseph Redmon and Ali Farhadi, 2017
  - 标题: YOLO90OO: beter, faster, stronger
  - 关键词: anchor-based, YOLO9000
  - 总结: 作为anchor-based检测器演进路线中的一个节点被引用。

- [32] Joseph Redmon and Ali Farhadi, 2018
  - 标题: Yolov3: An incremental improvement
  - 关键词: anchor-based, YOLOv3
  - 总结: 作为anchor-based检测器演进路线中的成熟方案被引用。

- [35] Rezatofighi, H., 2019
  - 标题: Generalized intersection over union: A metric and a loss for bounding box regression
  - 关键词: anchor-based, GIoU, bounding box
  - 总结: 作为anchor-based检测器的代表方法被引用。

- [37] Sun, Z., 2020
  - 标题: Rethinking transformer-based set prediction for object detection
  - 关键词: TSP, set prediction, no cross-attention, DETR variant
  - 总结: 作为解决DETR慢收敛问题的另一条技术路线被引用。TSP选择消除交叉注意力，而本文选择改进交叉注意力，deformable DETR选择稀疏注意力。三者代表不同的解决思路。

- [38] Tian, Z., 2020
  - 标题: Conditional convolutions for instance segmentation
  - 关键词: CondInst, instance segmentation, conditional convolution
  - 总结: 作为条件卷积在实例分割中的成功应用被引用，为"从输入学习核权重"的研究脉络提供具体实例。

- [39] Tian, Z., 2019
  - 标题: FCOS: Fully convolutional one-stage object detection
  - 关键词: anchor-free, FCOS, one-stage
  - 总结: 作为anchor-free one-stage检测器的代表方法被引用。

- [42] Wang, J., 2019
  - 标题: Deep high-resolution representation learning for visual recognition
  - 关键词: HRNet, high-resolution, visual recognition
  - 总结: 作为高分辨率表示学习的代表工作被引用，同时其变体Lite-HRNet出现在通道权重学习的脉络中。

- [44] Brandon Yang, 2019
  - 标题: Condconv: Conditionally parameterized convolutions for effcient inference
  - 关键词: CondConv, conditional convolution, efficient inference
  - 总结: 作为条件卷积的代表方法被引用，说明从输入学习核权重的思路。

- [45] Changqian Yu, 2021
  - 标题: Lite-hrnet:A lightweight high-resolution network
  - 关键词: Lite-HRNet, lightweight, channel weight
  - 总结: 作为轻量级通道权重学习方案被引用。

- [46] Yang, G., 2019
  - 标题: CondConv: Conditionally parameterized convolutions for efficient inference
  - 关键词: anchor-free, UnitBox
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [47] Yu, C., 2021
  - 标题: Lite-HRNet: A lightweight high-resolution network
  - 关键词: ATSS, adaptive training, anchor-free
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [48] Yu, J., 2016
  - 标题: UnitBox: An advanced object detection network
  - 关键词: adaptive clustering, transformer, computation efficiency
  - 总结: 作为降低DETR计算复杂度的方案之一被引用，与deformable DETR的稀疏注意力方案并列。

- [51] Chenchen Zhu, 2020
  - 标题: Soft anchor-point object detection
  - 关键词: anchor-free, soft anchor-point
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [52] Zhu, C., 2020
  - 标题: Soft anchor-point object detection
  - 关键词: anchor-free, feature selective
  - 总结: 作为anchor-free检测器的一个实例被引用。

- [53] Zhu, C., 2020
  - 标题: Feature selective anchor-free module for single-shot object detection
  - 关键词: deformable DETR, sparse attention, fast convergence, DETR variant
  - 总结: 作为解决DETR慢收敛问题的主要对比方案被引用。Deformable DETR选择用稀疏注意力替代全局交叉注意力，而本文选择改进交叉注意力本身。此外，本文在损失函数设计上直接借鉴了deformable DETR的focal loss和偏移回归方案。这是关键参考文献。





#### 时间线分析

##### 早期
早期工作主要奠定了现代目标检测的基础建模思想。包括以Fast R-CNN为代表的两阶段anchor-based检测器、SSD和YOLOv1等one-stage检测器、以及CornerNet和ExtremeNet等anchor-free/keypoint-based检测器。这一时期的工作确立了anchor boxes和object centers作为两种主流初始猜测范式，同时Dynamic Filter Networks开创了从输入学习卷积核的思路，为后续条件卷积路线奠定基础。


- [9] Ross B.Girshick, 2015: Fast R-CNN

- [15] Lichao Huang, 2015: Densebox:Unifying landmark localization with end to end object detection

- [16] Jia, X., 2016: Dynamic filter networks

- [24] Lin, T.-Y., 2020: Focal loss for dense object detection

- [26] Wei Liu, 2016: Reed, Cheng-Yang Fu,and Alexander C. Berg. SSD: single shot multibox detector

- [28] Loshchilov, I., 2017: Fixing weight decay regularization in Adam

- [30] Joseph Redmon, 2016: You only look once: Unified,real-time object detection

- [31] Joseph Redmon and Ali Farhadi, 2017: YOLO90OO: beter, faster, stronger

- [46] Yang, G., 2019: CondConv: Conditionally parameterized convolutions for efficient inference




##### 中期
中期工作将检测器设计推向更成熟的阶段。anchor-based路线出现了YOLOv3、Cascade R-CNN、RetinaNet、Libra R-CNN等精化方案；anchor-free路线发展出FCOS、FoveaBox、Trident Networks等多样化方法。同时，SENet和GENet等通道注意力机制被引入，TUPE开始探索空间与内容双成分注意力，GAU将注意力衰减机制引入transformer。GIoU改进了边界框回归的度量方式。这一时期检测器的精细化设计和注意力机制的演进为DETR的出现铺平了道路。


- [2] Zhaowei Cai and Nuno Vasconcelos, 2018: Cascade R-CNN: delving into high quality object detection

- [11] Guo, M., 2019: Gaussian transformer: A lightweight approach for natural language inference

- [13] Jie Hu, 2018: Gather-excite: Exploiting feature context in convolutional neural networks

- [14] Jie Hu, 2018: Squeeze-and-excitation networks

- [19] Kong, T., 2019: FoveaBox: Beyond anchor-based object detector

- [23] Li, Y., 2019: Scale-aware trident networks for object detection

- [29] Jiangmiao Pang, 2019: Libra R-CNN: towards balanced learning for object detection

- [32] Joseph Redmon and Ali Farhadi, 2018: Yolov3: An incremental improvement

- [35] Rezatofighi, H., 2019: Generalized intersection over union: A metric and a loss for bounding box regression

- [39] Tian, Z., 2019: FCOS: Fully convolutional one-stage object detection

- [42] Wang, J., 2019: Deep high-resolution representation learning for visual recognition

- [44] Brandon Yang, 2019: Condconv: Conditionally parameterized convolutions for effcient inference

- [52] Zhu, C., 2020: Soft anchor-point object detection




##### 近期
近期工作直接收束到本文所处的方法脉络。DETR [3]开创性地将transformer应用于目标检测，消除了NMS和anchor等手工组件，但面临训练收敛慢的问题。对此，deformable DETR [53]和TSP [35]分别用稀疏注意力和消除交叉注意力来应对，而本文提出条件式交叉注意力作为第三条路线。SMCA [7]作为同期工作，用高斯调制调制注意力。同时，CondInst、CondConv、YOLOv4、TUPE、T-GSA等近期工作从条件卷积、注意力衰减等角度丰富了技术背景。


- [1] Bochkovskiy, A., 2020: YOLOv4: Optimal speed and accuracy of object detection

- [3] Nicolas Carion, 2020: End-toend object detection with transformers

- [4] Yinpeng Chen, 2020: Dynamic convolution: Attention over convolution kernels

- [7] Peng Gao, 2021: Fast convergence of DETR with spatially modulated co-attention

- [17] Guolin Ke, 2020: Rethinking positional encoding in language pre-training

- [18] Jaeyoung Kim, 2020: TGSA: transformer with gaussian-weighted self-attention for speech enhancement

- [22] Hei Law, 2020: Cornernet-lite: Efficient keypoint based object detection

- [37] Sun, Z., 2020: Rethinking transformer-based set prediction for object detection

- [38] Tian, Z., 2020: Conditional convolutions for instance segmentation

- [45] Changqian Yu, 2021: Lite-hrnet:A lightweight high-resolution network

- [47] Yu, C., 2021: Lite-HRNet: A lightweight high-resolution network

- [48] Yu, J., 2016: UnitBox: An advanced object detection network

- [51] Chenchen Zhu, 2020: Soft anchor-point object detection

- [53] Zhu, C., 2020: Feature selective anchor-free module for single-shot object detection


# Using the Polar Transform for Efficient Deep Learning-Based Aorta Segmentation in CTA Images (2022)

- Paper ref: 1:XKJFVI8H
- Title: Using the Polar Transform for Efficient Deep Learning-Based Aorta Segmentation in CTA Images
- Year: 2022

## Compact References

_No references artifact rows available._

## Citation Analysis Report

#### 总体总结
本文在引言与相关工作部分先通过早期极坐标变换和U-Net架构工作铺出技术背景，再把直接应用于主动脉分割的3D U-Net和级联网络路线并置比较，最后借极坐标变换网络和数据增强工作的对比把本文的两阶段方法路线明确出来。


#### 关键文献

- [1] Bencevic, M., 2021: Training on Polar Image Transformations Improves Biomedical Image Segmentation (Component)

- [6] Esteves, C., 2018: Polar Transformer Networks (Contrast)



#### 范围
- 章节: I. INTRODUCTION + A. Related work
- 行号: 19-39

#### 按功能归类


##### Component

- [1] Bencevic, M., 2021
  - 标题: Training on Polar Image Transformations Improves Biomedical Image Segmentation
  - 关键词: polar transform, biomedical segmentation, direct predecessor
  - 总结: 该工作是本文方法的直接前身，本文在其基础上增加了对多连通分量的支持，通过分别变换每个对象并融合分割结果。



##### Background

- [2] Fantazzini, A., 2020
  - 标题: 3D Automatic Segmentation of Aortic Computed Tomography Angiography Combining Multi-View 2D Convolutional Neural Networks
  - 关键词: aorta segmentation, cascade U-Net, existing method
  - 总结: 该工作被用来展示现有主动脉分割方法的技术路线，作为本文方法的对比基线。

- [3] Yu, Y., 2021
  - 标题: A Three-Dimensional Deep Convolutional Neural Network for Automatic Segmentation and Diameter Measurement of Type B Aortic Dissection
  - 关键词: 3D U-Net, aortic dissection, existing approach
  - 总结: 该工作被用来展示3D U-Net架构在主动脉分割中的应用，作为现有方法的一种代表。

- [4] Chen, D., 2021
  - 标题: Multi-stage learning for segmentation of aortic dissections using a prior aortic anatomy simplification
  - 关键词: multi-stage learning, aortic dissection, existing approach
  - 总结: 该工作被用来说明现有主动脉分割方法的多样性，作为技术背景的一部分。

- [5] Liu, Q., 2019
  - 标题: DDNet: Cartesian-polar Dual-domain Network for the Joint Optic Disc and Cup Segmentation
  - 关键词: polar transform, medical imaging, prior work
  - 总结: 该工作被用来追溯极坐标变换在医学图像分割中的应用历史，作为技术背景。



##### Contrast

- [6] Esteves, C., 2018
  - 标题: Polar Transformer Networks
  - 关键词: polar transformer, end-to-end, contrast
  - 总结: 该工作被用来与本文方法进行对比，说明本文采用两阶段网络而非端到端架构，更易于适配现有方法。

- [7] Salehinejad, H., 2018
  - 标题: Image Augmentation Using Radial Transform for Training Deep Neural Networks
  - 关键词: radial transform, data augmentation, contrast
  - 总结: 该工作被用来对比不同的预测融合策略，说明本文采用逐对象加权和迟滞阈值化而非多数投票。


# Attention is All you Need (2017)

- Paper ref: 1:Z25GLKZV
- Title: Attention is All you Need
- Year: 2017

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2016 | Ba, J.L.; Kiros, J.R.; et al. | Layer normalization |
| ref-2 | 2014 | Bahdanau, D.; Cho, K.; et al. | Neural machine translation by jointly learning to align and translate |
| ref-3 | 2017 | Britz, D.; Goldie, A.; et al. | Massive exploration of neural machine translation architectures |
| ref-4 | 2016 | Cheng, J.; Dong, L.; et al. | Long short-term memory-networks for machine reading |
| ref-5 | 2014 | Cho, K.; Merrienboer, B.v.; et al. | Learning phrase representations using rnn encoder-decoder for statistical machine translation |
| ref-6 | 2016 | Chollet, F. | Xception: Deep learning with depthwise separable convolutions |
| ref-7 | 2014 | Chung, J.; Gülçehre, Ç.; et al. | Empirical evaluation of gated recurrent neural networks on sequence modeling |
| ref-8 | 2017 | Gehring, J.; Auli, M.; et al. | Convolutional sequence to sequence learning |
| ref-9 | 2013 | Graves, A. | Generating sequences with recurrent neural networks |
| ref-10 | 2016 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-11 | 2001 | Hochreiter, S.; Bengio, Y.; et al. | Gradient flow in recurrent nets: the difficulty of learning long-term dependencies, 2001 |
| ref-12 | 1997 | Schmidhuber, S.H.a.J. | Long short-term memory |
| ref-13 | 2016 | Jozefowicz, R.; Vinyals, O.; et al. | Exploring the limits of language modeling |
| ref-14 | 2016 | Sutskever, Ł.K.a.I. | Neural GPUs learn algorithms |
| ref-15 | 2017 | Kalchbrenner, N.; Espeholt, L.; et al. | Neural machine translation in linear time |
| ref-16 | 2017 | Kim, Y.; Denton, C.; et al. | Structured attention networks |
| ref-17 | 2015 | Ba, D.K.a.J. | Adam: A method for stochastic optimization |
| ref-18 | 2017 | Ginsburg, O.K.a.B. | Factorization tricks for LSTM networks |
| ref-19 | 2017 | Lin, Z.; Feng, M.; et al. | A structured self-attentive sentence embedding |
| ref-20 | 2016 | Kaiser, S.B.Ł. | Can active memory replace attention? In Advances in Neural Information Processing Systems, (NIPS), 2016 |
| ref-21 | 2015 | Luong, M.; Pham, H.; et al. | Effective approaches to attentionbased neural machine translation |
| ref-22 | 2016 | Parikh, A.; Täckström, O.; et al. | A decomposable attention model |
| ref-23 | 2017 | Paulus, R.; Xiong, C.; et al. | A deep reinforced model for abstractive summarization |
| ref-24 | 2016 | Wolf, O.P.a.L. | Using the output embedding to improve language models |
| ref-25 | 2015 | Sennrich, R.; Haddow, B.; et al. | Neural machine translation of rare words with subword units |
| ref-26 | 2017 | Shazeer, N.; Mirhoseini, A.; et al. | Outrageously large neural networks: The sparsely-gated mixture-of-experts layer |
| ref-27 | 2014 | Srivastava, N.; Hinton, G.E.; et al. | Dropout: a simple way to prevent neural networks from overfitting |
| ref-28 | 2015 | Sukhbaatar, S.; szlam, a.; et al. | End-to-end memory networks |
| ref-29 | 2014 | Sutskever, I.; Vinyals, O.; et al. | Sequence to sequence learning with neural networks |
| ref-30 | 2015 | Szegedy, C.; Vanhoucke, V.; et al. | Rethinking the inception architecture for computer vision |
| ref-31 | 2016 | Wu, Y.; Schuster, M.; et al. | Google’s neural machine translation system: Bridging the gap between human and machine translation |
| ref-32 | 2016 | Zhou, J.; Cao, Y.; et al. | Deep recurrent models with fast-forward connections for neural machine translation |

## Citation Analysis Report

#### 总体总结
原文在引言与相关工作部分通过三条主要研究脉络组织引文：首先追溯从RNN/LSTM到注意力机制的序列建模范式演进，确立循环架构的历史地位及其顺序计算瓶颈；其次梳理卷积序列模型（ConvS2S、ByteNet）作为并行化替代方案的尝试与局限；最后聚焦于注意力机制本身的多样化发展，从结构化注意力到可分解注意力，为Transformer纯注意力架构的提出铺平道路。论述动作上，先铺技术背景（RNN主导但受限），再对比主流范式（卷积并行但长程依赖困难），最后引出本文路线（纯注意力实现完全并行化）。


#### 关键文献

- [2] Bahdanau, D., 2014: Neural machine translation by jointly learning to align and translate (Background)

- [8] Gehring, J., 2017: Convolutional sequence to sequence learning (Contrast)

- [9] Graves, A., 2013: Generating sequences with recurrent neural networks (Background)

- [17] Ba, D.K.a.J., 2015: Adam: A method for stochastic optimization (Component)

- [21] Luong, M., 2015: Effective approaches to attentionbased neural machine translation (Background)

- [29] Sutskever, I., 2014: Sequence to sequence learning with neural networks (Background)



#### 范围
- 章节: Introduction through Conclusion
- 行号: 25-222

#### 按功能归类


##### Component

- [1] Ba, J.L., 2016
  - 标题: Layer normalization
  - 关键词: layer normalization, training stability, residual connection
  - 总结: 原文在层归一化技术的上下文中引用该工作，作为技术背景，支撑Transformer架构设计。

- [10] He, K., 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: residual learning, ResNet, skip connection
  - 总结: 原文在残差学习的上下文中引用该工作，作为技术背景，支撑Transformer架构设计。

- [17] Ba, D.K.a.J., 2015
  - 标题: Adam: A method for stochastic optimization
  - 关键词: Adam optimizer, stochastic optimization, training
  - 总结: 原文在Adam优化器的上下文中引用该工作，作为关键基线，支撑Transformer架构设计。

- [24] Wolf, O.P.a.L., 2016
  - 标题: Using the output embedding to improve language models
  - 关键词: output embedding, weight sharing, language model
  - 总结: 原文在输出嵌入改进语言模型的上下文中引用该工作，作为技术背景，支撑Transformer架构设计。

- [25] Sennrich, R., 2015
  - 标题: Neural machine translation of rare words with subword units
  - 关键词: BPE, subword units, rare words
  - 总结: 原文在子词单元处理稀有词的上下文中引用该工作，作为关键基线，支撑Transformer架构设计。

- [27] Srivastava, N., 2014
  - 标题: Dropout: a simple way to prevent neural networks from overfitting
  - 关键词: dropout, regularization, overfitting prevention
  - 总结: 原文在Dropout正则化的上下文中引用该工作，作为关键基线，支撑Transformer架构设计。



##### Background

- [2] Bahdanau, D., 2014
  - 标题: Neural machine translation by jointly learning to align and translate
  - 关键词: attention, machine translation, encoder-decoder
  - 总结: 原文在注意力机制在机器翻译中的应用的上下文中引用该工作，作为关键基线，建立研究背景。

- [3] Britz, D., 2017
  - 标题: Massive exploration of neural machine translation architectures
  - 关键词: NMT architectures, transformer comparison
  - 总结: 原文在神经机器翻译架构探索的上下文中引用该工作，作为技术背景，建立研究背景。

- [4] Cheng, J., 2016
  - 标题: Long short-term memory-networks for machine reading
  - 关键词: LSTM, reading comprehension, self-attention context
  - 总结: 原文在LSTM在阅读理解中的应用的上下文中引用该工作，作为技术背景，建立研究背景。

- [5] Cho, K., 2014
  - 标题: Learning phrase representations using rnn encoder-decoder for statistical machine translation
  - 关键词: RNN, encoder-decoder, sequence modeling
  - 总结: 原文在RNN编码器-解码器的上下文中引用该工作，作为技术背景，建立研究背景。

- [6] Chollet, F., 2016
  - 标题: Xception: Deep learning with depthwise separable convolutions
  - 关键词: separable convolutions, computational complexity
  - 总结: 原文在深度可分离卷积的上下文中引用该工作，作为技术背景，建立研究背景。

- [7] Chung, J., 2014
  - 标题: Empirical evaluation of gated recurrent neural networks on sequence modeling
  - 关键词: GRU, sequence modeling, RNN variants
  - 总结: 原文在门控循环神经网络的上下文中引用该工作，作为技术背景，建立研究背景。

- [9] Graves, A., 2013
  - 标题: Generating sequences with recurrent neural networks
  - 关键词: RNN, sequence generation, autoregressive
  - 总结: 原文在RNN序列生成的上下文中引用该工作，作为技术背景，建立研究背景。

- [11] Hochreiter, S., 2001
  - 标题: Gradient flow in recurrent nets: the difficulty of learning long-term dependencies, 2001
  - 关键词: gradient flow, long-term dependencies, RNN limitations
  - 总结: 原文在循环网络中的梯度流的上下文中引用该工作，作为技术背景，建立研究背景。

- [12] Schmidhuber, S.H.a.J., 1997
  - 标题: Long short-term memory
  - 关键词: LSTM, sequence modeling, RNN
  - 总结: 原文在LSTM的上下文中引用该工作，作为技术背景，建立研究背景。

- [13] Jozefowicz, R., 2016
  - 标题: Exploring the limits of language modeling
  - 关键词: language modeling, scaling, limits
  - 总结: 原文在语言模型极限探索的上下文中引用该工作，作为技术背景，建立研究背景。

- [14] Sutskever, Ł.K.a.I., 2016
  - 标题: Neural GPUs learn algorithms
  - 关键词: neural GPU, parallel sequence, convolutional
  - 总结: 原文在神经GPU的上下文中引用该工作，作为技术背景，建立研究背景。

- [16] Kim, Y., 2017
  - 标题: Structured attention networks
  - 关键词: structured attention, attention variants
  - 总结: 原文在结构化注意力网络的上下文中引用该工作，作为技术背景，建立研究背景。

- [18] Ginsburg, O.K.a.B., 2017
  - 标题: Factorization tricks for LSTM networks
  - 关键词: LSTM factorization, computational efficiency
  - 总结: 原文在LSTM因子化技巧的上下文中引用该工作，作为技术背景，建立研究背景。

- [19] Lin, Z., 2017
  - 标题: A structured self-attentive sentence embedding
  - 关键词: self-attention, sentence embedding, NLP applications
  - 总结: 原文在结构化自注意句子嵌入的上下文中引用该工作，作为技术背景，建立研究背景。

- [20] Kaiser, S.B.Ł., 2016
  - 标题: Can active memory replace attention? In Advances in Neural Information Processing Systems, (NIPS), 2016
  - 关键词: active memory, attention alternative, NIPS
  - 总结: 原文在主动记忆与注意力的上下文中引用该工作，作为技术背景，建立研究背景。

- [21] Luong, M., 2015
  - 标题: Effective approaches to attentionbased neural machine translation
  - 关键词: attention NMT, effective approaches, Luong attention
  - 总结: 原文在注意力神经机器翻译的上下文中引用该工作，作为关键基线，建立研究背景。

- [22] Parikh, A., 2016
  - 标题: A decomposable attention model
  - 关键词: decomposable attention, NLP, EMNLP
  - 总结: 原文在可分解注意力模型的上下文中引用该工作，作为技术背景，建立研究背景。

- [23] Paulus, R., 2017
  - 标题: A deep reinforced model for abstractive summarization
  - 关键词: reinforcement learning, summarization, self-attention application
  - 总结: 原文在强化摘要模型的上下文中引用该工作，作为技术背景，建立研究背景。

- [26] Shazeer, N., 2017
  - 标题: Outrageously large neural networks: The sparsely-gated mixture-of-experts layer
  - 关键词: mixture-of-experts, scaling, sparse networks
  - 总结: 原文在混合专家层的上下文中引用该工作，作为技术背景，建立研究背景。

- [28] Sukhbaatar, S., 2015
  - 标题: End-to-end memory networks
  - 关键词: memory networks, recurrent attention, NIPS
  - 总结: 原文在端到端记忆网络的上下文中引用该工作，作为技术背景，建立研究背景。

- [29] Sutskever, I., 2014
  - 标题: Sequence to sequence learning with neural networks
  - 关键词: seq2seq, neural machine translation, NIPS
  - 总结: 原文在序列到序列学习的上下文中引用该工作，作为关键基线，建立研究背景。

- [31] Wu, Y., 2016
  - 标题: Google’s neural machine translation system: Bridging the gap between human and machine translation
  - 关键词: GNMT, production NMT, Google translation
  - 总结: 原文在Google神经机器翻译系统的上下文中引用该工作，作为关键基线，建立研究背景。



##### Contrast

- [8] Gehring, J., 2017
  - 标题: Convolutional sequence to sequence learning
  - 关键词: ConvS2S, convolutional sequence, baseline comparison
  - 总结: 原文在卷积序列到序列学习的上下文中引用该工作，作为关键基线，与Transformer进行对比。

- [15] Kalchbrenner, N., 2017
  - 标题: Neural machine translation in linear time
  - 关键词: ByteNet, linear time, dilated convolution
  - 总结: 原文在线性时间神经机器翻译的上下文中引用该工作，作为技术背景，与Transformer进行对比。



##### Baseline

- [32] Zhou, J., 2016
  - 标题: Deep recurrent models with fast-forward connections for neural machine translation
  - 关键词: fast-forward connections, recurrent models, NMT baseline, BLEU comparison
  - 总结: 原文在结果表格中引用该工作作为性能对比基线，展示Transformer在BLEU分数和训练效率上均优于该模型。
