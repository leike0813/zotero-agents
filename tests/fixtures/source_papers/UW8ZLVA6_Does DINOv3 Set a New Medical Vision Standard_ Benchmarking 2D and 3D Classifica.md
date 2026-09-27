# Does DINOv3 Set a New Medical Vision Standard?

# Benchmarking 2D and 3D Classification, Segmentation, and Registration

Che Liu∗†1, Yinda Chen∗2, Haoyuan Shi∗2, Jinpeng Lu∗2, Bailiang Jian∗7, Jiazhen Pan∗5,7, Linghan Cai∗3, Jiayi Wang∗ , Jieming Yu∗10, Ziqi Gao∗12, , Long Bai11, Yundi Zhang5,7, Jun Li7,8, Cosmin I. Bercea7,9, Cheng Ouyang5, Chen Chen6, Zhiwei Xiong2 Benedikt Wiestler7,8, Christian Wachinger7,8, James S. Duncan12, Daniel Rueckert1,7,8, Wenjia Bai1, Rossella Arcucci1

1Imperial College London 2University of Science and Technology of China   
3Dresden University of Technology 4University of Erlangen-Nuremberg 5University of Oxford   
6University of Sheffield 7Technical University of Munich (TUM) 8Munich Center for Machine Learning   
9Helmholtz AI and Helmholtz Munich 10The Hong Kong University of Science and Technology   
11The Chinese University of Hong Kong 12Yale University   
∗Equal contribution, †Corresponding author

The advent of large-scale vision foundation models, pre-trained on diverse natural images, has marked a paradigm shift in computer vision. However, how the frontier vision foundation models’ efficacies transfer to specialised domains such as medical imaging remains an open question. This report investigates whether DINOv3, a state-of-the-art self-supervised vision transformer (ViT) pre-trained on natural images, can directly serve as a powerful, unified encoder for medical vision tasks without domain-specific fine-tuning. To answer this, we benchmark DINOv3 across common medical vision tasks, including 2D and 3D classification, segmentation, and registration on a wide range of medical imaging modalities. We systematically analyse its scalability by varying model sizes and input image resolutions. Our findings reveal that DINOv3 shows impressive performance and establishes a formidable new baseline. Remarkably, it can even outperform medical-specific foundation models like BiomedCLIP and CT-Net on several tasks, despite being trained solely on natural images. However, we identify clear limitations: The model’s features degrade in scenarios requiring deep domain specialisation, such as in whole-slide images (WSIs), electron microscopy (EM), and positron emission tomography (PET). Furthermore, we observe that DINOv3 does not consistently follow the scaling law in the medical domain. Its performance does not reliably increase with larger models or finer feature resolutions, showing diverse scaling behaviours across tasks. Overall, our work establishes DINOv3 as a strong baseline, whose powerful visual features can serve as a robust prior for multiple medical tasks. This opens promising future directions, such as leveraging its features to enforce multiview consistency in 3D reconstruction.

Date: January 21, 2026 Correspondence: che.liu21@imperial.ac.uk

## 1 Motivation

Foundation models, exemplified by Large Language Models (LLMs) [1], have demonstrated that immense knowledge can be learned from vast, unannotated corpora through self-supervised objectives, leading to impressive scaling laws [2]. While this principle has been extended to and often assumed in computer vision, a definitive answer on scaling laws for visual pre-training has been more elusive [3, 4, 5]. Recent works have questioned traditional scaling limits, but their evaluation was often focused on narrower tasks [6, 7, 8], leaving their general-purpose capabilities less explored. The DINO series [9, 10, 11], in contrast, has been instrumental in showing that self-supervised learning (SSL) can produce emergent visual representations of remarkable quality. Most recently, DINOv3 [11] has pushed this frontier by scaling the visual encoder up to a 7B parameter scale on 1.7B images, demonstrating unprecedented generalization and strong performance across a wide range of visual tasks.

This progress in the natural image domain is highly relevant to medical image analysis, a field that strongly relies on the quality of visual representations to capture subtle anomalies. Indeed, very recent work [12, 13] has shown promising performance using DINOv3 features on specific medical tasks, although the results often depend on careful hyperparameter tuning, leaving the broader impact less clear. The medical domain is characterized by a vast diversity of imaging modalities, from 2D grayscale X-rays [14] to multi-channel RGB histopathology [15] and 3D volumetric scans [16], each demanding distinct visual understanding capabilities. This is further complicated with long-tailed distributions over conditions and the prohibitive cost and regulatory concerns associated with data collection. This heterogeneity and data scarcity highlight the imperative need for strong vision representation extractors. However, the development of a large-scale medical visual foundation model has been hampered by the relative scarcity of curated data due to cost, privacy, and regulatory concerns. Existing efforts, such as BiomedCLIP [17], have attempted to bridge this gap by training visual encoders on web-crawled medical images from research articles with text supervision. While valuable, this approach is limited by the quality and scalability of its data source and still relies on language supervision. This dichotomy leads us to a series of fundamental questions:

Q1: Can DINOv3’s [11] natural-image representations excel on medical vision tasks?

Q2: Does scaling visual pre-training on natural images improve performance in the medical domain?

Q3: Are the benefits of scaling model size and dataset size transferable across diverse medical tasks and modalities?

## 2 Benchmark Setup

To evaluate the capabilities of DINOv3 [11] as a generic off-the-shelf vision encoder for medical imaging, we designed a multi-faceted benchmark assessing its performance across the most common tasks and diverse data formats, ranging from static 2D images and 3D volumetric scans. A key feature claimed in DINOv3 is the fine granularity of its features. Therefore, we are particularly interested in evaluating how this transfers to fine-grained medical imaging tasks such as image segmentation. Our benchmark is structured to cover a wide range of modalities and tasks, including 2D classification, 2D registration, 2D segmentation, 3D classification, 3D segmentation, and 3D registration. The evaluation spans diverse modalities such as X-ray, ultrasound, Whole Slide Imaging (WSI), endoscopy images, Electron Microscopy (EM), and volumetric data from Computed Tomography (CT), Magnetic Resonance Imaging (MRI), and Positron Emission Tomography (PET). We systematically analyse scalability by evaluating three different model scales (DINOv3-S, DINOv3-B, and DINOv3-L) across multiple input resolutions.

## 2.1 Classification on 2D Medical Images

Image classification is a foundational task in medical imaging, often used for diagnostic purposes on planar images or individual video frames. For these tasks, we process 2D images directly as input for the DINOv3 encoder. To accommodate DINOv3’s 3-channel input requirement, single-channel grayscale images are replicated three times to create a 3-channel tensor. For native RGB images, such as those from Whole Slide Imaging (WSI) or endoscopic feeds, we use the original data without modification. We benchmark the 2D classification performance on the following publicly available datasets:

NIH-14 [14] This dataset is a large collection of chest X-ray images for multi-label classification of 14 common thoracic pathologies, comprising 112,120 images from 30,805 unique patients. For our experiments, we adhere strictly to the official patient-wise data splits provided by the dataset creators to ensure reproducibility.

RSNA-Pneumonia [18] This dataset from the RSNA Pneumonia Detection Challenge consists of 29,700 chest X-ray images for pneumonia classification. To ensure a standardized comparison, we follow the data splitting methodology proposed in the MGCA [19], which provides a well-defined protocol for training and testing.

Camelyon16 [20] This dataset comprises 399 H&E-stained lymph node WSIs for breast cancer metastasis detection (tumor vs. normal). We adopt a 5-fold cross-validation protocol on the Camelyon16 [20] training set and additionally report results under the official split for comparability. Under the official split (270 train / 129 test slides), we train on the Camelyon16 [20] training set and report performance on its official test set. To assess cross-cohort generalization, we train models with five different random seeds on Camelyon16 [20] and evaluate them on the Camelyon17 [21] Unseen subset.

Camelyon17 [21] This dataset is a multi-center cohort for pathological N-staging. The official training set contains 100 patients with 5 labeled slides per patient. Each slide is annotated as negative, micro-metastasis, macro-metastasis, or isolated tumor cells (ITC). In our evaluation protocol, we use Camelyon17 [21] solely as an out-of-distribution testbed for models trained on Camelyon16 [20]. Since the official test annotations are unavailable, we evaluate on the official training set. Following prior practice [22], we remove the ITC slides and split Camelyon17 [21] into Seen (140 slides) and Unseen (324 slides) subsets based on center overlap with Camelyon16; we report generalization on the Unseen subset in the WSI tumor detection benchmark.

BCNB [23] This dataset is an Early Breast Cancer Core-Needle Biopsy WSI dataset. It contains 1058 patients with molecular status labels: ER (831 positive / 227 negative), PR (790 positive/ 268 negative), HER2 (277 positive/ 781 negative), and Ki67 (156 positive / 902 negative). WSIs are annotated with tumor type, molecular status, number of lymph node metastases, and axillary lymph node (ALN) metastatic status, among others. Using CLAM [24], we remove background and crop each slide into 224×224 patches at the native resolution, yielding on average ∼968 patches per slide. For the BCNB benchmark, we perform 5-fold cross-validation with a 7:1:2 split ratio (train:val:test) within each fold, and evaluate five tasks: ALN metastatic status (N0 vs. N+), and the molecular status prediction of ER, PR, HER2, and Ki67. Unless otherwise specified, preprocessing and tiling are identical across tasks.

Kvasir-Capsule [25] This dataset represents the largest publicly available PillCAM dataset, comprising 47,238 labeled frames derived from endoscopic feeds depicting various anatomical landmarks with both normal and pathological features. We utilize the 11 categories containing at least 50 samples each: Angiectasia, Fresh blood, Erosion, Erythema, Foreign body, Ileocecal valve, Lymphangiectasia, Normal clean mucosa, Pylorus, Reduced mucosal view, and Ulcer.

AutoLaparo [26] This dataset contains 21 videos that include 7 unique surgical phases. Each video is recorded at a resolution of 1920 × 1080 pixels and a frame rate of 25 fps, with an average length of about 66 minutes. The dataset is divided into 10 training, 4 validation, and 7 testing videos. To reduce computational demands and emphasize the central region of the surgical field, all videos undergo preprocessing in which they are downsampled to 1 fps and each frame is resized to 250 × 250 pixels, in line with the original preprocessing setup. This process yields a sequence of approximately 83,160 discrete 2D images representing 7 unique surgical phases

## 2.2 Registration on 2D Medical Images

Medical image registration aligns anatomical structures across different temporal or spatial views to facilitate motion tracking and comparative analysis. We evaluate the capacity of DINOv3 to drive precise deformable registration on 2D cardiac ultrasound sequences.

Ultrasound CAMUS [27] The CAMUS dataset (Cardiac Acquisitions for Multi-structure Ultrasound) consists of 2D echocardiograms from 500 patients. Each subject includes apical two-chamber (2CH) and four-chamber (4CH) views at end-diastole (ED) and end-systole (ES), along with ground truth segmentations for the LV cavity, myocardium, and left atrium. Preprocessing involves resampling images to 128 × 128 dimensions and normalizing orientation. For experimentation, sequences are grouped by patient and view to ensure valid ED-ES correspondence, resulting in 800 training, 100 validation, and 100 testing registration pairs. HD95 and ASD are reported in pixels.

## 2.3 Segmentation on 2D Medical Images

We evaluate 2D semantic segmentation performance on individual frames derived from medical video sequences. We benchmark on the following publicly available datasets:

EndoVis 2018 [28] Originating from the 2018 Robotic Scene Segmentation Challenge, this dataset consists of high-resolution (1280×1024) surgical frames recorded by the da Vinci Xi system during robotic procedures. We adhere to the standard evaluation protocol and data split defined in [29], utilizing frames from 11 sequences for training and 4 for testing. The task involves pixel-wise segmentation of seven distinct instrument categories: bipolar forceps, prograsp forceps, large needle driver, monopolar curved scissors, ultrasound probe, suction instrument, and clip applier.

EDD 2020 [30] This dataset was established for the 2020 Endoscopy Disease Detection and Segmentation Challenge. It comprises 380 annotated frames collected from multiple international centers, capturing various gastrointestinal organs (colon, esophagus, and stomach) across different endoscopic modalities. We treat this as a multi-class 2D segmentation task targeting five specific pathologies: Barrett’s Oesophagus, suspicious regions, high-grade dysplasia, cancer, and polyp.

## 2.4 Classification on 3D Medical Images

To perform 3D classification with a 2D-native encoder like DINOv3, we adopt a slice-wise feature extraction strategy. We process each 2D slice of a 3D volume independently through the DINOv3 backbone to obtain a feature embedding for that slice. The resulting set of slice embeddings is then aggregated into a single feature vector representing the entire volume, typically via mean pooling [31]. As with the 2D tasks, grayscale slices are replicated across three channels before being fed into the model. For this task, the model’s performance is assessed using the following publicly available dataset:

CT-RATE [16] This dataset is a large-scale collection of 3D medical imaging, pairing 47k non-contrast CT volumes(20k patients) with their corresponding radiology reports. The dataset is annotated for 18 clinically significant abnormalities. For all of our experiments, we utilize the official data splits provided by the organizers for training and evaluation procedures, extracted features from every slice of these over 40,000 volumes and employed two methods for the downstream classification task: zero-shot k-nearest neighbors (k-NN) and linear probing. In the CT-RATE original work [16], the associated dataset is annotated with multi-label binary labels. This annotation scheme specifies for each clinical category whether a case has a particular condition or does not have that condition. Consequently, this task can be viewed as a multi-label binary classification problem, where normal/abnormal binary classifications are performed across multiple categories.

## 2.5 Segmentation on 3D Medical Images

Segmentation on 3D medical images is the task of producing a dense, voxel-wise prediction to delineate anatomical structures or pathologies within a volumetric scan. To achieve this with a 2D encoder, we process the volume on a slice-by-slice basis. The 2D feature map extracted from each slice by the DINOv3 encoder is preserved. These 2D feature maps are then stacked to construct a pseudo-3D feature volume, which serves as the input to a lightweight segmentation head that produces the final voxel-wise predictions. In our evaluation, we freeze the vision encoder and only fine-tune the segmentation head. We benchmark this task on 14 widely-used public datasets:

Medical Segmentation Decathlon (MSD) [32] The MSD challenge provides 10 distinct 3D medical image segmentation tasks across various modalities and body parts. Since the official online evaluation platform is no longer available, we adopt a 5-fold cross-validation approach on the public training set. Following the standard protocol established in previous medical SSL works [33], we normalize all volumes and apply standard geometric augmentations, including random rotations and flips. For each fold, we use a random 80%/20% split for training and validation, reporting the average performance across all folds.

EM Neuron Segmentation in CREMI [34] The CREMI dataset originates from the 2016 CREMI challenge, designed to advance neuron segmentation in electron microscopy volumes. The data are from an adult Drosophila brain imaged at a resolution of $4 \times 4 \times 4 0$ nm with 1250 × 1250 pixels per slice. It includes three subsets, CREMI-A, CREMI-B, and CREMI-C, each providing 125 annotated slices that represent different neuron types. The difficulty increases from A to C, with later subsets exhibiting more intricate neuronal morphology. In our setup, we train on the first 100 sections from each subset and evaluate on the remaining 25 sections.

EM Neuron Segmentation in AC3/4 [35] Both AC3 and AC4 are densely annotated EM volumes from the Kasthuri15 dataset [35], acquired at $3 \times 3 \times 2 9$ nm resolution with 1024 × 1024 pixels per slice. AC3 comprises

