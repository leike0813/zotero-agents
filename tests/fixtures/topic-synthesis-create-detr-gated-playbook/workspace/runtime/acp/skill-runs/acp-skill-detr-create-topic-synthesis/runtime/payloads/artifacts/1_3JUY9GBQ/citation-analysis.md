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
