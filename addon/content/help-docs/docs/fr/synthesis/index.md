# Vue d'ensemble du Synthesis Workbench

Le Synthesis Workbench est une plateforme d'analyse approfondie de la littérature fournie par Zotero Agents. Il transforme votre bibliothèque en un réseau de connaissances structuré, prenant en charge la synthèse de sujets, l'analyse de citations, la gestion de concepts et la gestion de vocabulaires contrôlés.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/home.webp" alt="Synthesis Workbench Home" title="Synthesis Workbench Home" loading="lazy" /><figcaption>Synthesis Workbench Home</figcaption></figure>

## Comment l'ouvrir

1. Ouvrez le Dashboard / Espace de travail Synthesis via le **bouton de la barre d'outils** ou le **menu**
2. Basculez vers la vue **Synthesis** dans l'onglet Espace de travail

## Toutes les surfaces (pages)

Le Synthesis Workbench se compose de 8 surfaces, chacune offrant une vue fonctionnelle différente :

| Surface | Fonction | Docs |
|---------|----------|------|
| **Home** | Tableau de bord de la bibliothèque : aperçu (articles enregistrés / nombre de sujets / nœuds du graphe), panneau d'état de la synchronisation Git, carte des sujets tendance | [Détails](#doc/synthesis%2Fhome) |
| **Topics** | Liste et gestion des sujets : 3 modes d'affichage (graphe / grille / liste), création et mise à jour des sujets, recherche et tri des sujets | [Détails](#doc/synthesis%2Ftopic-synthesis) |
| **Index** | Index de référence canonique : vue du registre des articles (liste des articles + lignes de citation + état de liaison), vue de référence canonique (recherche / fusion / redirection / dédoublonnage) | [Détails](#doc/synthesis%2Findex-and-citation) |
| **Review** | Centre de révision : 3 sous-onglets — révision des correspondances de citations (accepter/refuser les propositions de liaison), révision des concepts, révision des relations du graphe de sujets | [Détails](#doc/synthesis%2Freview) |
| **Graph** | Visualisation du graphe de citations (force-directed / radial / composantes — 3 dispositions), avec filtrage par sujet et interaction nœud/arête | [Détails](#doc/synthesis%2Findex-and-citation) |
| **Tags** | Gestion du vocabulaire contrôlé de balises + approbation des suggestions de tag automatique | [Détails](#doc/synthesis%2Ftags) |
| **Concepts** | Gestion de la base de connaissances conceptuelle : structure en quatre couches concepts / sens / alias / relations, superposable au graphe de sujets et au lecteur | [Détails](#doc/synthesis%2Fconcepts) |
| **Reader** | Lecteur de sujets : page complète de détail du sujet avec 8 sous-pages (Aperçu, Taxonomie, Affirmations, Comparaison, Perspectives futures, Couverture, Références, Rapport) | [Détails](#doc/synthesis%2Ftopic-synthesis) |

## Concepts fondamentaux

### Canonical Store

Le Canonical Store est le stockage sous-jacent du graphe de connaissances pour le système Synthesis. Il stocke des fichiers JSON adressables par contenu dans le répertoire de données de Zotero.

**Emplacement de stockage :** `<répertoire de données Zotero>/zotero-agents/data/synthesis/`

**Structure du répertoire :**

```
synthesis/
├── topics/             # Artefacts structurés pour la synthèse de sujets
├── concepts/           # Base de connaissances conceptuelle
├── topic-graph/        # Nœuds et arêtes du graphe de sujets
├── citation-graph/     # Instantanés du graphe de citations
├── tags/               # Vocabulaire contrôlé de balises
├── sync/               # Arbre de travail de la synchronisation Git
└── state/              # État d'exécution (transactions, reçus, caches, etc.)
```

Chaque fichier utilise un format d'enveloppe JSON (CanonicalEnvelope) qui inclut un identifiant de schéma, un numéro de version, un horodatage et un corps de données validé par le schéma. Les opérations d'écriture utilisent une sémantique transactionnelle : les données sont d'abord mises en attente dans le répertoire des transactions, promues à l'emplacement canonique après validation réussie, et automatiquement annulées en cas d'échec.

### Reference Sidecar

Un Reference Sidecar est un index des artefacts attachés pour chaque article. Lorsqu'un workflow traite une notice littéraire et génère un résumé, une liste de références et une analyse de citations, ces artefacts sont attachés à la notice sous forme de notes structurées (Zotero Notes). Le système Sidecar analyse ces notes et enregistre l'état des artefacts (complet / partiel / manquant) dans l'index.

**Cycle de balayage du Sidecar :** Le sidecar est déclenché dans les cas suivants :

- Après l'exécution d'un workflow et l'écriture des artefacts
- Lorsqu'une opération explicite de rafraîchissement du sidecar est déclenchée
- Lorsque le système détecte des données sidecar obsolètes au démarrage

**Types d'artefacts :**

| Artefact | Description |
|----------|-------------|
| `digest` | Résumé d'article (Markdown) |
| `references` | Liste de références (JSON) |
| `citation_analysis` | Rapport d'analyse de citations (JSON) |

Les données du sidecar servent d'entrée principale à l'index de référence canonique — le système extrait les enregistrements de citations de l'artefact des références, établit les références canoniques, puis tente de les faire correspondre et de les lier aux notices de la bibliothèque.

### Flux de données

```
Bibliothèque Zotero
    │
    ├──→ Exécution du workflow (Analyse littéraire / Lecture approfondie)
    │         │
    │         ↓
    │   Notes d'artefacts (Résumé / Références / Analyse de citations)
    │         │
    │         ↓
    │   Reference Sidecar ← Balayage de l'état des artefacts
    │         │
    │         ├──→ Index de référence canonique
    │         │         │
    │         │         ├──→ Liaison des citations (Liaison aux notices Zotero)
    │         │         └──→ Graphe de citations
    │         │
    │         └──→ Synthèse de sujets
    │                   │
    │                   ├──→ Graphe de sujets (Relations entre sujets)
    │                   └──→ Associations conceptuelles (Base de connaissances)
    │
    └──→ Synchronisation Git ←→ Dépôt distant (Contrôle de version et sauvegarde)
```

## Prérequis

L'utilisation du Synthesis Workbench nécessite :

- Un backend [Skill-Runner](#doc/backends%2Fskill-runner) configuré (pour exécuter les workflows de synthèse)
- Des notices d'articles déjà présentes dans la bibliothèque

## Prochaines étapes

- [Tableau de bord Home](#doc/synthesis%2Fhome) — Voir l'aperçu de la bibliothèque et l'état de la synchronisation
- [Gestion des balises](#doc/synthesis%2Ftags) — Gérer le vocabulaire contrôlé de balises
- [Index et graphe de citations](#doc/synthesis%2Findex-and-citation) — Découvrir l'indexation des références et les réseaux de citations
- [Créer une synthèse de sujet](#doc/synthesis%2Ftopic-synthesis) — Créer des analyses de sujets
- [Centre de révision](#doc/synthesis%2Freview) — Réviser les correspondances de citations, les concepts et les propositions du graphe de sujets
- [Base de connaissances conceptuelle](#doc/synthesis%2Fconcepts) — Gérer les concepts fondamentaux
- [Synchronisation Git](#doc/synthesis%2Fgit-sync) — Configurer la synchronisation et la sauvegarde des données