256 consecutive sections and exhibits greater structural heterogeneity, leading to higher topological complexity. AC4 contains 100 sections with relatively uniform contrast, providing a stable target for optimization. In our experiments, we train on the first 80 sections of AC4 and evaluate on the first 100 sections of AC3.

Automated Lesion Segmentation in Whole-Body FDG-PET/CT Challenge (AutoPET-II) [36] The autoPET-II challenge provides a comprehensive dataset of 1014 whole-body FDG-PET/CT scans for automated tumor lesion segmentation in oncology. The dataset focuses on malignant melanoma, lymphoma, and lung cancer lesions across diverse patient populations. Following established evaluation protocols, we utilize the official train/validation split provided by the organizers. All volumes are preprocessed with intensity normalization, and we apply standard data augmentation techniques including random rotations and flips to enhance model robustness.

Head and Neck Tumor segmentation and outcome prediction in PET/CT images (HECKTOR 2022) [37] The HECKTOR 2022 dataset comprises 882 head and neck FDG-PET/CT scans with annotations for primary gross tumor volume (GTVp) and lymph node gross tumor volume (GTVn). This dataset presents unique challenges due to the complex anatomy of the head and neck region and the heterogeneous appearance of head and neck cancers. We follow the challenge’s standard preprocessing pipeline, which includes image registration between PET and CT modalities and intensity normalization. The evaluation follows the official challenge protocol to ensure fair comparison with published benchmarks.

## 2.6 Registration on 3D Medical Images

MRIACDC [38] We utilize the ACDC dataset, comprising cardiac MRI volume sequences from 150 patients. Each sequence includes frames at end-diastole (ED) and end-systole (ES), along with corresponding segmentation maps for the LV cavity, myocardium, and right ventricle. Preprocessing includes resampling to a uniform (1.5, 1.5, 3.15) mm spacing and myocardium-centered cropping to volume dimensions of $1 2 8 \times 1 2 8 \times 3 2$ Intensities are linearly normalized to [−1, 1]. For experimentation, the dataset is split into 80 training, 20 validation, and 50 testing patients. HD95 and ASD are reported in millimeters, accounting for volume anisotropy.

## 3 Task Adaptation

To assess the quality of the visual features produced by DINOv3 [11], we apply straightforward, standardized adaptation techniques that introduce minimal task-specific parameters. This design ensures the benchmark primarily reflects the strength of the frozen representations.

## 3.1 Classification

Our primary evaluation protocol for the 2D X-ray, 2D endoscopic, and 3D CT datasets is linear probing. In this setting, the DINOv3 [11] backbone remains frozen, and only a single linear layer is trained on top of the extracted features using binary cross-entropy (BCE) loss with a learning rate of 0.005, a batch size of 1024, and for 50 epochs.

For the CT-RATE [16] dataset, we additionally perform k-nearest neighbors (k-NN) evaluation. We extract feature embeddings for all scans, and for each of the 18 disease categories (treated as independent binary tasks), k-NN predicts the presence or absence of the disease based on feature similarity.

For whole-slide pathological classification tasks, we use the multiple instance learning (MIL) paradigm. Each WSI is tiled into non-overlapping 224×224 patches and treated as a bag $X = \{ \mathbf { x } _ { i } \} _ { i = 1 } ^ { N }$ . Per-patch features are extracted with a frozen DINOv3 encoder (with global average pooling) to obtain $\dot { \mathbf { e } _ { i } } \in \mathbb { R } ^ { D _ { 0 } \times 1 }$ . We then apply a learnable linear projection:

$$
\mathbf { h } _ { i } = \mathbf { W } _ { \mathrm { p r o j } } \mathbf { e } _ { i } + \mathbf { b } _ { \mathrm { p r o j } } , \qquad \mathbf { W } _ { \mathrm { p r o j } } \in \mathbb { R } ^ { D \times D _ { 0 } } , \ \mathbf { b } _ { \mathrm { p r o j } } \in \mathbb { R } ^ { D \times 1 } , \ \mathbf { h } _ { i } \in \mathbb { R } ^ { D \times 1 } , \ D < D _ { 0 } .\tag{1}
$$

Table 1 Overview of datasets included in the DINOv3 medical imaging benchmark, spanning 2D and 3D modalities across classification, segmentation, and registration.
<table><tr><td>Dataset</td><td>Modality</td><td>Data Scale</td><td>Target</td></tr><tr><td colspan="4"> 2D Classification</td></tr><tr><td>NIH-14 RSNA-Pneumonia</td><td>Chest X-ray Chest X-ray</td><td>112,120 images 29,700 images</td><td>14 thoracic pathologies Pneumonia detection</td></tr><tr><td>Camelyon16 Camelyon17</td><td>WSI (H&amp;E) WSI (H&amp;E)</td><td>399 slides 500 slides</td><td>Tumor metastasis detection Pathological N-staging</td></tr><tr><td>BCNB</td><td>WSI (Biopsy)</td><td>1,058 patients</td><td>Molecular &amp; ALN status prediction</td></tr><tr><td>Kvasir-Capsule</td><td>Capsule Endoscopy</td><td>47,238 frames</td><td>11 anatomical/pathological classes</td></tr><tr><td>AutoLaparo</td><td>Laparoscopy</td><td>83,160 frames</td><td>7 surgical phase recognition</td></tr><tr><td></td><td></td><td> 2D Segmentation</td><td></td></tr><tr><td colspan="4"></td></tr><tr><td>EndoVis 2018</td><td>Robotic Surgery</td><td>15 sequences</td><td>7 surgical instruments segmentation</td></tr><tr><td>EDD 2020</td><td>Endoscopy</td><td>380 frames</td><td> 5 disease classes segmentation</td></tr><tr><td></td><td></td><td> 3D Classification</td><td></td></tr><tr><td colspan="4"></td></tr><tr><td>CT-RATE</td><td>CT</td><td>47,000 volumes</td><td>18 clinical abnormalities classification</td></tr><tr><td></td><td></td><td>3D Segmentation</td><td></td></tr><tr><td>MSD</td><td>CT/MRI</td><td>10 tasks</td><td>10 organ/tumor targets</td></tr><tr><td>CREMI (A/B/C)</td><td>EM (Drosophila)</td><td>3 × 125 slices</td><td> Neuron segmentation</td></tr><tr><td>AC3/4</td><td>EM (Mouse)</td><td>356 sections</td><td>Neuron segmentation</td></tr><tr><td>AutoPET-II</td><td>FDG-PET/CT</td><td>1,014 scans</td><td>Whole-body lesion segmentation</td></tr><tr><td>HECKTOR 2022</td><td>FDG-PET/CT</td><td>882 scans</td><td>Head &amp; Neck tumor segmentation</td></tr><tr><td></td><td></td><td></td><td></td></tr><tr><td colspan="4"></td></tr><tr><td>CAMUS</td><td></td><td>Registration</td><td></td></tr><tr><td>ACDC</td><td>Ultrasound Cardiac MRI</td><td>1,000 pairs 150 patients</td><td>2D Cardiac ED-ES registration 3D Cardiac ED-ES registration</td></tr></table>

Instance embeddings are aggregated using attention-based deep multiple instance learning (ABMIL) [39]:

$$
a _ { i } = \frac { \exp \bigl \{ \mathbf { w } ^ { \top } \bigl ( \operatorname { t a n h } ( \mathbf { V } \mathbf { h } _ { i } ) \odot \sigma ( \mathbf { U } \mathbf { h } _ { i } ) \bigr ) \bigr \} } { \displaystyle \sum _ { j = 1 } ^ { N } \exp \bigl \{ \mathbf { w } ^ { \top } \bigl ( \operatorname { t a n h } ( \mathbf { V } \mathbf { h } _ { j } ) \odot \sigma ( \mathbf { U } \mathbf { h } _ { j } ) \bigr ) \bigr \} } , \qquad \mathbf { z } = \sum _ { i = 1 } ^ { N } a _ { i } \mathbf { h } _ { i } ,\tag{2}
$$

where U, $\mathbf { V } \in \mathbb { R } ^ { H \times D } , \mathbf { w } \in \mathbb { R } ^ { H \times 1 }$ ， $\sigma ( \cdot )$ denotes the sigmoid function, $a _ { i } \in \mathbb { R }$ and $\textstyle \sum _ { i } a _ { i } = 1$ , and $\mathbf { z } \in \mathbb { R } ^ { D \times 1 }$ is the slide-level representation. A task-specific head g(·) maps z to $\hat { Y } ;$ training uses bag-level cross-entropy. Unless specified, the DINOv3 encoder is frozen and only the projection, attention, and head layers are trained.

## 3.2 Segmentation

The 2D segmentation architecture consists of three main components: (1) a frozen DINOv3 encoder that extracts dense features from images of arbitrary size; (2) a lightweight 2D adaptive decoder that refines and progressively upsamples the feature maps; and (3) a segmentation head that produces pixel-wise logits. The decoder employs shallow convolutional blocks with dynamic bilinear upsampling to align predictions with the target resolution during training and inference.

For 3D medical image segmentation, we leverage DINOv3’s 2D feature extraction capabilities in a slice-wise manner. Each axial slice of the 3D volume is processed independently through the frozen DINOv3 encoder to extract dense feature maps. These 2D feature maps are then stacked along the slice dimension to construct a pseudo-3D feature volume.

The segmentation architecture consists of three main components: (1) the frozen DINOv3 encoder for feature extraction, (2) a lightweight 3D decoder that processes the pseudo-3D features, and (3) a segmentation head that produces voxel-wise predictions. The decoder employs 3D convolutional layers with skip connections to progressively upsample features to the original volume resolution.

For the MSD benchmark, we adopt the established 5-fold cross-validation protocol to ensure robust evaluation. Each fold uses an 80%/20% split for training and validation, with careful attention to maintaining patientlevel separation to avoid data leakage. All models are trained using the Dice loss function combined with cross-entropy loss, optimized with AdamW optimizer using a learning rate of 1e-4 and a cosine annealing schedule.

For the AutoPET-II and HECKTOR 2022 benchmarks, we followed the official challenge protocol, using an 80%/20% split for training and validation to maintain consistency with the published benchmarks. Models were trained using a combination of the Dice and CE losses and optimized with the AdamW optimizer, a learning rate of 1e-4, and a linear warmup and cosine annealing schedule.

For the EM neuron segmentation benchmarks, CREMI and AC3/4, we follow the experimental protocols established in previous studies to ensure direct comparability. Models are trained using a weighted mean squared error objective and optimized with the Adam optimizer, a learning rate of 1e-3. During inference, instance segmentations are obtained using the Waterz [40] post-processing method.

## 3.3 Registration

To adapt the 2D DINOv3 backbone for 3D volumetric data, a slice-wise feature extraction strategy is employed, mirroring the approach used for segmentation models. Each axial slice of the 3D volume is independently passed through the frozen DINOv3 encoder to obtain dense 2D feature maps. These maps are subsequently stacked along the slice dimension to form a pseudo-3D feature volume. Following the DINO-Reg methodology [41], the high-dimensional features extracted from both the fixed and moving volumes are aggregated, and Principal Component Analysis (PCA) is applied to learn a shared, compressed basis. These low-dimensional PCA features serve as the input to the self-supervised registration network. This network utilizes a lightweight, 3D U-Net-like structure which accepts the feature volumes. The network is trained to predict a dense, 3D deformation displacement field, which is then applied to the moving image to generate the registered output. For 2D ultrasound registration, an analogous 2D U-Net architecture processes the 2D feature maps directly.

## 3.4 Evaluation Metrics

Classification: We report the Area Under the Curve (AUC), accuracy, precision, recall, and F1-score. For multi-label tasks such as NIH-14 [14] and CT-RATE [16], these metrics are averaged across classes. For endoscopic datasets, we additionally report the Jaccard index (for surgical phase recognition) as well as both macro-averaged and weighted-averaged precision, recall, and F1-scores to account for class imbalance.

Segmentation: For 3D segmentation tasks, we report the mean Dice score for the MSD [32] datasets. For the PET datasets, we report the Dice score, HD95, precision, and recall. for the EM datasets, we use the Variation of Information (VOI) [42] and Adapted Rand Error (ARAND) [43].

Registration: For single-modality registration tasks, we evaluate our results quantitatively by warping segmentation maps in the source image with our predicted displacement and compute anatomical conformance in terms of Dice Similarity Coefficient (DSC), 95th percentile Hausdorff Distance (HD95), and Average Surface Distance (ASD). HD95 and ASD are calculated using medpy.metric.binary implementations.

## 4 Experiments

## 4.1 2D Classification Results

Classification on Chest X-ray images: On the NIH-14 and RSNA-Pneumonia chest X-ray datasets, DINOv3 models demonstrate strong, competitive performance. As shown in Table 2, DINOv3-L achieves the highest AUC on NIH-14, outperforming the medical-specific BiomedCLIP model. While BiomedCLIP performs best on the RSNA-Pneumonia task, DINOv3 models are close contenders. However, the results also highlight an inconsistent scaling behavior, as seen in Figure 1. Performance does not reliably improve with larger model sizes or higher input resolutions; for instance, AUC for all models on NIH-14 peaks at a 512x512 resolution before declining. This suggests that simply increasing model scale does not guarantee better performance in this domain.

