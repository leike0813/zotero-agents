# Topic Synthesis

## Objectif

Créer une Topic Synthesis via un pipeline automatisé en trois étapes, effectuant une analyse et une synthèse systématiques d'un groupe d'articles connexes.

Correspondant au flux de création de Sujet dans le Synthesis Workbench, ce workflow fournit un traitement de bout en bout depuis la graine de sujet jusqu'à un rapport d'analyse complet.

## Cas d'Usage

- Créer une analyse de sujet complète autour d'une direction de recherche
- Construire automatiquement une taxonomie, des affirmations clés, une chronologie et des directions futures
- Générer un rapport d'analyse de synthèse structuré

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | workflow (aucune notice n'a besoin d'être sélectionnée) |
| Méthode de Déclenchement | Exécuter depuis le Tableau de Bord, ou déclenché dans le Synthesis Workbench |

## Flux d'Exécution

Ce workflow consiste en **3 compétences exécutées séquentiellement** qui se passent automatiquement le relais :

```
1. create-topic-synthesis-prepare
   └── Recevoir la graine de sujet
       └── Créer l'intention du sujet
       └── Construire l'ensemble de travail des articles
       └── Préparer le contexte d'analyse

2. topic-synthesis-core-enrichment
   └── Enrichissement central
       └── Écrire la Taxonomie (système de classification)
       └── Construire la Chronologie
       └── Extraire les Affirmations
       └── Analyser les Directions Futures
       └── Générer le Plan de Revue
       └── Complétion du graphe de connaissances

3. topic-synthesis-finalize
   └── Détermination de la couverture
       └── Générer le résumé de contexte externe
       └── Suggestions de curation
       └── Générer le résumé d'analyse final
```

## Sorties

Une fois l'exécution terminée, les résultats de la synthèse de sujet sont écrits dans le stockage persistant du système Synthesis et reflétés dans les vues Sujets et Graphe du Synthesis Workbench.

Les sorties spécifiques incluent :

- **Métadonnées du Sujet** : Nom, description, date de création
- **Taxonomie** : Système de classification hiérarchique des sujets
- **Événements Chronologiques** : Événements importants organisés chronologiquement
- **Affirmations** : Affirmations clés extraites et leurs preuves
- **Comparaisons** : Analyse comparative multi-dimensionnelle
- **Directions Futures** : Suggestions de directions de recherche futures
- **Couverture** : Analyse de la couverture littéraire
- **Rapport** : Rapport d'analyse de synthèse

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_overview.webp" alt="Page d&#39;Aperçu de Topic Synthesis" title="Page d&#39;Aperçu de Topic Synthesis" loading="lazy" /><figcaption>Page d&#39;Aperçu de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_taxonomy.webp" alt="Page Taxonomie de Topic Synthesis" title="Page Taxonomie de Topic Synthesis" loading="lazy" /><figcaption>Page Taxonomie de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_claims.webp" alt="Page Affirmations de Topic Synthesis" title="Page Affirmations de Topic Synthesis" loading="lazy" /><figcaption>Page Affirmations de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_compare.webp" alt="Page Comparaison de Topic Synthesis" title="Page Comparaison de Topic Synthesis" loading="lazy" /><figcaption>Page Comparaison de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_future-directions.webp" alt="Page Directions Futures de Topic Synthesis" title="Page Directions Futures de Topic Synthesis" loading="lazy" /><figcaption>Page Directions Futures de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_coverage.webp" alt="Page Couverture de Topic Synthesis" title="Page Couverture de Topic Synthesis" loading="lazy" /><figcaption>Page Couverture de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_report.webp" alt="Page Rapport de Topic Synthesis" title="Page Rapport de Topic Synthesis" loading="lazy" /><figcaption>Page Rapport de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_references.webp" alt="Page Références de Topic Synthesis" title="Page Références de Topic Synthesis" loading="lazy" /><figcaption>Page Références de Topic Synthesis</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_subgraph.webp" alt="Sous-graphe d&#39;Articles de Topic Synthesis" title="Sous-graphe d&#39;Articles de Topic Synthesis" loading="lazy" /><figcaption>Sous-graphe d&#39;Articles de Topic Synthesis</figcaption></figure>

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `topicSeed` | string | Graine de sujet décrivant le sujet à créer | — |
| `language` | string | Langue de sortie | `auto` |

### Description de language

- `auto` : Détection automatique (utilise généralement la langue de l'interface du plugin)
- `zh-CN` : Chinois
- `en-US` : Anglais

## Dépendances

- **Backend** : Backend ACP
- **Système Synthesis** : Nécessite que le Synthesis Workbench soit initialisé
- **Articles de la Bibliothèque** : Il est recommandé d'avoir déjà un nombre suffisant d'articles connexes dans la bibliothèque

:::tip Préparation Recommandée
Avant de créer un Sujet, il est recommandé de :
1. S'assurer que tous les articles connexes ont été traités par [Literature Analysis](#doc/workflows%2Fliterature-analysis)
2. S'assurer que les articles connexes ont été traités par [Tag Regulator](#doc/workflows%2Ftag-regulator)
3. Exécuter **Advance Matching** (déduplication avancée de correspondance de citations) sur la page Index du Synthesis Workbench
4. Traiter tous les éléments d'approbation sur la page Revue (n'oubliez pas d'"Appliquer" les décisions en attente)

Les relations précises du graphe de citation affectent directement la qualité du calcul d'importance des articles dans Topic Synthesis (PageRank, score de front, etc.), améliorant ainsi la qualité globale de l'aperçu du Sujet.
:::

## Durée Estimée

| Taille du Sujet | Durée Estimée |
|---------|---------|
| Petit sujet (≤10 articles) | 8-12 minutes |
| Sujet moyen (10-30 articles) | 12-18 minutes |
| Grand sujet (30+ articles) | 18-25 minutes |

S'il y a beaucoup d'articles, il est recommandé d'utiliser plutôt la fonctionnalité de mise à jour pour une itération incrémentale.

## Recommandation de Modèle

🔴 Des modèles avec une **forte compréhension du texte + contexte long** sont recommandés. Topic Synthesis nécessite une analyse complète d'un grand nombre de résumés d'articles, de relations de citation, de balises et de connaissances conceptuelles, ce qui en fait une tâche intensive en calcul. Si le backend prend en charge la délégation à des sous-agents, le pipeline multi-étapes peut être exécuté plus efficacement.

## Workflows Associés

- [Aperçu du Synthesis Workbench](#doc/synthesis%2Findex) — Guide d'utilisation du Synthesis Workbench
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) — Rédiger des introductions d'articles basées sur les résultats de Topic Synthesis
