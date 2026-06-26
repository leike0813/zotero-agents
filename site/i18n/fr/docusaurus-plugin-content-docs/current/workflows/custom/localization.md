# Localisation

Le système de workflows prend en charge la localisation multilingue, permettant au même workflow d'afficher les noms et descriptions correspondants dans différentes interfaces linguistiques de Zotero.

## Hiérarchie de localisation

La localisation des workflows suit l'ordre de priorité suivant :

```
Messages en ligne (manifest.i18n.messages)  ← Priorité la plus élevée
        ↓
Fichiers de locale au niveau du package (locales/ du workflow-package)
        ↓
Champs bruts du manifeste (label / description etc. valeurs par défaut en anglais)
        ↓
Repli sur la clé (par ex. "workflows.my-id.label")
```

## Localisation en ligne (workflow unique)

Définie directement dans `workflow.json` :

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

Les champs comme `label` et `taskNameTemplate` dans le manifeste brut servent de valeurs par défaut (généralement en anglais), et les traductions dans `i18n.messages` remplacent le texte affiché pour la langue correspondante.

### Conventions de nommage des clés

```
label                                    — Nom du workflow
taskNameTemplate                         — Modèle de nom de tâche
parameters.<paramKey>.title              — Titre du paramètre
parameters.<paramKey>.description         — Description du paramètre
skills.<skillId>.name                    — Nom affiché du skill dans le workflow actuel
```

`skills.<skillId>.name` n'affecte que le nom affiché dans l'interface. Le `runner.json.name` du package Skill reste le nom par défaut du skill ; si le workflow ne déclare pas de traduction correspondante, l'interface affiche `runner.json.name` par défaut.

## Localisation au niveau du package (package multi-workflows)

Déclarez les fichiers de locale dans `workflow-package.json` :

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

Contenu de `locales/zh-CN.json` :

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.skills.my-skill.name": "我的技能",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

Les clés dans les fichiers de locale au niveau du package utilisent le format entièrement qualifié : `workflows.<workflowId>.<field>`.

### Utilisation mixte

Les messages en ligne au niveau du package et au niveau du workflow peuvent coexister, les messages en ligne ayant une priorité supérieure. Bonnes pratiques :

- Conserver la langue par défaut (par ex. l'anglais) dans les champs de workflow.json
- Placer les traductions dans les fichiers de locale au niveau du package pour une gestion unifiée
- Si une traduction est très spécifique à un workflow particulier, elle peut également être placée dans les messages en ligne du workflow

## Logique de correspondance linguistique

Le système tente de faire correspondre les paramètres linguistiques de l'utilisateur dans l'ordre suivant :

1. **Correspondance exacte** : La locale de l'utilisateur est `"zh-CN"`, rechercher les messages `"zh-CN"`
2. **Correspondance par sous-balise de langue** : La locale de l'utilisateur est `"zh-Hans-CN"`, si aucune correspondance exacte n'est trouvée, essayer de correspondre `"zh"`
3. **Repli sur defaultLocale** : Utiliser la langue spécifiée par `i18n.defaultLocale`
4. **Repli sur la valeur brute du champ** : Utiliser les valeurs brutes des champs dans `workflow.json` (par ex. `label`)
5. **Repli sur la clé** : Afficher le nom de la clé elle-même

## Localisation des valeurs d'énumération des paramètres

Si un paramètre possède des valeurs d'énumération, le texte affiché pour les valeurs d'énumération utilise actuellement les champs `title` et `description` du paramètre. Pour les scénarios complexes nécessitant la localisation des valeurs d'énumération elles-mêmes, il est recommandé d'ajouter une explication dans le `label` ou la description du workflow.

## Ajouter une nouvelle langue à un workflow

1. Créer un nouveau fichier `<locale>.json` dans le répertoire `locales/` du package
2. Se référer aux fichiers de locale existants (par ex. `zh-CN.json`) et traduire toutes les clés
3. Ajouter la nouvelle entrée de langue dans `i18n.locales` de `workflow-package.json`
4. Recharger le plugin pour que les modifications prennent effet

## Référence

- Exemple de fichier de locale officiel : `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- Exemple de déclaration i18n au niveau du package : `content/official/workflows/literature-workbench-package/workflow-package.json`

## Prochaines étapes

- [Types de requêtes](request-kinds) — Choisir le backend d'exécution et le type de requête
- [Empaquetage et déploiement](packaging) — Publier des packages de workflows avec localisation
