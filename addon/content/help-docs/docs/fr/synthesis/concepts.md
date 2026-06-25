# Base de connaissances conceptuelle

La base de connaissances conceptuelle (Concept KB) est une couche de connaissances optionnelle dans le système Synthesis qui fournit une gestion structurée des concepts fondamentaux référencés dans la littérature. Les concepts peuvent être superposés au graphe de sujets et au lecteur, enrichissant le contexte pour la synthèse de sujets.

## Qu'est-ce qu'un concept ?

Dans le système Synthesis, un **concept** est un terme ou une entité dotée d'un sens indépendant au sein d'un domaine de recherche. Contrairement à la classification à plat des balises, les concepts peuvent avoir une structure multi-couche, incluant des sens, des alias et des relations.

### Structure en quatre couches des concepts

```
Concept                 — ex. « Transformer »
  └── Sens              — ex. « Transformer (architecture d'apprentissage automatique) »
       ├── Alias        — ex. « Modèle Transformer », « Réseau Transformer »
       └── Relation     — broader_than « Mécanisme d'attention »
```

### Types de concepts

| Type | Description | Exemples |
|------|-------------|----------|
| `method` | Méthodes de recherche | Deep learning, reinforcement learning |
| `model` | Modèles ou architectures | Transformer, ResNet |
| `dataset` | Jeux de données | ImageNet, COCO |
| `metric` | Métriques d'évaluation | BLEU, F1-score |
| `field` | Domaines de recherche | Vision par ordinateur, traitement du langage naturel |
| `task` | Tâches | Classification d'images, traduction automatique |
| `tool` | Outils | PyTorch, TensorFlow |

## Fonctionnalités de la surface Concepts

### Liste des concepts

Dans la page Synthesis Workbench → Concepts, vous pouvez parcourir tous les concepts indexés :

- **Filtrer** : Par type (method / model / dataset, etc.), état ou sujets associés
- **Rechercher** : Rechercher des concepts par nom
- **Changement d'affichage** : Densité compacte / confortable

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/concepts.webp" alt="Synthesis Concepts Page" title="Synthesis Concepts Page" loading="lazy" /><figcaption>Synthesis Concepts Page</figcaption></figure>

### Détails d'un concept

Après avoir sélectionné un concept, vous pouvez voir et modifier :

| Information | Description |
|-------------|-------------|
| **Identité** | ID du concept, nom, type |
| **État** | active / deprecated / pending |
| **Définition** | Définition descriptive du concept |
| **Sens** | Significations spécifiques du concept dans différents contextes |
| **Alias** | Noms alternatifs pour le même concept |
| **Relations** | Associations avec d'autres concepts (broader / narrower / related) |
| **Sujets associés** | Sujets qui référencent ce concept |

### Gestion des sens

Le même concept peut avoir des significations différentes selon les disciplines. Le mécanisme de sens permet :

- D'ajouter plusieurs sens à un concept, chacun avec sa propre définition
- D'annoter le contexte d'utilisation ou le domaine de chaque sens
- D'associer des sens spécifiques à des articles ou des sujets

### Gestion des alias

- Enregistrer les différentes conventions de dénomination pour le même concept (ex. : nom complet, abréviation, termes alternatifs)
- Les alias sont utilisés pour la correspondance de citations et l'identification de concepts

### Fonctionnalités de superposition

Les informations conceptuelles peuvent être superposées à d'autres surfaces :

- **Superposition au graphe de sujets** : Afficher les concepts liés à un sujet dans le graphe de sujets
- **Superposition au lecteur** : Afficher les cartes de concepts dans la page de détail du sujet

## Révision

Les propositions de modification de la base de connaissances conceptuelle (nouveaux concepts, nouveaux sens, nouvelles relations) apparaissent dans l'onglet de révision Concepts du [Centre de révision](#doc/synthesis%2Freview). Vous pouvez examiner et décider d'accepter ces propositions.

## Relation avec les balises

Les concepts et les balises sont deux approches complémentaires de l'organisation des connaissances :

| Dimension | Balises | Concepts |
|-----------|---------|----------|
| Structure | Plat, facette:valeur | Multi-couche (sens + alias + relations) |
| Objectif | Classification et filtrage de la littérature | Gestion des connaissances et analyse d'associations |
| Source | Vocabulaire contrôlé + inférence IA | Auto-extraction de la littérature + gestion par l'utilisateur |
| Portée | Couvre toute la littérature | Couverture profonde des termes fondamentaux sélectionnés |

## Prochaines étapes

- [Centre de révision](#doc/synthesis%2Freview) — Réviser les suggestions de concepts
- [Gestion des balises](#doc/synthesis%2Ftags) — Gérer le vocabulaire contrôlé de balises
- [Synthèse de sujets](#doc/synthesis%2Ftopic-synthesis) — Exploiter les connaissances conceptuelles lors de la création de synthèses de sujets
