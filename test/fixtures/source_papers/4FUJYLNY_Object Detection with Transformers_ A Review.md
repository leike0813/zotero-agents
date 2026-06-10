Review

# Object Detection with Transformers: A Review

Tahira Shehzadi 1,2,3,\* , Khurram Azeem Hashmi 1,2,3 , Marcus Liwicki 4 , Didier Stricker 1,2,3   
and Muhammad Zeshan Afzal 1,2,3

Department of Computer Science, Technical University of Kaiserslautern, 67663 Kaiserslautern, Germany; muhammad\_zeshan.afzal@dfki.de (M.Z.A.)

2 Mindgarage Lab, Technical University of Kaiserslautern, 67663 Kaiserslautern, Germany

3 German Research Institute for Artificial Intelligence (DFKI), 67663 Kaiserslautern, Germany

4 Department of Computer Science, Electrical and Space Engineering, Luleå University of Technology, 971 87 Luleå, Sweden

Correspondence: tahira.shehzadi@dfki.de

## Abstract

The astounding performance of transformers in natural language processing (NLP) has motivated researchers to explore their applications in computer vision tasks. A detection transformer (DETR) introduces transformers to object detection tasks by reframing detection as a set prediction problem. Consequently, it eliminates the need for proposal generation and post-processing steps. Despite competitive performance, DETR initially suffered from slow convergence and poor detection of small objects. However, numerous improvements are proposed to address these issues, leading to substantial improvements, enabling DETR to achieve state-of-the-art performance. To the best of our knowledge, this paper is the first to provide a comprehensive review of 25 recent DETR advancements. We dive into both the foundational modules of DETR and its recent enhancements, such as modifications to the backbone structure, query design strategies, and refinements to attention mechanisms. Moreover, we conduct a comparative analysis across various detection transformers, evaluating their performance and network architectures. We aim for this study to encourage further research in addressing the existing challenges and exploring the application of transformers in the object detection domain.

![](Images_GFP684MN/c514bb2c7e1ee2c19c5c48012bc5d813b5a109874e84c32783c402d698515f4e.jpg)

Academic Editor: Liang-Jian Deng

Received: 16 August 2025   
Revised: 24 September 2025   
Accepted: 26 September 2025   
Published: 1 October 2025

Citation: Shehzadi, T.; Hashmi, K.A.; Liwicki, M.; Stricker, D.; Afzal, M.Z. Object Detection with Transformers: A Review. Sensors 2025, 25, 6025. https://doi.org/10.3390/s25196025

