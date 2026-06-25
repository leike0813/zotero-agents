# Empaquetage et déploiement

Les workflows prennent en charge deux formes : **workflow unique** et **package multi-workflows**. Les workflows uniques conviennent aux scénarios simples, tandis que les packages multi-workflows conviennent aux ensembles de workflows partageant du code.

## Workflow unique

La forme la plus simple : un répertoire contenant un `workflow.json` et ses scripts Hook :

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

Un workflow unique n'a pas de `packageId`, et les scripts Hook ne peuvent pas partager de code via des imports relatifs.

## Package multi-workflows

Lorsque plusieurs workflows partagent de la logique, ils peuvent être organisés en package :

```
my-package/
├── workflow-package.json       # Manifeste du package
├── lib/                        # Code partagé
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # Fichiers de localisation au niveau du package
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### Code partagé au sein d'un package

Les scripts Hook dans un package peuvent importer des modules partagés depuis `lib/` via des chemins relatifs :

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // Logique de traitement partagée
}
```

Remarque : Les scripts Hook sont exécutés en tant qu'ES Modules, supportant les instructions `import`, mais les chemins d'importation doivent être relatifs au fichier Hook lui-même.

## Méthodes de déploiement

### Répertoire de workflows utilisateur

Placez le répertoire du workflow dans le **répertoire de workflows** configuré dans les préférences de Zotero. Le Workflow Manager analyse automatiquement ce répertoire (y compris les sous-répertoires) et découvre tous les fichiers `workflow.json`.

Emplacement de configuration : Zotero → Paramètres → Zotero Agents → Répertoire de workflows.

### Règles d'analyse de répertoires

- Le Workflow Manager **analyse récursivement** le répertoire de workflows et ses sous-répertoires
- La découverte d'un `workflow.json` l'enregistre en tant que workflow
- Si un `workflow-package.json` est trouvé dans un répertoire de package, les sous-workflows sont chargés en mode package
- Si le répertoire de workflows n'existe pas ou ne contient aucun workflow valide, le Workflow Manager signale un avertissement mais n'affecte pas le fonctionnement du plugin

### Compatibilité avec d'autres formats

| Emplacement de stockage | Visibilité | Description |
|-------------------------|------------|-------------|
| Package de workflows officiel `content/official/workflows/` | Tous les utilisateurs | Installé indépendamment via le flux de contenu ; non modifiable directement par les utilisateurs |
| Répertoire de workflows utilisateur | Utilisateur courant | Peut être librement ajouté/modifié/supprimé |
| Répertoires officiel + utilisateur | Affichage combiné | Les workflows des deux emplacements sont affichés côte à côte dans le tableau de bord |

## Validation

Après avoir déployé un workflow dans le répertoire utilisateur :

1. **Rouvrez le tableau de bord** ; le nouveau workflow devrait apparaître dans la liste des workflows de la page d'accueil
2. Après avoir sélectionné les notices correspondantes, faites un clic droit → Zotero Agents ; le nouveau workflow devrait apparaître
3. Avant d'exécuter le workflow, vérifiez que les paramètres dans la boîte de dialogue sont corrects

## Prochaines étapes

- [Localisation](#doc/workflows%2Fcustom%2Flocalization) — Ajouter le support multilingue aux workflows
- [Types de requêtes](#doc/workflows%2Fcustom%2Frequest-kinds) — Choisir le backend d'exécution et le type de requête appropriés
- [Débogage et tests](#doc/workflows%2Fcustom%2Fdebugging) — Vérifier la correctness des workflows
