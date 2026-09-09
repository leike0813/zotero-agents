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
