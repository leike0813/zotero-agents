# Manuscript Literature Framing

## Objectif

Aider à rédiger les sections Introduction et Travaux Connexes d'un article académique. Par un dialogue interactif, clarifier le positionnement de l'article, collecter la littérature pertinente, analyser les cadres rédactionnels et générer des brouillons LaTeX.

## Cas d'Usage

- Rédiger un article et avoir besoin d'organiser le cadre littéraire
- Déterminer le positionnement et les innovations de l'article
- Générer des brouillons LaTeX pour les sections Introduction et Travaux Connexes

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | workflow (aucune notice n'a besoin d'être sélectionnée) |
| Méthode de Déclenchement | Exécuter directement depuis le Tableau de Bord |

## Flux d'Exécution

Ce workflow s'exécute de manière interactive, progressant à travers les étapes suivantes :

```
1. Confirmation des Informations de l'Article
   └── Confirmer le titre de l'article et le périmètre de recherche
       └── Clarifier la revue/lieu cible et le style rédactionnel

2. Collecte de Matériel
   └── Récupérer la littérature pertinente de la bibliothèque Zotero
       └── Obtenir les métadonnées littéraires et les informations de citation

3. Analyse de Cadre Multi-perspective
   └── Analyser le positionnement de l'article dans le domaine
       └── Identifier les angles rédactionnels disponibles et les fils narratifs

4. Plan de Rédaction
   └── Générer le plan de structure de l'Introduction
       └── Générer le plan d'organisation des Travaux Connexes

5. Génération du Brouillon
   └── Produire le brouillon LaTeX de l'Introduction
       └── Produire le brouillon LaTeX des Travaux Connexes
       └── Inclure la cartographie des citations et l'inventaire des preuves
```

### Détails de l'Interaction

- Chaque étape nécessite une confirmation utilisateur avant de procéder
- L'utilisateur peut ajuster la direction pendant la conversation
- La progression peut être suivie dans le Tableau de Bord

## Durée Estimée

Dépend du nombre de tours de conversation et de la taille de la bibliothèque littéraire. L'étape d'analyse par l'IA prend environ 5-10 minutes, plus le temps de confirmation utilisateur pour chaque étape.

## Sorties

Une fois l'exécution terminée, les artefacts peuvent être écrits dans Zotero (sous forme de notes) via le hook Apply Result ou téléchargés :

| Artefact | Format | Description |
|------|------|------|
| `introduction.tex` | LaTeX | Brouillon de l'Introduction |
| `related-work.tex` | LaTeX | Brouillon des Travaux Connexes |
| `framing-analysis.json` | JSON | Analyse de cadre multi-perspective |
| `writing-plan.json` | JSON | Plan de rédaction |
| `evidence-inventory.json` | JSON | Inventaire des preuves/citations |
| `citation-map.json` | JSON | Relations de cartographie des citations |
| `intent-brief.json` | JSON | Résumé du positionnement de l'article |

:::tip Accès aux Artefacts
Les brouillons LaTeX générés et autres artefacts peuvent être trouvés dans la **zone d'artefacts du Tableau de Bord**. Vous pouvez placer directement les artefacts dans votre manuscrit LaTeX ou les exporter pour un traitement ultérieur.
:::

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `paperTitle` | string | Titre de l'article | — |
| `language` | string | Langue de sortie | `auto` |
| `targetVenue` | string | Revue/lieu cible (optionnel) | Vide |
| `articleType` | string | Type d'article | `original research` |
| `stylePreference` | string | Préférence de style rédactionnel (optionnel) | Vide |

### Exemples de Styles Rédactionnels

- `concise` : Style concis
- `IEEE-like` : Style IEEE
- `Nature-like` : Style Nature
- `Chinese draft` : Brouillon chinois

## Dépendances

- **Backend** : Backend ACP
- **Bibliothèque Zotero** : Nécessite des notices d'articles connexes dans la bibliothèque

:::tip Workflow Recommandé
Pour de meilleurs résultats, il est recommandé de compléter la préparation suivante avant d'exécuter ce workflow :
1. Collecter et ingérer un nombre suffisant d'articles connexes
2. Exécuter [Literature Analysis](literature-analysis) + [Tag Regulator](tag-regulator) sur tous les articles
3. Exécuter Advance Matching dans le Synthesis Workbench et traiter les éléments d'approbation
4. Créer plusieurs [Topic Syntheses](topic-synthesis) connexes
:::

## Recommandation de Modèle

🟡 Des modèles avec un **contexte long** sont recommandés. Rédiger l'Introduction et les Travaux Connexes nécessite d'intégrer des résumés, des analyses de citation et des résultats de Topic Synthesis provenant d'un grand nombre d'articles, ce qui place des exigences élevées sur la fenêtre de contexte.

## Workflows Associés

- [Literature Analysis](literature-analysis) — Établir une base de connaissances structurée pour les articles
- [Topic Synthesis](topic-synthesis) — Créer d'abord des synthèses de sujet, puis rédiger l'article basé sur les résultats d'analyse