Copyright: © 2025 by the authors. Licensee MDPI, Basel, Switzerland. This article is an open access article distributed under the terms and conditions of the Creative Commons Attribution (CC BY) license (https://creativecommons.org/lice nses/by/4.0/).

Keywords: transformer; object detection; DETR; computer vision; deep neural networks

## 1. Introduction

Object detection is a fundamental task in computer vision that involves locating and classifying objects within an image [1–6], with applications in autonomous driving, surveillance, robotics, and medical imaging. In autonomous driving, for example, accurately detecting pedestrians, vehicles, and traffic signs in real time is critical for safety. Traditionally, convolutional neural networks (CNNs), such as faster R-CNN [1] and RetinaNet [4], have served as the primary backbones for object detection models, achieving impressive performance. However, these models heavily rely on hand-crafted components like region proposal networks (RPNs) and post-processing steps such as non-maximum suppression (NMS) [7], which complicate the training pipeline and limit end-to-end optimization. The recent success of transformers in natural language processing (NLP) has motivated researchers to explore their potential in computer vision [8]. The transformer architecture [9,10] effectively captures long-range dependencies in sequential data, enabling global context modeling that is difficult for traditional CNNs. This capability makes transformers particularly attractive for object detection, where recognizing objects often depends on global context.

The transformer architecture [9,10] is characterized by its encoder–decoder structure and the use of self-attention and cross-attention mechanisms, which allow it to capture long-range dependencies across input sequences effectively. Unlike CNNs, which primarily focus on local features through convolutional kernels, transformers can model global relationships across an entire image. This capability makes transformers particularly suitable for object detection, where understanding the spatial and contextual relationships between multiple objects is crucial. Leveraging this strength, researchers have explored transformer-based approaches to develop end-to-end object detection frameworks that do not rely on hand-crafted components.

In this context, Carion et al. (2020) proposed the detection transformer (DETR) [11], a novel framework that replaces traditional region proposal-based methods with a end-to-end trainable architecture using a transformer encoder–decoder network. The DETR network demonstrates promising performance, outperforming conventional CNN-based object detectors [12–19], while also eliminating the need for components such as region proposal networks and post-processing steps like non-maximum suppression (NMS) [7]. Despite these advantages, DETR has certain limitations, including slow training convergence and reduced performance on small objects, which have motivated numerous modifications and improvements in subsequent research.

Since DETR’s introduction, numerous variants have emerged to address limitations such as slow convergence, small object detection, and computational efficiency. Figure 1 illustrates the growth and evolution of DETR research, showing rising publications and citations, widespread architectural modifications, and a focus on key challenges like improving training stability, efficiency, and small object performance. This highlights the rapid expansion of transformer-based detection, emphasizing the need for a comprehensive review, to which numerous DETR variants have responded. Deformable-DETR [20] modifies the attention modules to process the image feature maps by considering the attention mechanism as the main reason for slow training convergence, while UP-DETR [21] proposes modifications to pre-train DETR similar to the pre-training of transformers in natural language processing. Efficient-DETR [22], based on original DETR and Deformable-DETR, examines the randomly initialized object probabilities, including reference points and object queries, which is one of the reasons for multiple training iterations. SMCA-DETR [23] introduces a spatially modulated co-attention module that replaces the existing co-attention mechanism in DETR to overcome slow training convergence, and TSP-DETR [24] deals with cross-attention and the instability of bipartite matching. Conditional-DETR [25] presents a conditional cross-attention mechanism, while WB-DETR [26] considers a CNN backbone for feature extraction as an extra component and presents a transformer encoder–decoder network without a backbone. PnP-DETR [27] proposes a PnP sampling module to reduce spatial redundancy and improve computational efficiency. Dynamic-DETR [28] introduces dynamic attention in the encoder–decoder network, YOLOS-DETR [29] demonstrates the transferability and versatility of the transformer from image recognition to detection, Anchor-DETR [30] proposes object queries as anchor points, Sparse-DETR [31] reduces computational cost via token filtering, D2ETR [32] uses cross-scale attention in the decoder, FP-DETR [33] reformulates pre-training and fine-tuning, and CF-DETR [34] refines predicted locations to improve small object detection. Further improvements targeting training stability and small object performance include DN-DETR [35], which uses noised object queries as additional decoder input to reduce the instability of the bipartite-matching mechanism, AdaMixer [36], which considers the encoder an extra network between the backbone and decoder and introduces a 3D sampling process, REGO-DETR [37], which proposes an RoI-based method for detection refinement, and DINO [38], which uses positive and negative noised object queries to accelerate convergence and enhance performance on small objects. These successive innovations collectively address the limitations of the original DETR while retaining its advantages as a fully end-to-end transformer-based object detector. FP-DETR [33] reformulates the pre-training and fine-tuning stages for detection transformers. CF-DETR [34] refines the predicted locations by utilizing local information, as incorrect bounding box location reduces performance on small objects.

![](Images_GFP684MN/e74b6930f314f176ea39cf2a148b08c9ce97a03f02b01c09a6f25c9d994170df.jpg)

![](Images_GFP684MN/9257ee4fb1bc2d0948731b4d1a12759bbac63a85c778819757fbbeef3222c67c.jpg)

![](Images_GFP684MN/e2b186443539d9f00a83527d7bd004200983b49fa17f50cd39f199a34f1f416c.jpg)

![](Images_GFP684MN/2eae80c82c80c0911466e8740e86190d34c5ab17823279e98b99313153edcacf.jpg)

(e) Timeline of important developments in DEtection TRansformers (DETR)  
![](Images_GFP684MN/89d759034494e7cb0ef369187dd866546fdd7b63c1f2fae502d3b1ac6d807af8.jpg)  
Figure 1. Statistical overview of the literature on transformers. (a) Number of citations per year for transformer papers. (b) Citations in the last 12 months on detection transformer papers. (c) Modification percentage in the original detection transformer (DETR) to improve the performance and convergence speed. (d) Number of peer-reviewed publications per year that used DETR as a baseline. (e) A non-exhaustive timeline overview of important developments in DETR for detection tasks.

DN-DETR [35] uses noised object queries as additional decoder input to reduce the instability of the bipartite-matching mechanism in DETR, which causes the slow convergence problem. AdaMixer [36] considers the encoder an extra network between the backbone and decoder that limits the performance and slows the training convergence because of its design complexity. It proposes a 3D sampling process and a few other modifications in the decoder. REGO-DETR [37] proposes an RoI-based method for detection refinement to improve the attention mechanism in the detection transformer. DINO [38] considers positive and negative noised object queries to make training convergence faster and to enhance the performance on small objects. Building on these improvements, Co-DETR [39] introduces collaborative hybrid assignments to improve training stability and convergence speed, addressing limitations in bipartite matching and small object performance. LW-DETR [40] focuses on efficiency, using a lightweight ViT encoder, a shallow decoder, and global attention to reduce computational cost while maintaining competitive accuracy. RT-DETR [41] combines a hybrid encoder with multi-scale feature processing and IoUaware query selection to achieve adaptable inference speed, balancing high accuracy with real-time performance.

The rapid pace of advancements makes it difficult to track progress systematically. Thus, a review of ongoing progress is necessary and would be helpful for the researchers in the field. This paper provides a detailed overview of recent advancements in detection transformers. Table 1 shows the overview of Detection Transformer (DETR) modifications to improve performance and training convergence. Many surveys have studied deep learning approaches in object detection [42–47]. Table 2 lists existing object detection surveys. Among these, several studies comprehensively review approaches that process different 2D data types [48–51], while others focus on specific 2D applications [52–59] or related tasks such as segmentation [60–62], image captioning [63–66], and object tracking [67]. Furthermore, some surveys examine deep learning methods and introduce vision transformers [68–71]. Nonetheless, most of these surveys were published before recent improvements in detection transformer networks, and a comprehensive review of transformer-based object detectors is still lacking. Therefore, a detailed survey of ongoing advancements is necessary to provide guidance and insights for researchers.

Table 1. Overview of improvements in the detection transformer (DETR) to make training convergence faster and improve performance for small objects. Here, Bk represents the backbone, Pre denotes pre-training, Attn indicates attention, and Qry represents the query of the transformer network. Each method represents an improvement over the baseline DETR, and the green check marks indicate where modifications were introduced. The main contributions of each network are summarized in the last column. All GitHub links in this Table are accessed on 25 September 2025.
<table><tr><td rowspan="2">Methods</td><td colspan="4">Modifications</td><td rowspan="2">Publication</td><td rowspan="2">Highlights</td></tr><tr><td>Bk</td><td>Pre</td><td></td><td>Attn Qry</td></tr><tr><td>DETR [11] GitHub https://github.com/facebookresearch/detr</td><td></td><td></td><td></td><td></td><td>ECCV 2020</td><td>Transformer, Set-based prediction, bipartite matching</td></tr><tr><td>Deformable-DETR [20] GitHub https: //github.com/fundamentalvision/Deformable-DETR</td><td></td><td></td><td></td><td></td><td>ICLR 2021</td><td>Deformable-attention module</td></tr><tr><td>UP-DETR [21] GitHub https://github.com/dddzg/up-detr</td><td></td><td>5</td><td></td><td></td><td>CVPR 2021</td><td>Unsupervised pre-training, random query patch detection</td></tr><tr><td>Efficient-DETR [22]</td><td></td><td></td><td></td><td></td><td>arXiv 2021</td><td>Refence point and top-k queries selection module</td></tr><tr><td>SMCA-DETR [23] GitHub https: //github.com/gaopengcuhk/SMCA-DETR</td><td></td><td></td><td></td><td></td><td>ICCV 2021</td><td>Spatially-Modulated Co-attention module</td></tr><tr><td>TSP-DETR [24] GitHub https: //github.com/Edward-Sun/TSP-Detection</td><td></td><td></td><td></td><td></td><td>ICCV 2021</td><td>TSP-FCOS and TSP-RCNN modules for cross attention</td></tr><tr><td>Conditional-DETR [25] GitHub htts: // github.com/Atten4Vis/ConditionalDETR</td><td></td><td></td><td></td><td></td><td>ICCV 2021</td><td>Conditional spatial queries</td></tr><tr><td>WB-DETR [26] GitHub https://github.com/aybora/wbdetr</td><td>√</td><td></td><td></td><td></td><td>ICCV 2021</td><td>Encoder-decoder network without a backbone,LIE-T2T encoder module</td></tr><tr><td>PnP-DETR [27] GitHub https: //github.com/twangnh/pnp-detr</td><td></td><td></td><td>√</td><td></td><td>ICCV 2021</td><td>PnP sampling module including pool sampler and poll sampler</td></tr><tr><td>Dynamic-DETR [28]</td><td></td><td></td><td></td><td></td><td>ICCV 2021</td><td>Dynamic attention in the encoder-decoder network</td></tr><tr><td>YOLOS-DETR [29] GitHub https://github.com/hustvl/YOLOS</td><td></td><td></td><td></td><td></td><td>NeurIPS 2021</td><td>Pre-training encoder network</td></tr><tr><td>Anchor-DETR [30] GitHub https: //github.com/megvii-research/AnchorDETR</td><td></td><td></td><td>√</td><td></td><td>AAAI 2022</td><td>Row and Column decoupled-attention, object queries as anchor points</td></tr><tr><td>Sparse-DETR [31] GitHub https: //github.com/kakaobrain/sparse-detr D²ETR [32] GitHub https:</td><td></td><td></td><td></td><td></td><td>ICLR 2022</td><td>Cross-attention map predictor, deformable-attention module</td></tr><tr><td>//github.com/alibaba/easyrobust/tree/main/ddetr</td><td></td><td></td><td>√</td><td></td><td>arXiv 2022</td><td>Fine fused features, cross-scale attention module</td></tr><tr><td>FP-DETR [33] GitHub https: //github.com/encounter1997/FP-DETR</td><td>√</td><td></td><td></td><td></td><td>ICLR 2022</td><td>Multiscale tokenizer in place of CNN backbone,pre-training encoder network</td></tr><tr><td>CF-DETR [34]</td><td></td><td></td><td>√</td><td></td><td>AAAI 2022</td><td>TEF module to capture spatial relationships,a coarse and a fine layer in the decoder network</td></tr><tr><td>DAB-DETR [72] GitHub https: // github.com/IDEA-Research/DAB-DETR</td><td></td><td></td><td></td><td></td><td>ICLR 2022</td><td>Dynamic anchor boxes as object queries</td></tr><tr><td>DN-DETR [35] GitHub https: //github.com/IDEA-Research/DN-DETR</td><td></td><td></td><td></td><td></td><td>CVPR 2022</td><td>Positive noised object queries</td></tr></table>

Table 1. Cont.
<table><tr><td rowspan="2">Methods</td><td colspan="4">Modifications</td><td rowspan="2">Publication</td><td rowspan="2">Highlights</td></tr><tr><td>Bk</td><td>Pre</td><td>Attn</td><td>Qry</td></tr><tr><td>AdaMixer [36] GitHub https: //github.com/MCG-NJU/AdaMixer</td><td></td><td></td><td></td><td></td><td>CVPR 2022</td><td>3D sampling module, Adaptive mixing module in the decoder</td></tr><tr><td>REGO [37] GitHub https: //github.com/zhechen/Deformable-DETR-REGO</td><td></td><td></td><td></td><td></td><td>CVPR 2022</td><td>A multi-level recurrent mechanism and a glimpse-based decoder</td></tr><tr><td>DINO [38] GitHub https: //github.com/facebookresearch/dino</td><td></td><td></td><td></td><td></td><td>arXiv 2022</td><td>Contrastive denoising module, positive and negative noised object queries</td></tr><tr><td>Co-DETR [39] GitHub https: / / github.com/Sense-X/Co-DETR</td><td></td><td></td><td></td><td></td><td>ICCV 2023</td><td>Collaborative hybrid assignments for faster convergence and improved training stability</td></tr><tr><td>LW-DETR [40] GitHub https: // github.com/Atten4Vis/LW-DETR</td><td></td><td></td><td></td><td></td><td>arXiv 2024</td><td>Lightweight DETR with optimized ViT encoder, shallow decoder,and global attention</td></tr><tr><td>RT-DETR [41] GitHub https: //github.com/lyuwenyu/RT-DETR</td><td></td><td></td><td>√</td><td>√</td><td>CVPR 2024</td><td>Hybrid encoder with multi-scale features, IoU-aware query selection,adaptable inference speed</td></tr></table>

Table 2. Overview of previous surveys on object detection. For each paper, the publication details are provided.
<table><tr><td>Title</td><td>Year</td><td>Venue</td><td>Description</td></tr><tr><td>Advanced Deep-Learning Techniques forSalient and Category-SpecificObject Detection: ASurvey[50]</td><td>2018</td><td>SPM</td><td>It providesanoverviewofdiferentobjectdetectiondomains, including ojectetection(OD),sentODndcategoryspic</td></tr><tr><td>Object Detection in 20 Years: A Survey [73]</td><td>2019</td><td>TPAMI</td><td>This work gives an overview of the evolution of object detectors.</td></tr><tr><td>Deep Learning for Generic Object Detection: A Survey [51]</td><td>2019</td><td>IJCV</td><td> A review on deep learning techniques on generic object detection.</td></tr><tr><td>A Survey on Deep Learning-based Architectures for Semantic Segmentationon2Dimages [53]</td><td>2020</td><td>PRJ</td><td>Deep learning-based method for semantic segmentation are reviewed.</td></tr><tr><td>A Survey of Modern Deep Learning based Object Detection Models[74]</td><td>2021</td><td>ICV</td><td>Itbriefly overviews deep learning-based (regression-based single-stage and candidate-based two-stage) object detectors.</td></tr><tr><td>A Survey of Object Detection Based on CNN and Transformer [70]</td><td>2021</td><td>PRML</td><td>A review of thebenefits and drawbacks of deep learning-based object detectors and introduction of transformer-based methods.</td></tr><tr><td>Transformers in computational visual media: A survey [71]</td><td>2021</td><td>CVM</td><td>It focuses on backbone design and low-level vision using vision transformer methods.</td></tr><tr><td>A survey: object detection methods from CNN to transformer [68]</td><td>2022</td><td>MTA</td><td>Comparison of various CNN-based detection networks and introduction of transformer-based detection networks.</td></tr><tr><td>A Survey on Vision Transformer [69]</td><td>2023</td><td>TPAMI</td><td>This paper provides an overview of vision transformers and focuses on summarizing thestate-of-the-art research inthe fieldof vision transformers (ViTs).</td></tr></table>

1. A detailedreview of transformer-based detection methods from an architectural perspective. We categorize and summarize improvements in the detection transformer (DETR) according to backbone modifications, pre-training level, attention mechanism, query design, etc. This analysis aims to help researchers develop a deeper understanding of the key components of detection transformers in terms of performance indicators.

2. A performance evaluation of detection transformers. We evaluate improvements in detection transformers using the popular benchmark MS COCO [75]. We also highlight the advantages and limitations of these approaches.

3. An analysis of accuracy and computational complexity of improved versions of detection transformers. We present an evaluative comparison of state-of-the-art transformer-based detection methods with respect to attention mechanisms, backbone modifications, and query designs.

4. An overview of the key building blocks of detection transformers to improve their performance further and future directions. We examine the impact of various key architectural design modules that impact network performance and training convergence to provide possible suggestions for future research. Readers interested in ongoing developments in detection transformers can refer to our Github repository: https://github.com/mindgarage-shan/transformer\_object\_detection\_survey (accessed on 25 September 2025).

The remaining paper is arranged as follows. Section 2 is related to object detection and transformers in all types of vision. Section 3 is the main part, which explains the modifications in the detection transformers in detail. Section 3.24 refers to the evaluation protocol, and Section 4 provides a comparative evaluation of detection transformers. Section 5 discusses open challenges and future directions. Finally, Section 6 concludes the paper.

## 2. Object Detection and Transformers in Vision

## 2.1. Object Detection

This section explains the key concept of object detection and previously used object detectors. A more detailed analysis of object detection concepts can be found in [74,76,77]. The object detection task localizes and recognizes objects in an image by providing a bounding box around each object and its category. These detectors are usually trained on datasets like PASCAL VOC [78] or MS COCO [75]. The backbone network extracts the features of the input image as feature maps [79]. Usually, the backbone network, such as ResNet-50 [80], is pre-trained on ImageNet [81] and then fine-tuned to downstream tasks [82–87]. Moreover, many works have also used visual transformers [3,88,89] as a backbone. Single-stage object detectors [3,4,90–98] use only one network, having faster speed but lower performance than two-stage networks. Two-stage object detectors [1,2,7,79,99–104] contain two networks, which provide final bounding boxes and class labels.

Lightweight Detectors: Lightweight detectors are designed to be more computationally efficient than standard object detection models. These are real-time object detectors and can be employed on small devices. Examples include [105–114].

Three-Dimensional Object Detection: The primary purpose of 3D object detection is to recognize the objects of interest using a 3D bounding box and give a class label. Three-dimensional approaches fall into three categories: image-based [115–121], point cloud-based [122–130] , and multimodal fusion-based [131–135].

## 2.2. Transformer for Segmentation

The self-attention mechanism can be employed for segmentation tasks [136–140] that provide pixel-level [141] prediction results. Panoptic segmentation [142] jointly solves semantic and instance segmentation tasks by providing per-pixel class and instance labels. Wang et al. [143] propose location-sensitive axial attention for the panoptic segmentation task on three benchmarks [75,144,145]. The above segmentation approaches have self-attention in CNN-based networks. Recently, segmentation transformers [137,139] containing encoder– decoder modules have provided new directions to employ transformers for segmentation tasks.

## 2.3. Transformers for Scene and Image Generation

Previously, text-to-image generation methods [146–149] were based on GANs [150]. Ramesh et al. [151] introduced a transformer-based model for generating high-quality images from provided text details. Transformer networks are also applied for image synthesis [152–156], which is important for learning unsupervised and generative models for downstream tasks. Feature learning with an unsupervised training procedure [153] achieves state-of-the-art performance on two datasets [157,158], while SimCLR [159] provides comparable performance on [160]. The iGPT image generation network [153] does not include pre-training procedures similar to language modeling tasks. However, unsupervised CNN-based networks [161–163] consider prior knowledge as the architectural layout, attention mechanism, and regularization. Generative adversarial networks (GAN) [150] with CNN-based backbones are appealing for image synthesis [164–166]. TransGAN [155] is a strong GAN network where the generator and discriminator contain transformer modules. These transformer-based networks boost performance for scene and image generation tasks.

## 2.4. Transformers for Low-Level Vision

Low-level vision analyzes images to identify their basic components and create an intermediate representation for further processing and higher-level tasks. After observing the remarkable performance of attention networks in high-level vision tasks [11,137], many attention-based approaches have been introduced for low-level vision problems, such as [167–171].

## 2.5. Transformers for Multi-Modal Tasks

Multi-modal tasks involve processing and combining information from multiple sources or modalities, such as text, images, audio, or video. The application of transformer networks in vision language tasks has also been widespread, including visual question-answering [172], visual commonsense-reasoning [173], cross-modal retrieval [174], and image captioning [175]. These transformer designs can be classified into singlestream [176–181] and dual-stream networks [182–184]. The primary distinction between these networks lies in the choice of loss functions.

## 3. Detection Transformers

This section briefly explains the detection transformer (DETR) and its improvements, as shown in Figure 2.

![](Images_GFP684MN/3ad96e0c4515515e204e359b1fbc5d84d5b9417f98b92b2880b6f417fbbf0d4c.jpg)  
Figure 2. An overview of the detection transformer (DETR) and its modifications proposed by recent methods to improve performance and training convergence. It considers the detection a set prediction task and uses the transformer to free the network from post-processing steps such as non-maximal suppression (NMS). Here, each module added to the DETR is represented by different color with its corresponding label (shown on the right side).

## 3.1. DETR

The detection transformer (DETR) [11] architecture is much simpler than CNN-based detectors like faster R-CNN [185] as it removes the need for an anchor generation process and post-processing steps, such as non-maximal suppression (NMS), and provides an optimal detection framework. The DETR network has three main modules: a backbone network with positional encodings, an encoder, and a decoder network with an attention mechanism. The extracted features from the backbone network are a single vector and its positional encoding [186,187] within the input vector fed to the encoder network. Here, self-attention is performed on key, query, and value matrices forwarded to the multi-head attention and feed-forward network to find the attention probabilities of the input vector. The DETR decoder takes object queries in parallel with the encoder output. It computes predictions by decoding N number of object queries in parallel. It uses a bipartite-matching algorithm to label the ground-truth and predicted objects, as provided in the following equation:

$$
\hat { \sigma } = \arg \operatorname* { m i n } _ { \sigma \in N } \sum _ { k } ^ { N } \mathcal { L } _ { m } ( y _ { k } , \hat { y } _ { \sigma ( k ) } ) .\tag{1}
$$

Here, $y _ { k }$ is a set of ground-truth (GT) objects. It provides boxes for both object and “no object” classes, where N is the total number of objects to be detected. $\mathcal { L } _ { m } \big ( y _ { k } , \hat { y } _ { \sigma ( k ) } \big )$ represents the duplicate-free matching cost between predicted objects $\sigma ( k )$ and groundtruth $y _ { k } ,$ as defined below:

$$
\mathcal { L } _ { m } ( y _ { k } , \hat { y } _ { \sigma ( k ) } ) = - \mathbb { 1 } _ { \{ c _ { k } \neq \phi \} } \hat { p } _ { \sigma ( k ) } ( c _ { k } ) + \mathbb { 1 } _ { \{ c _ { k } \neq \phi \} } \mathcal { L } _ { b b o x } ( b _ { k } , \hat { b } _ { \hat { \sigma } } ( k ) ) .\tag{2}
$$

The next step is to compute the Hungarian loss by determining the optimal matching between ground-truth (GT) and detected boxes regarding the bounding-box region and label. The loss is reduced by stochastic gradient descent (SGD).

$$
\begin{array} { r } { \mathcal { L } _ { H } ( y , \hat { y } ) = \sum _ { k = 1 } ^ { N } [ - l o g \hat { p } _ { \hat { \sigma } ( k ) } ( c _ { k } ) + \mathbb { 1 } _ { \{ c _ { k } \neq \phi \} } \mathcal { L } _ { b o x } ( b _ { k } , \hat { b } _ { \hat { \sigma } } ( k ) ) ] , } \end{array}\tag{3}
$$

where $\hat { p } _ { \hat { \sigma } ( k ) }$ and $c _ { k }$ are the predicted class and target label, respectively. The term $\hat { \sigma }$ is the optimal-assignment factor; $b _ { k }$ and $\hat { b } _ { \hat { \sigma } } ( \boldsymbol { k } )$ are ground-truth and predicted bounding boxes. The term yˆ and $y = \{ ( c _ { k } , b _ { k } ) \}$ are the prediction and ground-truth of objects, respectively. Specifically, the bounding box loss is a linear combination of the generalized IoU (GIoU) loss [188] and of the L1 loss, as in the following equation:

$$
\mathcal { L } _ { b b o x } = \lambda _ { i } \mathcal { L } _ { i o u } ( b _ { k } , \hat { b } _ { \sigma ( k ) } ) + \lambda _ { l 1 } \parallel b _ { k } - \hat { b } _ { \sigma ( k ) } \parallel _ { 1 } ,\tag{4}
$$

where $\lambda _ { i }$ and $\lambda _ { l 1 }$ are the hyperparameters. DETR can only predict a fixed number of N objects in a single pass. For the COCO dataset [75], the value of N is set to 100 as this dataset has 80 classes. This network does not need NMS to remove redundant predictions as it uses bipartite matching loss with parallel decoding [189–191]. In comparison, previous studies used RNN-based autoregressive decoding [192–194,194–196]. The DETR network has several challenges, such as slow training convergence and performance drops for small objects. To address these challenges, modifications have been made to the DETR network. Despite its end-to-end design, DETR suffers from slow training convergence and lower accuracy for small objects. The uniform attention initialization and lack of multi-scale features make learning precise object locations difficult. These limitations motivated the development of several modifications aimed at improving convergence, computational efficiency, and small object detection.

## 3.2. Deformable-DETR

The attention module of DETR provides a uniform weight value to all pixels of the input feature map at the initialization stage. These weights need many epochs for training convergence to find informative pixel locations. However, it requires high computation and extensive memory. The encoder’s self-attention has complexity $O ( w _ { i } ^ { 2 } h _ { i } ^ { 2 } c _ { i } )$ . In contrast, the decoder’s cross-attention has complexity $O ( h _ { i } w _ { i } c _ { i } ^ { 2 } + N h _ { i } w _ { i } c _ { i } )$ . Formally, $h _ { i }$ and $w _ { i }$ denote the height and width of the input feature map, respectively, and N represents object queries fed as input to the decoder. Let $q \in \Omega _ { q }$ denote a query element with feature $z _ { q } \in R ^ { c _ { i } }$ and $k \in \Omega _ { k }$ represents a key vector with feature $\boldsymbol { x } _ { k } \in R ^ { c _ { i } } ,$ where $c _ { i }$ is the input features dimension, $\Omega _ { k }$ and $\Omega _ { q }$ indicate the set of key and query vectors, respectively. Then, the feature of multi-head attention (MHAttn) is computed by the following:

$$
\begin{array} { r } { M H A t t n ( z _ { q } , x ) = \sum _ { j = 1 } ^ { J } W _ { j } [ \sum _ { k \in \Omega _ { k } } A _ { j q k } . W _ { j } ^ { \prime } x _ { k } ] , } \end{array}\tag{5}
$$

where j represents the attention head, $W _ { j } \in \mathbb { R } ^ { c _ { i } \times c _ { v } } .$ , and $W _ { j } ^ { \prime } \in \mathbb { R } ^ { c _ { v } \times c _ { i } }$ are of learnable weights $( c _ { v } = c _ { i } / J$ by default). The attention weights $A _ { j q k }$ ∝ ex $\gamma \frac { z _ { q } ^ { T } U _ { j } ^ { T } V _ { j } x _ { k } } { \sqrt { c } _ { v } }$ are normalized as $\begin{array} { r } { \sum _ { k \in \Omega _ { k } } A _ { j q k } = 1 } \end{array}$ , in which $U _ { j } , V _ { j } \in R ^ { c _ { v } \times c _ { i } }$ are also learnable weights. Deformable-DETR [20] modifies the attention modules inspired by [197,198] to process the image feature map by considering the attention network as the main reason for slow training convergence and confined feature spatial resolution. This module samples a small set of features near each reference point. Given an input feature map $x \in R ^ { c _ { i } \times h _ { i } \times w _ { i } }$ , let query q have content feature $z _ { q }$ and a 2D reference point $\boldsymbol { r } _ { q } ,$ and the deformable attention feature is computed by the following:

$$
\begin{array} { r } { D e f o r m A t t n ( z _ { q } , r _ { q } , x ) = \sum _ { j = 1 } ^ { J } W _ { j } [ \sum _ { k = 1 } ^ { K } A _ { j q k } . W _ { j } x ( r _ { q } + \Delta r _ { j q k } ) ] , } \end{array}\tag{6}
$$

where $\Delta r _ { j q k }$ indexes the sampling offset. It takes ten times fewer training epochs than a simple DETR network. The complexity of self-attention becomes $O ( w _ { i } h _ { i } c _ { i } ^ { 2 } )$ , which is linear complexity according to spatial size $h _ { i } w _ { i }$ . The complexity of the cross-attention in the decoder becomes $O ( N K c _ { i } ^ { 2 } )$ , which is independent of spatial size $h _ { i } w _ { i }$ . In Figure $^ { 3 , }$ the dark pink block indicates the deformable attention module in Deformable-DETR.

![](Images_GFP684MN/cab0f6b4d2cd79ad867c59e82f845c212ae20f0e6690b6a3d6342d7f10153a41.jpg)  
Figure 3. The structure of the original DETR after the addition of Deformable-DETR [20], UP-DETR [21], and Efficient-DETR [22]. Here, the network is a simple DETR network, along with improvement indicated by small colored boxes. The dark pink block indicates Deformable-DETR, the bright cyan block indicates UP-DETR, and the dull green box represents Efficient-DETR.

Multi-Scale Feature Maps: High-resolution input image features increase the network efficiency, specifically for small objects. However, this is computationally expensive. Deformable-DETR provides high-resolution features without affecting the computation. It uses a feature pyramid containing high and low-resolution features rather than the original high-resolution input image feature map. This feature pyramid has an input image resolution of $1 / 8 , 1 / 1 6 ,$ and 1/32 and contains its relative positional embeddings. Furthermore, Deformable-DETR replaces the attention module in DETR with the multi-scale deformable attention module to reduce computational complexity and improve performance. While Deformable-DETR accelerates training and improves small object detection, designing effective sampling offsets and managing multi-scale feature interactions remain critical to achieving optimal performance. Algorithm 1 illustrates the step-by-step implementation of the multi-scale deformable attention mechanism, complementing the mathematical formulation presented above.

Algorithm 1: Multi-scale deformable attention in Deformable-DETR.   
Input: Feature maps $\overline { { \mathcal { F } = \left\{ F _ { 1 } , F _ { 2 } , \ldots \right\} } }$ , Query features $Q ,$ Reference points $R ,$   
Sampling offsets $\Delta r$   
Output: Updated query features $Q ^ { \prime }$   
1 for each query $q \in Q$ do   
2 Initialize attention result $z  0 ;$   
3 for each attention head $j = 1 t o J$ do   
4 for each sampling point $k = 1$ to K do   
5 Compute sampling location: $p  r [ q ] + \Delta r [ j , k ] ;$   
6 Interpolate feature: $x \gets$ SampleFeature $( \mathcal { F } , p ) ;$   
7 Update attention: $z  z + A [ j , q , k ] \cdot W _ { j } \cdot x ;$   
8 Aggregate z across heads and update $q ;$   
9 return $Q ^ { \prime }$

## 3.3. UP-DETR

Dai et al. [21] proposed a few modifications to pre-train the DETR similar to pretraining transformers in NLP. The randomly sized patches from the input image are used as object queries to the decoder as input. The pre-training proposed by UP-DETR helps to detect these randomly sized query patches. Algorithm 2 summarizes the pre-training procedure of UP-DETR, illustrating how random patches, query grouping, and attention masking are applied to improve convergence and feature learning. In Figure 3, the bright cyan block denotes UP-DETR. Two issues are addressed during pre-training: multi-task learning and multi-query localization.

Multi-Task Learning: The object detection task combines object localization and classification, while these tasks always have distinct features [199–201]. The patch detection damages the classification features. Multi-task learning using patch feature reconstruction and a frozen pre-training backbone is proposed to protect the classification features of the transformer. The feature reconstruction is given as follows:

$$
\mathcal { L } _ { r e c } ( f _ { k } , \hat { f } _ { \hat { \sigma } ( k ) } ) = \parallel \frac { f _ { k } } { \parallel f _ { k } \parallel _ { 2 } } - \frac { \hat { f } _ { \hat { \sigma } ( k ) } } { \parallel \hat { f } _ { \hat { \sigma } ( k ) } \parallel _ { 2 } } \parallel _ { 2 } ^ { 2 } .\tag{7}
$$

Here, the feature reconstruction term is $\mathcal { L } _ { r e c }$ . It is the mean-squared error between l2 (normalized) features of patches obtained from the CNN backbone.

Multi-query Localization: The decoder of DETR takes object queries as input to focus on different positions and box sizes. When this object queries a number N (typically N = 100) that is high, a single-query group is unsuitable as it has convergence issues. To solve the multi-query localization problem between object queries and patches, UP-DETR proposes an attention mask and query shuffle mechanism. The number of object queries is divided into X different groups, where each patch is provided to N/X object queries. The Softmax layer of the self-attention module in the decoder is modified by adding an attention mask inspired by [202] as follows:

$$
P ( q _ { i } , k _ { i } ) = S o f t m a x ( \frac { q _ { i } k _ { i } ^ { T } } { \sqrt { d } } + M ) v _ { i } ,\tag{8}
$$

$$
M _ { k , l } = \left\{ \begin{array} { l l } { { 0 } } & { { \ k , l \ i n \ t h e \ s a m e \ g r o u p } } \\ { { - \infty } } & { { \ o t h e r w i s e } } \end{array} \right. ,\tag{9}
$$

where $M _ { k , l }$ is the interaction parameter of object queries $q _ { k }$ and $q _ { l }$ . Though object queries are divided into groups, these queries do not have explicit groups during downstream training tasks. Therefore, these queries are randomly shuffled during pre-training by masking 10% query patches to zero, similar to dropout [203]. Although UP-DETR improves convergence and query learning, the pre-training may not always transfer perfectly to downstream detection tasks, and its grouping and masking mechanisms require careful tuning to avoid convergence or performance issues. Algorithm 2 shows the patch detection pre-training procedure, where random patches are cropped, assigned to query subsets with attention masking, and the model is trained to predict patch locations while reconstructing features, improving robustness and convergence.

Algorithm 2: Patch detection pre-training in UP-DETR.   
Input: Input image I, Random patch set $P ,$ Object queries Q   
Output: Pre-trained DETR model   
1 Randomly crop patches from I to form $P ;$   
2 Extract image features with frozen backbone;   
3 for each patch $p \in P$ do   
4 Assign p to a subset of queries $Q _ { g } \subset Q ;$   
5 Apply attention mask to restrict attention within $Q _ { g } ;$   
6 Decoder predicts patch location and size;   
7 Compute localization loss $\mathcal { L } _ { l o c }$ and feature reconstruction loss $\mathcal { L } _ { r e c } { ; }$   
8 Shuffle query assignments and mask 10% queries (dropout-style);   
9 Backpropagate and update model parameters.

## 3.4. Efficient-DETR

The performance of DETR also depends on the object queries, as the detection head obtains final predictions from them. However, these object queries are randomly initialized at the start of training. Efficient-DETR [22], based on DETR and Deformable-DETR, examines the randomly initialized object blocks, including reference points and object queries, which is one of the reasons for multiple training iterations. In Figure 3, the dull green box shows Efficient-DETR.

Efficient-DETR has two main modules: a dense module and a sparse module. These modules have the same final detection head. The dense module includes the backbone network, encoder network, and detection head. Following [204], it generates proposals by a class-specific dense prediction using the sliding window and selects Top-k features as object queries and reference points. Efficient-DETR uses 4D boxes as reference points rather than 2D centers. The sparse network does the same work as the dense network, except for their output size. The features from the dense module are taken as the initial state of the sparse module, which is considered a good initialization of object queries. Both dense and sparse modules use a one-to-one assignment rule, as in [205–207]. However, Efficient-DETR adds architectural complexity, and the final performance heavily depends on the quality of the dense module’s proposals, making the approach sensitive to the selection of initial object queries and hyperparameters.

## 3.5. SMCA-DETR

The decoder of the DETR takes object queries as input that are responsible for object detection in various spatial locations. These object queries combine with spatial features from the encoder. The co-attention mechanism in DETR involves computing a set of attention maps between the object queries and the image features to provide class labels and bounding box locations. However, the visual regions in the decoder of DETR related to object query might be irrelevant to the predicted bounding boxes. This is one of the reasons that DETR needs many training epochs to find suitable visual locations to identify corresponding objects correctly. Gao et al. [23] introduced a spatially modulated coattention (SMCA) module that replaces the existing co-attention mechanism in DETR to overcome the slow training convergence of DETR. In Figure 4, the purple block represents SMCA-DETR. The object queries estimate the scale and center of its corresponding object, which are further used to set up a 2D spatial weight map. The initial estimate of scale $l _ { h _ { i } } , l _ { w _ { i } }$ and center $e _ { h _ { i } } , e _ { w _ { i } }$ of a Gaussian-like distribution for object queries q is provided as follows:

$$
e _ { h _ { i } } ^ { n r m } , e _ { w _ { i } } ^ { n r m } = s i g m o i d ( M L P ( q ) ) ,\tag{10}
$$

$$
l _ { h _ { i } } , l _ { w _ { i } } = F C ( q ) ,\tag{11}
$$

where object query q provides a prediction center in normalized form by a sigmoid activation function after two layers of MLP. These predicted centers are un-normalized to obtain the input image’s center coordinates $e _ { h _ { i } }$ and $e _ { w _ { i } }$ . The object query also estimates the object scales as $l _ { h _ { i } }$ and $l _ { w _ { i } }$ . After the prediction of the object scale and center, SMCA provides a Gaussian-like weight map as follows:

$$
\mathbf { W } ( x , y ) = e x p \left( - \frac { ( x - e _ { w _ { i } } ) ^ { 2 } } { \beta l _ { w _ { i } } ^ { 2 } } - \frac { ( y - e _ { h _ { i } } ) ^ { 2 } } { \beta l _ { h _ { i } } ^ { 2 } } \right) ,\tag{12}
$$

where $\beta$ is the hyperparameter to regulate the bandwidth, and $( x , y )$ is the spatial parameter of weight map W. It provides high attention to spatial locations closer to the center and low attention to spatial locations away from the center.

$$
A _ { i } = S o f t m a x ( \frac { q _ { i } k _ { i } ^ { T } } { \sqrt { d } } + \mathbf { l o g } \mathbf { W } ) v _ { i } .\tag{13}
$$

Here, $A _ { i }$ is the co-attention map. The difference between the co-attention module in DETR and this co-attention module is the addition of the logarithm of the spatialmap W. The decoder attention network has more attention near predicted box regions, which limits the search locations and thus converges the network faster. SMCA-DETR improves training efficiency and small object detection. However, its success depends on accurate initial predictions of object centers and scales, making it sensitive to initialization and hyperparameters.

![](Images_GFP684MN/10f0a4be4a6623af75fb24fa5bf28e393d63f648d4771a9cffaeb0e05ce5ba00.jpg)  
Figure 4. The structure of the original DETR after the addition of SMCA-DETR [23], TSP-DETR [24], and Conditional-DETR [25]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The purple block indicates SMCA-DETR, the orange block indicates TSP-DETR, and the yellow box represents Conditional-DETR.

## 3.6. TSP-DETR

TSP-DETR [24] deals with the cross-attention and the instability of bipartite matching to overcome the slow training convergence of DETR. TSP-DETR proposes two modules based on an encoder network with feature pyramid networks (FPN) [79] to accelerate the training convergence of DETR. In Figure 4, the orange block indicates TSP-DETR. These modules are TSP-FCOS and TSP-RCNN, which use a classical one-stage detector FCOS [208] and classical two-stage detector Faster-RCNN [1], respectively. TSP-FCOS used a new Feature of Interest (FoI) module to handle the multi-level features in the transformer encoder. Both modules use the bipartite matching mechanism to accelerate the training convergence.

TSP-FCOS: The TP-FCOS module follows the FCOS [208] for designing the backbone and FPN [79]. Firstly, the features extracted by the CNN backbone from the input image are fed to the FPN component to produce multi-level features. Two feature extraction heads, the classification head and the auxiliary head, use four convolutional layers and group normalization [209], which are shared across the feature pyramid stages. Then, the FoI classifier filters the concatenated output of these heads to select top-scored features. Finally, the transformer encoder network takes these FoIs and their positional encodings as input, providing class labels and bounding boxes as output.

TSP-RCNN: Like TP-FCOS, this module extracts the features from the CNN backbone and produces multi-level features using the FPN component. In place of two feature extraction heads used in TSP-FCOS, the TSP-RCNN module follows the design of faster R-CNN [1]. It uses a region proposal network (RPN) to find regions of interest (RoIs) to refine further. Each RoI in this module has an objectness score, as well as a predicted bounding box. RoIAlign [101] is applied on multi-level feature maps to take RoI information. After passing through a fully connected network, these extracted features are fed to the Transformer encoder as input. The positional info of these RoI proposals is the four values $\left( { { c _ { n x } } , { c _ { n y } } , { w _ { n } } , { h _ { n } } } \right)$ , where $( c _ { n x } , c _ { n y } ) \in [ 0 , 1 ] ^ { 2 }$ represents the normalized value of center and $( w _ { n } , h _ { n } ) \in [ 0 , 1 ] ^ { 2 }$ represents the normalized value of height and width. Finally, the transformer encoder network inputs these RoIs and their positional encoding for accurate predictions. The FCOS and RCNN modules in TSP-DETR accelerate training convergence and improve the performance of the DETR network.

## 3.7. Conditional-DETR

The cross-attention module in the DETR network needs high-quality input embeddings to predict accurate bounding boxes and class labels. The high-quality content embeddings increase the training convergence difficulty. Conditional-DETR [25] presents a conditional cross-attention mechanism to solve the training convergence issue of DETR. It differs from the simple DETR by input keys $k _ { i }$ and input queries $q _ { i }$ for cross-attention. In Figure 4, the yellow box represents conditional-DETR. The conditional queries are obtained from 2D coordinates along with the embedding output of the previous decoder layer. The predicted candidate box from decoder-embedding is as follows:

$$
b o x = s i g ( F F N ( e ) + [ r ^ { T } 0 0 ] ^ { T } ) .\tag{14}
$$

Here, e is the input embedding that is fed as input to the decoder. The box is a 4D vector $[ b o x _ { c x } b o x _ { c y } b o x _ { w } b o x _ { h } ] .$ , having the box center value as $\left( b o x _ { c x } , b o x _ { c y } \right)$ , width value as box ${ \bf \dot { \theta } } _ { w } ,$ and height value as boxh. The $s i g ( )$ function normalizes the predictions and varies from 0 to 1. FFN() predicts the un-normalized box. r is the un-normalized 2D coordinate of the reference-point, and (0, 0) is the simple DETR. This work either learns the reference point r for each box or generates it from the respective object query. It learns queries for multi-head cross-attention from input embeddings of the decoder. This spatial query makes the cross-attention head consider the explicit region, which helps to localize the different regions for class labels and bounding boxes by narrowing down the spatial range.

## 3.8. WB-DETR

DETR extracts local features using a CNN backbone and gets global contexts by an encoder–decoder network of the transformer. WB-DETR [26] proves that the CNN backbone for feature extraction in detection transformers is not compulsory. It contains a transformer network without a backbone. It serializes the input image and feeds the local features directly in each independent token to the encoder as input. The transformer selfattention network provides global information, which can accurately obtain the contexts between input image tokens. However, the local features of each token and the information between adjacent tokens need to be included, as the transformer lacks the ability for local feature modeling. The LIE-T2T (Local Information Enhancement-T2T) module solves this issue by reorganizing and unfolding the adjacent patches and focusing on each patch’s channel dimension after unfolding. In Figure 5, the top-right block denotes the LIE-T2T module of WB-DETR. The iterative process of the LIE-T2T module is as follows:

$$
P = s t r e t c h ( r e s h a p e ( P i ) ) ,\tag{15}
$$

$$
Q = s i g ( e _ { 2 } \cdot R e L U ( e _ { 1 } \cdot P ) ) ,\tag{16}
$$

$$
P _ { i + 1 } = e _ { 3 } \cdot ( P \cdot Q ) ,\tag{17}
$$

where reshape function reorganizes $\left( l _ { 1 } \times c _ { 1 } \right)$ patches into $\left( h _ { i } \times w _ { i } \times c _ { i } \right)$ feature maps. The term stretch denotes unfolding $\left( h _ { i } \times w _ { i } \times c _ { i } \right)$ feature maps to $\left( l _ { 2 } \times c _ { 2 } \right)$ patches. Here, the fully connected layer parameters are $e _ { 1 } , e _ { 2 }$ , and $e _ { 3 } .$ . The ReLU activation is its non-linear map function, and the sig generates the final attention. The channel attention in this module provides local information as the relationship between the channels of the patches is the same as the spatial relation in the pixels of the feature maps.

![](Images_GFP684MN/c3ab6bc56c1b38c75e84fd30c9cebab649faa4a81bb0637a11c0fbd75f681c16.jpg)  
Figure 5. The structure of the original DETR after the addition of WB-DETR [26], PnP-DETR [27], and Dynamic-DETR [28]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The Magenta block indicates WB-DETR, the blue block indicates PnP-DETR, and the green box represents Dynamic-DETR.

## 3.9. PnP-DETR

The transformer processes the image feature maps that are transformed into a onedimensional feature vector to produce the final results. Although effective, using the full feature map is expensive because of useless computation on background regions. PnP-DETR [27] proposes a poll and pool (PnP) sampling module to reduce spatial redundancy and make the transformer network computationally more efficient. This module divides the image feature map into contextual background features and fine foreground object features. Then, the transformer network uses these updated feature maps and translates them into the final detection results. In Figure 5, the bottom-left block indicates PnP-DETR. This PnP Sampling module includes two types of samplers: a pool sampler and a poll sampler, as explained below.

Poll Sampler: The poll sampler provides fine feature vectors $\mathbb { V } _ { f }$ . A meta-scoring module is used to find the informational value for every spatial location (x, y):

$$
a _ { x y } = S c o r e N e t ( v _ { x y } , \theta s ) .\tag{18}
$$

The score value is directly related to the information of feature vector $v _ { x y }$ . These score values are sorted as follows:

$$
[ a _ { z } , | z = 1 , . . . , Z ] , \aleph = S o r t ( a _ { x y } ) ,\tag{19}
$$

where $Z = h _ { i } w _ { i } ,$ , and ℵ is the sorting order. The top $N _ { s }$ -scoring vectors are selected to obtain fine features:

$$
\mathbb { V } _ { f } = [ v _ { z } , | z = 1 , . . . , N _ { s } ] .\tag{20}
$$

Here, the predicted informative value is considered a modulating factor to sample the fine feature vectors:

$$
\mathbb { V } _ { f } = [ v _ { z } \times a _ { z } , | z = 1 , . . . , N _ { s } ] .\tag{21}
$$

To make the learning stable, the feature vectors are normalized:

$$
\mathbb { V } _ { f } = [ L _ { n o r m } ( v _ { z } ) \times a _ { z } , | z = 1 , . . . , N _ { s } ] .\tag{22}
$$

Here, $L _ { n o r m }$ is the layer normalization, and $N _ { s } = \alpha Z ,$ where α is the poll ratio factor. This sampling module reduces the training computation.

Pool Sampler: The poll sampler obtains the fine features of foreground objects. A pool sampler compresses the background region’s remaining feature vectors that provide contextual information. It performs weighted pooling to get a small number of background

features $M _ { b }$ motivated by double attention operation [210] and bilinear pooling [211]. The remaining feature vectors of the background region are as follows:

$$
\mathbb { V } _ { b } = \mathbb { V } \backslash \mathbb { V } _ { f } = \{ \mathbf { v } _ { b } , | b = 1 , . . . , Z - N \} .\tag{23}
$$

The aggregated weights ${ \bf a _ { b } } \in \mathbb { R } ^ { M _ { \mathrm { b } } }$ are obtained by projecting the features with weight values $\mathbf { w } ^ { s } \in \mathbb { R } ^ { c _ { i } \times M _ { b } }$ as follows:

$$
\begin{array} { r } { \mathbf { a } _ { b } = \mathbf { v } _ { b } \mathbf { w } ^ { s } . } \end{array}\tag{24}
$$

The projected features with learnable weight $\mathbf { w } ^ { p } \in \mathbb { R } ^ { c _ { i } \times c _ { i } }$ are obtained as follows:

$$
\begin{array} { r } { \dot { \mathbf { v } } _ { b } = \mathbf { v _ { b } } \mathbf { w } ^ { \mathbf { p } } . } \end{array}\tag{25}
$$

The aggregated weights are normalized over the non-sampled regions with Softmax as follows:

$$
a _ { b m } = \frac { e _ { b m } ^ { a } } { \sum _ { \hat { b } = 1 } ^ { N - Z } e ^ { a } \hat { b } m } .\tag{26}
$$

By using the normalized aggregation weight, the new feature vector is obtained to provide information for non-sampled regions:

$$
\mathbf { v } _ { m } = \sum _ { b = 1 } ^ { Z - N } \hat { \mathbf { v } } _ { b } \times a _ { b m } .\tag{27}
$$

By considering all Z aggregation weights, the coarse background contextual feature vector is as follows:

$$
\mathbb { V } _ { c } = \{ \mathbf { v } _ { m } , | b = 1 , . . . , M _ { b } \} .\tag{28}
$$

The pool sampler provides contextual information at different scales using aggregation weights. Here, some feature vectors may provide local context while others may capture the global context.

## 3.10. Dynamic-DETR

Dynamic-DETR [28] introduces dynamic attention in the encoder–decoder network of DETR to solve the slow training convergence issue and detection of small objects. Firstly, a convolutional dynamic encoder is proposed to have different attention types to the selfattention module of the encoder network to make the training convergence faster. The attention of this encoder depends on various factors such as spatial effect, scale effect and input feature dimensions effect. Secondly, ROI-based dynamic attention is replaced with cross-attention in the decoder network. This decoder helps to focus on small objects, reduces learning difficulty and converges the network faster. In Figure 5, the bottom right box represents Dynamic-DETR. This dynamic encoder–decoder network is explained in detail as follows.

Dynamic Encoder: The Dynamic-DETR uses a convolutional approach for the selfattention module. Given the feature vectors $F = \{ F 1 , \cdots , F _ { n } \}$ , where n = 5 represents object detectors from the feature pyramid, the multi-scale self-attention (MSA) is as follows:

$$
A t t n = M S A ( F ) . F .\tag{29}
$$

However, it is impossible because of the various scale feature maps from the FPN. The feature maps of different scales are equalized within neighbors using 2D convolution as in the pyramid convolution [212]. It focuses on the spatial locations of the un-resized mid-layer and transfers information to its scaled neighbors. Moreover, SE [213] is applied to combine the features to provide scale attention.

Dynamic Decoder: The dynamic decoder uses mixed attention blocks in place of multihead layers to ease learning in the cross-attention network and improve the detection of small objects. It also uses dynamic convolution instead of a cross-attention layer inspired by ConvBERT [214] in natural language processing (NLP). Firstly, RoI pooling [1] is introduced in the decoder network, after which position embeddings are replaced with box encoding $B E \in \mathbb { R } ^ { p \times 4 }$ as the image size. The output from the dynamic encoder, along with box encoding $B E ,$ is fed to the dynamic decoder to pool image features $R \in \mathbb { R } ^ { p \times s \times s \times c _ { i } }$ from the feature pyramid as follows:

$$
R = R o I _ { p o o l } ( F _ { e n c o d e r } , B E , s ) ,\tag{30}
$$

where s is the size of the pooling parameter, and $c _ { i }$ represents the quantity of channels of $F _ { e n c o d e r }$ . To feed this into the cross-attention module, input embeddings $q e \in R ^ { p \times c _ { i } }$ are required for object queries. These embeddings are passed through the multi-head self-attention (MHSAttn) layer as follows:

$$
q e ^ { * } = M H S A t t n ( q e , q e , q e ) .\tag{31}
$$

Then, these query embeddings are passed through the fully connected layer (dynamic filters) as follows:

$$
F i l t e r ^ { q e } = F C ( q e ^ { * } ) .\tag{32}
$$

Finally, cross-attention between features and object queries is performed with 1 × 1 convolution using dynamic filters $F i l t e r ^ { q e }$

$$
q e ^ { F } = C o n _ { 1 \times 1 } ( F , F i l t e r ^ { q e } ) .\tag{33}
$$

These features are passed through FFN layers to provide various predictions as updated object-embedding, updated box-encoding, and the object class. This process eases the learning of the cross-attention module by focusing on sparse areas and then spreading to global regions.

## 3.11. YOLOS-DETR

Vision transformer (ViT) [8], inherited from NLP, performs well on the image recognition task. ViT-FRCNN [215] uses a pre-trained backbone (ViT) for a CNN-based detector. It utilizes convolution neural networks and relies on strong 2D inductive biases and regionwise pooling operations for object-level perception. Other similar works, such as DETR [11], introduce 2D inductive bias using CNNs and pyramidal features. YOLOS-DETR [29] presents the transferability and versatility of the transformer from image recognition to detection in the sequence aspect using the least information about the spatial design of the input. It closely follows the ViT architecture with two simple modifications. Firstly, it removes the image-classification patches (CLS) and adds randomly initialized one hundred detection patches (DET) as [216] along with the input patch embeddings for object detection. Secondly, similar to DETR, a bipartite matching loss is used instead of the ViT classification loss. The transformer encoder takes the generated sequence as input as follows:

$$
\begin{array} { r } { s _ { 0 } = [ \mathbf { I } _ { p } ^ { 1 } \mathbf { L } ; \cdot \cdot \cdot ; \mathbf { I } _ { p } ^ { M } \mathbf { L } ; \mathbf { I } _ { d } ^ { 1 } ; \cdot \cdot \cdot ; \mathbf { I } _ { d } ^ { 1 0 0 } ] + \mathbf { P E } , } \end{array}\tag{34}
$$

where I is the input image $\mathbf { I } \in \mathbb { R } ^ { h _ { i } \times w _ { i } \times c _ { i } }$ that is reshaped into 2D tokens $\mathbf { I } _ { p } \in \mathbb { R } ^ { n _ { i } \times ( R ^ { 2 } \cdot c _ { i } ) }$ Here, $h _ { i }$ represents the height, and $w _ { i }$ indicates the width of the input image. $c _ { i }$ is the total number of channels. $( r , r )$ is each token resolution, and $\begin{array} { r } { n _ { i } = \frac { h _ { i } w _ { i } } { r ^ { 2 } } } \end{array}$ is the total number of tokens. These tokens are mapped to $D _ { i }$ dimensions with linear projection, $\mathbf { L } \in \mathbb { R } ^ { ( r ^ { 2 } \cdot c _ { i } ) \times D _ { i } }$

The result of this projection is $\mathbf { I } _ { p } \mathbf { L }$ . The encoder also takes one hundred randomly initialized learnable tokens $\mathbf { I } _ { d } \in \mathbb { R } ^ { 1 0 0 \times D _ { i } }$ . To keep the positional information, positional embeddings $\mathbf { P E } \in \mathbb { R } ^ { ( n _ { i } + 1 0 0 ) \times D _ { i } }$ are also added. The encoder of the transformer contains a multi-head self-attention mechanism and one MLP block with a GELU [217] non-linear activation function. Layer normalization (LN) [218] is added between each self-attention and MLP block as follows:

$$
\begin{array} { r l } { \acute { s } _ { n } } & { { } = M H S A t t n ( L N ( s _ { n - 1 } ) ) + s _ { n - 1 } , } \end{array}\tag{35}
$$

$$
\begin{array} { r l } { s _ { n } } & { { } = M L P ( L N ( \acute { s } _ { n } ) ) + \acute { s } _ { n } , } \end{array}\tag{36}
$$

where $s _ { n }$ is the encoder input sequence. In Figure 6, the top-right block indicates YOLOS-DETR.

![](Images_GFP684MN/71a9e6b3c55efe5d187d458daff9c72bb0d7baaee7ae6d991e6189a8ff5a45ab.jpg)  
Figure 6. The structure of the original DETR after the addition of YOLOS-DETR [29], Anchor-DETR [30], and Sparse-DETR [31]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The yellow block indicates YOLOS-DETR, the light blue block indicates Anchor-DETR, and the light orange box represents Sparse-DETR.

## 3.12. Anchor-DETR

DETR uses learnable embeddings as object queries in the decoder network. These input embeddings do not have a clear physical meaning and cannot illustrate where to focus. It is challenging to optimize the network as object queries concentrate on something other than specific regions. Anchor-DETR [30] solves this issue by proposing object queries as anchor points that are extensively used in CNN-based object detectors. This query design can provide multiple object predictions in one region. Moreover, a few modifications in the attention are proposed that reduce the memory cost and improve performance. In Figure 6, the yellow block shows Anchor-DETR. The two main contributions of Anchor-DETR, query and attention variant design, are explained as follows.

Row and Column Decoupled-Attention: DETR requires huge GPU memory, as in [219,220], because of the complexity of the cross-attention module. It is more complex than the self-attention module in the decoder. Although Deformable-DETR reduces memory cost, it still causes random memory access, making the network slower. Row– column decoupled attention (RCDA), as shown in the blue block of Figure 6, reduces memory and provides similar or better efficiency.

Anchor Points as Object Queries: The CNN-based object detectors consider anchor points as the relative position of the input feature maps. In contrast, transformer-based detectors take uniform grid locations, handcraft locations, or learned locations as anchor points. Anchor-DETR considers two types of anchor points: learned anchor locations and grid anchor locations. The grid anchor locations are input image grid points. The learned anchor locations are uniform distributions from 0 to 1 (randomly initialized) and updated using the learned parameters.

## 3.13. Sparse-DETR

Sparse-DETR [31] filters the encoder tokens by a learnable cross-attention map predictor. After distinguishing these tokens in the decoder network, it focuses only on foreground tokens to reduce computational costs.

Sparse-DETR introduces the scoring module, aux-heads in the encoder, and the Top-k queries selection module for the decoder. In Figure 6, the light orange box represents Sparse-DETR. Firstly, it determines the saliency of tokens, fed as input to the encoder, using the scoring network that selects top $\rho \%$ tokens. Secondly, the aux-head takes the top-k tokens from the output of the encoder network. Finally, the top-k tokens are used as the decoder object queries. The salient token prediction module refines encoder tokens that are taken from the backbone feature map using threshold $\rho$ and updates the features $x _ { l } - 1$ as follows:

$$
\begin{array} { r } { x _ { 1 } ^ { \mathbf { m } } = \left\{ \begin{array} { l l } { x _ { l - 1 } ^ { m } } & { m \not \in \Omega _ { r } ^ { q } } \\ { L N \big ( F F N ( y _ { l } ^ { m } ) + y _ { l } ^ { m } \big ) } & { m \in \Omega _ { r } ^ { q } , } \end{array} \right. } \\ { w h e r e } & { y _ { l } ^ { m } = L N \big ( D e f o r m A t t n ( x _ { l - 1 } ^ { m } , x _ { l - 1 } \big ) + x _ { l - 1 } ^ { m } \big ) , } \end{array}\tag{37}
$$

where DeformAttn is the deformable attention, FFN is the feed-forward network, and LN is the layer normalization. Then, the decoder cross-attention map (DAM) accumulates the attention weights of decoder object queries, and the network is trained by minimizing loss between prediction and binarized DAM as follows:

$$
\mathcal { L } _ { d a m } = \frac { - 1 } { M } \sum _ { k = 1 } ^ { M } B C E L o s s ( s n ( x _ { f } ) , D A M _ { k } ^ { b } ) ,\tag{38}
$$

where BCELoss is the binary cross-entropy (BCE) loss, $D A M _ { k } ^ { b }$ is the k-th binarized DAM value of the encoder token, and sn is the scoring network. In this way, sparse-DETR minimizes the computation by significantly eliminating encoder tokens.

## 3.14. $D ^ { 2 }$ ETR

Much work [20,22–25] has been proposed to make the training convergence faster by modifying the cross-attention module. Many researchers [20] used multi-scale feature maps to improve performance for small objects. However, the solution for high computation complexity has yet to be proposed. D2ETR [32] achieves better performance with low computational cost. Without an encoder module, the decoder directly uses the fine-fused feature maps provided by the backbone network with a novel cross-scale attention module. The D2ETR contains two main modules: a backbone and a decoder. The backbone network based on a pyramid vision transformer (PVT) consists of two parallel layers: one for cross-scale interaction and another for intra-scale interaction. This backbone contains four transformer levels to provide multi-scale feature maps. All levels have the same architecture, depending on the basic module of the selected transformer. The backbone also contains three fusing levels in parallel with four transformer levels. These fusing levels provide a cross-scale fusion of input features. The i-th fusing level is shown in the light green block of Figure 7. The cross-scale attention is formulated as follows:

$$
f _ { j } = \mathbf { L } _ { j } ( f _ { j - 1 } ) ,\tag{39}
$$

$$
f _ { j } ^ { \ast } = S A ( f _ { q } , f _ { k } , f _ { v } ) ,\tag{40}
$$

$$
f _ { q } = f _ { j } , f _ { k } = f _ { v } = [ f _ { 1 } ^ { * } , f _ { 2 } ^ { * } , \ldots , f _ { j - 1 } ^ { * } , f _ { j } ] ,\tag{41}
$$

where $f _ { j } ^ { * }$ is the fused form feature map $f _ { j } .$ Given that L is the input of the decoder as the last-level feature map, the final result of cross-scale attention is $f _ { 1 } ^ { * } , f _ { 2 } ^ { * } , \ldots , f _ { L } ^ { * }$ . The output of this backbone is fed to the decoder that takes object queries in parallel. It provides output embeddings independently transformed into class labels and box coordinates by a forward feed network. Without an encoder module, the decoder directly used the finefused feature maps provided by the backbone network, with a novel cross-scale attention module providing better performance with low computational cost.

![](Images_GFP684MN/efd2b5160235229e6876e2db5da9d069ea1cb7627413b0a9242a2a0de9dfe6e9.jpg)  
Figure 7. The structure of the original DETR after the addition of D2ETR [32], FP-DETR [33], and CF-DETR [34]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The light green block indicates D2ETR, the pink block indicates FP-DETR, and the blue box represents CF-DETR.

## 3.15. FP-DETR

Modern CNN-based detectors like YOLO [221] and Faster-RCNN [1] utilize specialized layers on top of backbones pre-trained on ImageNet to enjoy pre-training benefits such as improved performance and faster training convergence. The DETR network and its improved version [21] only pre-train its backbone while training both encoder and decoder layers from scratch. Thus, the transformer needs massive training data for fine-tuning. The main reason for not pre-training the detection transformer is the difference between the pre-training and final detection tasks. Firstly, the decoder module of the transformer takes multiple object queries as input for detecting objects, while ImageNet classification takes only a single query (class token). Secondly, the self-attention module and the projections on input query embeddings in the cross-attention module easily overfit a single class query, making the decoder network difficult to pre-train. Moreover, the downstream detection task focuses on classification and localization, while the upstream task considers only classification for the objects of interest.

FP-DETR [33] reformulates the pre-training and fine-tuning stages for detection transformers. In Figure 7, the pink block indicates FP-DETR. It takes only the encoder network of the detection transformer for pre-training, as it is challenging to pre-train the decoder on the ImageNet classification task. Moreover, DETR uses both the encoder and CNN backbone as feature extractors. FP-DETR replaces the CNN backbone with a multi-scale tokenizer and uses the encoder network to extract features. It fully pre-trains the Deformable-DETR on the ImageNet dataset and fine-tunes it for final detection that achieves competitive performance.

## 3.16. CF-DETR

CF-DETR [34] observes that COCO-style metric average precision (AP) results for small objects on detection transformers at low IoU threshold values are better than CNNbased detectors. It refines the predicted locations by utilizing local information, as incorrect bounding box location reduces performance on small objects. CF-DETR introduces the transformer-enhanced FPN (TEF) module, coarse layers, and fine layers into the decoder network of DETR. In Figure 7, the blue box represents CF-DETR. The TEF module provides the same functionality as FPN, has non-local features E4 and E4 extracted from the backbone, and E5 features taken from the encoder output. The features of the TEF module and the encoder network are fed to the decoder as input. The decoder modules introduce a coarse block and a fine block. The coarse block selects foreground features from the global context. The fine block has two modules: adaptive scale-fusion (ASF) and local cross-attention (LCA), further refining coarse boxes. In summary, these modules refine and enrich the features by fusing global and local information to improve detection transformer performance.

## 3.17. DAB-DETR

DAB-DETR [72] uses the bounding box coordinates as object queries in the decoder and gradually updates them in every layer. In Figure 8, the purple block indicates DAB-DETR. These box coordinates make training convergence faster by providing positional information and using the height and width values to update the positional attention map. This type of object query provides better spatial information prior to the attention mechanism and provides a simple query formulation mechanism.

![](Images_GFP684MN/9c3e4a57096bb1f03483aa216c98eb81a123bf892b35fc6ae6d6683f955b1cf3.jpg)  
Figure 8. The structure of the original DETR after the addition of DAB-DETR [72], DN-DETR [35], and AdaMixer [36]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The purple block indicates DAB-DETR, the dark green block indicates DN-DETR, and light green box represents AdaMixer.

The decoder network contains two main networks: a self-attention network to update queries and a cross-attention network to find feature probing. The difference between the self-attention of the original DETR and DAB-DETR is that the query and key matrices also have position information taken from bounding box coordinates. The cross-attention module concatenates the position and content information in key and query matrices and determines their corresponding heads. The decoder takes input embeddings as content queries and anchor boxes as positional queries to find object probabilities related to anchors and content queries. This way, dynamic box coordinates used as object queries provide better prediction, making the training convergence faster and increasing detection results for small objects.

## 3.18. DN-DETR

DN-DETR [35] uses noised object queries as an additional decoder input to reduce the instability of the bipartite-matching mechanism in DETR, which causes the slow convergence problem. In Figure 8, the dark green block indicates DN-DETR. The decoder queries have two parts: the denoising part, containing noised ground-truth box-label pairs as input, and the matching part, containing learnable anchors as input. The matching part $M = \left\{ M _ { 0 } , M _ { 1 } , \dots , M _ { l - 1 } \right\}$ determines the resemblance between the ground-truth label pairs and the decoder output, while the denoising part $d = \{ d _ { 0 } , d _ { 1 } , \dotsc , d _ { k - 1 } \}$ attempts to reconstruct the ground-truth objects as follows:

$$
O u t p u t = D e c o d e r ( d , M , I | A ) ,\tag{42}
$$

where I is the image features taken as input from the transformer encoder, and A is the attention mask that stops the information transfer between the matching and denoising parts and among different noised levels of the same ground-truth objects. The decoder has noised levels of ground-truth objects where noise is added to bounding boxes and class labels, such as label flipping. It contains a hyperparameter λ for controlling the noise level. The training architecture of DN-DETR is based on DAB-DETR, as it also takes bounding box coordinates as object queries. The only difference between these two architectures is the class label indicator as an additional input in the decoder to assist label denoising. The bounding boxes are updated inconsistently in DAB-DETR, making relative offset learning challenging. The denoising training mechanism in DN-DETR improves performance and training convergence.

## 3.19. AdaMixer

AdaMixer [36] considers the encoder an extra network between the backbone and decoder that limits the performance and slows the training convergence because of its design complexity. AdaMixer provides a detection transformer network without an encoder. In Figure 8, the light green box represents AdaMixer. The main modules of AdaMixer are explained as follows.

Three-dimensional feature space: For the 3D feature space, the input feature map from the CNN backbone with the downsampling stride $s _ { i } ^ { f }$ is first transformed by a linear layer to the same $d _ { f }$ channel and computed the coordinate of its z-axis as follows:

$$
z _ { i } ^ { f } = l o g _ { 2 } ( s _ { i } ^ { f } / s _ { b } ) ,\tag{43}
$$

where the height $h _ { i }$ and width $w _ { i }$ of feature maps (different strides) is rescaled to $h _ { i } / s _ { b }$ and $w _ { i } / s _ { b } ,$ , where $s _ { b } = 4$

Three-dimensional feature-sampling process: In the sampling process, the query generates $I _ { p }$ groups of vectors to $I _ { p }$ points, $( \Delta x _ { j } , \Delta y _ { j } , \Delta z _ { j } ) I _ { p } ,$ , where each vector is dependent on its content vector $q _ { i }$ by a linear layer $L _ { i }$ as follows:

$$
( \Delta x _ { j } , \Delta y _ { j } , \Delta z _ { j } ) I _ { p } = L _ { i } ( q _ { i } ) .\tag{44}
$$

These offset values are converted into sampling positions with regard to the position vector of the object query as follows:

$$
\left\{ \begin{array} { l l } { \tilde { x } _ { j } } & { = x + \Delta x _ { j } . 2 ^ { z - r } , } \\ { \tilde { y } _ { j } } & { = y + \Delta y _ { j } . 2 ^ { z + r } , } \\ { \tilde { z } _ { j } } & { = z + \Delta z _ { j } . } \end{array} \right.\tag{45}
$$

The interpolation over the 3D feature space first samples by bilinear interpolation in the $\left( x _ { i } , y _ { i } \right)$ space and then interpolates on the z-axis by Gaussian weighting, where the weight for the i-th feature map is as follows:

$$
\tilde { w } _ { i } = \frac { e x p ( - ( \tilde { z } - z _ { i } ^ { f } ) ^ { 2 } / \Gamma _ { z } ) } { \sum _ { i } e x p ( - ( \tilde { z } - z _ { i } ^ { f } ) ^ { 2 } / \Gamma _ { z } ) } ,\tag{46}
$$

where $\Gamma _ { z }$ is the softening coefficient used to interpolate values over the z-axis $( \Gamma _ { z } = 2 )$ This process makes decoder detection learning easier by taking feature samples according to the query.

AdaMixer Decoder: The decoder module in AdaMixer takes a content vector $q _ { i }$ and positional vector $\left( x _ { i } , y _ { i } , z _ { i } , r _ { i } \right)$ as input object queries. The position-aware multi-head selfattention is applied between these queries as follows:

$$
A t t n ( q _ { i } , k _ { i } , v _ { i } ) = S o f t m a x ( \frac { q _ { i } k _ { i } ^ { T } } { \sqrt { d } } + \alpha X ) . v _ { i } ,\tag{47}
$$

where $X _ { k l } = l o g ( | b o x _ { k } \cap b o x _ { l } / | b o x _ { k } | + \epsilon ) , \epsilon = 1 0 ^ { - 7 } .$ . The $X _ { k l } = 0$ indicates the boxk is inside the $b o x _ { l }$ and $X _ { k l } = l$ represents no overlapping between bo ${ { x } _ { k } }$ and boxl. This position vector is updated at every stage of the decoder network. The AdaMixer decoder module takes a content vector and a positional vector as input object queries. For this, multi-scale features taken from the CNN backbone are converted into a 3D feature space, as the decoder should consider $\left( x _ { i } , y _ { i } \right)$ space as well as be adjustable in terms of scales of detected objects. It takes the sampled features from this feature space as input. It applies the AdaMixer mechanism to provide final predictions of input queries without using an encoder network to reduce the computational complexity of detection transformers.

## 3.20. REGO-DETR

REGO-DETR [37] proposes an RoI-based method for detection refinement to improve the attention mechanism in DETR. In Figure 9, the purple color block denotes REGO-DETR. It contains two main modules: a multi-level recurrent mechanism and a glimpse-based decoder. In the multi-level recurrent mechanism, bounding boxes detected in the previous level are considered to get glimpse features. These are converted into refined attention using earlier attention in describing objects. The k-th processing level is as follows:

$$
\left\{ \begin{array} { l l } { \displaystyle O _ { c l a s s } ( k ) = D F _ { c l a s s } ( H _ { d e } ( k ) ) , } \\ { O _ { b b o x } ( k ) = D F _ { b b o x } ( H _ { d e } ( k ) ) + O _ { b b o x } ( k - 1 ) , } \end{array} \right.\tag{48}
$$

where $O _ { c l a s s } \in \mathbb { R } ^ { M _ { d } \times M _ { c } }$ and $O _ { b b o x } \in \mathbb { R } ^ { M _ { d } \times 4 }$ . Here, $M _ { d }$ and $M _ { c }$ represent the total number of predicted objects and classes, respectively. $D F _ { c l a s s }$ and $D F _ { b b o x }$ are functions that convert the input features into desired outputs. $H _ { d e } ( k )$ is the attention of this level after decoding as follows:

$$
H _ { d e } ( k ) = [ H _ { g m } ( k ) , H _ { d e } ( k - 1 ) ] ,\tag{49}
$$

where $H _ { g m } ( k )$ refers to the glimpse features according to $H _ { d e } ( k - 1 )$ and previous levels. These glimpse features are transformed using multi-head cross-attention into refined attention outputs according to previous attention outputs as follows:

$$
H _ { g m } ( k ) = A t t n ( V ( k ) , H _ { d e } ( k - 1 ) ) .\tag{50}
$$

For extracting glimpse features $V ( k )$ , the following operation is performed:

$$
V ( k ) = F E _ { e x t } ( X , R I ( { \cal O } _ { b b o x } ( k - 1 ) , \alpha ( k ) ) ) ,\tag{51}
$$

where $F E _ { e x t }$ is the feature extraction function, $\alpha ( k )$ is a scalar parameter, and RI is the RoI computation. In this way, region of interest (RoI)-based refinement modules make the training convergence of the detection transformer faster and provide better performance.

![](Images_GFP684MN/974b963dbb7639bd17f5112d7db66dc6bb410ac634f49e4993a0377bbd03b8a2.jpg)  
Figure 9. The structure of the original DETR after the addition of REGO-DETR [37] and DINO [38]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The purple color block indicates REGO-DETR and the red indicator block represents DINO.

## 3.21. DINO

DN-DETR adds positive noise to the anchors taken as object queries to the input of the decoder and provides labels to only those anchors with ground-truth objects nearby. Following DAB-DETR and DN-DETR, DINO [38] proposes a mixed object query selection method for anchor initialization and a look forward twice mechanism for box prediction. It provides the contrastive denoising (CDN) module, which takes positional queries as anchor boxes and adds additional DN loss. In Figure 9, the red block indicates DINO. This detector uses $\lambda _ { 1 }$ and $\lambda _ { 2 }$ hyperparameters where $\lambda _ { 1 } < \lambda _ { 2 }$ . The bounding box $\boldsymbol { b } = \left( x _ { i } , y _ { i } , w _ { i } , h _ { i } \right)$ taken as input in the decoder, its corresponding generated anchor is denoted as $a = \left( x _ { i } , y _ { i } , w _ { i } , h _ { i } \right)$

$$
\begin{array} { r } { A T D ( k ) = \frac { 1 } { k } \Sigma \{ M _ { K } ( \{ \mid b _ { 0 } - a _ { 0 } \mid _ { 1 } , \mid b _ { 1 } - a _ { 1 } \mid _ { 1 } , . . . , \mid \mid b _ { N - 1 } - a _ { N - 1 } \mid _ { 1 } \} , k ) \} , } \end{array}\tag{52}
$$

where $\parallel \left( b _ { i } - a _ { i } \right) \ |$ is the distance between the anchor and bounding box, and $M _ { K } ( { \boldsymbol { x } } , { \boldsymbol { k } } )$ is the function that provides the top K elements in x. The λ parameter is the threshold value for generating noise for anchors that are fed as input object queries to the decoder. It provides two types of anchor queries: positive with threshold value less than $\lambda _ { 1 }$ and negative with noise threshold values greater than $\lambda _ { 1 }$ and less than $\lambda _ { 2 }$ . This way, the anchors with no ground-truth nearby are labeled as “no object”. Thus, DINO makes the training convergence faster and improves performance for small objects.

DINOv2 [222] is a self-supervised vision transformer model developed by Meta AI. It was trained on a large-scale dataset of 142 million images without any labels or annotations. DINOv2 [222] produces high-performance visual features that can be directly employed with classifiers as simple as linear layers on a variety of computer vision tasks. These visual features are robust and perform well across domains without any requirement for fine-tuning. DINOv3 [223], also developed by Meta AI, is the third generation of the DINO framework. It is a 7-billion-parameter Vision Transformer trained on 1.7 billion images without labels. DINOv3 [223] introduces several innovations, including Gram anchoring, which stabilizes dense feature maps during training, and axial RoPE (Rotary Positional Embeddings) with jittering, which enhances the model’s robustness to varying image resolutions, scales, and aspect ratios. These advancements enable DINOv3 [223] to achieve state-of-the-art performance across a wide range of vision tasks, including object detection, semantic segmentation, and depth estimation.

## 3.22. Co-DETR

Co-DETR [39] is an improvement over DETR that addresses a key limitation of the standard one-to-one label assignment, which in DETR restricts each ground-truth object to a single predicted query. In Figure 10, the light red block indicates Co-DETR. This design leads to a few positive samples during training, leaving many decoder queries unused and slowing gradient flow, particularly in the early stages of learning. Co-DETR overcomes this by introducing a collaborative hybrid assignment strategy that combines the original one-to-one assignment with a one-to-many assignment implemented through auxiliary heads. The one-to-one assignment preserves the unique matching of each object, maintaining the stability and structure of DETR’s training. The one-to-many assignment leverages heuristics from classical object detectors, such as ATSS or Faster R-CNN, to assign multiple predicted queries to the same ground-truth object, providing denser supervision for both the encoder and decoder. The auxiliary heads are only active during training and are discarded during inference, ensuring no additional computational cost at test time.

The total training loss is expressed as follows:

$$
L _ { \mathrm { t o t a l } } = L _ { \mathrm { D E T } } + \sum _ { h \in \mathrm { a u x i l i a r y } } L _ { \mathrm { a u x } , h } ,\tag{53}
$$

where LDET is the standard DETR loss and $L _ { \mathrm { a u x } , h }$ represents the one-to-many assignment loss from each auxiliary head. This hybrid assignment improves gradient flow by increasing the number of positive samples per batch, enhances encoder supervision through additional feedback signals, and leads to better detection performance on benchmarks such as COCO and LVIS. By enriching training supervision without altering the inference process, Co-DETR enables faster convergence, more effective learning, and higher accuracy in DETRbased object detectors.

![](Images_GFP684MN/d02651a8844595ff0e89226c712f509c9644f1df46a487bdd3f97671c2cea1fc.jpg)  
Figure 10. The structure of the original DETR after the addition of Co-DETR [37], RT-DETR, and LW-DETR [38]. Here, the network is a simple DETR network, along with improvement indicated with small colored boxes. The light red indicator block represents Co-DETR, blue color block indicates LW-DETR, and the purple color block indicates RT-DETR.

## 3.23. LW-DETR

LW-DETR [40] is a lightweight, transformer-based object detection model designed for high accuracy and real-time performance. It streamlines the standard DETR architecture by using an optimized vision transformer (ViT) encoder and a shallow decoder. The model first processes an input image by breaking it into patches and extracting features through the encoder. These features are then refined via a convolutional projection layer before being passed to the decoder, which uses a set of object queries to predict bounding boxes and class labels. In Figure 10, the blue block indicates LW-DETR. LW-DETR further improves efficiency through several strategies: interleaved window and global attention reduce the complexity of self-attention, multi-level feature aggregation captures richer representations, and window-major feature map organization optimizes attention computation. During training, the model employs deformable cross-attention to focus on relevant regions, IoUaware classification loss to enhance localization accuracy, and encoder–decoder pre-training to learn robust features. The total training loss combines classification, bounding box regression, and IoU losses to guide learning effectively.

$$
L _ { \mathrm { t o t a l } } = L _ { \mathrm { c l s } } + L _ { \mathrm { b o x } } + \lambda _ { \mathrm { g i o u } } L _ { \mathrm { G I o U } } ,\tag{54}
$$

where $L _ { \mathrm { c l s } }$ is the classification loss, $L _ { \mathrm { b o x } }$ is the bounding box regression loss, $L _ { \mathrm { G I o U } }$ is the generalized intersection over union loss, and $\lambda _ { \mathrm { g i o u } }$ balances the contributions of the losses. Experimental results show that LW-DETR achieves higher accuracy than many real-time detectors, including YOLO variants, while maintaining low computational cost, making it suitable for real-time object detection tasks.

## 3.24. RT-DETR

An RT-DETR [41] (real-time detection transformer) is a transformer-based object detection model developed by Baidu, designed for high-speed, end-to-end inference suitable for real-time applications. In Figure 10, the purple block indicates RT-DETR. The model employs a hybrid encoder that processes multi-scale features by decoupling intra-scale interactions and cross-scale feature fusion. This efficient design reduces computational costs while retaining rich feature representations. The encoder outputs multi-scale feature maps, which are then passed to a DETR-style decoder. An IoU-aware query selection mechanism is utilized to focus on the most relevant object queries, enhancing detection accuracy. Additionally, the inference speed can be adjusted by changing the number of decoder layers, allowing for flexible deployment across different real-time scenarios.

Subsequent versions build upon this foundation to further enhance performance. RT-DETRv2 [224] introduces selective multi-scale sampling and replaces the grid-sample operator with a discrete sampling operator, improving the detection of objects at different scales. It also employs dynamic data augmentation and scale-adaptive hyperparameter tuning to enhance training efficiency without increasing inference latency. RT-DETRv3 [225] addresses limitations of sparse supervision and insufficient decoder training by adding a CNN-based auxiliary branch for dense supervision, a self-attention perturbation strategy to diversify label assignment, and a shared-weight decoder branch for dense positive supervision. In summary, the RT-DETR series demonstrates a clear evolution in real-time object detection, with each version introducing architectural and training innovations that enhance both speed and accuracy. The original RT-DETR establishes the foundation for real-time performance, while v2 and v3 progressively improve detection capability without compromising inference efficiency.

It is important to compare modifications in detection transformers to understand their effect on network size, training convergence, and performance. In this work, we use the COCO2014 mini validation set (minival) as a benchmark, since COCO is a widely accepted standard for evaluating object detection models [75]. All images are preprocessed using standard resizing and normalization procedures, and data augmentation, such as random horizontal flipping, is applied, consistent with typical DETR training protocols. The performance of DETR and its variants is evaluated using mean average precision (mAP), calculated as the mean of each object category’s average precision (AP), where AP corresponds to the area under the precision–recall curve [226]. Following the standard COCO evaluation protocol, objects are classified into three size categories based on pixel area: small $( < 3 2 ^ { 2 }$ pixels), medium $( 3 2 ^ { 2 } - 9 6 ^ { 2 }$ pixels), and large $( > 9 6 ^ { 2 }$ pixels). This categorization allows for detailed analysis across object scales, with $\mathrm { A P } _ { \mathrm { S } } , \mathrm { A P } _ { \mathrm { M } } .$ , and $\mathrm { A P _ { L } }$ reporting performance for small, medium, and large objects, respectively. For a fair comparison, all results are obtained by loading the original pre-trained PTH files released by the respective authors and validating them on the COCO minival set. This approach allows us to reproduce the reported performance of each model while focusing on the architectural differences and improvements introduced by various DETR variants.

## 4. Results and Discussion

Many advancements are proposed in DETR, such as backbone modification, query design, and attention refinement to improve performance and training convergence. Table 3 shows the performance comparison of all DETR-based detection transformers on the COCO minival set. We can observe that DETR performs well at 500 training epochs and has low AP on small objects. The modified versions improve performance and training convergence, like DINO, which has an mAP of 49.0% at 12 epochs and performs well on small objects.

The quantitative analysis of DETR and its updated versions regarding training convergence and model size on the COCO minival set is performed. Left side of Figure 11 shows the mAP of the detection transformers using a ResNet-50 backbone with training epochs. The original DETR, represented with a brown line, has low training convergence. It has an mAP value of 35.3% at 50 training epochs and 44.9 % at 500 training epochs. Here, DINO, represented with a red line, converges at low training epochs and gives the highest mAP on all epoch values. The attention mechanism in DETR involves computing pairwise attention scores between every pair of feature vectors, which can be computationally expensive, especially for large input images. Moreover, the self-attention mechanism in DETR relies on using fixed positional encodings to encode the spatial relationships between the different parts of the input image. This can slow down the training process and increase convergence time. In contrast, Deformable-DETR and DINO have some modifications that can help speed up the training process. For example, Deformable DETR introduces deformable attention layers, which can better capture spatial context information and improve object detection accuracy. Similarly, DINO uses a denoising learning approach to train the network to learn more generalized features useful for object detection, making the training process faster and more effective.

Right side of Figure 11 compares all detection transformers regarding the model size. Here, YOLOS-DETR uses DeiT-small as the backbone instead of DeiT-Ti, but it also increases the model size by 20x times. DINO and REGO-DETR have comparable mAP, but REGO-DETR is nearly double the model size of DINO. These networks use more complex architectures than the original DETR architecture, which increases the total parameters and the overall network size.

We also provide a qualitative analysis of DETR and its updated versions on all-sized objects in Figure 12. For small objects, the mAP for the original DETR is 15.2% at 50 epochs, while Deformable-DETR has an mAP value of 26.4% at 50 epochs. The self-attention mechanism in Deformable-DETR allows it to interpolate features from neighboring pixels, which is particularly useful for small objects that may only occupy a few pixels in an image. This mechanism in Deformable-DETR captures more precise and detailed information about small objects, which can lead to better performance than DETR.

Table 3. Performance comparison of all DETR-based detection transformers on the COCO minival set. Here, networks labeled with DC5 take a dilated feature map. The IoU threshold values are set to 0.5 and 0.75 for AP calculation and also calculate the AP for small $( A P _ { s } ) ,$ medium $( A P _ { m } ) ,$ , and large (APl) objects. + represents bounding-box refinement and ++ denotes Deformable-DETR. ∗∗ indicates Efficient-DETR used 6 encoder layers and 1 decoder layer. S denotes small, and B indicates base. † represents the distillation mechanism by Touvron et al. [227]. ‡ indicates the model is pre-trained on ImageNet-21k. All models use 300 queries, while DETR uses 100 object queries to input to the decoder network. The models with superscript ∗ use three pattern embeddings. All GitHub links in this Table are accessed on 25 September 2025.
<table><tr><td>Methods</td><td>Backbone</td><td>Publications</td><td>Epoch</td><td>GFLOPs</td><td>Parameters (M)</td><td>AP</td><td> $\mathbf { A } \mathbf { P } ^ { 5 0 }$ </td><td> $\mathbf { A } \mathbf { P } ^ { 7 5 }$ </td><td> $\mathbf { A P _ { S } }$ </td><td> $\mathbf { A P _ { M } }$ </td><td></td><td> $\mathbf { A P _ { L } }$ </td></tr><tr><td rowspan="2">DETR[11]GitHub htps://github.com/facebookresearch/detr</td><td>DC5-ResNet-50 DC5-ResNet-50</td><td rowspan="2">ECCV 2020</td><td>50</td><td>187</td><td>41460</td><td>35.3</td><td>55.7 </td><td>36.8 8</td><td></td><td>15.2</td><td>37.5</td><td>53.6</td></tr><tr><td>DC5-ResNet-101</td><td>500</td><td></td><td></td><td>8</td><td></td><td></td><td></td><td>2</td><td></td><td>611 62.3</td></tr><tr><td rowspan="2">Deformable-DETR [20] GitHub</td><td>ResNet-50</td><td rowspan="2">ICLR 2021</td><td>50</td><td>173</td><td></td><td></td><td>43.8 62.6</td><td>47.7</td><td></td><td>26.4</td><td></td><td>58.0</td></tr><tr><td>ResNet-50 +</td><td>50</td><td>173</td><td>40 40</td><td></td><td>45.4</td><td>64.7</td><td></td><td>26.8</td><td>47.1 48.3</td><td></td></tr><tr><td rowspan="2">https://gitub.com/fundamentalvision/Deformable-DETR</td><td rowspan="2">ResNet-50 ++ ResNet-50</td><td rowspan="2">CVPR 2021</td><td>50</td><td>173</td><td>40</td><td></td><td>65.2</td><td>49.0 50.0</td><td>28.8</td><td></td><td>61.7</td><td></td></tr><tr><td></td><td>86</td><td>41</td><td></td><td>46.2 40.5</td><td>60.8</td><td></td><td>19.0</td><td>49.2 44.4</td><td>61.7</td></tr><tr><td rowspan="2">UP-DETR [21]GitHub htps://github.com/ddzg/up-etr</td><td rowspan="2">ResNet-50 ResNet-50</td><td rowspan="2">arXiv 2021</td><td>150 300</td><td>86</td><td>41</td><td></td><td>42.8 63.0</td><td>42.6 45.3</td><td></td><td>20.8</td><td></td><td>60.0</td></tr><tr><td></td><td>159</td><td>3254</td><td></td><td>44.2</td><td>62.2</td><td>48.0</td><td>28.4</td><td>47.1 47.5</td><td>61.7</td></tr><tr><td rowspan="2">Efficint-DETR [22]</td><td rowspan="2">ResNet-101 ResNet-101 ** ResNet-50</td><td rowspan="2"></td><td>36630</td><td>239</td><td></td><td></td><td>45.2 637</td><td>48.8</td><td></td><td>28.8</td><td>49.1</td><td>56.6 59.0</td></tr><tr><td></td><td>289 152</td><td></td><td>45.7</td><td>64.1</td><td></td><td>49.5</td><td>28.2</td><td>49.1</td><td>60.2</td></tr><tr><td rowspan="2"> SMCA-DETR[23]GitHub htps://github.com/gaopengcuhk/SMCA-DETR</td><td rowspan="2">ResNet-50 ResNet-101</td><td rowspan="2">ICCV 2021</td><td rowspan="2"></td><td>152</td><td></td><td>404058</td><td>4</td><td>63.6 65.5</td><td>47.2</td><td>24.2 25.9</td><td>47.0</td><td>60.4</td></tr><tr><td></td><td>218</td><td></td><td>44.4</td><td>65.2</td><td>49.1 48.0</td><td>24.3</td><td>49.3 48.5</td><td>62.6 610</td></tr><tr><td rowspan="2">TSP-DETR [24]GitHub https://github.com/Edward-Sun/TSP-Detection</td><td rowspan="2">FCOS-ResNet-50 RCNN-ResNet-50</td><td rowspan="2">ICCV 2021</td><td rowspan="2">36</td><td>189</td><td></td><td>51.5</td><td>43.1</td><td>62.3</td><td></td><td>26.6</td><td></td><td></td></tr><tr><td></td><td>188</td><td>63.6</td><td>43.8</td><td>63.3</td><td>47.0 48.3</td><td>28.6</td><td>46.8 46.9</td><td>55.9 55.7</td></tr><tr><td>Conditional-DETR[25]GitHubhtps://github.com/Atten4Vis/ConditionalDETR</td><td>DC5-ResNet-50</td><td>ICCV 2021</td><td>50</td><td>195</td><td>8</td><td></td><td>8 64</td><td>46.7</td><td></td><td>2</td><td>47.6</td><td>60.7</td></tr><tr><td>WB-DETR[26]GitHub https://github.com/aybora/wbdetr</td><td>DC5-ResNet-101 -</td><td>ICCV 2021</td><td>500</td><td>98</td><td>24</td><td></td><td>65.5 41.8 63.2</td><td>48.4 44.8</td><td></td><td>19.4</td><td>48.9</td><td>62.8</td></tr><tr><td>PnP-DETR[27]GitHub htps://github.com/twangh/-det</td><td>DC5-ResNet-50</td><td>ICCV 2021</td><td>500</td><td>145</td><td>41</td><td></td><td>43.1 63.4</td><td>45.3</td><td></td><td>22.7</td><td>45.1 46.5</td><td>62.4 61.1</td></tr><tr><td>Dynamc-DETR [28]</td><td>ResNet-50</td><td>ICCV 2021</td><td>12</td><td>-</td><td>58</td><td></td><td>42.961.0</td><td>46.3</td><td></td><td></td><td>44.9</td><td>54.4</td></tr><tr><td rowspan="2"> YOLOS-DETR [29] GitHub htps://github.com/hustvl/YOLOS</td><td rowspan="2">DeiT-S [227]t DeiT-B[227]t</td><td rowspan="2"></td><td rowspan="2">150</td><td>150</td><td>194</td><td>31</td><td></td><td>56.5</td><td></td><td></td><td></td><td></td></tr><tr><td>NeurIPS 2021</td><td>538</td><td>127</td><td>361</td><td>62.2</td><td>37.1 44.5</td><td>15.3</td><td>38.5</td><td>56.2</td></tr><tr><td> Anchor-DETR[30]GitHub https://github.com/megvi-esearch/AnchorDETR</td><td>DC5-ResNet-50 *</td><td>AAAI 2022</td><td>5</td><td>151</td><td>38</td><td></td><td>44.2 647</td><td>47.5</td><td></td><td>19.5 24.7</td><td>45.3 48.2</td><td>62.1 60.6</td></tr><tr><td> Sparse-DETR[31]GitHub htps://github.com/kakaobrain/sparse-detr</td><td>DC5-ResNet-101 * ResNet-50-p-0.5</td><td>ICLR 2022</td><td>50</td><td>237 16</td><td></td><td></td><td>45.1 46.3</td><td>65.7 48.8 50.1</td><td></td><td>25.8 29.0</td><td>49. 49.5</td><td>61.6 60.8</td></tr><tr><td rowspan="2">D2ETR[32]GitHubhttps://github.com/alibab/easyrobust/tree/mainddetr Def D2ETR[32]</td><td rowspan="2">Swin-T-p-0.5[228] PVT2 PVT2</td><td rowspan="2">arXiv 2022</td><td rowspan="2">50</td><td rowspan="2"></td><td></td><td></td><td>49.3</td><td>66.0 69.5</td><td></td><td></td><td></td><td></td></tr><tr><td></td><td>4 8 3</td><td>43.2 50.0 67.9</td><td>62.9</td><td>53.3 46.2</td><td>32.0 22.0</td><td>52.7 48.5</td><td>64.9</td></tr></table>

Table 3. Cont.
<table><tr><td>Methods</td><td>Backbone</td><td>Publications</td><td>Epoch 50550</td><td>GFLOPs</td><td>Parameters (M)</td><td>AP</td><td>AP50</td><td> $\mathbf { A } \mathbf { P } ^ { 7 5 }$ </td><td>APs</td><td> $\mathbf { A P _ { M } }$ </td><td>APL</td></tr><tr><td rowspan="2">FP-DETR-S[3GitHubhtts://github.com/encounter197/F-DER FP-DETR-B3]GitHubhps://githubcom/encounter1997/F-D</td><td>- -</td><td rowspan="2">ICLR 2022</td><td></td><td>102</td><td></td><td>42.5 43.3</td><td>62.6</td><td>45.9 47.7</td><td>25.3 27.5</td><td>45.5 46.1</td><td>56.9</td></tr><tr><td></td><td></td><td></td><td></td><td></td><td>63.9</td><td></td><td></td><td></td><td>57.0</td></tr><tr><td rowspan="2">FP-DETR-B‡33]GitHubhps://githubom/encounter1997/F-DT CF-DETR [34]</td><td>-</td><td rowspan="2"></td><td>36</td><td>1</td><td>243630</td><td>43.7</td><td>641</td><td>47.8</td><td>26.5</td><td>46.7</td><td>58.2</td></tr><tr><td>ResNet-50</td><td></td><td></td><td></td><td>47.8</td><td>66.5</td><td>52.4</td><td>31.2</td><td>50.6 52.2</td><td>62.8</td></tr><tr><td rowspan="2"> DAB-DETR [72] GitHub https://github.com/IDEA-Research/DAB-DETR</td><td>ResNet-101</td><td rowspan="2">AAAI 2022 ICLR 2022</td><td></td><td>--</td><td>-</td><td>49.0</td><td>68.1</td><td>53.4</td><td>314</td><td></td><td>64.3</td></tr><tr><td>DC5-ResNet-50 * DC5-ResNet-101 *</td><td></td><td>216</td><td>44</td><td>45.7</td><td>66.2</td><td>49.0</td><td>26.1</td><td>49.4</td><td>63.1</td></tr><tr><td rowspan="2"></td><td></td><td rowspan="2"></td><td>50</td><td>296</td><td>63</td><td>46.6</td><td>67.0</td><td>50.2</td><td>28.1</td><td>50.5</td><td>64.1</td></tr><tr><td>ResNet-50 DC5-ResNet-50</td><td>5050</td><td>94 202</td><td></td><td>44.1</td><td>64.4</td><td>46.7 49.7</td><td>22.9 26.7</td><td>48.0</td><td>63.4</td></tr><tr><td rowspan="2"> DN-DETR [35] GitHub https://github.com/IDEA-Research/DN-DETR</td><td>ResNet-101</td><td rowspan="2">CVPR 2022</td><td></td><td>174</td><td>4466</td><td>46.3 45.2</td><td>66.4 65.5</td><td>48.3</td><td>24.1</td><td>50.0</td><td>64.3</td></tr><tr><td>DC5-ResNet-101</td><td></td><td></td><td></td><td>47.3</td><td>67.5</td><td>50.8</td><td>28.6</td><td>49.1 51.5</td><td>65.1 65.0</td></tr><tr><td rowspan="2"> AdaMixer [36]GitHub htps://github.com/MCG-NJU/AdaMixer</td><td>ResNet-50</td><td rowspan="2">CVPR 2022</td><td></td><td>132</td><td>10</td><td></td><td>66.0</td><td></td><td>30.1</td><td></td><td></td></tr><tr><td>ResNeXt-101-DCN</td><td>33</td><td></td><td></td><td>47.0 49.5</td><td>68.9</td><td>51.1 53.9</td><td>31.3</td><td>50.2 52.3</td><td>61.8 66.3</td></tr><tr><td rowspan="2"></td><td>Swin-s [228]</td><td rowspan="2"></td><td></td><td>2</td><td>164</td><td>51.3</td><td>712</td><td>55.7</td><td>34.2</td><td></td><td></td></tr><tr><td>ResNet-50 ++</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>54.6</td><td>67.3</td></tr><tr><td rowspan="2">REGO [37] GitHub htps://github.com/zhechen/Deformable-DETR-REGO</td><td>ResNet-101 ++</td><td rowspan="2">CVPR 2022</td><td></td><td>190 23</td><td></td><td>47.6 48.5</td><td>66.8 67.0</td><td>51.6 52.4</td><td>29.6 29.5</td><td>50.6</td><td>62.3</td></tr><tr><td>ReNeXt-101 ++</td><td>50550</td><td></td><td></td><td>49.1</td><td>67.5</td><td>53.1</td><td>30.0</td><td>52.0 52.6</td><td>644 65.0</td></tr><tr><td rowspan="2">DINO [38] GitHub htps://github.com/facebookresearch/dino</td><td>ReNet-50-4scale *</td><td rowspan="2"></td><td></td><td>279</td><td>5万</td><td></td><td></td><td>53.5</td><td>32.0</td><td></td><td></td></tr><tr><td>ResNet-50-5scale *</td><td>12</td><td>860</td><td></td><td>49.0 49.4</td><td>66.6 66.9</td><td>53.8</td><td>32.3</td><td>52.3 52.5</td><td>63.0 63.9</td></tr><tr><td rowspan="2"></td><td>ReNet-50-5scale *</td><td rowspan="2">arXiv 2022</td><td>24</td><td>860</td><td>4 47</td><td>51.3</td><td>69.1</td><td>56.0</td><td>34.5</td><td></td><td></td></tr><tr><td>ResNet-50-5scale *</td><td>36</td><td>860</td><td></td><td>51.2</td><td>69.0</td><td>55.8</td><td>35.0</td><td>54.2 54.3</td><td>65.8</td></tr><tr><td rowspan="2">Co-DETR [39]GitHub htps://github.com/Sense-X/Co-DETR</td><td>ReNet-50 *</td><td rowspan="2"></td><td></td><td>279</td><td>47</td><td>52.1</td><td>69.3</td><td>57.3</td><td>35.4</td><td></td><td>65.3</td></tr><tr><td>ReNet-50 *</td><td>136122</td><td>860</td><td></td><td>54.8</td><td>72.5</td><td>60.1</td><td>38.3</td><td>55.5 58.4</td><td>67.2</td></tr><tr><td rowspan="2"></td><td>Swin-L(IN-22K) *</td><td rowspan="2">ICCV 2023</td><td></td><td>860</td><td>老 47</td><td>59.3</td><td>77.3</td><td>64.9</td><td>43.3</td><td></td><td>69.6</td></tr><tr><td>Swin-L(IN-22K) *</td><td>34</td><td>860</td><td></td><td>60.4</td><td>78.3</td><td>66.4</td><td>44.6</td><td>63.3 64.2</td><td>75.5 76.5</td></tr><tr><td rowspan="2"> LW-DETR [40] GitHub https://github.com/Atten4Vis/LW-DETR</td><td>Swin-L(IN-22K) *</td><td rowspan="2">arXiv 2024</td><td></td><td>860</td><td>老</td><td>60.7</td><td>785</td><td>66.7</td><td>45.1</td><td>64.7</td><td>76.</td></tr><tr><td>-</td><td>50</td><td>67.7</td><td>54.6</td><td>54.4</td><td>1</td><td>-</td><td>48.0</td><td>52.5</td><td>56.1</td></tr><tr><td> RT-DETR [41] GitHub https://github.com/lyuwenyu/RT-DETR</td><td>ReNet-50*</td><td>CVPR 2024</td><td></td><td>136</td><td>42</td><td>53.1</td><td>71.3</td><td>57.7</td><td>34.8</td><td>58.0</td><td>70.0</td></tr><tr><td rowspan="2">RT-DETRv2 [24]GitHub htps:/ /github.com/supervisely-cosystem/RT-DETRv2</td><td>ResNet-101 *</td><td></td><td>2</td><td>259</td><td>76</td><td>54.3</td><td>72.7</td><td>58.6</td><td>36.0</td><td>58.8</td><td>72.1</td></tr><tr><td>ReNet-50 * ResNet-101 *</td><td>arXiv 2024</td><td>2</td><td></td><td></td><td>53.4</td><td></td><td></td><td></td><td></td><td></td></tr><tr><td> RT-DETRv3[25]GitHub htps://github.com/cxia12/RT-DETRv3</td><td>ReNet-50*</td><td>arXiv 2024</td><td>2</td><td>13 136</td><td>5</td><td>543 53.4</td><td></td><td></td><td></td><td>-</td><td></td></tr></table>

![](Images_GFP684MN/507382105aa07b518da378c858c0804b145742c736532e299fb2a7515008dafd.jpg)  
Figure 11. Comparison of all DETR-based detection transformers on the COCO minival set. left Performance comparison of detection transformers using a ResNet-50 [80] backbone with regard to training epochs. Networks that are labeled with DC5 take a dilated feature map. right Performance comparison of detection transformers with regard to model size (parameters in million).

![](Images_GFP684MN/7fdef3c2e7ca24ac1bb08ff3235b30a4014b6b82370b4f86d54f05e46edbc78d.jpg)  
Figure 12. Comparison of DETR-based detection transformers on the COCO minival set using a ResNet-50 backbone. left Performance comparison of detection transformers on small objects. middle Performance comparison of detection transformers on medium objects. right Performance comparison of detection transformers on large objects.

While DINO demonstrates impressive accuracy and fast convergence, its computational footprint remains a significant concern. With approximately 860 GFLOPs per inference, DINO is far more demanding than lightweight alternatives such as Nano YOLO variants, which typically operate in the range of 5–10 GFLOPs. This stark difference highlights a fundamental limitation of many DETR-based models: despite their accuracy gains, their inference cost makes them impractical for latency-critical or resource-constrained applications. In contrast, RT-DETR and LW-DETR provide lightweight and real-time DETR variants, achieving competitive accuracy with a substantially lower computational load (136–259 GFLOPs for RT-DETR and 67.7 GFLOPs for LW-DETR). Additionally, Co-DETR focuses on enhancing contextual reasoning to further boost detection performance, achieving very high AP scores, though at a higher computational cost similar to DINO. Thus, future research must address not only accuracy and convergence speed but also the efficiency gap that separates DETR variants from lightweight CNN-based detectors, ensuring their practical applicability in real-world scenarios.

While Table 3 and Figures 11 and 12 show performance improvements, it is also important to consider computational cost, memory footprint, and implementation complexity. Models like DINO and REGO achieve high mAP but require significantly more parameters and GFLOPs, making them less suitable for resource-constrained scenarios. Deformable-DETR provides a balanced trade-off by improving small object detection and convergence speed without drastically increasing computational load. YOLOS-DETR, while compact in design, relies on a transformer backbone (DeiT-S) that increases the memory requirement by up to 20×, highlighting a trade-off between model size and detection speed. Therefore, selecting a DETR variant depends not only on accuracy but also on hardware constraints, dataset characteristics, and real-time requirements.

## 5. Open Challenges and Future Directions

Detection transformers have shown promising results on various object detection benchmarks. However, several open challenges remain, providing directions for future improvements. Table 4 summarizes the advantages and limitations of the various improved versions of DETR. Some of the key open challenges and future directions are as follows.

Improving the attention mechanisms: The performance of detection transformers heavily relies on the attention mechanism to capture dependencies between spatial locations in an image. To date, around 60% of modifications in DETR have focused on the attention mechanism to improve performance and training convergence. Future research could explore more refined attention mechanisms to better capture spatial information or incorporate task-specific constraints.

Adaptive and dynamic backbones: The backbone architecture significantly affects network performance and size. Current detection transformers often use fixed backbones or remove them entirely. Only about 10% of DETR modifications have targeted the backbone to improve performance or reduce model size. Future work could investigate dynamic backbone architectures that adjust their complexity based on the input image, potentially enhancing both efficiency and accuracy.

Improving the quantity and quality of object queries: In DETR, the number of object queries fed to the decoder is typically fixed during training and inference, but the number of objects in an image varies. Later approaches, such as DAB-DETR, DN-DETR, and DINO, demonstrate that adjusting the quantity or quality of object queries can significantly impact performance. DAB-DETR uses dynamic anchor boxes as queries, DN-DETR adds positive noise to queries for denoising training, and DINO adds both positive and negative noise for improved denoising. Future models could dynamically adjust the number of object queries based on image content and incorporate adaptive mechanisms to improve query quality.

Emerging directions: Beyond attention mechanisms, backbones, and object queries, several additional challenges remain. Improving training efficiency through faster convergence strategies and sample-efficient learning could make DETR more practical for large-scale applications. Integrating multitask learning, such as jointly performing detection, segmentation, and tracking, can leverage shared representations for better performance. Enhancing robustness and generalization under occlusions, domain shifts, or low-resolution inputs is also critical. Interdisciplinary approaches could incorporate reinforcement learning to guide model adaptation, NLP-inspired sequence modeling to improve feature interactions, or graph-based reasoning techniques to capture relationships between objects. Concrete research challenges include designing models that dynamically adapt to new tasks or domains and developing cross-modal attention mechanisms that integrate multiple data sources for richer scene understanding.

Table 4. Overview of the advantages and limitations of detection transformers. All GitHub links in this Table are accessed on 25 September 2025.
<table><tr><td>Methods</td><td>Publications</td><td>Advantages</td><td>Limitations</td></tr><tr><td>DETR [11] GitHub https://github.com/facebookresearch/detr</td><td>ECCV 2020</td><td>Removes the need for hand-designed components like NMS or anchor generation.</td><td>Low performance on small objects and slow training convergence.</td></tr><tr><td>Deformable-DETR [20] GitHub https://github.com/fundamentalvision/D eformable-DETR</td><td>ICLR 2021</td><td>Deformable attention network, which makes training convergence faster.compared to DETR.</td><td>Number of encoder tokens increases by 20 times</td></tr></table>

Table 4. Cont.
<table><tr><td>Methods</td><td>Publications</td><td> Advantages</td><td>Limitations</td></tr><tr><td>UP-DETR [21] GitHub https://github.com/dddzg/up-detr</td><td>CVPR 2021</td><td>Pre-training for Multi-tasks learning and Multi-queries localization.</td><td>Pre-training for patch localization, CNN and transformers pre-training needs to integrate.</td></tr><tr><td>Efficient-DETR [22]</td><td>arXiv 2021</td><td>Reduces decoder layers by employing dense and sparse set based network</td><td>Increase in GFLOPs twice compared to original DETR.</td></tr><tr><td>SMCA-DETR [23] GitHub https: //github.com/gaopengcuhk/SMCA-DETR</td><td>ICCV 2021</td><td>Regression-aware mechanism to increase convergence speed</td><td>Low performance in detecting small objects.</td></tr><tr><td>TSP-DETR [24] GitHub https: / /github.com/Edward-Sun/TSP-Detection</td><td>ICCV 2021</td><td>Deals with issues of Hungarian loss and the cross-attention mechanism of Transformer.</td><td>Uses proposals in TSP-FCOS and feature points in TSP-RCNN as in CNN-based detectors.</td></tr><tr><td>Conditional-DETR [25]GitHub https://gith ub.com/Atten4Vis/ConditionalDETR</td><td>ICCV 2021</td><td>Conditional queries remove dependency on content embeddings and ease the training.</td><td>Performs beter than DETR and deformable-DETR for stronger backbones.</td></tr><tr><td>WB-DETR [26] GitHub https://github.com/aybora/wbdetr</td><td>ICCV 2021</td><td>Pure transformer network without backbone.</td><td>Low performance on small objects.</td></tr><tr><td>PnP-DETR [27] GitHub https://github.com/twangnh/pnp-detr</td><td>ICCV 2021</td><td>Sampling module provides foreground and a small quantity of background features.</td><td>Breaks 2d spatial structure by taking foreground tokens and reducing background tokens.</td></tr><tr><td>Dynamic-DETR [28]</td><td>ICCV 2021</td><td>Dynamic attention provides small feature resolution and improves training convergence.</td><td>Still dependent on CNN networks as convolution-based encoder and an ROI-based decoder.</td></tr><tr><td>YOLOS-DETR [29] GitHub https://github.com/hustvl/YOLOS</td><td>NeurIPS 2021</td><td>Convert ViT pre-trained on ImageNet-1k dataset into Object detector.</td><td>Pre-trained ViT still needs improvements as it requires long training epochs.</td></tr><tr><td>Anchor-DETR [30] GitHub htps://github.c om/megvii-research/AnchorDETR</td><td>AAAI 2022</td><td>Object queries as anchor points that predict multiple objects at one position.</td><td>Consider queries as 2D anchor points which ignore object scale.</td></tr><tr><td>Spare-DETR [31] GitHub https: //github.com/kakaobrain/sparse-detr</td><td>ICLR 2022</td><td>Improve performance by updating tokens referenced by the decoder.</td><td>Performance is strongly dependent on the backbone specifically for large objects.</td></tr><tr><td>D²ETR [32] GitHub https://github.com/ali baba/easyrobust/tree/main/ddetr</td><td>arXiv 2022</td><td>Decoder-only transformer network to reduce computational cost.</td><td>Decreases computation comlexity significantly but has low performance on small objects.</td></tr><tr><td>FP-DETR [33] GitHub https: // github.com/encounter1997/FP-DETR</td><td>ICLR 2022</td><td>Pre-Training of the encoder-only transformer.</td><td>Low performance on large objects.</td></tr><tr><td>CF-DETR [34] GitHub https://github.com/facebookresearch/detr</td><td>AAAI 2022</td><td>Refine coarse features to improve localization accuracy of small objects.</td><td>Addition of three new modules increase network size.</td></tr><tr><td>DAB-DETR [72] GitHub https: // github.com/IDEA-Research/DAB-DETR</td><td>ICLR 2022</td><td>Anchor-boxes as queries, attention for different scale objects.</td><td>Positional prior for only foreground objects.</td></tr></table>

Table 4. Cont.
<table><tr><td>Methods</td><td>Publications</td><td>Advantages</td><td>Limitations</td></tr><tr><td>DN-DETR [35] GitHub https: / / github.com/IDEA-Research/DN-DETR</td><td>CVPR 2022</td><td>Denoising training for positional-prior for foreground and background regions.</td><td>Denoising training by adding positive noise to object queries ignoring background regions.</td></tr><tr><td>AdaMixer [36] GitHub https://github.com/MCG-NJU/AdaMixer</td><td>CVPR 2022</td><td>Faster Convergence, Improves the adaptability of query-based decoding mechanism.</td><td>Large number of parameters.</td></tr><tr><td>REGO [37] GitHub https://github.com/zhe chen/Deformable-DETR-REGO</td><td>CVPR 2022</td><td>Attention mechanism gradually focus on foreground regions more accurately.</td><td>Multi-stage RoI-based attention modeling increases the number of parameters.</td></tr><tr><td>DINO [38] GitHub https: / /github.com/facebookresearch/dino</td><td>arXiv 2022</td><td>impressive results on small and medium-sized datasets</td><td>Performance drops for large size objects</td></tr><tr><td>Co-DETR [39] GitHub https://github.com/Sense-X/Co-DETR</td><td>ICCV 2023</td><td>Enhances encoder feature learning and decoder attention via collaborative hybrid assignments.</td><td>Increases training complexity due to multiple assignment heads.</td></tr><tr><td>LW-DETR [40] GitHub https:/ /github.com/Atten4Vis/LW-DETR</td><td>arXiv 2024</td><td>Achieves real-time detection with a lightweight transformer design using optimized ViT encoder and window attention.</td><td>Limited evaluation on benchmarks; less mature than YOLO-style detectors.</td></tr></table>

## 6. Conclusions

Detection transformers have transformed object detection by enabling fully end-to-end models that eliminate the need for proposal generation and complex post-processing, while also providing insights into the inner workings of deep neural networks. This review presented a detailed overview of DETR and its variants, focusing on recent advancements designed to improve performance and training convergence. In particular, modifications to the attention module in the encoder–decoder network and updates to object queries have enhanced training stability and performance, especially for small objects. Other improvements include backbone refinements, query design enhancements, and attention mechanism optimizations, all of which contribute to better accuracy and efficiency. From this survey, several high-level patterns emerge. Slow convergence and limited small-object detection remain central challenges, driving innovations in attention mechanisms, query design, and backbone architecture. Across DETR variants, commonalities include the use of transformer-based attention, modular encoder–decoder design, and strategies to increase positive supervision, while differences arise in how variants balance accuracy versus efficiency, implement multi-scale feature fusion, and assign object queries. Research diverges along two primary paths: accuracy-focused methods leverage deeper backbones and extensive pre-training, while efficiency-oriented approaches adopt lightweight, sparse, or deformable architectures such as RT-DETR and LW-DETR, which achieve competitive performance with lower computational cost. Recent trends further emphasize efficiency, multitask learning, and cross-modal integration, enabling faster convergence, improved generalization, and broader scene understanding that encompasses detection, segmentation, tracking, and vision–language reasoning. Key insights from this survey indicate that model design is increasingly shaped by the trade-off between real-time deployment and high accuracy, and that modular, adaptive architectures are central to achieving this balance.

Overall, DETR has evolved into a modular and flexible framework capable of balancing accuracy and efficiency. Future directions point toward adaptive architectures that dynamically allocate computational resources based on input complexity, robust training strategies for challenging environments, and richer contextual reasoning through multimodal integration. By uniting architectural innovation with practical deployment considerations, transformers are poised to drive the next generation of scalable, intelligent, and versatile visual perception systems.

Author Contributions: writing, review and editing , T.S.; review , K.A.H. and M.Z.A.; supervision and project administration, M.L. and D.S. All authors have read and agreed to the published version of the manuscript.

Funding: The work was partially funded by the European project AIRISE under Grant Agreement ID 101092312.

Acknowledgments: All included in this paper have consented to the acknowledgment.

Conflicts of Interest: The authors declare no conflict of interest.

## References

1. Ren, S.; He, K.; Girshick, R.B.; Sun, J. Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks. arXiv 2015, arXiv:1506.01497. [CrossRef]

2. Girshick, R.B. Fast R-CNN. arXiv 2015, arXiv:1504.08083. [CrossRef]

3. Redmon, J.; Farhadi, A. YOLOv3: An Incremental Improvement. arXiv 2018, arXiv:1804.02767. [CrossRef]

4. Lin, T.; Goyal, P.; Girshick, R.B.; He, K.; Dollár, P. Focal Loss for Dense Object Detection. arXiv 2017, arXiv:1708.02002.

5. Shehzadi, T.; Majid, A.; Hameed, M.; Farooq, A.; Yousaf, A. Intelligent predictor using cancer-related biologically information extraction from cancer transcriptomes. In Proceedings of the 2020 International Symposium on Recent Advances in Electrical Engineering & Computer Sciences (RAEE & CS), Islamabad, Pakistan, 20–22 October 2020; Volume 5, pp. 1–5. [CrossRef]

6. Sarode, S.; Khan, M.S.U.; Shehzadi, T.; Stricker, D.; Afzal, M.Z. Classroom-Inspired Multi-mentor Distillation with Adaptive Learning Strategies. In Proceedings of the Intelligent Systems and Applications, Amsterdam, The Netherlands, 27–28 August 2025; Arai, K., Ed.; Springer Nature: Cham, Switzerland, 2025; pp. 294–324. [CrossRef]

7. Girshick, R.B.; Donahue, J.; Darrell, T.; Malik, J. Rich feature hierarchies for accurate object detection and semantic segmentation. arXiv 2013, arXiv:1311.2524.

8. Dosovitskiy, A.; Beyer, L.; Kolesnikov, A.; Weissenborn, D.; Zhai, X.; Unterthiner, T.; Dehghani, M.; Minderer, M.; Heigold, G.; Gelly, S.; et al. An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale. arXiv 2020, arXiv:2010.11929.

9. Vaswani, A.; Shazeer, N.; Parmar, N.; Uszkoreit, J.; Jones, L.; Gomez, A.N.; Kaiser, L.; Polosukhin, I. Attention is all you need. In Proceedings of the 31st International Conference on Neural Information Processing Systems, Long Beach, CA, USA, 4–9 December 2017; Curran Associates Inc.: Red Hook, NY, USA, 2017; pp. 6000–6010. Available online: https: //dl.acm.org/doi/10.5555/3295222.3295349 (accessed on 25 September 2025).

10. Khan, M.S.U.; Shehzadi, T.; Noor, R.; Stricker, D.; Afzal, M.Z. Enhanced Bank Check Security: Introducing a Novel Dataset and Transformer-Based Approach for Detection and Verification. arXiv 2024, arXiv:2406.14370. [CrossRef]

11. Carion, N.; Massa, F.; Synnaeve, G.; Usunier, N.; Kirillov, A.; Zagoruyko, S. End-to-End Object Detection with Transformers. In Proceedings of the Computer Vision–ECCV 2020, Glasgow, UK, 23–28 August 2020; Vedaldi, A., Bischof, H., Brox, T., Frahm, J.M., Eds.; Springer International Publishing: Cham, Switzerland, 2020; pp. 213–229. [CrossRef]

12. Shehzadi, T.; Hashmi, K.A.; Stricker, D.; Afzal, M.Z. Object Detection with Transformers: A Review. arXiv 2023, arXiv:2306.04670. [CrossRef]

13. Sheikh, T.U.; Shehzadi, T.; Hashmi, K.A.; Stricker, D.; Afzal, M.Z. UnSupDLA: Towards Unsupervised Document Layout Analysis. arXiv 2024, arXiv:2406.06236.

14. Ehsan, I.; Shehzadi, T.; Stricker, D.; Afzal, M.Z. End-to-End Semi-Supervised approach with Modulated Object Queries for Table Detection in Documents. Int. J. Document Anal. Recognit. 2024, 27, 363–378. Available online: https://api.semanticscholar.org/Co rpusID:269626070 (accessed on on 25 September 2025). [CrossRef]

15. Shehzadi, T.; Stricker, D.; Afzal, M.Z. A Hybrid Approach for Document Layout Analysis in Document images. arXiv 2024, arXiv:2404.17888. [CrossRef]

16. Shehzadi, T.; Sarode, S.; Stricker, D.; Afzal, M.Z. Towards End-to-End Semi-Supervised Table Detection with Semantic Aligned Matching Transformer. arXiv 2024, arXiv:2405.00187.

17. Saeed, W.; Saleh, M.S.; Gull, M.N.; Raza, H.; Saeed, R.; Shehzadi, T. Geometric features and traffic dynamic analysis on 4-leg intersections. Int. Rev. Appl. Sci. Eng. 2024, 15, 171–188. [CrossRef]

18. Shehzadi, T.; Hashmi, K.A.; Stricker, D.; Liwicki, M.; Afzal, M.Z. Bridging the Performance Gap between DETR and R-CNN for Graphical Object Detection in Document Images. arXiv 2023, arXiv:2306.13526. [CrossRef]

19. Shehzadi, T.; Hashmi, K.A.; Stricker, D.; Afzal, M.Z. Sparse Semi-DETR: Sparse Learnable Queries for Semi-Supervised Object Detection. arXiv 2024, arXiv:2404.01819.

20. Zhu, X.; Su, W.; Lu, L.; Li, B.; Wang, X.; Dai, J. Deformable DETR: Deformable Transformers for End-to-End Object Detection. arXiv 2020, arXiv:2010.04159.

21. Dai, Z.; Cai, B.; Lin, Y.; Chen, J. UP-DETR: Unsupervised Pre-training for Object Detection with Transformers. arXiv 2020, arXiv:2011.09094.

22. Yao, Z.; Ai, J.; Li, B.; Zhang, C. Efficient DETR: Improving End-to-End Object Detector with Dense Prior. arXiv 2021, arXiv:2104.01318.

23. Gao, P.; Zheng, M.; Wang, X.; Dai, J.; Li, H. Fast Convergence of DETR with Spatially Modulated Co-Attention. arXiv 2021, arXiv:2101.07448.

24. Sun, Z.; Cao, S.; Yang, Y.; Kitani, K. Rethinking Transformer-based Set Prediction for Object Detection. arXiv 2020, arXiv:2011.10881.

25. Meng, D.; Chen, X.; Fan, Z.; Zeng, G.; Li, H.; Yuan, Y.; Sun, L.; Wang, J. Conditional DETR for Fast Training Convergence. arXiv 2021, arXiv:2108.06152.

26. Liu, F.; Wei, H.; Zhao, W.; Li, G.; Peng, J.; Li, Z. WB-DETR: Transformer-Based Detector without Backbone. In Proceedings of the 2021 IEEE/CVF International Conference on Computer Vision (ICCV), Montreal, QC, Canada, 11–17 October 2021; pp. 2959–2967. [CrossRef]

27. Wang, T.; Yuan, L.; Chen, Y.; Feng, J.; Yan, S. PnP-DETR: Towards Efficient Visual Analysis with Transformers. arXiv 2021, arXiv:2109.07036.

28. Dai, X.; Chen, Y.; Yang, J.; Zhang, P.; Yuan, L.; Zhang, L. Dynamic DETR: End-to-End Object Detection with Dynamic Attention. In Proceedings of the 2021 International Conference on Computer Vision, Montreal, QC, Canada, 11–17 October 2021. Available online: https://www.microsoft.com/en-us/research/publication/dynamic-detr-end-to-end-object-detection-with-dynamic -attention/ (accessed on 25 September 2025).

29. Fang, Y.; Liao, B.; Wang, X.; Fang, J.; Qi, J.; Wu, R.; Niu, J.; Liu, W. You Only Look at One Sequence: Rethinking Transformer in Vision through Object Detection. arXiv 2021, arXiv:2106.00666. [CrossRef]

30. Wang, Y.; Zhang, X.; Yang, T.; Sun, J. Anchor DETR: Query Design for Transformer-Based Detector. In Proceedings of the AAAI Conference on Artificial Intelligence, Online, 22 February–1 March 2022. Available online: https://api.semanticscholar.org/Corp usID:237513850 (accessed on 25 September 2025).

31. Roh, B.; Shin, J.; Shin, W.; Kim, S. Sparse DETR: Efficient End-to-End Object Detection with Learnable Sparsity. arXiv 2021, arXiv:2111.14330.

32. Lin, J.; Mao, X.; Chen, Y.; Xu, L.; He, Y.; Xue, H. D2ETR: Decoder-Only DETR with Computationally Efficient Cross-Scale Attention. arXiv 2022, arXiv:2203.00860. [CrossRef]

33. Wang, W.; Cao, Y.; Zhang, J.; Tao, D. FP-DETR: Detection Transformer Advanced by Fully Pre-training. In Proceedings of the International Conference on Learning Representations, Virtual Event, 25–29 April 2022. Available online: https://openreview.n et/forum?id=yjMQuLLcGWK (accessed on 25 September 2025).

34. Cao, X.; Yuan, P.; Feng, B.; Niu, K. CF-DETR: Coarse-to-Fine Transformers for End-to-End Object Detection. In Proceedings of the AAAI Conference on Artificial Intelligence, Online, 22 February–1 March 2022. Available online: https://api.semanticscholar.or g/CorpusID:250293790 (accessed on 25 September 2025).

35. Li, F.; Zhang, H.; Liu, S.; Guo, J.; Ni, L.M.; Zhang, L. DN-DETR: Accelerate DETR Training by Introducing Query DeNoising. IEEE Trans. Pattern Anal. Mach. Intell. 2024, 46, 2239–2251. [CrossRef]

36. Gao, Z.; Wang, L.; Han, B.; Guo, S. AdaMixer: A Fast-Converging Query-Based Object Detector. arXiv 2022, arXiv:2203.16507. [CrossRef]

37. Chen, Z.; Zhang, J.; Tao, D. Recurrent Glimpse-based Decoder for Detection with Transformer. arXiv 2021, arXiv:2112.04632.

38. Zhang, H.; Li, F.; Liu, S.; Zhang, L.; Su, H.; Zhu, J.; Ni, L.M.; Shum, H.Y. DINO: DETR with Improved DeNoising Anchor Boxes for End-to-End Object Detection. arXiv 2022, arXiv:2203.03605. [CrossRef]

39. Zong, Z.; Song, G.; Liu, Y. DETRs with Collaborative Hybrid Assignments Training. In Proceedings of the 2023 IEEE/CVF International Conference on Computer Vision (ICCV), Paris, France, 2–6 October 2023; pp. 6725–6735. [CrossRef]

40. Chen, Q.; Su, X.; Zhang, X.; Wang, J.; Chen, J.; Shen, Y.; Han, C.; Chen, Z.; Xu, W.; Li, F.; et al. LW-DETR: A Transformer Replacement to YOLO for Real-Time Detection. arXiv 2024, arXiv:2406.03459. Available online: https://arxiv.org/abs/2406.03459 (accessed on 25 September 2025).

41. Zhao, Y.; Lv, W.; Xu, S.; Wei, J.; Wang, G.; Dang, Q.; Liu, Y.; Chen, J. DETRs Beat YOLOs on Real-time Object Detection. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), Seattle, WA, USA, 17–21 June 2024; pp. 16965–16974. Available online: https://openaccess.thecvf.com/content/CVPR2024/html/Zhao\_DETRs\_Beat\_YOLOs \_on\_Real-time\_Object\_Detection\_CVPR\_2024\_paper.html (accessed on 25 September 2025).

42. Gu, J.; Wang, Z.; Kuen, J.; Ma, L.; Shahroudy, A.; Shuai, B.; Liu, T.; Wang, X.; Wang, G. Recent Advances in Convolutional Neural Networks. arXiv 2015, arXiv:1512.07108. [CrossRef]

43. Borji, A.; Cheng, M.; Jiang, H.; Li, J. Salient Object Detection: A Survey. arXiv 2014, arXiv:1411.5878. [CrossRef]

44. Chen, G.; Wang, H.; Chen, K.; Li, Z.; Song, Z.; Liu, Y.; Chen, W.; Knoll, A. A Survey of the Four Pillars for Small Object Detection: Multiscale Representation, Contextual Information, Super-Resolution, and Region Proposal. IEEE Trans. Syst. Man Cybern. Syst. 2022, 52, 936–953. [CrossRef]

45. Agarwal, S.; du Terrail, J.O.; Jurie, F. Recent Advances in Object Detection in the Age of Deep Convolutional Neural Networks. arXiv 2018, arXiv:1809.03193.

46. Yang, M.H.; Kriegman, D.; Ahuja, N. Detecting faces in images: A survey. IEEE Trans. Pattern Anal. Mach. Intell. 2002, 24, 34–58. [CrossRef]

47. Zhao, B.; Feng, J.; Wu, X.; Yan, S. A survey on deep learning-based fine-grained object classification and semantic segmentation. Int. J. Autom. Comput. 2017, 14, 119–135. Available online: https://api.semanticscholar.org/CorpusID:53076119 (accessed on 25 September 2025). [CrossRef]

48. Goswami, T.; Barad, Z.; Desai, P.; Nikita, P. Text Detection and Recognition in images: A survey. arXiv 2018, arXiv:1803.07278. [CrossRef]

49. Chaudhari, S.; Polatkan, G.; Ramanath, R.; Mithal, V. An Attentive Survey of Attention Models. arXiv 2019, arXiv:1904.02874. [CrossRef]

50. Han, J.; Zhang, D.; Cheng, G.; Liu, N.; Xu, D. Advanced Deep-Learning Techniques for Salient and Category-Specific Object Detection: A Survey. IEEE Signal Process. Mag. 2018, 35, 84–100. [CrossRef]

51. Liu, L.; Ouyang, W.; Wang, X.; Fieguth, P.W.; Chen, J.; Liu, X.; Pietikäinen, M. Deep Learning for Generic Object Detection: A Survey. arXiv 2018, arXiv:1809.02165. [CrossRef]

52. Enzweiler, M.; Gavrila, D.M. Monocular Pedestrian Detection: Survey and Experiments. IEEE Trans. Pattern Anal. Mach. Intell. 2009, 31, 2179–2195. [CrossRef]

53. Ülkü, I.; Akagündüz, E. A Survey on Deep Learning-based Architectures for Semantic Segmentation on 2D images. arXiv 2019, arXiv:1912.10230.

54. Cheng, G.; Han, J. A Survey on Object Detection in Optical Remote Sensing Images. arXiv 2016, arXiv:1603.06201. [CrossRef]

55. Sommer, L.W.; Schuchert, T.; Beyerer, J. Fast Deep Vehicle Detection in Aerial Images. In Proceedings of the 2017 IEEE Winter Conference on Applications of Computer Vision (WACV), Santa Rosa, CA, USA, 2–29 March 2017; pp. 311–319. [CrossRef]

56. Zhang, P.; Niu, X.; Dou, Y.; Xia, F. Airport Detection on Optical Satellite Images Using Deep Convolutional Neural Networks. IEEE Geosci. Remote Sens. Lett. 2017, 14, 1183–1187. [CrossRef]

57. Bach, M.; Stumper, D.; Dietmayer, K. Deep Convolutional Traffic Light Recognition for Automated Driving. In Proceedings of the 2018 21st International Conference on Intelligent Transportation Systems (ITSC), Maui, HI, USA, 4–7 November 2018; pp. 851–858. [CrossRef]

58. de la Escalera, A.; Moreno, L.; Salichs, M.; Armingol, J. Road traffic sign detection and classification. IEEE Trans. Ind. Electron. 1997, 44, 848–859. [CrossRef]

59. Shehzadi, T.; Hashmi, K.A.; Pagani, A.; Liwicki, M.; Stricker, D.; Afzal, M.Z. Mask-Aware Semi-Supervised Object Detection in Floor Plans. Appl. Sci. 2022, 12, 9398. [CrossRef]

60. Hariharan, B.; Arbelaez, P.; Girshick, R.B.; Malik, J. Simultaneous Detection and Segmentation. arXiv 2014, arXiv:1407.1808. [CrossRef]

61. Hariharan, B.; Arbeláez, P.A.; Girshick, R.B.; Malik, J. Hypercolumns for Object Segmentation and Fine-grained Localization. arXiv 2014, arXiv:1411.5752.

62. Dai, J.; He, K.; Sun, J. Instance-aware Semantic Segmentation via Multi-task Network Cascades. arXiv 2015, arXiv:1512.04412.

63. Karpathy, A.; Fei-Fei, L. Deep Visual-Semantic Alignments for Generating Image Descriptions. arXiv 2014, arXiv:1412.2306.

64. Xu, K.; Ba, J.; Kiros, R.; Cho, K.; Courville, A.C.; Salakhutdinov, R.; Zemel, R.S.; Bengio, Y. Show, Attend and Tell: Neural Image Caption Generation with Visual Attention. arXiv 2015, arXiv:1502.03044.

65. Wu, Q.; Shen, C.; van den Hengel, A.; Wang, P.; Dick, A.R. Image Captioning and Visual Question Answering Based on Attributes and Their Related External Knowledge. arXiv 2016, arXiv:1603.02814.

66. Bai, S.; An, S. A survey on automatic image caption generation. Neurocomputing 2018, 311, 291–304. [CrossRef]

67. Kang, K.; Li, H.; Yan, J.; Zeng, X.; Yang, B.; Xiao, T.; Zhang, C.; Wang, Z.; Wang, R.; Wang, X.; et al. T-CNN: Tubelets with Convolutional Neural Networks for Object Detection from Videos. arXiv 2016, arXiv:1604.02532. [CrossRef]

68. Arkin, E.; Yadikar, N.; Xu, X.; Aysa, A.; Ubul, K. A survey: Object detection methods from CNN to transformer. Multimed. Tools Appl. 2022, 82, 21353–21383. [CrossRef]

69. Han, K.; Wang, Y.; Chen, H.; Chen, X.; Guo, J.; Liu, Z.; Tang, Y.; Xiao, A.; Xu, C.; Xu, Y.; et al. A Survey on Vision Transformer. IEEE Trans. Pattern Anal. Mach. Intell. 2023, 45, 87–110. [CrossRef]

70. Arkin, E.; Yadikar, N.; Muhtar, Y.; Ubul, K. A Survey of Object Detection Based on CNN and Transformer. In Proceedings of the 2021 IEEE 2nd International Conference on Pattern Recognition and Machine Learning (PRML), Chengdu, China, 16–18 July 2021; pp. 99–108. [CrossRef]

71. Khan, S.; Naseer, M.; Hayat, M.; Zamir, S.W.; Khan, F.S.; Shah, M. Transformers in Vision: A Survey. ACM Comput. Surv. 2022, 54, 1–41. [CrossRef]

72. Liu, S.; Li, F.; Zhang, H.; Yang, X.; Qi, X.; Su, H.; Zhu, J.; Zhang, L. DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR. arXiv 2022, arXiv:2201.12329. [CrossRef]

73. Zou, Z.; Shi, Z.; Guo, Y.; Ye, J. Object Detection in 20 Years: A Survey. arXiv 2019, arXiv:1905.05055. [CrossRef]

74. Zaidi, S.S.A.; Ansari, M.S.; Aslam, A.; Kanwal, N.; Asghar, M.N.; Lee, B. A Survey of Modern Deep Learning based Object Detection Models. arXiv 2021, arXiv:2104.11892. [CrossRef]

75. Lin, T.; Maire, M.; Belongie, S.J.; Bourdev, L.D.; Girshick, R.B.; Hays, J.; Perona, P.; Ramanan, D.; Dollár, P.; Zitnick, C.L. Microsoft COCO: Common Objects in Context. arXiv 2014, arXiv:1405.0312.

76. Jiao, L.; Zhang, F.; Liu, F.; Yang, S.; Li, L.; Feng, Z.; Qu, R. A Survey of Deep Learning-based Object Detection. arXiv 2019, arXiv:1907.09408. [CrossRef]

77. Ahmed, M.; Hashmi, K.A.; Pagani, A.; Liwicki, M.; Stricker, D.; Afzal, M.Z. Survey and Performance Analysis of Deep Learning Based Object Detection in Challenging Environments. Sensors 2021, 21, 5116. [CrossRef] [PubMed]

78. Everingham, M.; Gool, L.V.; Williams, C.K.I.; Winn, J.; Zisserman, A. The Pascal Visual Object Classes (VOC) Challenge. Int. J. Comput. Vis. 2009, 88, 303–308. Available online: https://www.microsoft.com/en-us/research/publication/the-pascal-visual-o bject-classes-voc-challenge/ (accessed on 25 September 2025). [CrossRef]

79. Lin, T.Y.; Dollár, P.; Girshick, R.; He, K.; Hariharan, B.; Belongie, S. Feature Pyramid Networks for Object Detection. In Proceedings of the 2017 IEEE Conference on Computer Vision and Pattern Recognition (CVPR), Honolulu, HI, USA, 21–26 July 2017; pp. 936–944. [CrossRef]

80. He, K.; Zhang, X.; Ren, S.; Sun, J. Deep Residual Learning for Image Recognition. arXiv 2015, arXiv:1512.03385. [CrossRef]

81. Krizhevsky, A.; Sutskever, I.; Hinton, G.E. ImageNet Classification with Deep Convolutional Neural Networks. In Proceedings of the Advances in Neural Information Processing Systems, Lake Tahoe, NV, USA, 3–6 December 2012; Pereira, F., Burges, C., Bottou, L., Weinberger, K., Eds.; Curran Associates, Inc.: Red Hook, NY, USA, 2012; Volume 25. Available online: https: //proceedings.neurips.cc/paper/2012/file/c399862d3b9d6b76c8436e924a68c45b-Paper.pdf (accessed on 25 September 2025).

82. Bar, A.; Wang, X.; Kantorov, V.; Reed, C.J.; Herzig, R.; Chechik, G.; Rohrbach, A.; Darrell, T.; Globerson, A. DETReg: Unsupervised Pretraining with Region Priors for Object Detection. arXiv 2021, arXiv:2106.04550.

83. Bateni, P.; Barber, J.; van de Meent, J.; Wood, F. Improving Few-Shot Visual Classification with Unlabelled Examples. arXiv 2020, arXiv:2006.12245.

84. Wang, X.; Yang, X.; Zhang, S.; Li, Y.; Feng, L.; Fang, S.; Lyu, C.; Chen, K.; Zhang, W. Consistent Targets Provide Better Supervision in Semi-supervised Object Detection. arXiv 2022, arXiv:2209.01589. [CrossRef]

85. Li, Y.; Huang, D.; Qin, D.; Wang, L.; Gong, B. Improving Object Detection with Selective Self-supervised Self-training. arXiv 2020, arXiv:2007.09162. [CrossRef]

86. Hashmi, K.A.; Stricker, D.; Afzal, M.Z. Spatio-Temporal Learnable Proposals for End-to-End Video Object Detection. arXiv 2022, arXiv:2210.02368.

87. Hashmi, K.A.; Pagani, A.; Stricker, D.; Afzal, M.Z. BoxMask: Revisiting Bounding Box Supervision for Video Object Detection. In Proceedings of the 2023 IEEE/CVF Winter Conference on Applications of Computer Vision (WACV), Waikoloa, HI, USA, 2–7 January 2023; pp. 2029–2039. [CrossRef]

88. Caron, M.; Touvron, H.; Misra, I.; Jégou, H.; Mairal, J.; Bojanowski, P.; Joulin, A. Emerging Properties in Self-Supervised Vision Transformers. arXiv 2021, arXiv:2104.14294. [CrossRef]

89. Li, C.; Yang, J.; Zhang, P.; Gao, M.; Xiao, B.; Dai, X.; Yuan, L.; Gao, J. Efficient Self-supervised Vision Transformers for Representation Learning. arXiv 2021, arXiv:2106.09785.

90. Liu, W.; Anguelov, D.; Erhan, D.; Szegedy, C.; Reed, S.E.; Fu, C.; Berg, A.C. SSD: Single Shot MultiBox Detector. arXiv 2015, arXiv:1512.02325.

91. Redmon, J.; Divvala, S.K.; Girshick, R.B.; Farhadi, A. You Only Look Once: Unified, Real-Time Object Detection. arXiv 2015, arXiv:1506.02640.

92. Redmon, J.; Farhadi, A. YOLO9000: Better, Faster, Stronger. arXiv 2016, arXiv:1612.08242. [CrossRef]

93. Bochkovskiy, A.; Wang, C.; Liao, H.M. YOLOv4: Optimal Speed and Accuracy of Object Detection. arXiv 2020, arXiv:2004.10934. [CrossRef]

94. Zhou, X.; Wang, D.; Krähenbühl, P. Objects as Points. arXiv 2019, arXiv:1904.07850.

95. Fu, C.; Liu, W.; Ranga, A.; Tyagi, A.; Berg, A.C. DSSD: Deconvolutional Single Shot Detector. arXiv 2017, arXiv:1701.06659. [CrossRef]

96. Jeong, J.; Park, H.; Kwak, N. Enhancement of SSD by concatenating feature maps for object detection. arXiv 2017, arXiv:1705.09587. [CrossRef]

97. Zhang, S.; Wen, L.; Bian, X.; Lei, Z.; Li, S.Z. Single-Shot Refinement Neural Network for Object Detection. arXiv 2017, arXiv:1711.06897.

98. Law, H.; Deng, J. CornerNet: Detecting Objects as Paired Keypoints. arXiv 2018, arXiv:1808.01244.

99. He, K.; Zhang, X.; Ren, S.; Sun, J. Spatial Pyramid Pooling in Deep Convolutional Networks for Visual Recognition. arXiv 2014, arXiv:1406.4729.

100. Dai, J.; Li, Y.; He, K.; Sun, J. R-FCN: Object Detection via Region-based Fully Convolutional Networks. arXiv 2016, arXiv:1605.06409.

101. He, K.; Gkioxari, G.; Dollár, P.; Girshick, R. Mask R-CNN. In Proceedings of the 2017 IEEE International Conference on Computer Vision (ICCV), Venice, Italy, 22–29 October 2017; pp. 2980–2988. [CrossRef]

102. Qiao, S.; Chen, L.; Yuille, A.L. DetectoRS: Detecting Objects with Recursive Feature Pyramid and Switchable Atrous Convolution. arXiv 2020, arXiv:2006.02334. [CrossRef]

103. Chen, K.; Pang, J.; Wang, J.; Xiong, Y.; Li, X.; Sun, S.; Feng, W.; Liu, Z.; Shi, J.; Ouyang, W.; et al. Hybrid Task Cascade for Instance Segmentation. arXiv 2019, arXiv:1901.07518. [CrossRef]

104. Cai, Z.; Vasconcelos, N. Cascade R-CNN: Delving into High Quality Object Detection. arXiv 2017, arXiv:1712.00726. [CrossRef]

105. Iandola, F.N.; Moskewicz, M.W.; Ashraf, K.; Han, S.; Dally, W.J.; Keutzer, K. SqueezeNet: AlexNet-level accuracy with 50x fewer parameters and <1MB model size. arXiv 2016, arXiv:1602.07360.

106. Howard, A.G.; Zhu, M.; Chen, B.; Kalenichenko, D.; Wang, W.; Weyand, T.; Andreetto, M.; Adam, H. MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications. arXiv 2017, arXiv:1704.04861. [CrossRef]

107. Sandler, M.; Howard, A.G.; Zhu, M.; Zhmoginov, A.; Chen, L. Inverted Residuals and Linear Bottlenecks: Mobile Networks for Classification, Detection and Segmentation. arXiv 2018, arXiv:1801.04381.

108. Howard, A.; Sandler, M.; Chu, G.; Chen, L.; Chen, B.; Tan, M.; Wang, W.; Zhu, Y.; Pang, R.; Vasudevan, V.; et al. Searching for MobileNetV3. arXiv 2019, arXiv:1905.02244. [CrossRef]

109. Zhang, X.; Zhou, X.; Lin, M.; Sun, J. ShuffleNet: An Extremely Efficient Convolutional Neural Network for Mobile Devices. arXiv 2017, arXiv:1707.01083. [CrossRef]

110. Wang, R.J.; Li, X.; Ao, S.; Ling, C.X. Pelee: A Real-Time Object Detection System on Mobile Devices. arXiv 2018, arXiv:1804.06882.

111. Ma, N.; Zhang, X.; Zheng, H.; Sun, J. ShuffleNet V2: Practical Guidelines for Efficient CNN Architecture Design. arXiv 2018, arXiv:1807.11164. [CrossRef]

112. Tan, M.; Chen, B.; Pang, R.; Vasudevan, V.; Le, Q.V. MnasNet: Platform-Aware Neural Architecture Search for Mobile. arXiv 2018, arXiv:1807.11626.

113. Yousaf, A.; Sazonov, E. Food Intake Detection in the Face of Limited Sensor Signal Annotations. In Proceedings of the 2024 Tenth International Conference on Communications and Electronics (ICCE), Da Nang, Vietnam, 31 July–2 August 2024; pp. 351–356. [CrossRef]

114. Cai, H.; Gan, C.; Han, S. Once for All: Train One Network and Specialize it for Efficient Deployment. arXiv 2019, arXiv:1908.09791.

115. Chabot, F.; Chaouch, M.; Rabarisoa, J.; Teulière, C.; Chateau, T. Deep MANTA: A Coarse-to-fine Many-Task Network for joint 2D and 3D vehicle analysis from monocular image. arXiv 2017, arXiv:1703.07570.

116. Mousavian, A.; Anguelov, D.; Flynn, J.; Kosecka, J. 3D Bounding Box Estimation Using Deep Learning and Geometry. arXiv 2016, arXiv:1612.00496.

117. Li, B.; Ouyang, W.; Sheng, L.; Zeng, X.; Wang, X. GS3D: An Efficient 3D Object Detection Framework for Autonomous Driving. arXiv 2019, arXiv:1903.10955. [CrossRef]

118. Li, P.; Chen, X.; Shen, S. Stereo R-CNN based 3D Object Detection for Autonomous Driving. arXiv 2019, arXiv:1902.09738. [CrossRef]

119. Shi, X.; Ye, Q.; Chen, X.; Chen, C.; Chen, Z.; Kim, T. Geometry-based Distance Decomposition for Monocular 3D Object Detection. arXiv 2021, arXiv:2104.03775.

120. Ma, X.; Zhang, Y.; Xu, D.; Zhou, D.; Yi, S.; Li, H.; Ouyang, W. Delving into Localization Errors for Monocular 3D Object Detection. arXiv 2021, arXiv:2103.16237. [CrossRef]

121. Liu, Y.; Wang, L.; Liu, M. YOLOStereo3D: A Step Back to 2D for Efficient Stereo 3D Detection. arXiv 2021, arXiv:2103.09422. [CrossRef]

122. Yin, T.; Zhou, X.; Krähenbühl, P. Center-based 3D Object Detection and Tracking. arXiv 2020, arXiv:2006.11275.

123. Zhou, Y.; Tuzel, O. VoxelNet: End-to-End Learning for Point Cloud Based 3D Object Detection. arXiv 2017, arXiv:1711.06396.

124. Lang, A.H.; Vora, S.; Caesar, H.; Zhou, L.; Yang, J.; Beijbom, O. PointPillars: Fast Encoders for Object Detection from Point Clouds. arXiv 2018, arXiv:1812.05784.

125. Xu, Q.; Zhong, Y.; Neumann, U. Behind the Curtain: Learning Occluded Shapes for 3D Object Detection. arXiv 2021, arXiv:2112.02205. [CrossRef]

126. Zheng, W.; Tang, W.; Chen, S.; Jiang, L.; Fu, C. CIA-SSD: Confident IoU-Aware Single-Stage Object Detector from Point Cloud. arXiv 2020, arXiv:2012.03015. [CrossRef]

127. Zheng, W.; Tang, W.; Jiang, L.; Fu, C. SE-SSD: Self-Ensembling Single-Stage Object Detector From Point Cloud. arXiv 2021, arXiv:2104.09804.

128. Deng, J.; Shi, S.; Li, P.; Zhou, W.; Zhang, Y.; Li, H. Voxel R-CNN: Towards High Performance Voxel-based 3D Object Detection. arXiv 2020, arXiv:2012.15712. [CrossRef]

129. Sheng, H.; Cai, S.; Liu, Y.; Deng, B.; Huang, J.; Hua, X.; Zhao, M. Improving 3D Object Detection with Channel-wise Transformer. arXiv 2021, arXiv:2108.10723. [CrossRef]

130. Mao, J.; Xue, Y.; Niu, M.; Bai, H.; Feng, J.; Liang, X.; Xu, H.; Xu, C. Voxel Transformer for 3D Object Detection. arXiv 2021, arXiv:2109.02497. [CrossRef]

131. Vora, S.; Lang, A.H.; Helou, B.; Beijbom, O. PointPainting: Sequential Fusion for 3D Object Detection. arXiv 2019, arXiv:1911.10150.

132. Ku, J.; Mozifian, M.; Lee, J.; Harakeh, A.; Waslander, S.L. Joint 3D Proposal Generation and Object Detection from View Aggregation. arXiv 2017, arXiv:1712.02294.

133. Liang, M.; Yang, B.; Wang, S.; Urtasun, R. Deep Continuous Fusion for Multi-Sensor 3D Object Detection. arXiv 2020, arXiv:2012.10992. [CrossRef]

134. Yoo, J.H.; Kim, Y.; Kim, J.S.; Choi, J.W. 3D-CVF: Generating Joint Camera and LiDAR Features Using Cross-View Spatial Feature Fusion for 3D Object Detection. arXiv 2020, arXiv:2004.12636.

135. Pang, S.; Morris, D.; Radha, H. CLOCs: Camera-LiDAR Object Candidates Fusion for 3D Object Detection. arXiv 2020, arXiv:2009.00784.

136. Ye, L.; Rochan, M.; Liu, Z.; Wang, Y. Cross-Modal Self-Attention Network for Referring Image Segmentation. arXiv 2019, arXiv:1904.04745.

137. Xie, E.; Wang, W.; Yu, Z.; Anandkumar, A.; Alvarez, J.M.; Luo, P. SegFormer: Simple and Efficient Design for Semantic Segmentation with Transformers. arXiv 2021, arXiv:2105.15203. [CrossRef]

138. Zheng, S.; Lu, J.; Zhao, H.; Zhu, X.; Luo, Z.; Wang, Y.; Fu, Y.; Feng, J.; Xiang, T.; Torr, P.H.S.; et al. Rethinking Semantic Segmentation from a Sequence-to-Sequence Perspective with Transformers. arXiv 2020, arXiv:2012.15840.

139. Strudel, R.; Pinel, R.G.; Laptev, I.; Schmid, C. Segmenter: Transformer for Semantic Segmentation. arXiv 2021, arXiv:2105.05633. [CrossRef]

140. Ramachandran, P.; Parmar, N.; Vaswani, A.; Bello, I.; Levskaya, A.; Shlens, J. Stand-Alone Self-Attention in Vision Models. arXiv 2019, arXiv:1906.05909.

141. Wang, W.; Xie, E.; Li, X.; Fan, D.; Song, K.; Liang, D.; Lu, T.; Luo, P.; Shao, L. Pyramid Vision Transformer: A Versatile Backbone for Dense Prediction without Convolutions. arXiv 2021, arXiv:2102.12122. [CrossRef]

142. Kirillov, A.; He, K.; Girshick, R.B.; Rother, C.; Dollár, P. Panoptic Segmentation. arXiv 2018, arXiv:1801.00868.

143. Wang, H.; Zhu, Y.; Green, B.; Adam, H.; Yuille, A.L.; Chen, L. Axial-DeepLab: Stand-Alone Axial-Attention for Panoptic Segmentation. arXiv 2020, arXiv:2003.07853.

144. Neuhold, G.; Ollmann, T.; Bulò, S.R.; Kontschieder, P. The Mapillary Vistas Dataset for Semantic Understanding of Street Scenes. In Proceedings of the 2017 IEEE International Conference on Computer Vision (ICCV), Venice, Italy, 22–29 October 2017; pp. 5000–5009. [CrossRef]

145. Cordts, M.; Omran, M.; Ramos, S.; Rehfeld, T.; Enzweiler, M.; Benenson, R.; Franke, U.; Roth, S.; Schiele, B. The Cityscapes Dataset for Semantic Urban Scene Understanding. arXiv 2016, arXiv:1604.01685. [CrossRef]

146. Reed, S.; Akata, Z.; Yan, X.; Logeswaran, L.; Schiele, B.; Lee, H. Generative Adversarial Text to Image Synthesis. In Proceedings of the 33rd International Conference on Machine Learning, New York, NY, USA, 20–22 June 2016; Balcan, M.F., Weinberger, K.Q., Eds.; Proceedings of Machine Learning Research: New York, NY, USA, 2016; Volume 48, pp. 1060–1069. Available online: https://proceedings.mlr.press/v48/reed16.html (accessed on 25 September 2025).

147. Zhang, H.; Xu, T.; Li, H.; Zhang, S.; Huang, X.; Wang, X.; Metaxas, D.N. StackGAN: Text to Photo-realistic Image Synthesis with Stacked Generative Adversarial Networks. arXiv 2016, arXiv:1612.03242.

148. Zhang, H.; Xu, T.; Li, H.; Zhang, S.; Wang, X.; Huang, X.; Metaxas, D.N. StackGAN++: Realistic Image Synthesis with Stacked Generative Adversarial Networks. arXiv 2017, arXiv:1710.10916.

149. Xu, T.; Zhang, P.; Huang, Q.; Zhang, H.; Gan, Z.; Huang, X.; He, X. AttnGAN: Fine-Grained Text to Image Generation with Attentional Generative Adversarial Networks. arXiv 2017, arXiv:1711.10485.

150. Goodfellow, I.J.; Pouget-Abadie, J.; Mirza, M.; Xu, B.; Warde-Farley, D.; Ozair, S.; Courville, A.; Bengio, Y. Generative Adversarial Networks. arXiv 2014, arXiv:1406.2661. [CrossRef]

151. Murahari, M.D.; Reddy; Sk, M.; Basha, M.M.M.; Hari, M.N.C.; Student, P. DALL-E: CREATING IMAGES FROM TEXT. 2021. Available online: https://api.semanticscholar.org/CorpusID:261026641 (accessed on 25 September 2025).

152. Wang, X.; Yeshwanth, C.; Nießner, M. SceneFormer: Indoor Scene Generation with Transformers. arXiv 2020, arXiv:2012.09793.

153. Chen, M.; Radford, A.; Child, R.; Wu, J.; Jun, H.; Luan, D.; Sutskever, I. Generative Pretraining From Pixels. In Proceedings of the 37th International Conference on Machine Learning, Virtual Event, 13–18 July 2020; III, H.D., Singh, A., Eds.; Proceedings of Machine Learning Research (PMLR): New York, NY, USA, 2020; Volume 119, pp. 1691–1703. Available online: https: //proceedings.mlr.press/v119/chen20s.html (accessed on 25 September 2025).

154. Esser, P.; Rombach, R.; Ommer, B. Taming Transformers for High-Resolution Image Synthesis. arXiv 2020, arXiv:2012.09841.

155. Jiang, Y.; Chang, S.; Wang, Z. TransGAN: Two Transformers Can Make One Strong GAN. arXiv 2021, arXiv:2102.07074.

156. Bhunia, A.K.; Khan, S.H.; Cholakkal, H.; Anwer, R.M.; Khan, F.S.; Shah, M. Handwriting Transformers. arXiv 2021, arXiv:2104.03964. [CrossRef]

157. Krizhevsky, A.; Hinton, G. Learning Multiple Layers of Features from Tiny Images; Technical Report; University of Toronto: Toronto, ON, Canada, 2009. Available online: https://www.cs.toronto.edu/\~kriz/learning-features-2009-TR.pdf (accessed on 25 September 2025).

158. Coates, A.; Ng, A.; Lee, H. An Analysis of Single-Layer Networks in Unsupervised Feature Learning. In Proceedings of the Fourteenth International Conference on Artificial Intelligence and Statistics, Fort Lauderdale, FL, USA, 11–13 April 2011; Gordon, G., Dunson, D., Dudík, M., Eds.; Proceedings of Machine Learning Research: New York, NY, USA, 2011; Volume 15, pp. 215–223. Available online: https://proceedings.mlr.press/v15/coates11a.html (accessed on 25 September 2025).

159. Chen, T.; Kornblith, S.; Norouzi, M.; Hinton, G.E. A Simple Framework for Contrastive Learning of Visual Representations. arXiv 2020, arXiv:2002.05709. [CrossRef]

160. Deng, J.; Dong, W.; Socher, R.; Li, L.J.; Li, K.; Fei-Fei, L. ImageNet: A large-scale hierarchical image database. In Proceedings of the 2009 IEEE Conference on Computer Vision and Pattern Recognition, Miami, FL, USA, 20–25 June 2009; pp. 248–255. [CrossRef]

161. He, K.; Fan, H.; Wu, Y.; Xie, S.; Girshick, R.B. Momentum Contrast for Unsupervised Visual Representation Learning. arXiv 2019, arXiv:1911.05722.

162. Bachman, P.; Hjelm, R.D.; Buchwalter, W. Learning Representations by Maximizing Mutual Information Across Views. arXiv 2019, arXiv:1906.00910. [CrossRef]

163. Hénaff, O.J.; Srinivas, A.; Fauw, J.D.; Razavi, A.; Doersch, C.; Eslami, S.M.A.; van den Oord, A. Data-Efficient Image Recognition with Contrastive Predictive Coding. arXiv 2019, arXiv:1905.09272.

164. Radford, A.; Metz, L.; Chintala, S. Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks. arXiv 2015, arXiv:1511.06434. Available online: https://api.semanticscholar.org/CorpusID:11758569 (accessed on 25 September 2025).

165. Gao, C.; Chen, Y.; Liu, S.; Tan, Z.; Yan, S. AdversarialNAS: Adversarial Neural Architecture Search for GANs. arXiv 2019, arXiv:1912.02037.

166. Karras, T.; Laine, S.; Aittala, M.; Hellsten, J.; Lehtinen, J.; Aila, T. Analyzing and Improving the Image Quality of StyleGAN. arXiv 2019, arXiv:1912.04958.

167. Yang, F.; Yang, H.; Fu, J.; Lu, H.; Guo, B. Learning Texture Transformer Network for Image Super-Resolution. arXiv 2020, arXiv:2006.04139. [CrossRef]

168. Chen, H.; Wang, Y.; Guo, T.; Xu, C.; Deng, Y.; Liu, Z.; Ma, S.; Xu, C.; Xu, C.; Gao, W. Pre-Trained Image Processing Transformer. arXiv 2020, arXiv:2012.00364.

169. Liang, J.; Cao, J.; Sun, G.; Zhang, K.; Van Gool, L.; Timofte, R. SwinIR: Image Restoration Using Swin Transformer. arXiv 2021, arXiv:2108.10257. [CrossRef]

170. Wang, Z.; Cun, X.; Bao, J.; Liu, J. Uformer: A General U-Shaped Transformer for Image Restoration. arXiv 2021, arXiv:2106.03106. [CrossRef]

171. Kumar, M.; Weissenborn, D.; Kalchbrenner, N. Colorization Transformer. arXiv 2021, arXiv:2102.04432.

172. Antol, S.; Agrawal, A.; Lu, J.; Mitchell, M.; Batra, D.; Zitnick, C.L.; Parikh, D. VQA: Visual Question Answering. arXiv 2015, arXiv:1505.00468.

173. Zellers, R.; Bisk, Y.; Farhadi, A.; Choi, Y. From Recognition to Cognition: Visual Commonsense Reasoning. arXiv 2018, arXiv:1811.10830.

174. Lee, K.; Chen, X.; Hua, G.; Hu, H.; He, X. Stacked Cross Attention for Image-Text Matching. arXiv 2018, arXiv:1803.08024. [CrossRef]

175. Vinyals, O.; Toshev, A.; Bengio, S.; Erhan, D. Show and Tell: A Neural Image Caption Generator. arXiv 2014, arXiv:1411.4555.

176. Chen, Y.; Li, L.; Yu, L.; Kholy, A.E.; Ahmed, F.; Gan, Z.; Cheng, Y.; Liu, J. UNITER: Learning UNiversal Image-TExt Representations. arXiv 2019, arXiv:1909.11740.

177. Li, X.; Yin, X.; Li, C.; Zhang, P.; Hu, X.; Zhang, L.; Wang, L.; Hu, H.; Dong, L.; Wei, F.; et al. Oscar: Object-Semantics Aligned Pre-training for Vision-Language Tasks. arXiv 2020, arXiv:2004.06165.

178. Sun, C.; Myers, A.; Vondrick, C.; Murphy, K.; Schmid, C. VideoBERT: A Joint Model for Video and Language Representation Learning. arXiv 2019, arXiv:1904.01766. [CrossRef]

179. Li, G.; Duan, N.; Fang, Y.; Jiang, D.; Zhou, M. Unicoder-VL: A Universal Encoder for Vision and Language by Cross-modal Pre-training. arXiv 2019, arXiv:1908.06066. [CrossRef]

180. Li, L.H.; Yatskar, M.; Yin, D.; Hsieh, C.; Chang, K. VisualBERT: A Simple and Performant Baseline for Vision and Language. arXiv 2019, arXiv:1908.03557. [CrossRef]

181. Su, W.; Zhu, X.; Cao, Y.; Li, B.; Lu, L.; Wei, F.; Dai, J. VL-BERT: Pre-training of Generic Visual-Linguistic Representations. arXiv 2019, arXiv:1908.08530.

182. Tan, H.; Bansal, M. LXMERT: Learning Cross-Modality Encoder Representations from Transformers. arXiv 2019, arXiv:1908.07490. [CrossRef]

183. Lu, J.; Batra, D.; Parikh, D.; Lee, S. ViLBERT: Pretraining Task-Agnostic Visiolinguistic Representations for Vision-and-Language Tasks. arXiv 2019, arXiv:1908.02265.

184. Lee, S.; Yu, Y.; Kim, G.; Breuel, T.M.; Kautz, J.; Song, Y. Parameter Efficient Multimodal Transformers for Video Representation Learning. arXiv 2020, arXiv:2012.04124.

185. Sun, N.; Zhu, Y.; Hu, X. Faster R-CNN Based Table Detection Combining Corner Locating. In Proceedings of the 2019 International Conference on Document Analysis and Recognition (ICDAR), Sydney, NSW, Australia, 20–25 September 2019; pp. 1314–1319. [CrossRef]

186. Parmar, N.; Vaswani, A.; Uszkoreit, J.; Kaiser, L.; Shazeer, N.; Ku, A. Image Transformer. arXiv 2018, arXiv:1802.05751.

187. Bello, I.; Zoph, B.; Vaswani, A.; Shlens, J.; Le, Q.V. Attention Augmented Convolutional Networks. arXiv 2019, arXiv:1904.09925.

188. Rezatofighi, S.H.; Tsoi, N.; Gwak, J.; Sadeghian, A.; Reid, I.D.; Savarese, S. Generalized Intersection over Union: A Metric and a Loss for Bounding Box Regression. arXiv 2019, arXiv:1902.09630. [CrossRef]

189. van den Oord, A.; Li, Y.; Babuschkin, I.; Simonyan, K.; Vinyals, O.; Kavukcuoglu, K.; van den Driessche, G.; Lockhart, E.; Cobo, L.C.; Stimberg, F.; et al. Parallel WaveNet: Fast High-Fidelity Speech Synthesis. arXiv 2017, arXiv:1711.10433.

190. Gu, J.; Bradbury, J.; Xiong, C.; Li, V.O.K.; Socher, R. Non-Autoregressive Neural Machine Translation. arXiv 2017, arXiv:1711.02281.

191. Ghazvininejad, M.; Levy, O.; Liu, Y.; Zettlemoyer, L. Mask-Predict: Parallel Decoding of Conditional Masked Language Models. In Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP), Hong Kong, China, 3–7 November 2019; Inui, K., Jiang, J., Ng, V., Wan, X., Eds.; Association for Computational Linguistics: Stroudsburg, PA, USA, 2019; pp. 6112–6121. [CrossRef]

192. Stewart, R.; Andriluka, M. End-to-end people detection in crowded scenes. arXiv 2015, arXiv:1506.04878.

193. Romera-Paredes, B.; Torr, P.H.S. Recurrent Instance Segmentation. arXiv 2015, arXiv:1511.08250.

194. Park, E.; Berg, A.C. Learning to decompose for object detection and instance segmentation. arXiv 2015, arXiv:1511.06449.

195. Ren, M.; Zemel, R.S. End-to-End Instance Segmentation and Counting with Recurrent Attention. arXiv 2016, arXiv:1605.09410.

196. Salvador, A.; Bellver, M.; Baradad, M.; Marqués, F.; Torres, J.; Giró-i-Nieto, X. Recurrent Neural Networks for Semantic Instance Segmentation. arXiv 2017, arXiv:1712.00617.

197. Dai, J.; Qi, H.; Xiong, Y.; Li, Y.; Zhang, G.; Hu, H.; Wei, Y. Deformable Convolutional Networks. arXiv 2017, arXiv:1703.06211. [CrossRef]

198. Zhu, X.; Hu, H.; Lin, S.; Dai, J. Deformable ConvNets v2: More Deformable, Better Results. arXiv 2018, arXiv:1811.11168. [CrossRef]

199. Zhang, H.; Wang, J. Towards Adversarially Robust Object Detection. arXiv 2019, arXiv:1907.10310. [CrossRef]

200. Wu, Y.; Chen, Y.; Yuan, L.; Liu, Z.; Wang, L.; Li, H.; Fu, Y. Rethinking Classification and Localization in R-CNN. arXiv 2019, arXiv:1904.06493. [CrossRef]

201. Song, G.; Liu, Y.; Wang, X. Revisiting the Sibling Head in Object Detector. arXiv 2020, arXiv:2003.07540. [CrossRef]

202. Dong, L.; Yang, N.; Wang, W.; Wei, F.; Liu, X.; Wang, Y.; Gao, J.; Zhou, M.; Hon, H. Unified Language Model Pre-training for Natural Language Understanding and Generation. arXiv 2019, arXiv:1905.03197. [CrossRef]

203. Srivastava, N.; Hinton, G.; Krizhevsky, A.; Sutskever, I.; Salakhutdinov, R. Dropout: A Simple Way to Prevent Neural Networks from Overfitting. J. Mach. Learn. Res. 2014, 15, 1929–1958. Available online: http://jmlr.org/papers/v15/srivastava14a.html (accessed on 25 September 2025).

204. Sun, P.; Zhang, R.; Jiang, Y.; Kong, T.; Xu, C.; Zhan, W.; Tomizuka, M.; Li, L.; Yuan, Z.; Wang, C.; et al. Sparse R-CNN: End-to-End Object Detection with Learnable Proposals. arXiv 2020, arXiv:2011.12450.

205. Zhang, X.; Wan, F.; Liu, C.; Ji, R.; Ye, Q. FreeAnchor: Learning to Match Anchors for Visual Object Detection. arXiv 2019, arXiv:1909.02466. [CrossRef]

206. Kim, K.; Lee, H.S. Probabilistic Anchor Assignment with IoU Prediction for Object Detection. arXiv 2020, arXiv:2007.08103. [CrossRef]

207. Li, H.; Wu, Z.; Zhu, C.; Xiong, C.; Socher, R.; Davis, L.S. Learning from Noisy Anchors for One-stage Object Detection. arXiv 2019, arXiv:1912.05086.

208. Tian, Z.; Shen, C.; Chen, H.; He, T. FCOS: Fully Convolutional One-Stage Object Detection. In Proceedings of the 2019 IEEE/CVF International Conference on Computer Vision (ICCV), Seoul, Republic of Korea, 27 October–2 November 2019; pp. 9626–9635. [CrossRef]

209. Wu, Y.; He, K. Group Normalization. arXiv 2018, arXiv:1803.08494. [CrossRef]

210. Chen, Y.; Kalantidis, Y.; Li, J.; Yan, S.; Feng, J. A2-Nets: Double Attention Networks. arXiv 2018, arXiv:1810.11579.

211. Lin, T.Y.; RoyChowdhury, A.; Maji, S. Bilinear CNN Models for Fine-Grained Visual Recognition. In Proceedings of the 2015 IEEE International Conference on Computer Vision (ICCV), Santiago, Chile, 7–13 December 2015; pp. 1449–1457. [CrossRef]

212. Wang, X.; Zhang, S.; Yu, Z.; Feng, L.; Zhang, W. Scale-Equalizing Pyramid Convolution for Object Detection. In Proceedings of the 2020 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), Seattle, WA, USA, 13–19 June 2020; pp. 13356–13365. Available online: https://api.semanticscholar.org/CorpusID:218537867 (accessed on 25 September 2025).

213. Hu, J.; Shen, L.; Sun, G. Squeeze-and-Excitation Networks. arXiv 2017, arXiv:1709.01507.

214. Jiang, Z.; Yu, W.; Zhou, D.; Chen, Y.; Feng, J.; Yan, S. ConvBERT: Improving BERT with Span-based Dynamic Convolution. arXiv 2020, arXiv:2008.02496.

215. Beal, J.; Kim, E.; Tzeng, E.; Park, D.H.; Zhai, A.; Kislyuk, D. Toward Transformer-Based Object Detection. arXiv 2020, arXiv:2012.09958. [CrossRef]

216. Zhu, B.; Wang, J.; Jiang, Z.; Zong, F.; Liu, S.; Li, Z.; Sun, J. AutoAssign: Differentiable Label Assignment for Dense Object Detection. arXiv 2020, arXiv:2007.03496. [CrossRef]

217. Hendrycks, D.; Gimpel, K. Bridging Nonlinearities and Stochastic Regularizers with Gaussian Error Linear Units. arXiv 2016, arXiv:1606.08415. [CrossRef]

218. Ba, J.L.; Kiros, J.R.; Hinton, G.E. Layer Normalization. arXiv 2016, arXiv:1607.06450. [CrossRef]

219. Ma, X.; Kong, X.; Wang, S.; Zhou, C.; May, J.; Ma, H.; Zettlemoyer, L. Luna: Linear Unified Nested Attention. arXiv 2021, arXiv:2106.01540. [CrossRef]

220. Shen, Z.; Zhang, M.; Yi, S.; Yan, J.; Zhao, H. Factorized Attention: Self-Attention with Linear Complexities. arXiv 2018, arXiv:1812.01243.

221. Ge, Z.; Liu, S.; Wang, F.; Li, Z.; Sun, J. YOLOX: Exceeding YOLO Series in 2021. arXiv 2021, arXiv:2107.08430. [CrossRef]

222. Oquab, M.; Darcet, T.; Moutakanni, T.; Vo, H.; Szafraniec, M.; Khalidov, V.; Fernandez, P.; Haziza, D.; Massa, F.; El-Nouby, A.; et al. DINOv2: Learning Robust Visual Features without Supervision. arXiv 2024, arXiv:2304.07193. Available online: https://arxiv.org/abs/2304.07193 (accessed on 25 September 2025). [CrossRef]

223. Siméoni, O.; Vo, H.V.; Seitzer, M.; Baldassarre, F.; Oquab, M.; Jose, C.; Khalidov, V.; Szafraniec, M.; Yi, S.; Ramamonjisoa, M.; et al. DINOv3. arXiv 2025, arXiv:2508.10104. Available online: https://arxiv.org/abs/2508.10104 (accessed on 25 September 2025). [PubMed]

224. Lv, W.; Zhao, Y.; Chang, Q.; Huang, K.; Wang, G.; Liu, Y. RT-DETRv2: Improved Baseline with Bag-of-Freebies for Real-Time Detection Transformer. arXiv 2024, arXiv:2407.17140. Available online: https://arxiv.org/abs/2407.17140 (accessed on 25 September 2025).

225. Wang, S.; Xia, C.; Lv, F.; Shi, Y. RT-DETRv3: Real-time End-to-End Object Detection with Hierarchical Dense Positive Supervision. arXiv 2024, arXiv:2409.08475.

226. Powers, D.M.W. Evaluation: From precision, recall and F-measure to ROC, informedness, markedness and correlation. arXiv 2020, arXiv:2010.16061. [CrossRef]

227. Touvron, H.; Cord, M.; Douze, M.; Massa, F.; Sablayrolles, A.; Jégou, H. Training data-efficient image transformers & distillation through attention. arXiv 2020, arXiv:2012.12877.

228. Liu, Z.; Lin, Y.; Cao, Y.; Hu, H.; Wei, Y.; Zhang, Z.; Lin, S.; Guo, B. Swin Transformer: Hierarchical Vision Transformer using Shifted Windows. arXiv 2021, arXiv:2103.14030. [CrossRef]

Disclaimer/Publisher’s Note: The statements, opinions and data contained in all publications are solely those of the individual author(s) and contributor(s) and not of MDPI and/or the editor(s). MDPI and/or the editor(s) disclaim responsibility for any injury to people or property resulting from any ideas, methods, instructions or products referred to in the content.