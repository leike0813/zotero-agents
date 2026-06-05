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
