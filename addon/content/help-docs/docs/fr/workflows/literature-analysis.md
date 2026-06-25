# Literature Analysis

## Objectif

Générer des résumés de littérature, des listes de références et des rapports d'analyse de citation à partir de pièces jointes PDF ou Markdown.

**Literature Analysis est la pierre angulaire de la gestion littéraire agentique** — chaque article ingéré devrait être traité par ce workflow. Il établit une base de connaissances structurée pour chaque article, et toutes les fonctionnalités avancées telles que les graphes de citation et la Topic Synthesis dépendent des sorties de ce workflow.

Ce workflow appelle la compétence `literature-analysis` sur le backend Skill-Runner pour effectuer une analyse structurée des articles académiques.

:::tip Bonnes Pratiques
- **Extraire le Markdown d'abord** : Avant d'exécuter Literature Analysis, il est recommandé d'utiliser [MinerU](#doc/workflows%2Fmineru) pour convertir d'abord le PDF en Markdown. Le Markdown original améliore significativement la compréhension par l'IA de la structure de l'article.
- **Initialiser le vocabulaire de balises d'abord** : Il est recommandé d'exécuter [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) pour initialiser un vocabulaire de balises contrôlé avant votre première Literature Analysis. Cela permet à la régulation automatique des balises dans le pipeline d'analyse d'atteindre une efficacité maximale.
:::

## Cas d'Usage

- Obtenir rapidement un résumé du contenu clé lors de la lecture d'un nouvel article
- Collecter la liste complète des références d'un article
- Analyser le contexte de citation et l'intention de citation d'un article

## Contraintes d'Entrée

| Type de Contrainte | Description |
|---------|------|
| Unité d'Entrée | Pièce jointe |
| Types Acceptés | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Limite par parent | Au maximum 1 pièce jointe |

### Méthodes de Déclenchement

- Sélectionner directement une pièce jointe PDF ou Markdown
- Sélectionner la notice parente, et le plugin déploiera automatiquement sa première pièce jointe éligible

## Flux d'Exécution

```
1. Construire la Requête
   └── Téléverser le fichier source vers Skill-Runner
       └── Invoquer skill_id: "literature-analysis"

2. Traitement Skill-Runner
   └── Analyser le contenu du document
       └── Générer trois sorties :
           ├── digest.md          (Résumé Littéraire)
           ├── references.json    (Liste de Références)
           └── citation_analysis.json (Analyse de Citation)

3. Renvoyer les Résultats
   └── Télécharger le bundle (zip)
       └── Contient result.json et artifacts/
```

### Mode d'Exécution

Entièrement automatique, aucune intervention utilisateur requise. Soumettez et attendez la fin.

### Configuration d'Exécution

- `execution.mode`: `auto` — Exécution automatique, aucune intervention utilisateur requise
- `skillrunner_mode`: `auto` — Mode non interactif

## Durée Estimée

| Scénario | Durée Estimée |
|------|---------|
| Format de référence standard | 6-10 minutes |
| Format de référence non standard | 12-18 minutes |

La durée dépend principalement de la standardisation du format des références — plus le format est normalisé (par exemple, citations de ScienceDirect, IEEE et autres revues mainstream), plus l'analyse par l'IA sera rapide. La longueur de l'article a un impact relativement mineur.

## Sorties

Une fois l'exécution terminée, **3 Notes Zotero** sont créées sous la notice parente :

### 1. Note Résumé

- Type : `data-zs-note-kind="digest"`
- Contenu : Résumé littéraire rendu en HTML couvrant le contexte de recherche, les méthodes, les résultats et les conclusions
- Stratégie de mise à jour : Chaque exécution met à jour la note portant le même nom (écrase si elle existe déjà)

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_digest.webp" alt="Note Résumé de Literature Analysis" title="Note Résumé de Literature Analysis" loading="lazy" /><figcaption>Note Résumé de Literature Analysis</figcaption></figure>

:::info À Propos du Contenu des Notes
Le contenu affiché dans la note est **rendu** à partir des données du backend. Modifier directement le contenu de la note dans Zotero **ne changera pas** les données réelles du backend. Pour modifier les résultats d'analyse, utilisez la fonction [Export/Import Notes](#doc/workflows%2Fexport-import-notes) pour exporter, modifier puis réimporter.
:::

### 2. Note Références

- Type : `data-zs-note-kind="references"`
- Contenu : Table HTML des références (#, Année, Titre, Auteurs, Source, Localisation)
- Stratégie de mise à jour : Chaque exécution met à jour la note portant le même nom

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_references.webp" alt="Note Références de Literature Analysis" title="Note Références de Literature Analysis" loading="lazy" /><figcaption>Note Références de Literature Analysis</figcaption></figure>

### 3. Note Analyse de Citation

- Type : `data-zs-note-kind="citation-analysis"`
- Contenu : Rapport d'analyse de citation incluant le contexte de citation et la classification de l'intention de citation
- Stratégie de mise à jour : Chaque exécution met à jour la note portant le même nom

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_citation-analysis.webp" alt="Note Analyse de Citation de Literature Analysis" title="Note Analyse de Citation de Literature Analysis" loading="lazy" /><figcaption>Note Analyse de Citation de Literature Analysis</figcaption></figure>

## Paramètres

| Paramètre | Type | Description | Défaut |
|------|------|------|--------|
| `language` | string | Langue de sortie | `zh-CN` |
| `auto_tag_regulator` | boolean | S'il faut automatiquement enchaîner [Tag Regulator](#doc/workflows%2Ftag-regulator) après l'analyse littéraire. **Activation recommandée** | `true` |
| `auto_tag_infer_tag` | boolean | Lors de l'enchaînement de la régulation de balises, s'il faut laisser l'IA inférer de nouvelles balises (visible uniquement quand `auto_tag_regulator` est activé) | `true` |

Valeurs disponibles pour `language` : `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Une saisie personnalisée est également prise en charge.

## Recommandation de Modèle

🔴 Des modèles avec une **forte compréhension du texte** sont recommandés. Si le backend prend en charge la délégation à des sous-agents (par exemple, Claude Code, Codex), le résumé, les références et l'analyse de citation peuvent être traités en parallèle, réduisant significativement le temps total.

## Dépendances

- **Backend** : Service Skill-Runner
- **Configuration du Backend** : Configurer un backend de type Skill-Runner dans le Gestionnaire de Backends
- **Compétence** : La compétence `literature-analysis` doit être déployée sur le Skill-Runner

## Workflows Associés

- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — Initialiser un vocabulaire de balises contrôlé avant votre première analyse
- [MinerU](#doc/workflows%2Fmineru) — Convertir d'abord le PDF en Markdown pour une qualité d'analyse optimale
- [Interactive Literature Explainer](#doc/workflows%2Fliterature-explainer) — Dialoguer avec l'IA pour une compréhension approfondie de la littérature
- [Export/Import Notes](#doc/workflows%2Fexport-import-notes) — Exporter les artefacts d'analyse pour édition, ou migrer entre instances Zotero
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — Exécuter la régulation de balises indépendamment (Literature Analysis peut s'enchaîner automatiquement)