Table 2 2D classification linear probing results comparing baseline and DINOv3 series on the NIH-14 and RSNA-Pneumonia datasets. All models use an input resolution of 256x256. For each metric, the highest performing method is marked in bold, and the second highest is underlined.
<table><tr><td rowspan="2">Methods</td><td colspan="4">NIH-14</td><td colspan="4">RSNA-Pneumonia</td></tr><tr><td>AUC</td><td>ACC</td><td>Precision</td><td>Recall</td><td>AUC</td><td>ACC</td><td>Precision</td><td>Recall</td></tr><tr><td>BiomedCLIP [17]</td><td>0.7771</td><td>0.4820</td><td>0.5454</td><td>0.5643</td><td>0.8831</td><td>0.8374</td><td>0.6368</td><td>0.8026</td></tr><tr><td>DINOv3-S[ [11]</td><td>0.7788</td><td>0.4838</td><td>0.5419</td><td>0.5791</td><td>0.8667</td><td>0.8221</td><td>0.6048</td><td>0.8156</td></tr><tr><td>DINOv3-B [11]</td><td>0.7833</td><td>0.4823</td><td>0.5446</td><td>0.5753</td><td>0.8666</td><td>0.8274</td><td>0.6227</td><td>0.7679</td></tr><tr><td>DINOv3-L [11]</td><td>0.7865</td><td>0.4674</td><td>0.5355</td><td>0.5779</td><td>0.8708</td><td>0.8209</td><td>0.5972</td><td>0.7744</td></tr></table>

![](Images_8Y7BTD9S/5cc6432132700905ab4bccbf3de4c2b6d65e573000943d7582b6ae1be7c58a89.jpg)

(a) NIH-14 dataset.  
![](Images_8Y7BTD9S/49e9890b35879222574adef9ed948b97624b86347cbe9af07f59dc678dcb84e7.jpg)  
(b) RSNA-Pneumonia dataset.  
Figure 1 Scaling behavior of DINOv3 models across datasets. The results reveal a non-trivial relationship between performance, model size, and input resolution, where larger models or higher resolutions do not consistently yield better outcomes.

Classification on Pathology images: In the domain of WSIs, DINOv3’s performance is significantly weaker than specialized models. For both the Camelyon16 [20] and Camelyon17 [21] datasets, as shown in Tables 3 and 4 and Figure 2, DINOv3 models are substantially outperformed by pathology-specific foundation models like UNI [44] and CONCH [15]. Their performance is only comparable to a generic ResNet50 [45] baseline, indicating that DINOv3’s natural image features do not effectively transfer to the fine-grained, textural analysis required for histopathology. This limitation is further confirmed by the radar charts for the BCNB dataset in Figure 3, where DINOv3 again lags behind the domain-specialized models across multiple molecular subtyping tasks.

Classification on Endoscopic Imaging. We evaluate DINOv3 on two endoscopic datasets: Kvasir-Capsule (capsule endoscopy) and AutoLaparo (laparoscopy). As shown in Table 5, DINOv3 provides competitive baselines but does not outperform specialized, fully supervised State-of-the-Art (SOTA) methods like VAPCaps [46] on Kvasir-Capsule. However, on the AutoLaparo surgical phase recognition task (Table 6), DINOv3-L achieves the highest Precision (77.83%) and Jaccard index (57.65%), outperforming recent methods such as STSANet [47] in these metrics, though STSANet retains the highest accuracy.

Table 3 In-domain tumour detection on Camelyon16. Patch features are aggregated with ABMIL. Models are trained on the Camelyon16 training set and evaluated on its test set. The highest results are in bold and the second highest are underlined.
<table><tr><td rowspan="2">Patch Encoder</td><td colspan="4">Camelyon16 → Camelyon16</td></tr><tr><td>AUC</td><td>ACC</td><td>Precision</td><td>Recall</td></tr><tr><td>ResNet50 (ImageNet） [45]</td><td>0.842</td><td>0.713</td><td>0.594</td><td>0.776</td></tr><tr><td>UNI [44]</td><td>0.965</td><td>0.951</td><td>0.959</td><td>0.938</td></tr><tr><td>CONCH [[15]</td><td>0.961</td><td>0.944</td><td>0.956</td><td>0.928</td></tr><tr><td>DINOv3-S [11]</td><td>0.840</td><td>0.847</td><td>0.898</td><td>0.682</td></tr><tr><td>DINOv3-B [11]</td><td>0.805</td><td>0.800</td><td>0.834</td><td>0.629</td></tr></table>

Table 4 Out-of-domain tumour detection on Camelyon17. Models are trained on Camelyon16 and evaluated on Camelyon17 (Unseen). The highest results are in bold and the second highest are underlined.
<table><tr><td rowspan="2">Patch Encoder</td><td colspan="4">Camelyon16 → Camelyon17 (Unseen)</td></tr><tr><td>AUC</td><td>ACC</td><td>Precision</td><td>Recall</td></tr><tr><td>ResNet50 (ImageNet） [45]</td><td>0.852</td><td>0.723</td><td>0.607</td><td>0.808</td></tr><tr><td>UNI [44]</td><td>0.932</td><td>0.937</td><td>0.933</td><td>0.928</td></tr><tr><td>CONCH [15]</td><td>0.932</td><td>0.939</td><td>0.934</td><td>0.913</td></tr><tr><td>DINOv3-S [11]</td><td>0.854</td><td>0.761</td><td>0.589</td><td>0.894</td></tr><tr><td>DINOv3-B [11]</td><td>0.792</td><td>0.710</td><td>0.529</td><td>0.820</td></tr></table>

![](Images_8Y7BTD9S/bbe1932d7381efdba78082cbf06c0497584e5101aa7adc2fc4bb35f84862d1e7.jpg)

![](Images_8Y7BTD9S/866e87c71e73e6eeadc4cefdbc137bf929b67812112f788b712ec294f7b3e9d6.jpg)  
Figure 2 Cross-domain generalization on Camelyon16 [20] and Camelyon17 [21]: In-domain vs. Out-of-domain AUC and ACC comparisons.

## 4.2 2D Segmentation Results

We present the quantitative results for surgical instrument segmentation on the EndoVis18 [28] dataset in Table 7, where DINOv3-L achieves a state-of-the-art Binary IoU of 92.19%, surpassing prompt-based methods, although the latter remain superior in fine-grained instrument parsing. This is followed by the disease segmentation results on the EDD 2020 [30] dataset in Table 8, where DINOv3-S achieves a top-ranking Dice score of 93.93% for polyp segmentation, despite the specialized EAT model yielding higher overall mean IoU. Visualizations of the segmentation performance for both tasks are provided in Figure 4.

## 4.3 3D Classification Results

Classification on 3D CT images: For 3D classification on the CT-RATE [16] dataset, DINOv3 establishes a powerful new baseline, significantly outperforming prior models. As detailed in Table 9, all DINOv3 variants, using either k-NN or linear probing, achieve substantially higher scores across all metrics compared to the CT-Net and CT-CLIP [82] baselines. While this comparison is favourable, it is worth noting that CT-CLIP was pre-trained on only 50k samples, unlike other large-scale models such as BiomedCLIP [17] which used 15M samples, making a direct comparison of foundation model pre-training scale complex. Notably, DINOv3-B with linear probing achieves an AUC of 0.798, a considerable improvement over CT-CLIP’s 0.731. This strong performance demonstrates that DINOv3’s 2D features, when aggregated slice-wise, are highly effective for volumetric CT classification tasks without requiring any medical-specific pre-training.

![](Images_8Y7BTD9S/884c687c85e3942f33adf483edabe5e52f6711f46551c0da533ca03531284387.jpg)  
Figure 3 Performance comparison across ALN metastasis and receptor status tasks on the BCNB [23] dataset. The default feature aggregator for the whole-slide images is the attention-based multiple instance learning method [39].

Table 5 Quantitative comparison of DINOv3 with state-of-the-art methods on the Kvasir-Capsule dataset. Best results are highlighted in bold.
<table><tr><td rowspan="2">Method</td><td colspan="3">Macro Average</td><td colspan="3">Weighted Average</td><td rowspan="2">Accuracy (1）</td></tr><tr><td>Precision</td><td>Recall</td><td>F-1 Score</td><td>Precision</td><td>Recall</td><td>F-1 Score</td></tr><tr><td>GMSRF net [48]</td><td>0.1568</td><td>0.1980</td><td>0.1575</td><td>0.7431</td><td>0.6095</td><td>0.6636</td><td>0.6090</td></tr><tr><td>ConvMix - 1536/20[ [49]</td><td>0.1722</td><td>0.2275</td><td>0.1697</td><td>0.7431</td><td>0.6021</td><td>0.6524</td><td>0.6021</td></tr><tr><td>ConViT-S [50]</td><td>0.1765</td><td>0.2182</td><td>0.1689</td><td>0.7673</td><td>0.5610</td><td>0.6312</td><td>0.5610</td></tr><tr><td>Swin-S [51]</td><td>0.1538</td><td>0.2388</td><td>0.1525</td><td>0.7390</td><td>0.5800</td><td>0.6334</td><td>0.5800</td></tr><tr><td>FocalConv net [52]</td><td>0.2438</td><td>0.2745</td><td>0.2178</td><td>0.7557</td><td>0.6373</td><td>0.6734</td><td>0.6373</td></tr><tr><td>Vats et al. [53]</td><td>0.2489</td><td>0.2541</td><td>0.2353</td><td>0.6838</td><td>0.6671</td><td>0.6654</td><td>0.6671</td></tr><tr><td>API net [54]</td><td>0.9509</td><td>0.9808</td><td>0.9650</td><td>0.9879</td><td>0.9873</td><td>0.9875</td><td>0.9873</td></tr><tr><td>VAPCaps [46]</td><td>0.9778</td><td>0.9828</td><td>0.9800</td><td>0.9927</td><td>0.9926</td><td>0.9926</td><td>0.9926</td></tr><tr><td>DINOv3-S [11]</td><td>0.5810</td><td>0.4804</td><td>0.5187</td><td>0.7679</td><td>0.7640</td><td>0.7626</td><td>0.7640</td></tr><tr><td>DINOv3-B [11]</td><td>0.6221</td><td>0.5138</td><td>0.5513</td><td>0.7878</td><td>0.7766</td><td>0.7774</td><td>0.7766</td></tr><tr><td>DINOv3-L [11]</td><td>0.6000</td><td>0.4978</td><td>0.5338</td><td>0.7797</td><td>0.7675</td><td>0.7700</td><td>0.7675</td></tr></table>

Table 6 Quantitative comparison of DINOv3 with state-of-the-art methods on the AutoLaparo dataset. Best results are highlighted in bold.
<table><tr><td>Method</td><td>Accuracy</td><td>Precision</td><td>Recall</td><td> Jaccard</td></tr><tr><td>SV-RCNet [55]</td><td>75.60</td><td>64.00</td><td>59.70</td><td>47.20</td></tr><tr><td>TMRNet [56]</td><td>78.20</td><td>66.00</td><td>61.50</td><td>49.60</td></tr><tr><td>Trans-SVNet [57]</td><td>78.30</td><td>64.20</td><td>62.10</td><td>50.70</td></tr><tr><td>LoViT [58]</td><td>77.86</td><td>71.03</td><td>64.78</td><td>52.56</td></tr><tr><td>STSANet [47]</td><td>79.48</td><td>66.21</td><td>67.07</td><td>52.58</td></tr><tr><td>DINOv3-S [11]</td><td>76.17</td><td>73.64</td><td>72.31</td><td>57.39</td></tr><tr><td>DINOv3-B [11]</td><td>73.33</td><td>75.38</td><td>71.77</td><td>56.40</td></tr><tr><td>DINOv3-L [11]</td><td>77.29</td><td>77.83</td><td>70.91</td><td>57.65</td></tr></table>

Table 7 Quantitative comparison of DINOv3 with other SOTA methods on the tasks of binary segmentation and instrument segmentation on the EndoVis18 dataset. Results for other SOTA methods are derived from [59]. Categorical information directly inherits from associated prompts.
<table><tr><td rowspan="2">Task Type</td><td rowspan="2">Methods</td><td rowspan="2">Pub/Year(20-)</td><td rowspan="2">Arch.</td><td colspan="2">EndoVis18</td></tr><tr><td>Binary loU</td><td>Instrument loU</td></tr><tr><td rowspan="5">Single-Task</td><td>Vanilla UNet [60]</td><td>MICCAI15</td><td>UNet</td><td>68.89</td><td>1</td></tr><tr><td>TernausNet [61]</td><td>ICMLA18</td><td>UNet</td><td>1</td><td>46.22</td></tr><tr><td>MF-TAPNet [62]</td><td>MICCAI19</td><td>UNet</td><td>1</td><td>67.87</td></tr><tr><td>Wang et al. [63]</td><td>MICCAI22</td><td>UNet</td><td>58.12</td><td>1</td></tr><tr><td>ISINet [29]</td><td>MICCAI21</td><td>Res50</td><td>1</td><td>73.03</td></tr><tr><td rowspan="5">Multi-Task</td><td>ST-MTL [64]</td><td>MedIA21</td><td>-</td><td>/</td><td>1</td></tr><tr><td>AP-MTL [65]</td><td>ICRA20</td><td></td><td></td><td>1</td></tr><tr><td>S-MTL [66]</td><td>RA-L22</td><td>1</td><td></td><td>43.54</td></tr><tr><td>TraSeTR [67]</td><td>ICRA22</td><td>Res50 + Trfm</td><td></td><td>76.20</td></tr><tr><td>S3Net [68]</td><td>WACV23</td><td>Res50</td><td>1</td><td>75.81</td></tr><tr><td rowspan="5">Prompt-based</td><td>SAM (1 Point） [69]</td><td>arxiv23</td><td>ViT-H</td><td>57.12</td><td>54.30*</td></tr><tr><td>SAM (Box) [69]</td><td>arxiv23</td><td>ViT-H</td><td>89.35</td><td>81.09*</td></tr><tr><td> SAM 2-Image (1 Point） [70]</td><td>arxiv24</td><td>ViT-H</td><td>77.14</td><td>73.76*</td></tr><tr><td> SAM 2-Image (Box) [70]</td><td>arxiv24</td><td>ViT-H</td><td>90.18</td><td>81.97*</td></tr><tr><td>SAM 2-Video (1 Point） [70]</td><td>arxiv24</td><td>ViT-H</td><td>65.19</td><td>57.59*</td></tr><tr><td rowspan="3">Prompt-free</td><td>DINOv3-S [11]</td><td>arxiv25</td><td>ViT-S</td><td>86.05</td><td>39.86</td></tr><tr><td>DINOv3-B [11]</td><td>arxiv25</td><td>ViT-B</td><td>89.04</td><td>46.37</td></tr><tr><td>DINOv3-L [11]</td><td>arxiv25</td><td>ViT-L</td><td>92.19</td><td>63.97</td></tr></table>

Image  
Ground Truth  
SAM 2 (box prompt)  
![](Images_8Y7BTD9S/4c82f5ee2b22dc827eefb7318644c9a53636927133ef317055e93ffb147f367c.jpg)  
DINOv3  
EndoVis2018

Image  
Ground Truth SAM 2 (box prompt)  
DINOv3  
![](Images_8Y7BTD9S/2827e10a93c18b975ffb736a47a2df01222ef8a05f7446f5bd295e69030a8c06.jpg)  
EDD2020  
Figure 4 Visualization of segmentation results for surgical instruments on the EndoVis18 dataset and disease regions on the EDD2020 dataset.

## 4.4 3D Segmentation Results

Segmentation on MSD benchmarks: On the diverse MSD benchmark, DINOv3 shows mixed and generally modest performance compared to state-of-the-art segmentation-specific models like nnU-Net [84], as shown in Table 10 and 11. While DINOv3-L achieves the best Dice scores on a few tasks (e.g., Lung, and Spleen), its overall average performance lags behind top transformer-based and classic methods. This suggests that although its features provide a reasonable starting point, the simple frozen-backbone, slice-by-slice approach is insufficient to compete with fully optimized 3D segmentation architectures. More advanced adapters may therefore be required to effectively translate strong 2D visual features into 3D dense prediction tasks.

<table><tr><td rowspan="2">Methods</td><td colspan="6">Dice Metrics↑</td><td rowspan="2">mlOu 个</td><td rowspan="2">Prec.个</td><td rowspan="2">Recall 个</td></tr><tr><td>Avg.</td><td>NDBE</td><td>CA</td><td>HGD</td><td>polyp</td><td>Susp.</td></tr><tr><td>TransUnet[71]</td><td>82.45</td><td>83.85</td><td>83.53</td><td>83.31</td><td>82.54</td><td>79.00</td><td>76.53</td><td>82.57</td><td>73.65</td></tr><tr><td>Unet [60]</td><td>64.84</td><td>69.62</td><td>59.99</td><td>69.89</td><td>74.27</td><td>50.41</td><td>51.58</td><td>59.23</td><td>61.70</td></tr><tr><td>HarDNet [72]</td><td>85.31</td><td>88.15</td><td>85.78</td><td>89.13</td><td>84.51</td><td>78.94</td><td>79.66</td><td>88.05</td><td>82.24</td></tr><tr><td>Swin UNETR [73]</td><td>77.40</td><td>78.89</td><td>71.86</td><td>82.12</td><td>79.48</td><td>74.63</td><td>70.64</td><td>74.88</td><td>71.05</td></tr><tr><td>ESFPNet [74]</td><td>76.58</td><td>76.71</td><td>77.19</td><td>80.52</td><td>77.67</td><td>70.82</td><td>67.56</td><td>74.19</td><td>72.72</td></tr><tr><td>DUAT [75]</td><td>84.89</td><td>87.91</td><td>88.61</td><td>87.59</td><td>84.62</td><td>75.70</td><td>79.07</td><td>86.27</td><td>77.20</td></tr><tr><td>FCBFormer [76]</td><td>82.74</td><td>58.90</td><td>85.12</td><td>84.91</td><td>81.12</td><td>76.67</td><td>78.09</td><td>86.65</td><td>75.73</td></tr><tr><td>MSRF-Net [77]</td><td>83.42</td><td>84.08</td><td>82.56</td><td>87.77</td><td>84.84</td><td>77.86</td><td>77.51</td><td>84.79</td><td>76.86</td></tr><tr><td>GMSRF-Net [78]</td><td>82.88</td><td>84.86</td><td>83.29</td><td>83.57</td><td>84.48</td><td>78.19</td><td>76.73</td><td>82.13</td><td>79.28</td></tr><tr><td>Polyp-PVT[79]</td><td>84.45</td><td>86.87</td><td>85.25</td><td>88.90</td><td>83.51</td><td>77.73</td><td>78.09</td><td>86.09</td><td>77.18</td></tr><tr><td>PNS+ [80]</td><td>75.52</td><td>75.36</td><td>75.62</td><td>79.37</td><td>77.71</td><td>69.54</td><td>66.23</td><td>72.84</td><td>72.20</td></tr><tr><td>EAT [81]</td><td>88.02</td><td>91.89</td><td>86.80</td><td>92.51</td><td>86.34</td><td>82.57</td><td>84.85</td><td>91.42</td><td>79.45</td></tr><tr><td>DINOv3-S [11]</td><td>71.50</td><td>86.14</td><td>77.58</td><td>74.59</td><td>93.93</td><td>25.25</td><td>60.30</td><td>67.73</td><td>57.47</td></tr><tr><td>DINOv3-B [11]</td><td>73.56</td><td>84.92</td><td>77.07</td><td>73.23</td><td>88.82</td><td>43.79</td><td>60.43</td><td>66.54</td><td>56.84</td></tr><tr><td>DINOv3-L [11]</td><td>72.90</td><td>88.69</td><td>78.60</td><td>82.16</td><td>92.08</td><td>22.96</td><td>62.49</td><td>72.27</td><td>59.73</td></tr></table>

Table 8 Quantitative comparison of DINOv3 with other SOTA methods on disease segmentation on EDD 2020 dataset. Results for other SOTA methods are derived from [81].

Table 9 3D classification results on the CT-RATE [16] dataset, evaluated across 18 clinical categories (e.g., Medical material, Arterial wall calcification, Cardiomegaly). The top block shows baseline performance from CT-Net and CT-CLIP. The bottom block evaluates DINOv3 backbones using two methods: a k-NN classifier on frozen features (left) and a trained linear probing (right). For each method, the best result per metric is in bold and the second-best is underlined.
<table><tr><td>Methods</td><td>AUC</td><td>ACC</td><td>Precision</td><td>Recall</td><td>AUC</td><td>ACC</td><td>Precision</td><td>Recall</td></tr><tr><td rowspan="2">CLIP [82]</td><td colspan="4">CT-Net [83]</td><td colspan="4">CT-CLIP</td></tr><tr><td>0.629</td><td>0.657</td><td>0.263</td><td>0.575</td><td>0.731</td><td>0.707</td><td>0.323</td><td>0.663</td></tr><tr><td></td><td colspan="4">k-NN</td><td colspan="4">Linear Probing</td></tr><tr><td>DINOv3-S [11]</td><td>0.716</td><td>0.791</td><td>0.350</td><td>0.275</td><td>0.778</td><td>0.722</td><td>0.370</td><td>0.690</td></tr><tr><td>DINOv3-B [11]</td><td>0.737</td><td>0.729</td><td>0.374</td><td>0.541</td><td>0.798</td><td>0.741</td><td>0.390</td><td>0.688</td></tr><tr><td>DINOv3-L [11]</td><td>0.709</td><td>0.797</td><td>0.423</td><td>0.250</td><td>0.791</td><td>0.722</td><td>0.374</td><td>0.728</td></tr></table>

Neuron Segmentation on EM images: DINOv3’s features fail catastrophically on EM neuron segmentation. As shown in Tables 12 and 13 , for both CREMI [34] and AC3/4 [35] datasets, the error rates (VOI and ARAND, where lower is better) for all DINOv3 models are an order of magnitude worse than classic segmentation methods. The visualizations in Figure 5 suggest that the features learned from natural images are too coarse and lack the high-frequency textural detail necessary to delineate the intricate and complex boundaries of neurons in EM volumes. This represents a clear limitation where the domain shift from natural images to EM is too significant for the features to be useful.

Tumor segmentation on FDG-PET/CT images: Similar to its performance on EM images, DINOv3 performs very poorly on tumor segmentation in PET/CT scans across both the AutoPET-II [36] and HECKTOR 2022 [37] datasets. As shown in Table 14, its segmentation performance is drastically lower than established models. This failure likely highlights DINOv3’s inability to interpret PET data, as its self-supervised visual features are primarily attuned to anatomical structure. This hypothesis is supported by the visualizations in Figure 6, which suggest that while DINOv3 features capture anatomical shapes in CT images, they fail to isolate the metabolically active tumor regions in PET images, still focusing on underlying structural patterns. Ultimately, the functional information in PET imaging represents a fundamental departure from the structural patterns

in natural images, creating a domain shift that DINOv3’s pre-trained features cannot overcome.
<table><tr><td rowspan=1 colspan=2>Methods</td><td rowspan=1 colspan=1>Task01(Brain)</td><td rowspan=1 colspan=1>Task02(Heart)</td><td rowspan=1 colspan=1>Task03(Liver)</td><td rowspan=1 colspan=1>Task04(Hippo.)</td><td rowspan=1 colspan=1>Task05(Prostate)</td></tr><tr><td rowspan=1 colspan=7>Supervised LearningMethods</td></tr><tr><td rowspan=1 colspan=2>3D U-Net [85]</td><td rowspan=1 colspan=1>72.4</td><td rowspan=1 colspan=1>81.3</td><td rowspan=1 colspan=1>91.2</td><td rowspan=1 colspan=1>76.8</td><td rowspan=1 colspan=1>82.1</td></tr><tr><td rowspan=2 colspan=2>V-Net [86]nnU-Net [84]</td><td rowspan=2 colspan=1>71.878.9</td><td rowspan=2 colspan=1>83.789.4</td><td rowspan=1 colspan=1>90.8</td><td rowspan=1 colspan=1>78.2</td><td rowspan=1 colspan=1>84.3</td></tr><tr><td rowspan=1 colspan=1>96.2</td><td rowspan=1 colspan=1>84.1</td><td rowspan=1 colspan=1>91.3</td></tr><tr><td rowspan=2 colspan=2>TransUNet [71]SwinUNETR [73]UNETR[87]</td><td rowspan=2 colspan=1>74.276.575.1</td><td rowspan=1 colspan=1>85.1</td><td rowspan=1 colspan=1>93.4</td><td rowspan=1 colspan=1>79.6</td><td rowspan=1 colspan=1>86.7</td></tr><tr><td rowspan=1 colspan=1>87.386.2</td><td rowspan=1 colspan=1>94.793.9</td><td rowspan=1 colspan=1>81.280.4</td><td rowspan=1 colspan=1>88.987.5</td></tr><tr><td rowspan=1 colspan=7>Self-Supervised Methods(Linear Fine-tuning)</td></tr><tr><td rowspan=1 colspan=2>MAE-ViT-B/16[88]</td><td rowspan=1 colspan=1>62.1</td><td rowspan=1 colspan=1>73.8</td><td rowspan=1 colspan=1>82.3</td><td rowspan=1 colspan=1>68.4</td><td rowspan=1 colspan=1>75.2</td></tr><tr><td rowspan=1 colspan=2>MAE-ViT-L/16 [88]</td><td rowspan=1 colspan=1>64.5</td><td rowspan=1 colspan=1>76.2</td><td rowspan=1 colspan=1>84.1</td><td rowspan=1 colspan=1>71.2</td><td rowspan=1 colspan=1>78.1</td></tr><tr><td rowspan=1 colspan=2>SimCLR [89]</td><td rowspan=1 colspan=1>58.9</td><td rowspan=1 colspan=1>70.1</td><td rowspan=1 colspan=1>79.8</td><td rowspan=1 colspan=1>64.7</td><td rowspan=1 colspan=1>72.5</td></tr><tr><td rowspan=1 colspan=2>MoCo-v3 [90]</td><td rowspan=1 colspan=1>61.3</td><td rowspan=1 colspan=1>73.2</td><td rowspan=1 colspan=1>81.6</td><td rowspan=1 colspan=1>67.9</td><td rowspan=1 colspan=1>74.8</td></tr><tr><td rowspan=1 colspan=2>SwAV [91]</td><td rowspan=1 colspan=1>60.2</td><td rowspan=1 colspan=1>71.8</td><td rowspan=1 colspan=1>80.4</td><td rowspan=1 colspan=1>66.1</td><td rowspan=1 colspan=1>73.6</td></tr><tr><td rowspan=1 colspan=2>BYOL [92]</td><td rowspan=1 colspan=1>60.8</td><td rowspan=1 colspan=1>72.5</td><td rowspan=1 colspan=1>80.9</td><td rowspan=1 colspan=1>67.3</td><td rowspan=1 colspan=1>74.1</td></tr><tr><td rowspan=1 colspan=1>DINOv3-S[11]</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>65.2</td><td rowspan=1 colspan=1>77.1</td><td rowspan=1 colspan=1>83.8</td><td rowspan=1 colspan=1>72.6</td><td rowspan=1 colspan=1>78.9</td></tr><tr><td rowspan=1 colspan=1>DINOv3-B[11]</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>66.8</td><td rowspan=1 colspan=1>78.2</td><td rowspan=1 colspan=1>84.1</td><td rowspan=1 colspan=1>75.3</td><td rowspan=1 colspan=1>79.8</td></tr><tr><td rowspan=1 colspan=1>DINOv3-L[11]</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>65.9</td><td rowspan=1 colspan=1>77.6</td><td rowspan=1 colspan=1>83.5</td><td rowspan=1 colspan=1>73.8</td><td rowspan=1 colspan=1>80.5</td></tr></table>

Table 10 3D segmentation Dice scores (%) across Medical Segmentation Decathlon (MSD) benchmark tasks (Part 1: Tasks 01-05). For each method, the best result per metric is in bold and the second-best is underlined.

<table><tr><td rowspan=1 colspan=2>Methods</td><td rowspan=1 colspan=1>Task06(Lung)</td><td rowspan=1 colspan=1>Task07(Pancreas)</td><td rowspan=1 colspan=1>Task08(Hepatic)</td><td rowspan=1 colspan=1>Task09(Spleen)</td><td rowspan=1 colspan=1>Task10(Colon)</td><td rowspan=1 colspan=1>Average</td></tr><tr><td rowspan=1 colspan=3>Supe</td><td rowspan=1 colspan=5>rvised Learning Methods</td></tr><tr><td rowspan=1 colspan=2>3D U-Net [93]</td><td rowspan=1 colspan=1>67.9</td><td rowspan=1 colspan=1>71.5</td><td rowspan=1 colspan=1>55.3</td><td rowspan=1 colspan=1>87.6</td><td rowspan=1 colspan=1>42.1</td><td rowspan=1 colspan=1>72.8</td></tr><tr><td rowspan=1 colspan=2>V-Net [94]</td><td rowspan=1 colspan=1>66.4</td><td rowspan=1 colspan=1>73.2</td><td rowspan=1 colspan=1>57.1</td><td rowspan=1 colspan=1>89.2</td><td rowspan=1 colspan=1>41.8</td><td rowspan=1 colspan=1>73.7</td></tr><tr><td rowspan=3 colspan=2>nnU-Net [84]TransUNet [71]SwinUNETR [73]UNETR[87]</td><td rowspan=2 colspan=1>75.870.3</td><td rowspan=2 colspan=1>82.776.8</td><td rowspan=2 colspan=1>67.959.4</td><td rowspan=1 colspan=1>94.8</td><td rowspan=2 colspan=1>52.645.7</td><td rowspan=2 colspan=1>81.476.2</td></tr><tr><td rowspan=1 colspan=1>91.2</td></tr><tr><td rowspan=1 colspan=1>72.671.8</td><td rowspan=1 colspan=1>78.977.4</td><td rowspan=1 colspan=1>62.160.7</td><td rowspan=1 colspan=1>92.891.9</td><td rowspan=1 colspan=1>47.346.2</td><td rowspan=1 colspan=1>78.277.1</td></tr><tr><td rowspan=1 colspan=8>Self-Supervised Methods((Linear Fine-tuning)</td></tr><tr><td rowspan=1 colspan=2>MAE-ViT-B/16[88]</td><td rowspan=1 colspan=1>61.4</td><td rowspan=1 colspan=1>66.8</td><td rowspan=1 colspan=1>48.9</td><td rowspan=1 colspan=1>81.2</td><td rowspan=1 colspan=1>35.4</td><td rowspan=1 colspan=1>65.6</td></tr><tr><td rowspan=1 colspan=2>MAE-ViT-L/16 [88]</td><td rowspan=1 colspan=1>64.1</td><td rowspan=1 colspan=1>69.3</td><td rowspan=1 colspan=1>52.1</td><td rowspan=1 colspan=1>84.8</td><td rowspan=1 colspan=1>38.7</td><td rowspan=1 colspan=1>68.3</td></tr><tr><td rowspan=1 colspan=2>SimCLR [89]</td><td rowspan=1 colspan=1>57.8</td><td rowspan=1 colspan=1>63.2</td><td rowspan=1 colspan=1>45.1</td><td rowspan=1 colspan=1>77.4</td><td rowspan=1 colspan=1>31.9</td><td rowspan=1 colspan=1>62.1</td></tr><tr><td rowspan=1 colspan=2>MoCo-v3 [90]</td><td rowspan=1 colspan=1>60.9</td><td rowspan=1 colspan=1>66.1</td><td rowspan=1 colspan=1>48.2</td><td rowspan=1 colspan=1>80.6</td><td rowspan=1 colspan=1>35.1</td><td rowspan=1 colspan=1>64.8</td></tr><tr><td rowspan=1 colspan=2>SwAV [91]</td><td rowspan=1 colspan=1>59.1</td><td rowspan=1 colspan=1>64.7</td><td rowspan=1 colspan=1>46.8</td><td rowspan=1 colspan=1>78.9</td><td rowspan=1 colspan=1>33.2</td><td rowspan=1 colspan=1>63.5</td></tr><tr><td rowspan=1 colspan=2>BYOL [92]</td><td rowspan=1 colspan=1>60.2</td><td rowspan=1 colspan=1>65.4</td><td rowspan=1 colspan=1>47.5</td><td rowspan=1 colspan=1>79.7</td><td rowspan=1 colspan=1>34.6</td><td rowspan=1 colspan=1>64.2</td></tr><tr><td rowspan=1 colspan=2>DINOv3-S [11]</td><td rowspan=1 colspan=1>65.8</td><td rowspan=1 colspan=1>70.2</td><td rowspan=1 colspan=1>53.4</td><td rowspan=1 colspan=1>82.9</td><td rowspan=1 colspan=1>40.1</td><td rowspan=1 colspan=1>69.0</td></tr><tr><td rowspan=1 colspan=1>DINOv3-B3[11]</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>73.1</td><td rowspan=1 colspan=1>78.9</td><td rowspan=1 colspan=1>64.8</td><td rowspan=1 colspan=1>86.4</td><td rowspan=1 colspan=1>49.1</td><td rowspan=1 colspan=1>71.3</td></tr><tr><td rowspan=1 colspan=1>DINOv3-L [11]</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>72.4</td><td rowspan=1 colspan=1>78.2</td><td rowspan=1 colspan=1>63.7</td><td rowspan=1 colspan=1>91.2</td><td rowspan=1 colspan=1>47.8</td><td rowspan=1 colspan=1>71.0</td></tr></table>

Table 11 3D segmentation Dice scores (%) across Medical Segmentation Decathlon (MSD) benchmark tasks (Part 2: Tasks 06-10). For each method, the best result per metric is in bold and the second-best is underlined.

## 4.5 2D and 3D Registration

2D Registration of Cardiac Ultrasound Images: For 2D cardiac image registration on the CAMUS dataset [27], DINOv3, along with other feature-based registration methods, does not match the performance of VoxelMorph. Table 15 summarizes the quantitative results. Notably, MIND features fail drastically in this scenario; as shown in Figure 7, the feature maps are corrupted and lack meaningful anatomical information. Consequently, we do not concatenate MIND features with DINOv3 features for this comparison. Anatomix exhibits similar limitations, showing slightly better anatomical detail but noticeable dispersion outside the cone region.

Table 12 Quantitative comparison of different methods on the CREMI datasets. For each metric, the best result is in bold and the second-best is underlined. Note that all reported metrics are lower-is-better.
<table><tr><td rowspan="2">Method</td><td colspan="4">CREMI-A</td><td colspan="4">CREMI-B</td><td colspan="4">CREMI-C</td></tr><tr><td></td><td> $V O I _ { s } \ V O I _ { m }$ </td><td>VOI</td><td>ARAND|</td><td> $V O I _ { s }$ </td><td> $V O I _ { m }$ </td><td>VOI</td><td>ARAND</td><td> $V O I _ { s }$   $V O I _ { m }$ </td><td></td><td>VOI ARAND</td></tr><tr><td colspan="10"> Classic Segmentation Methods</td></tr><tr><td>Superhuman [95]</td><td>0.399</td><td>0.241</td><td>0.640</td><td>0.089</td><td>0.554</td><td>0.222 0.776</td><td>0.048</td><td>0.820</td><td>0.338</td><td>1.158</td><td>0.179</td></tr><tr><td>MALA 40]</td><td>0.398</td><td>0.236</td><td>0.634</td><td>0.085</td><td>0.589</td><td>0.261 0.850</td><td>0.041</td><td>0.842</td><td>0.332</td><td>1.174</td><td>0.162</td></tr><tr><td>PEA [96]</td><td>0.329</td><td>0.298</td><td>0.626</td><td>0.091</td><td>0.411</td><td>0.374 0.785</td><td>0.041</td><td>0.745</td><td>0.446</td><td>1.191</td><td>0.169</td></tr><tr><td>APViT [97]</td><td>0.445</td><td>0.260</td><td>0.704</td><td>0.117</td><td>0.579</td><td>0.201 0.781</td><td>0.032</td><td>0.884</td><td>0.234</td><td>1.118</td><td>0.110</td></tr><tr><td>LSD [98]</td><td>0.393</td><td>0.217</td><td>0.610</td><td>0.070</td><td>0.538</td><td>0.267 0.805</td><td>0.122</td><td>0.836</td><td>0.230</td><td>1.065</td><td>0.150</td></tr><tr><td>CAD [99]</td><td>0.313</td><td>0.252</td><td>0.565</td><td>0.079</td><td>0.379</td><td>0.305 0.684</td><td>0.030</td><td>0.738</td><td>0.322</td><td>1.060</td><td>0.149</td></tr><tr><td colspan="10">DINOu3 Foundation Models (Linear Probing)</td></tr><tr><td>DINOv3-S [11]</td><td>2.147</td><td>1.795</td><td>3.942</td><td>0.642</td><td>3.048</td><td>3.660 6.708</td><td>0.543</td><td>3.890</td><td>5.257</td><td>9.147</td><td>0.917</td></tr><tr><td>DINOv3-B [11]</td><td>1.849</td><td>1.693</td><td>3.542</td><td>0.611</td><td>2.535</td><td>3.256 5.791</td><td>0.506</td><td>3.457</td><td>4.089</td><td>7.546</td><td>0.795</td></tr><tr><td>DINOv3-L [11]</td><td>0.793</td><td>0.991</td><td>1.784</td><td>0.448</td><td>1.852</td><td>1.417 3.269</td><td>0.235</td><td>2.557</td><td>1.836</td><td>4.393</td><td>0.461</td></tr></table>

Table 13 Quantitative comparison of different methods on AC3/4 and Wafer4 datasets. We compare classic segmentation methods and DINOv3 foundation models (linear probing). Best results are in bold, and second best are underlined. Note: Reported metrics are all lower-is-better.
<table><tr><td rowspan="2">Method</td><td colspan="4">AC3/4</td><td colspan="4">Wafer4</td></tr><tr><td> $V O I _ { s }$ </td><td> $V O I _ { m }$ </td><td>VOI</td><td>ARAND</td><td> $V O I _ { s }$ </td><td> $V O I _ { m }$ </td><td>VOI</td><td>ARAND</td></tr><tr><td colspan="9">Classic Segmentation Methods</td></tr><tr><td>Superhuman [95]</td><td>0.597</td><td>0.433</td><td>1.031</td><td>0.179</td><td>0.452</td><td>0.166</td><td>0.618</td><td>0.041</td></tr><tr><td>MALA [40]</td><td>0.677</td><td>0.457</td><td>1.134</td><td>0.166</td><td>0.455</td><td>0.158</td><td>0.613</td><td>0.036</td></tr><tr><td>PEA [96]</td><td>0.552</td><td>0.498</td><td>1.050</td><td>0.209</td><td>0.421</td><td>0.172</td><td>0.593</td><td>0.034</td></tr><tr><td>APViT [97]</td><td>0.767</td><td>0.204</td><td>0.976</td><td>0.078</td><td>0.581</td><td>0.123</td><td>0.704</td><td>0.036</td></tr><tr><td>LSD [98]</td><td>0.633</td><td>0.280</td><td>0.913</td><td>0.093</td><td>0.445</td><td>0.115</td><td>0.560</td><td>0.026</td></tr><tr><td>CAD [99]</td><td>0.533</td><td>0.351</td><td>0.884</td><td>0.081</td><td>0.415</td><td>0.144</td><td>0.559</td><td>0.030</td></tr></table>

DINOv3 Foundation Models (Linear Probing)
<table><tr><td>DINOv3-S [11]</td><td>3.813</td><td>5.252</td><td>8.965</td><td>0.825</td><td>4.298</td><td>2.705</td><td>7.003</td><td>0.331</td></tr><tr><td>DINOv3-B [11]</td><td>3.070</td><td>2.009</td><td>5.079</td><td>0.274</td><td>3.564</td><td>1.722</td><td>5.286</td><td>0.189</td></tr><tr><td>DINOv3-L [11]</td><td>1.821</td><td>0.950</td><td>2.771</td><td>0.268</td><td>2.061</td><td>0.568</td><td>2.629</td><td>0.115</td></tr></table>

![](Images_8Y7BTD9S/9ef065468d013a1d08512ff930e0284bae4c133634bb7348a018d506f80fa39d.jpg)  
(a)

![](Images_8Y7BTD9S/f84b3ccd13ac384c5414cd684635c4cae979ab7a99283e52fee203f50be71cb3.jpg)  
(b)

![](Images_8Y7BTD9S/4ae8c2501a99de87fc4c5aee8051426310f9e038e4f1a3c3ac81a74be2142edb.jpg)  
(c)

![](Images_8Y7BTD9S/aa94347535e52457c4c14cca1706e5ef89ca8ac9075d2123a8f07527c968f0dd.jpg)  
(d)

![](Images_8Y7BTD9S/7f1aa2903e11953121c2524c23e1fa3037a8ad8363338ce3bc086704c61736ce.jpg)  
(e)  
Figure 5 Visualization of a slice from the AC3/4 [35] dataset and feature embeddings. (a) Raw EM image. (b–d) Feature embeddings extracted from DINOv3-S/16 (b), DINOv3-B/16 (c), and DINOv3-L/16 (d) models, visualized by projecting the first three principal components into RGB space. (e) Corresponding affinity map derived from the raw image.

DINO-S features also show spatial dispersion, although the myocardial structure begins to emerge. In contrast, DINO-B and DINO-L produce better anatomical representations. However, the highlighted regions are not confined solely to the myocardium, as noise is also emphasized. These observations underscore the need for ultrasound-specific foundation models that explicitly account for the unique characteristics of ultrasound imaging.

3D Registration of Cardiac MRI Volumes: For 3D image registration on the ACDC dataset [38], DINOv3 establishes a strong baseline, moderately outperforming other methods. Table 16 presents the results for cardiac MRI volume registration. Quantitatively, feature-based registration methods are on par with the widely used VoxelMorph method. However, qualitative differences are evident in the warped segmentation maps. As illustrated in the first row of Figure 8, DINOv3 demonstrates superior correspondence, particularly in scenarios involving occlusions. In instances where tissues inside the myocardial segmentation ring exhibit intensity differences, DINOv3 features yield the smoothest and most well-aligned results.

Table 14 Performance comparison of different methods on AutoPET-II and HECKTOR 2022 datasets across CT and PET modalities. Best results across all methods are in bold and second best are underlined. Notably, HD95 is NaN, which means the prediction is all background.
<table><tr><td rowspan="2">Methods</td><td rowspan="2">Modality</td><td colspan="4">AutoPET-II</td><td colspan="4">HECKTOR 2022</td></tr><tr><td>Dice</td><td>HD95</td><td>Prec.</td><td>Rec.</td><td>Dice</td><td>HD95</td><td>Prec.</td><td>Rec.</td></tr><tr><td colspan="10">Classic Segmentation Methods</td></tr><tr><td>UNet [93]</td><td>CT+PET</td><td>59.41</td><td>241.31</td><td>62.32</td><td>70.74</td><td>50.25</td><td>65.03</td><td>72.13</td><td>41.50</td></tr><tr><td>VNet [94]</td><td>CT+PET</td><td>53.21</td><td>242.78</td><td>53.21</td><td>60.85</td><td>55.61</td><td>41.46</td><td>78.21</td><td>46.01</td></tr><tr><td>UNETR [87]</td><td>CT+PET</td><td>51.49</td><td>257.30</td><td>51.49</td><td>61.03</td><td>48.10</td><td>73.27</td><td>70.71</td><td>39.11</td></tr><tr><td>Swin UNETR [100]</td><td>CT+PET</td><td>62.24</td><td>242.07</td><td>62.91</td><td>73.30</td><td>44.56</td><td>103.02</td><td>62.43</td><td>37.55</td></tr><tr><td>VSmTrans [101]</td><td>CT+PET</td><td>62.46</td><td>223.88</td><td>65.19</td><td>70.92</td><td>52.91</td><td>78.03</td><td>61.91</td><td>50.97</td></tr><tr><td>UNETR++ [102]</td><td>CT+PET</td><td>36.50</td><td>178.57</td><td>36.50</td><td>60.16</td><td>29.95</td><td>27.74</td><td>61.84</td><td>21.75</td></tr><tr><td>U-KAN [103]</td><td>CT+PET</td><td>60.67</td><td>70.91</td><td>62.03</td><td>72.94</td><td>55.89</td><td>23.48</td><td>77.72</td><td>46.89</td></tr><tr><td colspan="10">Multimodal lSegmentationMethods</td></tr><tr><td>Nestedformer [104]</td><td></td><td>CT+PET 61.38</td><td>265.51</td><td></td><td>61.3864.29</td><td>40.17</td><td>72.95</td><td>63.22</td><td>32.59</td></tr><tr><td>A2FSeg [105]</td><td>CT+PET</td><td>60.86</td><td>131.48</td><td>60.86</td><td>76.10</td><td>40.90</td><td>32.95</td><td>77.02</td><td>30.57</td></tr><tr><td>H-DenseFormer[ [106]</td><td>CT+PET</td><td>61.50</td><td>252.98</td><td>61.41</td><td>75.76</td><td>46.79</td><td>34.84</td><td>78.33</td><td>35.31</td></tr><tr><td colspan="10"> DINOu3 Foundation Models (Linear Probing)</td></tr><tr><td>DINOv3-S/16 [11]</td><td>CT</td><td>0.00</td><td>25475.80</td><td>0.00</td><td>0.00</td><td>0.00</td><td>NaN</td><td>0.00</td><td>0.00</td></tr><tr><td>DINOv3-B/16 [11]</td><td>CT</td><td>0.00</td><td>21394.57</td><td>0.00</td><td>0.00</td><td>0.00</td><td>7541.56</td><td>0.03</td><td>0.00</td></tr><tr><td>DINOv3-L/16 [11]</td><td>CT</td><td>0.00</td><td>11637.64</td><td>0.39</td><td>0.00</td><td>0.00</td><td>NaN</td><td>0.00</td><td>0.00</td></tr><tr><td>DINOv3-S/16 [11]</td><td>PET</td><td>7.10</td><td>13940.53</td><td>4.37</td><td>48.14</td><td>6.44</td><td>10641.95</td><td>5.92</td><td>17.37</td></tr><tr><td>DINOv3-B/16 [11]</td><td>PET</td><td>8.74</td><td>14114.07</td><td>5.43</td><td>54.38</td><td>21.41</td><td>7919.81</td><td>37.03</td><td>20.57</td></tr><tr><td>DINOv3-L/16 [11]</td><td>PET</td><td>10.87</td><td>13611.39</td><td>6.85</td><td>64.96</td><td>9.43</td><td>10329.33</td><td>9.40</td><td>25.93</td></tr><tr><td>DINOv3-S/16 [11]</td><td>CT+PET</td><td>9.06</td><td>13456.42</td><td>5.32</td><td>65.87</td><td>40.13</td><td>4294.74</td><td>52.82</td><td>40.67</td></tr><tr><td>DINOv3-B/16 [11]</td><td> $\mathrm { C T + P E T }$ </td><td>14.53</td><td>13188.93</td><td>9.50</td><td>49.06</td><td>39.50</td><td>5032.80</td><td>45.37</td><td>45.18</td></tr><tr><td> $\mathrm { D I N O v 3 – L } / 1 6 \ [ 1 1 ]$ </td><td>CT+PET</td><td>12.17</td><td>13418.89</td><td>7.50</td><td>71.16</td><td>30.86</td><td>8808.90</td><td>34.99</td><td>39.98</td></tr></table>

Table 15 Quantitative results of 2D registration on CAMUS. The results are presented as mean ± standard deviation. Best results across all methods are in bold.
<table><tr><td>Methods</td><td>Dice ↑</td><td>HD↓</td><td>ASD↓</td></tr><tr><td>Unregistered</td><td> $0 . 7 3 9 7 \pm 0 . 1 1 0 1$ </td><td> $7 . 0 4 0 1 \pm 2 . 1 9 8 9$ </td><td> $3 . 3 0 6 7 \pm 1 . 2 4 6 2$ </td></tr><tr><td>VoxelMorph [107]</td><td> $\pm 0 . 8 5 9 2 \pm 0 . 0 5 0 0$ </td><td> $\pm . 6 2 1 1 \pm 1 . 9 2 7 2$ </td><td> $\pm 0 . 7 0 9 6 1 \pm 0 . 7 0 9 5$ </td></tr><tr><td>MIND+ConvexAdam [108]</td><td> $0 . 7 1 0 0 \pm 0 . 1 2 6 1$ </td><td> $8 . 5 6 6 3 \pm 3 . 0 2 8 0$ </td><td> $3 . 6 4 7 2 \pm 1 . 3 9 8 3$ </td></tr><tr><td>Anatomix [109]+ConvexAdam</td><td> $0 . 8 0 1 2 \pm 0 . 0 9 0 2$ </td><td> $5 . 5 7 6 9 \pm 1 . 7 7 0 7$ </td><td> $2 . 5 5 6 4 \pm 0 . 9 4 1 9$ </td></tr><tr><td colspan="4">DINOv3 Foundation Models (Zero-Shot)</td></tr><tr><td>DINO-S+ConvexAdam</td><td> $0 . 8 4 0 1 \pm 0 . 0 8 9 5$ </td><td> $5 . 4 6 5 2 \pm 2 . 9 3 0 5$ </td><td> $2 . 1 2 3 6 \pm 1 . 0 1 6 7$ </td></tr><tr><td> $\mathrm { D I N O - B + C o n v e x A d a m }$ </td><td> $0 . 8 3 1 5 \pm 0 . 0 9 2 7$ </td><td> $5 . 7 7 0 3 \pm 2 . 9 9 0 7$ </td><td> $2 . 2 5 6 5 \pm 1 . 0 9 7 6$ </td></tr><tr><td> $\mathrm { D I N O - L + C o n v e x A d a m }$ </td><td> $0 . 8 4 3 1 \pm 0 . 0 8 8 6$ </td><td> $5 . 4 6 7 0 \pm 3 . 0 6 5 3$ </td><td> $2 . 1 0 6 1 \pm 1 . 0 2 9 1$ </td></tr></table>

![](Images_8Y7BTD9S/e087e86c6081bda7a49474309f21782ae124265de1c17c8aef7cde0773cb131f.jpg)

![](Images_8Y7BTD9S/688b4cff5e038849850cd95e67237515b2cd4fc797c932f1d04e58ceb36d9e66.jpg)  
(a)

![](Images_8Y7BTD9S/4d10422c01f3efd7841df36cbc3e62ae08ead899d1aa3bdc310d5b9d317de608.jpg)

![](Images_8Y7BTD9S/c6a5eac420a5d6543d824f3572f114d3c276699dc2dbaee502de60952bf7a2aa.jpg)  
(b)

![](Images_8Y7BTD9S/9581ede9902fc3fc0708cd40e8ae414b5c423f58704a9d20e0e7acb1811abc43.jpg)

Figure 6 Visualization of the first three principal components derived from PCA on image patches. (a) CT images and (b) PET images are shown with their respective PCA visualizations, where each of the first three components is mapped to a color channel. (c) The resulting tumor region can be isolated by thresholding the first principal component to remove the background.  
![](Images_8Y7BTD9S/c13589f3e6014a8fba52c14f49ade58f66cbfbfe27e69d4f814761b499e7e08c.jpg)

MIND  
![](Images_8Y7BTD9S/8abca5c372f3d009e093d83ec08bab4cf6d5412fc59646f9068a828734c71e49.jpg)

![](Images_8Y7BTD9S/a614cfcbde5fa8036a22c158d766574503ff83cf4b0941ba0131e71e793f2d42.jpg)  
Anatomix

![](Images_8Y7BTD9S/fad6bf581d4d2f30eda9d9c76b193eda9f6e0d6b6a87532c1f0f47d336afe5d5.jpg)  
DINO-S

![](Images_8Y7BTD9S/67ebfcaf738dc951ee34ebfd7d9b936130283451b877ab75c1a9ba7b80f4a1c7.jpg)  
DINO-B

![](Images_8Y7BTD9S/4640f701fec8aa12625aef3eaaf045dc412a6a68218a9c896f2fec0dfa1b70c6.jpg)  
DINO-L  
Figure 7 Visualization of ultrasound features extracted by different encoders. Each image displays the first three principal components of the feature representation, mapped to RGB color channels.

Table 16 Quantitative results of 3D registration on ACDC. The results are presented as mean ± standard deviation. Best results across all methods are in bold.
<table><tr><td>Methods</td><td>Dice ↑</td><td> $\mathrm { H D } \ ( \mathrm { m m } ) \downarrow$ </td><td>ASD (mm) ↓</td></tr><tr><td>Unregistered</td><td> $0 . 5 8 8 9 \pm 0 . 1 7 0 6$ </td><td> $1 1 . 1 2 5 4 \pm 4 . 0 8 7 1$ </td><td> $5 . 0 7 0 8 \pm 2 . 6 6 3 2$ </td></tr><tr><td>VoxelMorph [107]</td><td> $0 . 7 3 8 3 \pm 0 . 1 2 2 0$ </td><td> ${ \pm . 3 3 8 9 \pm 4 . 3 4 1 9 }$ </td><td> $3 . 4 0 3 8 \pm 2 . 0 3 4 4$ </td></tr><tr><td>MIND+ConvexAdam [108]</td><td> $0 . 7 4 9 9 \pm 0 . 1 1 6 8$ </td><td> $8 . 6 2 7 5 \pm 4 . 8 9 1 7$ </td><td> $3 . 4 3 0 2 \pm 2 . 1 9 9 0$ </td></tr><tr><td>Anatomix [109]+ConvexAdam</td><td> $0 . 7 5 6 6 \pm 0 . 1 1 3 2$ </td><td> $8 . 4 4 7 9 \pm 4 . 8 5 6 4$ </td><td> $3 . 3 4 7 7 \pm 2 . 1 3 6 7$ </td></tr><tr><td colspan="4">DINOu3 Foundation Models  $( Z e r o - S h o t )$ </td></tr><tr><td> $\mathrm { D I N O - S + M I N D + C o n v e x A d a m }$ </td><td> $0 . 7 4 8 0 \pm 0 . 1 1 7 3$ </td><td> $8 . 5 9 3 1 \pm 4 . 8 2 3 5$ </td><td> $3 . 4 1 5 3 \pm 2 . 1 6 2 5$ </td></tr><tr><td> $\mathrm { D I N O - B + M I N D + C o n v e x A d a m }$ </td><td> $\pm 0 . 7 5 9 3 \pm 0 . 1 1 2 4$ </td><td> $8 . 3 4 3 9 \pm 4 . 8 7 1 1$ </td><td> ${ \bf 3 . 2 9 5 7 \pm 2 . 1 2 4 4 }$ </td></tr><tr><td> $\mathrm { D I N O - L + M I N D + C o n v e x A d a m }$ </td><td> $0 . 7 4 8 1 \pm 0 . 1 1 7 1$ </td><td> $8 . 5 6 5 2 \pm 4 . 7 7 6 9$ </td><td> $3 . 4 1 0 1 \pm 2 . 1 5 8 3$ </td></tr></table>

## 5 Findings

F1: DINOv3’s natural-image features excel on some medical tasks but fail on modalities with a large domain shift.

Source (ED） Target (ES)

Warped Source  
![](Images_8Y7BTD9S/e36f756e73be0cb3f2d73008075f5ae1e75e556ed12f407e4bd2276c028b32b4.jpg)  
Figure 8 Qualitative results of cardiac image registration on the ACDC (top row) and CAMUS (second row) datasets. The first two columns show source and target images with ground truth myocardium segmentation contours. The subsequent columns display warped source images produced by different registration methods. Each warped image is overlaid with warped myocardium contours, with red highlighting the ground truth End-Systole (ES) myocardium.

DINOv3 [11], pretrained solely on natural images, establishes a strong new baseline in the medical domain without any medical specific pre training. It demonstrates impressive performance, showing results comparable to domain specific models like BiomedCLIP [17] and CT-CLIP [82], and sometimes even outperforming them in certain scenarios. Specifically, it achieves comparable performance on 2D chest X ray classification (NIH 14 [14] and RSNA Pneumonia [18] datasets) and sets a strong new baseline for 3D CT classification (CT-RATE [16] dataset). In the field of endoscopic imaging, DINOv3 also delivers competitive results; it achieves stateof-the-art performance in binary instrument segmentation on the EndoVis18 dataset, although it does not consistently surpass specialized supervised methods in fine-grained classification tasks. Furthermore, in cardiac MRI registration, DINOv3 features demonstrate superior correspondence compared to standard methods, particularly in scenarios involving occlusions. However, DINOv3 performs poorly on WSI classification, EM, and PET segmentation.

This performance disparity can be hypothesized to stem from the object centric nature of DINOv3 [11] pretraining. Since the model learned from a vast corpus of natural images from Instagram, its visual features are highly attuned to capturing structures and shapes. This explains its success in modalities like X-ray, CT, and endoscopy, where many diagnostic patterns are linked to macroscopic structural abnormalities. In contrast, its performance degrades significantly on image modalities where the visual characteristics differ greatly. For WSI, analysis relies on fine grained textural and cellular patterns, which are less represented in DINOv3 object focused feature space. For EM, the model features lack the high frequency textural detail required to delineate intricate neuronal boundaries. The shift is even more pronounced for PET, as these scans visualize functional metabolic activity, a fundamental departure from the structural patterns in natural images that DINOv3 is primed to recognize.

## F2: Scaling laws from natural images do not consistently transfer to the medical domain.

The report finds that DINOv3 does not consistently follow the expected scaling laws in the medical domain. Contrary to trends in natural image tasks, increasing the model size (e.g., from DINOv3 S to DINOv3 L) or using higher input resolutions does not reliably lead to better performance. For instance, on the NIH 14 chest X ray dataset, performance peaks at a 512 × 512 resolution before declining at higher resolutions. This inconsistent scaling behavior is observed across different tasks and datasets, indicating that larger models are not consistently able to achieve the best performance. This suggests that simply using a larger model or finer features is not a guaranteed strategy for improvement in medical imaging.

## F3: The benefits of scaling are not uniformly transferable across diverse medical tasks and modalities.

The advantages gained from scaling are not uniformly transferable, with different tasks exhibiting markedly different behaviors. This is particularly evident in 2D classification; for both chest X-ray and WSI analysis, larger models can paradoxically underperform smaller ones. In contrast, for 3D CT classification, increasing model scale is generally beneficial, though the improvement is not always monotonic. A third distinct pattern appears in 3D segmentation, where larger DINOv3 models typically outperform their smaller counterparts. Remarkably, on certain Medical Segmentation Decathlon tasks like Lung segmentation, the aggregated 2D features from DINOv3 can achieve performance comparable to the strong nnU-Net baseline. This underscores the potential of leveraging powerful 2D visual priors for complex 3D tasks, indicating that these features are not universal and vary significantly depending on the specific medical task and modality.

## 5.1 Limitations of this Report

While this report presents a comprehensive benchmark across diverse tasks and modalities, it has several limitations. First, our analysis focuses exclusively on the DINOv3 model family and does not include a comparative evaluation against other foundation models [110]. Second, our experiments are restricted to a linear probing protocol with a frozen backbone; we do not explore the potential benefits of full fine-tuning or parameter-efficient adaptation methods [111, 112]. Finally, although the selected datasets are diverse, they are not exhaustive. Our benchmark does not cover all medical imaging modalities, such as 4D cardiac MRI [113, 114], or all relevant tasks, such as 3D reconstruction [115, 116].

## 6 Conclusion

## 6.1 Summary of Findings

This report establishes DINOv3 as a strong off the shelf encoder for a range of medical imaging tasks, particularly those with visual characteristics similar to natural images such as CT and X ray analysis. Despite being trained exclusively on non medical data, it sets a strong baseline and can achieve performance comparable to domain specific models in certain scenarios. However, our findings highlight critical limitations: DINOv3 performance deteriorates significantly in domains like WSI, EM, and PET, where there may be even greater shifts between training and target distributions. Furthermore, we observe that the scaling laws that govern performance on natural images do not consistently apply in the medical domain; larger models and higher resolutions do not reliably yield better results, revealing complex and task dependent scaling behaviors.

## 6.2 Future Directions

Based on our findings, several promising research avenues emerge. First, to bridge the performance gap in specialized domains, future work should move beyond linear probing and investigate parameter efficient fine tuning methods to adapt DINOv3 features for new domains. Second, for volumetric tasks, there is a clear need to develop more sophisticated 2D to 3D adapters that can more effectively translate the powerful slice wise features for dense 3D prediction tasks like segmentation. Finally, the high quality of DINOv3 features in modalities like CT could be leveraged for other complex tasks, such as enforcing multi view consistency in 3D reconstruction from 2D slices or improving medical image registration.

## References

[1] OpenAI, “Chatgpt,” 2022. [Online]. Available: https://openai.com/blog/chatgpt

[2] J. Kaplan, S. McCandlish, T. Henighan, T. B. Brown, B. Chess, R. Child, S. Gray, A. Radford, J. Wu, and D. Amodei, “Scaling laws for neural language models,” arXiv preprint arXiv:2001.08361, 2020.

[3] I. M. Alabdulmohsin, B. Neyshabur, and X. Zhai, “Revisiting neural scaling laws in language and vision,” Advances in Neural Information Processing Systems, vol. 35, pp. 22 300–22 312, 2022.

[4] Z. Xie, Z. Zhang, Y. Cao, Y. Lin, Y. Wei, Q. Dai, and H. Hu, “On data scaling in masked image modeling,” in Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, 2023, pp. 10 365–10 374.

[5] A. El-Nouby, M. Klein, S. Zhai, M. A. Bautista, A. Toshev, V. Shankar, J. M. Susskind, and A. Joulin, “Scalable pre-training of large autoregressive image models,” arXiv preprint arXiv:2401.08541, 2024.

[6] J. Pan, B. Jian, P. Hager, Y. Zhang, C. Liu, F. Jungmann, H. B. Li, C. You, J. Wu, J. Zhu et al., “Beyond benchmarks: Dynamic, automatic and systematic red-teaming agents for trustworthy medical language models,” arXiv preprint arXiv:2508.00923, 2025.

[7] J. Pan, C. Liu, J. Wu, F. Liu, J. Zhu, H. B. Li, C. Chen, C. Ouyang, and D. Rueckert, “Medvlm-r1: Incentivizing medical reasoning capability of vision-language models (vlms) via reinforcement learning,” arXiv preprint arXiv:2502.19634, 2025.

[8] D. Fan, S. Tong, J. Zhu, K. Sinha, Z. Liu, X. Chen, M. Rabbat, N. Ballas, Y. LeCun, A. Bar et al., “Scaling language-free visual representation learning,” arXiv preprint arXiv:2504.01017, 2025.

[9] M. Oquab, T. Darcet, T. Moutakanni, H. Vo, M. Szafraniec, V. Khalidov, P. Fernandez, D. Haziza, F. Massa, A. El-Nouby et al., “Dinov2: Learning robust visual features without supervision,” arXiv preprint arXiv:2304.07193, 2023.

[10] M. Caron, H. Touvron, I. Misra, H. Jégou, J. Mairal, P. Bojanowski, and A. Joulin, “Emerging properties in self-supervised vision transformers,” in Proceedings of ICCV, 2021, pp. 9650–9660.

[11] O. Siméoni, H. V. Vo, M. Seitzer, F. Baldassarre, M. Oquab, C. Jose, V. Khalidov, M. Szafraniec, S. Yi, M. Ramamonjisoa et al., “Dinov3,” arXiv preprint arXiv:2508.10104, 2025.

[12] S. Yang, H. Wang, Z. Xing, S. Chen, and L. Zhu, “Segdino: An efficient design for medical and natural image segmentation with dino-v3,” arXiv preprint arXiv:2509.00833, 2025.

[13] Y. Li, Y. Wu, Y. Lai, M. Hu, and X. Yang, “Meddinov3: How to adapt vision foundation models for medical image segmentation?” arXiv preprint arXiv:2509.02379, 2025.

[14] X. Wang, Y. Peng, L. Lu, Z. Lu, M. Bagheri, and R. M. Summers, “Chestx-ray8: Hospital-scale chest x-ray database and benchmarks on weakly-supervised classification and localization of common thorax diseases,” in Proceedings of CVPR, 2017, pp. 3462–3471.

[15] M. Y. Lu, B. Chen, D. F. Williamson, R. J. Chen, I. Liang, T. Ding, G. Jaume, I. Odintsov, L. P. Le, G. Gerber et al., “A visual-language foundation model for computational pathology,” Nature medicine, vol. 30, no. 3, pp. 863–874, 2024.

[16] I. E. Hamamci, S. Er, C. Wang, F. Almas, A. G. Simsek, S. N. Esirgun, I. Doga, O. F. Durugol, W. Dai, M. Xu et al., “Developing generalist foundation models from a multimodal dataset for 3d computed tomography,” arXiv preprint arXiv:2403.17834, 2024.

[17] S. Zhang, Y. Xu, N. Usuyama, J. Bagga, R. Tinn, S. Preston, R. Rao, M. Wei, N. Valluri, C. Wong et al., “Largescale domain-specific pretraining for biomedical vision-language processing,” arXiv preprint arXiv:2303.00915, 2023.

[18] A. Stein, C. Wu, C. Carr, G. Shih, J. Dulkowski, kalpathy, L. Chen, L. Prevedello, M. Kohli, M. McDonald, Peter, P. Culliton, S. Halabi, and T. Xia, “RSNA pneumonia detection challenge,” https://www.kaggle.com/competitions/rsna-pneumonia-detection-challenge, 2018. [Online]. Available: https: //www.kaggle.com/competitions/rsna-pneumonia-detection-challenge

[19] F. Wang, Y. Zhou, S. Wang, V. Vardhanabhuti, and L. Yu, “Multi-granularity cross-modal alignment for generalized medical visual representation learning,” Advances in neural information processing systems, vol. 35, pp. 33 536–33 549, 2022.

[20] B. E. Bejnordi, M. Veta, P. J. Van Diest, B. Van Ginneken, N. Karssemeijer, G. Litjens, J. A. Van Der Laak, M. Hermsen, Q. F. Manson, M. Balkenhol et al., “Diagnostic assessment of deep learning algorithms for detection of lymph node metastases in women with breast cancer,” Jama, vol. 318, no. 22, pp. 2199–2210, 2017.

[21] P. Bandi, O. Geessink, Q. Manson, M. Van Dijk, M. Balkenhol, M. Hermsen, B. E. Bejnordi, B. Lee, K. Paeng, A. Zhong et al., “From detection of individual metastases to classification of lymph node status at the patient level: the camelyon17 challenge,” IEEE transactions on medical imaging, vol. 38, no. 2, pp. 550–560, 2018.

[22] L. Cai, S. Huang, Y. Zhang, J. Lu, and Y. Zhang, “Attrimil: Revisiting attention-based multiple instance learning for whole-slide pathological image classification from a perspective of instance attributes,” Medical Image Analysis, p. 103631, 2025.

[23] F. Xu, C. Zhu, W. Tang, Y. Wang, Y. Zhang, J. Li, H. Jiang, Z. Shi, J. Liu, and M. Jin, “Predicting axillary lymph node metastasis in early breast cancer using deep learning on primary tumor biopsy slides,” Frontiers in oncology, vol. 11, p. 759007, 2021.

[24] M. Y. Lu, D. F. Williamson, T. Y. Chen, R. J. Chen, M. Barbieri, and F. Mahmood, “Data-efficient and weakly supervised computational pathology on whole-slide images,” Nature biomedical engineering, vol. 5, no. 6, pp. 555–570, 2021.

[25] P. H. Smedsrud, V. Thambawita, S. A. Hicks, H. Gjestang, O. O. Nedrejord, E. Næss, H. Borgli, D. Jha, T. J. D. Berstad, S. L. Eskeland, M. Lux, H. Espeland, A. Petlund, D. T. D. Nguyen, E. Garcia-Ceja, D. Johansen, P. T. Schmidt, E. Toth, H. L. Hammer, T. de Lange, M. A. Riegler, and P. Halvorsen, “Kvasir-Capsule, a video capsule endoscopy dataset,” Scientific Data, vol. 8, no. 1, p. 142, 2021.

[26] Z. Wang, B. Lu, Y. Long, F. Zhong, T. H. Cheung, Q. Dou, and Y. Liu, “Autolaparo: A new dataset of integrated multi-tasks for image-guided surgical automation in laparoscopic hysterectomy,” CoRR, vol. abs/2208.02049, 2022.

[27] S. Leclerc, E. Smistad, J. Pedrosa, A. Østvik, F. Cervenansky, F. Espinosa, T. Espeland, E. A. R. Berg, P.-M. Jodoin, T. Grenier et al., “Deep learning for segmentation using an open large-scale dataset in 2d echocardiography,” IEEE transactions on medical imaging, vol. 38, no. 9, pp. 2198–2210, 2019.

[28] M. Allan, S. Kondo, S. Bodenstedt, S. Leger, R. Kadkhodamohammadi, I. Luengo, F. Fuentes-Hurtado, E. Flouty, A. K. Mohammed, M. Pedersen, A. Kori, A. Varghese, G. Krishnamurthi, D. Rauber, R. Mendel, C. Palm, S. Bano, G. Saibro, C. Shih, H. Chiang, J. Zhuang, J. Yang, V. Iglovikov, A. Dobrenkii, M. Reddiboina, A. Reddy, X. Liu, C. Gao, M. Unberath, M. Azizian, D. Stoyanov, L. Maier-Hein, and S. Speidel, “2018 robotic scene segmentation challenge,” CoRR, vol. abs/2001.11190, 2020. [Online]. Available: https://arxiv.org/abs/2001.11190

[29] C. González, L. Bravo-Sánchez, and P. Arbelaez, “Isinet: an instance-based approach for surgical instrument segmentation,” in Medical Image Computing and Computer Assisted Intervention–MICCAI 2020: 23rd International Conference, Lima, Peru, October 4–8, 2020, Proceedings, Part III 23. Springer, 2020, pp. 595–605.

[30] S. Ali, B. Braden, D. Lamarque, S. Realdon, A. Bailey, R. Cannizzaro, N. Ghatwary, J. Rittscher, C. Daul, and J. East, “Endoscopy disease detection and segmentation (edd2020),” 2020. [Online]. Available: https://ieee-dataport.org/competitions/endoscopy-disease-detection-and-segmentation-edd2020

[31] G. Müller-Franzes, F. Khader, R. Siepmann, T. Han, J. N. Kather, S. Nebelung, and D. Truhn, “Medical slice transformer for improved diagnosis and explainability on 3d medical images with dinov2,” Scientific Reports, vol. 15, no. 1, p. 23979, 2025.

[32] M. Antonelli, A. Reinke, S. Bakas, K. Farahani, A. Kopp-Schneider, B. A. Landman, G. Litjens, B. Menze, O. Ronneberger, R. M. Summers et al., “The medical segmentation decathlon,” Nature communications, vol. 13, no. 1, p. 4128, 2022.

[33] L. Wu, J. Zhuang, and H. Chen, “Voco: A simple-yet-effective volume contrastive learning framework for 3d medical image analysis,” in Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, 2024, pp. 22 873–22 882.

[34] CREMI, “Miccai challenge on circuit reconstruction from electron microscopy images,” https://cremi.org/, 2016.

[35] N. Kasthuri, K. J. Hayworth, D. R. Berger, R. L. Schalek, J. A. Conchello, S. Knowles-Barley, D. Lee, A. Vázquez-Reina, V. Kaynig, T. R. Jones et al., “Saturated reconstruction of a volume of neocortex,” Cell, vol. 162, no. 3, pp. 648–661, 2015.

[36] K. T. Gatidis S, “A whole-body fdg-pet/ct dataset with manually annotated tumor lesions (fdg-pet-ct-lesions),” The Cancer Imaging Archive, vol. 226, 2022.

[37] V. Oreiller, V. Andrearczyk, M. Jreige, S. Boughdad, H. Elhalawani, J. Castelli, M. Vallieres, S. Zhu, J. Xie, Y. Peng et al., “Head and neck tumor segmentation in pet/ct: the hecktor challenge,” Medical image analysis, vol. 77, p. 102336, 2022.

[38] O. Bernard, A. Lalande, C. Zotti, F. Cervenansky, X. Yang, P.-A. Heng, I. Cetin, K. Lekadir, O. Camara, M. A. Gonzalez Ballester, G. Sanroma, S. Napel, S. Petersen, G. Tziritas, E. Grinias, M. Khened, V. A. Kollerathu, G. Krishnamurthi, M.-M. Rohé, X. Pennec, M. Sermesant, F. Isensee, P. Jäger, K. H. Maier-Hein, P. M. Full, I. Wolf, S. Engelhardt, C. F. Baumgartner, L. M. Koch, J. M. Wolterink, I. Išgum, Y. Jang, Y. Hong, J. Patravali, S. Jain, O. Humbert, and P.-M. Jodoin, “Deep learning techniques for automatic mri cardiac multi-structures segmentation and diagnosis: Is the problem solved?” IEEE Transactions on Medical Imaging, vol. 37, no. 11, pp. 2514–2525, 2018.

[39] M. Ilse, J. Tomczak, and M. Welling, “Attention-based deep multiple instance learning,” in International conference on machine learning. PMLR, 2018, pp. 2127–2136.

[40] J. Funke, F. Tschopp, W. Grisaitis, A. Sheridan, C. Singh, S. Saalfeld, and S. C. Turaga, “Large scale image segmentation with structured loss based deep learning for connectome reconstruction,” IEEE transactions on pattern analysis and machine intelligence, vol. 41, no. 7, pp. 1669–1680, 2018.

[41] X. Song, X. Xu, and P. Yan, “Dino-reg: General purpose image encoder for training-free multi-modal deformable medical image registration,” in International Conference on Medical Image Computing and Computer-Assisted Intervention. Springer, 2024, pp. 608–617.

[42] J. Nunez-Iglesias, R. Kennedy, T. Parag, J. Shi, and D. B. Chklovskii, “Machine learning of hierarchical clustering to segment 2d and 3d images,” PloS one, vol. 8, no. 8, p. e71715, 2013.

[43] I. Arganda-Carreras, S. C. Turaga, D. R. Berger, D. Cireşan, A. Giusti, L. M. Gambardella, J. Schmidhuber, D. Laptev, S. Dwivedi, J. M. Buhmann et al., “Crowdsourcing the creation of image segmentation algorithms for connectomics,” Frontiers in neuroanatomy, vol. 9, p. 152591, 2015.

[44] R. J. Chen, T. Ding, M. Y. Lu, D. F. Williamson, G. Jaume, A. H. Song, B. Chen, A. Zhang, D. Shao, M. Shaban et al., “Towards a general-purpose foundation model for computational pathology,” Nature medicine, vol. 30, no. 3, pp. 850–862, 2024.

[45] K. He, X. Zhang, S. Ren, and J. Sun, “Deep residual learning for image recognition,” in Proceedings of the IEEE conference on computer vision and pattern recognition, 2016, pp. 770–778.

[46] J. Joseph, S. N. George, and K. Raja, “Vapcaps: A novel variance-based attention network with imbalance aware loss for better pathology detection in video capsule endoscopy,” Neurocomputing, vol. 655, p. 131325, 2025. [Online]. Available: https://www.sciencedirect.com/science/article/pii/S0925231225019976

[47] Y. Li, G. Zhao, C. Li, W. Shi, Z. Jiang, Z. Zhang, and G. Feng, “Stsanet: Spatial temporal-self-aggregation network for surgical phase recognition,” Information Fusion, vol. 126, p. 103646, 2026. [Online]. Available: https://www.sciencedirect.com/science/article/pii/S1566253525007183

[48] A. Srivastava, S. Chanda, D. Jha, U. Pal, and S. Ali, “Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation,” in 2022 26th International Conference on Pattern Recognition (ICPR), 2022, pp. 4321–4327.

[49] A. Trockman and J. Kolter, “Patches are all you need?” Transactions on Machine Learning Research, 2022.

[50] S. d’Ascoli, H. Touvron, M. Leavitt, A. Morcos, G. Biroli, and L. Sagun, “Convit: Improving vision transformers with soft convolutional inductive biases,” Journal of Statistical Mechanics: Theory and Experiment, vol. 2022, no. 11, p. 114005, 2022.

[51] X. Dong, J. Bao, D. Chen, W. Zhang, N. Yu, L. Yuan, D. Chen, and B. Guo, “Cswin transformer: A general vision transformer backbone with cross-shaped windows,” in 2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). IEEE Computer Society, 2022, pp. 12 114–12 124.

[52] A. Srivastava, N. Tomar, and D. Jha, “Video capsule endoscopy classification using focal modulation guided convolutional neural network,” in Proceedings. IEEE International Symposium on Computer-Based Medical Systems, vol. 2022, 2022, pp. 323–328.

[53] A. Vats, M. Pedersen, A. Mohammed, and Ø. Hovde., “Learning more for free - a multi task learning approach for improved pathology classification in capsule endoscopy,” in Medical Image Computing and Computer Assisted Intervention – MICCAI 2021, M. de Bruijne, P. Cattin, S. Cotin, N. Padoy, S. Speidel, Y. Zheng, and C. Essert, Eds. Cham: Springer International Publishing, 2021, pp. 3–13.

[54] O. Yet, T. Rassem, M. Rahman, and M. Rahman, “Improved attentive pairwise interaction (api-net) for finegrained image classification,” in 2021 Emerging Technology in Computing, Communication and Electronics (ETCCE), 2021, pp. 1–6.

[55] Y. Jin, Q. Dou, H. Chen, L. Yu, J. Qin, C.-W. Fu, and P.-A. Heng, “Sv-rcnet: Workflow recognition from surgical videos using recurrent convolutional network,” IEEE Transactions on Medical Imaging, vol. 37, no. 5, pp. 1114–1126, 2018.

[56] Y. Jin, Y. Long, C. Chen, Z. Zhao, Q. Dou, and P.-A. Heng, “Temporal memory relation network for workflow recognition from surgical video,” IEEE Transactions on Medical Imaging, vol. 40, no. 7, pp. 1911–1923, 2021.

[57] X. Gao, Y. Jin, Y. Long, Q. Dou, and P. Heng, “Trans-svnet: Accurate phase recognition from surgical videos via hybrid embedding aggregation transformer,” in Medical Image Computing and Computer Assisted Intervention - MICCAI 2021 - 24th International Conference, Strasbourg, France, September 27 - October 1, 2021, Proceedings, Part IV, ser. Lecture Notes in Computer Science, M. de Bruijne, P. C. Cattin, S. Cotin, N. Padoy, S. Speidel, Y. Zheng, and C. Essert, Eds., vol. 12904. Springer, 2021, pp. 593–603.

[58] Y. Liu, M. Boels, L. Garcia-Peraza-Herrera, T. Vercauteren, P. Dasgupta, A. Granados, and S. Ourselin, “Lovit: Long video transformer for surgical phase recognition,” Medical Image Analysis, vol. 99, p. 103366, 2025.

[59] J. Yu, A. Wang, W. Dong, M. Xu, M. Islam, J. Wang, L. Bai, and H. Ren, “Sam 2 in robotic surgery: An empirical evaluation for robustness and generalization in surgical video segmentation,” 2024. [Online]. Available: https://arxiv.org/abs/2408.04593

[60] O. Ronneberger, P. Fischer, and T. Brox, “U-net: Convolutional networks for biomedical image segmentation,” in Medical Image Computing and Computer-Assisted Intervention–MICCAI 2015: 18th International Conference, Munich, Germany, October 5-9, 2015, Proceedings, Part III 18. Springer, 2015, pp. 234–241.

[61] A. A. Shvets, A. Rakhlin, A. A. Kalinin, and V. I. Iglovikov, “Automatic instrument segmentation in robotassisted surgery using deep learning,” in 2018 17th IEEE International Conference on Machine Learning and Applications (ICMLA), 2018, pp. 624–628.

[62] Y. Jin, K. Cheng, Q. Dou, and P.-A. Heng, “Incorporating temporal prior from motion flow for instrument segmentation in minimally invasive surgery video,” in Medical Image Computing and Computer Assisted Intervention– MICCAI 2019: 22nd International Conference, Shenzhen, China, October 13–17, 2019, Proceedings, Part V 22. Springer, 2019, pp. 440–448.

[63] A. Wang, M. Islam, M. Xu, and H. Ren, “Rethinking surgical instrument segmentation: A background image can be all you need,” in International Conference on Medical Image Computing and Computer-Assisted Intervention. Springer, 2022, pp. 355–364.

[64] M. Islam, V. Vibashan, C. M. Lim, and H. Ren, “St-mtl: Spatio-temporal multitask learning model to predict scanpath while tracking instruments in robotic surgery,” Medical Image Analysis, vol. 67, p. 101837, 2021.

[65] M. Islam, V. Vibashan, and H. Ren, “Ap-mtl: Attention pruned multi-task learning model for real-time instrument detection and segmentation in robot-assisted surgery,” in 2020 IEEE international conference on robotics and automation (ICRA). IEEE, 2020, pp. 8433–8439.

[66] L. Seenivasan, S. Mitheran, M. Islam, and H. Ren, “Global-reasoned multi-task learning model for surgical scene understanding,” IEEE Robotics and Automation Letters, vol. 7, no. 2, pp. 3858–3865, 2022.

[67] Z. Zhao, Y. Jin, and P.-A. Heng, “Trasetr: track-to-segment transformer with contrastive query for instance-level instrument segmentation in robotic surgery,” in 2022 International Conference on Robotics and Automation (ICRA). IEEE, 2022, pp. 11 186–11 193.

[68] B. Baby, D. Thapar, M. Chasmai, T. Banerjee, K. Dargan, A. Suri, S. Banerjee, and C. Arora, “From forks to forceps: A new framework for instance segmentation of surgical instruments,” in Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision, 2023, pp. 6191–6201.

[69] A. Kirillov, E. Mintun, N. Ravi, H. Mao, C. Rolland, L. Gustafson, T. Xiao, S. Whitehead, A. C. Berg, W.-Y. Lo et al., “Segment anything,” arXiv preprint arXiv:2304.02643, 2023.

[70] N. Ravi, V. Gabeur, Y.-T. Hu, R. Hu, C. Ryali, T. Ma, H. Khedr, R. Rädle, C. Rolland, L. Gustafson et al., “Sam 2: Segment anything in images and videos,” arXiv preprint arXiv:2408.00714, 2024.

[71] J. Chen, Y. Lu, Q. Yu, X. Luo, E. Adeli, Y. Wang, L. Lu, A. L. Yuille, and Y. Zhou, “Transunet: Transformers make strong encoders for medical image segmentation,” arXiv preprint arXiv:2102.04306, 2021.

[72] C.-H. Huang, H.-Y. Wu, and Y.-L. Lin, “Hardnet-mseg: A simple encoder-decoder polyp segmentation neural network that achieves over 0.9 mean dice and 86 fps,” 2021. [Online]. Available: https://arxiv.org/abs/2101.07172

[73] A. Hatamizadeh, V. Nath, Y. Tang, D. Yang, H. R. Roth, and D. Xu, “Swin unetr: Swin transformers for semantic segmentation of brain tumors in mri images,” in International MICCAI brainlesion workshop. Springer, 2022, pp. 272–284.

[74] Q. Chang, D. Ahmad, J. Toth, R. Bascom, and W. E. Higgins, “Esfpnet: efficient deep learning architecture for real-time lesion segmentation in autofluorescence bronchoscopic video,” in Medical Imaging 2023: Biomedical Applications in Molecular, Structural, and Functional Imaging, B. S. Gimi and A. Krol, Eds. SPIE, Apr. 2023. [Online]. Available: http://dx.doi.org/10.1117/12.2647897

[75] F. Tang, Q. Huang, J. Wang, X. Hou, J. Su, and J. Liu, “Duat: Dual-aggregation transformer network for medical image segmentation,” 2022. [Online]. Available: https://arxiv.org/abs/2212.11677

[76] E. Sanderson and B. J. Matuszewski, “Fcn-transformer feature fusion for polyp segmentation,” in Annual Conference on Medical Image Understanding and Analysis. Springer, 2022, pp. 892–907.

[77] A. Srivastava, D. Jha, S. Chanda, U. Pal, H. D. Johansen, D. Johansen, M. A. Riegler, S. Ali, and P. Halvorsen, “Msrf-net: A multi-scale residual fusion network for biomedical image segmentation,” 2022. [Online]. Available: https://arxiv.org/abs/2105.07451

[78] A. Srivastava, S. Chanda, D. Jha, U. Pal, and S. Ali, “Gmsrf-net: An improved generalizability with global multi-scale residual fusion network for polyp segmentation,” 2021. [Online]. Available: https://arxiv.org/abs/2111.10614

[79] D. Bo, W. Wenhai, F. Deng-Ping, L. Jinpeng, F. Huazhu, and S. Ling, “Polyp-pvt: Polyp segmentation with pyramidvision transformers,” CAAI AIR, 2023.

[80] G.-P. Ji, G. Xiao, Y.-C. Chou, D.-P. Fan, K. Zhao, G. Chen, and L. Van Gool, “Video polyp segmentation: A deep learning perspective,” Machine Intelligence Research, vol. 19, no. 6, p. 531–549, Nov. 2022. [Online]. Available: http://dx.doi.org/10.1007/s11633-022-1371-y

[81] Y. Pang, Y. Long, Z. Chen, Y. Hu, H. Chen, and Q. Wang, “Endoscopic adaptive transformer for enhanced polyp segmentation in endoscopic imaging,” IEEE Transactions on Medical Imaging, pp. 1–1, 2025.

[82] I. E. Hamamci, S. Er, C. Wang, F. Almas, A. G. Simsek, S. N. Esirgun, I. Doga, O. F. Durugol, W. Dai, M. Xu et al., “Developing generalist foundation models from a multimodal dataset for 3d computed tomography,” arXiv preprint arXiv:2403.17834, 2024.

[83] R. L. Draelos, D. Dov, M. A. Mazurowski, J. Y. Lo, R. Henao, G. D. Rubin, and L. Carin, “Machine-learning-based multiple abnormality prediction with large-scale chest computed tomography volumes,” Medical Image Analysis, vol. 67, p. 101857, 2021.

[84] F. Isensee, P. F. Jaeger, S. A. Kohl, J. Petersen, and K. H. Maier-Hein, “nnu-net: a self-configuring method for deep learning-based biomedical image segmentation,” Nature methods, vol. 18, no. 2, pp. 203–211, 2021.

[85] Ö. Çiçek, A. Abdulkadir, S. S. Lienkamp, T. Brox, and O. Ronneberger, “3d u-net: learning dense volumetric segmentation from sparse annotation,” in International conference on medical image computing and computerassisted intervention. Springer, 2016, pp. 424–432.

[86] F. Milletari, N. Navab, and S.-A. Ahmadi, “V-net: Fully convolutional neural networks for volumetric medical image segmentation,” in 2016 fourth international conference on 3D vision (3DV). IEEE, 2016, pp. 565–571.

[87] A. Hatamizadeh, Y. Tang, V. Nath, D. Yang, A. Myronenko, B. Landman, H. R. Roth, and D. Xu, “Unetr: transformers for 3d medical image segmentation,” in Proceedings of the IEEE/CVF winter conference on applications of computer vision, 2022, pp. 1748–1758.

[88] K. He, X. Chen, S. Xie, Y. Li, P. Dollár, and R. Girshick, “Masked autoencoders are scalable vision learners,” in Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, 2022, pp. 16 000–16 009.

[89] T. Chen, S. Kornblith, M. Norouzi, and G. Hinton, “A simple framework for contrastive learning of visual representations,” in International conference on machine learning. PMLR, 2020, pp. 1597–1607.

[90] X. Chen, S. Xie, and K. He, “An empirical study of training self-supervised vision transformers,” arXiv preprint arXiv:2104.02057, 2021.

[91] M. Caron, I. Misra, J. Mairal, P. Goyal, P. Bojanowski, and A. Joulin, “Unsupervised learning of visual features by contrasting cluster assignments,” vol. 33, pp. 9912–9924, 2020.

[92] J.-B. Grill, F. Strub, F. Altché, C. Tallec, P. Richemond, E. Buchatskaya, C. Doersch, B. A. Pires, Z. Guo, M. G. Azar et al., “Bootstrap your own latent: A new approach to self-supervised learning,” vol. 33, pp. 21 271–21 284, 2020.

[93] Ö. Çiçek, A. Abdulkadir, S. S. Lienkamp, T. Brox, and O. Ronneberger, “3d u-net: learning dense volumetric segmentation from sparse annotation,” in Medical Image Computing and Computer-Assisted Intervention–MICCAI 2016: 19th International Conference, Athens, Greece, October 17-21, 2016, Proceedings, Part II 19. Springer, 2016, pp. 424–432.

[94] F. Milletari, N. Navab, and S.-A. Ahmadi, “V-net: Fully convolutional neural networks for volumetric medical image segmentation,” in 2016 fourth international conference on 3D vision (3DV). Ieee, 2016, pp. 565–571.

[95] K. Lee, J. Zung, P. Li, V. Jain, and H. S. Seung, “Superhuman accuracy on the snemi3d connectomics challenge,” arXiv preprint arXiv:1706.00120, 2017.

[96] W. Huang, S. Deng, C. Chen, X. Fu, and Z. Xiong, “Learning to model pixel-embedded affinity for homogeneous instance segmentation,” in Proceedings of the AAAI Conference on Artificial Intelligence, vol. 36, no. 1, 2022, pp. 1007–1015.

[97] R. Sun, N. Luo, Y. Pan, H. Mai, T. Zhang, Z. Xiong, and F. Wu, “Appearance prompt vision transformer for connectome reconstruction.” in IJCAI, 2023, pp. 1423–1431.

[98] A. Sheridan, T. M. Nguyen, D. Deb, W.-C. A. Lee, S. Saalfeld, S. C. Turaga, U. Manor, and J. Funke, “Local shape descriptors for neuron segmentation,” Nature methods, vol. 20, no. 2, pp. 295–303, 2023.

[99] X. Liu, M. Cai, Y. Chen, Y. Zhang, T. Shi, R. Zhang, X. Chen, and Z. Xiong, “Cross-dimension affinity distillation for 3d em neuron segmentation,” in 2024 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). IEEE Computer Society, 2024, pp. 11 104–11 113.

[100] Y. Tang, D. Yang, W. Li, H. R. Roth, B. A. Landman, D. Xu, V. Nath, and A. Hatamizadeh, “Self-supervised pre-training of swin transformers for 3d medical image analysis,” Proceedings of CVPR, pp. 20 698–20 708, 2021.

[101] T. Liu, Q. Bai, D. A. Torigian, Y. Tong, and J. K. Udupa, “Vsmtrans: A hybrid paradigm integrating self-attention and convolution for 3d medical image segmentation,” Medical image analysis, vol. 98, p. 103295, 2024.

[102] A. M. Shaker, M. Maaz, H. Rasheed, S. Khan, M.-H. Yang, and F. S. Khan, “Unetr++: delving into efficient and accurate 3d medical image segmentation,” IEEE Transactions on Medical Imaging, 2024.

[103] C. Li et al., “U-kan makes strong backbone for medical image segmentation and generation,” in Proceedings of the AAAI Conference on Artificial Intelligence, vol. 39, no. 5, 2025, pp. 4652–4660.

[104] Z. Xing, L. Yu, L. Wan, T. Han, and L. Zhu, “Nestedformer: Nested modality-aware transformer for brain tumor segmentation,” in International conference on medical image computing and computer-assisted intervention. Springer, 2022, pp. 140–150.

[105] Z. Wang and Y. Hong, “A2fseg: Adaptive multi-modal fusion network for medical image segmentation,” in International Conference on Medical Image Computing and Computer-Assisted Intervention. Springer, 2023, pp. 673–681.

[106] J. Shi et al., “H-denseformer: An efficient hybrid densely connected transformer for multimodal tumor segmentation,” in International Conference on Medical Image Computing and Computer-Assisted Intervention. Springer, 2023, pp. 692–702.

[107] G. Balakrishnan, A. Zhao, M. R. Sabuncu, J. Guttag, and A. V. Dalca, “Voxelmorph: a learning framework for deformable medical image registration,” IEEE transactions on medical imaging, vol. 38, no. 8, pp. 1788–1800, 2019.

[108] H. Siebert, L. Hansen, and M. P. Heinrich, “Fast 3d registration with accurate optimisation and little learning for learn2reg 2021,” in International Conference on Medical Image Computing and Computer-Assisted Intervention. Springer, 2021, pp. 174–179.

[109] N. Dey, B. Billot, H. E. Wong, C. J. Wang, M. Ren, P. E. Grant, A. V. Dalca, and P. Golland, “Learning general-purpose biomedical volume representations using randomized synthesis,” 2024. [Online]. Available: https://arxiv.org/abs/2411.02372

[110] D. Bolya, P.-Y. Huang, P. Sun, J. H. Cho, A. Madotto, C. Wei, T. Ma, J. Zhi, J. Rajasegaran, H. Rasheed et al., “Perception encoder: The best visual embeddings are not at the output of the network,” arXiv preprint arXiv:2504.13181, 2025.

[111] E. J. Hu, Y. Shen, P. Wallis, Z. Allen-Zhu, Y. Li, S. Wang, L. Wang, W. Chen et al., “Lora: Low-rank adaptation of large language models.” ICLR, vol. 1, no. 2, p. 3, 2022.

[112] J. Ma, Y. He, F. Li, L. Han, C. You, and B. Wang, “Segment anything in medical images,” Nature Communications, vol. 15, no. 1, p. 654, 2024.

[113] Y. Zhang, P. Hager, C. Liu, S. Shit, C. Chen, D. Rueckert, and J. Pan, “Towards cardiac mri foundation models: Comprehensive visual-tabular representations for whole-heart assessment and beyond,” arXiv preprint arXiv:2504.13037, 2025.

[114] Y. Zhang, C. Chen, S. Shit, S. Starck, D. Rueckert, and J. Pan, “Whole heart 3d+ t representation learning through sparse 2d cardiac mr images,” in International Conference on Medical Image Computing and Computer-Assisted Intervention. Springer, 2024, pp. 359–369.

[115] B. Jian, J. Pan, Y. Li, F. Bongratz, R. Li, D. Rueckert, B. Wiestler, and C. Wachinger, “Timeflow: Longitudinal brain image registration and aging progression analysis,” arXiv preprint arXiv:2501.08667, 2025.

[116] N. Bubeck, S. Shit, C. Chen, C. Zhao, P. Guo, D. Yang, G. Zitzlsberger, D. Xu, B. Kainz, D. Rueckert et al., “Latent interpolation learning using diffusion models for cardiac volume reconstruction,” arXiv preprint arXiv:2508.13826, 2025.

## Acknowledgement

The LaTeX template is built upon Meta’s original template.