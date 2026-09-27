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
