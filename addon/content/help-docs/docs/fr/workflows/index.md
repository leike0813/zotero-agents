# Aperçu des Workflows

## Qu'est-ce qu'un Workflow ?

Les Workflows sont la fonctionnalité principale de Zotero Agents, vous permettant de combiner plusieurs étapes de compétences en pipelines de traitement automatisés. Un Workflow définit une tâche complète : de la réception des entrées, au traitement des données, jusqu'à la production des sorties.

## Structure d'un Workflow

```
workflow.json (fichier manifeste)
├── manifest: déclare les métadonnées, la version, le nom
├── parameters: définit les paramètres configurables
├── inputs: définit les types d'entrées (pièces jointes, notices, notes, etc.)
├── hooks: scripts hook JavaScript (filtrer les entrées, construire les requêtes, appliquer les résultats)
└── provider: spécifie le type de backend requis
```

### Types d'Unités d'Entrée

| Type | Description |
|------|------|
| `attachment` | Fichiers joints d'une notice |
| `parent` | Notice parente de la notice sélectionnée |
| `note` | Notice de type note |
| `workflow` | Portée du traitement par lot |

### Système de Hooks

Les Workflows peuvent exécuter des scripts JavaScript personnalisés à différentes étapes de l'exécution :

- **filterInputs**: Filtrer et sélectionner les entrées
- **buildRequest**: Construire le contenu de la requête envoyée au backend
- **normalizeSettings**: Normaliser les paramètres utilisateur
- **applyResult**: Appliquer les résultats renvoyés par le backend à Zotero

## Trois Backends d'Exécution

Les Workflows peuvent être exécutés via trois types de backends :

| Backend | Type de Requête | Cas d'Usage |
|---------|-------------|---------|
| **Skill-Runner** | `skill.run.v1` | Exécution de compétences générale, prend en charge le mode interactif |
| **ACP** | `acp.skill.run.v1` | Exécution de compétences via le backend ACP |
| **HTTP Générique** | `generic-http.request.v1` | Appels d'API HTTP |

## Package Officiel de Workflows

Les Workflows officiels sont publiés et installés sous forme de **packages autonomes**, découplés du plugin lui-même. Méthodes d'installation :

- Menu contextuel → **Zotero Agents** → **📦 Installer le Package Officiel de Workflows**
- Cliquer sur **Installer le Package Officiel de Workflows** dans les Préférences

Les packages officiels prennent en charge trois canaux de mise à jour : stable / bêta / dev. Le plugin vérifie automatiquement les mises à jour au démarrage.

## Workflows Officiels

Le plugin inclut une série de workflows officiels, regroupés par fonction :

### 📚 Boîte à Outils d'Analyse Littéraire

| Workflow | Objectif | Entrée | Backend | Docs |
|---------|------|------|------|------|
| **Literature Analysis** ⭐ | Générer un résumé, des références, une analyse de citation à partir de PDF/MD. Peut s'enchaîner avec la régulation de balises | Pièce jointe | Skill-Runner | [Détails](#doc/workflows%2Fliterature-analysis) |
| **Interactive Literature Explainer** | Dialogue multi-tours avec l'IA pour une compréhension approfondie de la littérature, avec des réponses vérifiées pour prévenir les hallucinations | Pièce jointe | Skill-Runner | [Détails](#doc/workflows%2Fliterature-explainer) |
| **Deep Reading** | Générer une vue HTML structurée de lecture approfondie avec prise en charge de la traduction | Pièce jointe | ACP | [Détails](#doc/workflows%2Fliterature-deep-reading) |
| **Literature Search & Ingest** | Laisser l'Agent rechercher de la littérature académique et l'ingérer directement dans Zotero | workflow | ACP | [Détails](#doc/workflows%2Fliterature-search-ingest) |
| **Tag Bootstrapper** | Créer interactivement un vocabulaire de balises contrôlé pour un domaine de recherche | workflow | Skill-Runner | [Détails](#doc/workflows%2Ftag-bootstrapper) |
| **Tag Regulator** | Normaliser les balises en fonction d'un vocabulaire contrôlé et inférer de nouvelles balises | Notice parente | Skill-Runner | [Détails](#doc/workflows%2Ftag-regulator) |
| **Export/Import Notes** | Exporter ou importer des notes d'analyse avec prise en charge de l'édition et de la réimportation | Notice parente | Aucun backend requis | [Détails](#doc/workflows%2Fexport-import-notes) |

### 🛠️ Utilitaires

| Workflow | Objectif | Entrée | Backend | Docs |
|---------|------|------|------|------|
| **MinerU PDF Parsing** | Appeler le service MinerU pour analyser un PDF en Markdown | Pièce jointe | HTTP Générique | [Détails](#doc/workflows%2Fmineru) |
| **Topic Synthesis** | Pipeline en trois étapes pour créer une analyse et des rapports de synthèse de sujet | workflow | ACP | [Détails](#doc/workflows%2Ftopic-synthesis) |
| **Manuscript Literature Framing** | Générer des brouillons LaTeX d'Introduction / Travaux Connexes | workflow | ACP | [Détails](#doc/workflows%2Fmanuscript-literature-framing) |

### 🔧 Outils de Débogage

| Workflow | Objectif | Backend | Docs |
|---------|------|------|------|
| **Debug Probe** | Tests de développement du système de Workflow et diagnostics | Skill-Runner | [Détails](#doc/workflows%2Fdebug-probe) |

## Prochaines Étapes

- [Invocation et Configuration des Workflows](#doc/workflows%2Finvocation)
- [Configuration des Backends](#doc/backends%2Findex) — Instructions détaillées pour configurer les backends
