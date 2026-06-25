# Types de requêtes

Les workflows déterminent quel Provider (exécuteur) traite la requête en déclarant `request.kind`. Le système dispose de plusieurs types de requêtes intégrés, correspondant à différents backends et modes d'exécution.

## Aperçu des types de requêtes

| `kind` | Provider applicable | Description |
|--------|---------------------|-------------|
| `pass-through.run.v1` | pass-through | Exécution purement locale, aucun backend distant impliqué |
| `skillrunner.job.v1` | skillrunner / acp | Exécution de skill en une seule étape via SkillRunner |
| `skillrunner.sequence.v1` | acp | Exécution de skills enchaînées en plusieurs étapes |
| `acp.prompt.v1` | acp | Envoyer directement un prompt au backend ACP |
| `acp.skill.run.v1` | acp | Soumettre directement une exécution de skill au backend ACP |
| `generic-http.request.v1` | generic-http | Appel API HTTP en une seule étape |
| `generic-http.steps.v1` | generic-http | Appels API HTTP en plusieurs étapes |

## pass-through.run.v1 — Exécution purement locale

Aucun backend distant requis ; exécuté directement dans le plugin. Adapté aux scénarios purement locaux comme les opérations sur fichiers et l'export de données.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

Lors de la construction de la requête dans le hook `buildRequest`, passer généralement `selectionContext` et `parameter` :

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — Exécution de skill en une seule étape

Soumettre une requête d'exécution de skill unique au backend Skill-Runner. Sondage des résultats après la soumission.

```json
{
  "provider": "skillrunner",
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "literature-analysis",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

| Champ | Description |
|-------|-------------|
| `create.skill_id` | Identifiant du skill à exécuter |
| `create.skill_source` | Source du skill. `"local-package"` (inclus dans le package), `"installed"` (déjà installé) |
| `input.upload.files` | Liste des fichiers à téléverser. `from` peut être `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` |
| `poll.interval_ms` | Intervalle de sondage (millisecondes) |
| `poll.timeout_ms` | Délai d'attente total (millisecondes) |

Lorsque le workflow sélectionne le backend ACP, `skillrunner.job.v1` s'adapte automatiquement en `acp.skill.run.v1`, de sorte que les workflows déclarés comme `skillrunner.job.v1` sont également compatibles avec le backend ACP.

## skillrunner.sequence.v1 — Enchaînement de skills en plusieurs étapes

Lorsque plusieurs skills doivent être enchaînés en séquence (où la sortie d'une étape devient l'entrée de la suivante), utiliser l'exécution séquentielle. Les scénarios typiques incluent les pipelines multi-étapes (par ex. le flux en trois étapes de la synthèse de sujet : prepare → core enrichment → finalize), où chaque étape est traitée par un skill différent, transmettant les résultats intermédiaires via le mécanisme de handoff.

Enchaîner plusieurs skills en séquence, où la sortie d'une étape peut servir d'entrée à la suivante (handoff).

```json
{
  "provider": "acp",
  "request": {
    "kind": "skillrunner.sequence.v1",
    "sequence": {
      "steps": [
        {
          "id": "prepare",
          "skill_id": "create-topic-synthesis-prepare",
          "workspace": "new",
          "parameter": { "language": "en-US" }
        },
        {
          "id": "core",
          "skill_id": "topic-synthesis-core-enrichment",
          "workspace": "reuse-workflow",
          "handoff": {
            "from_step": "prepare",
            "pass_through": true
          }
        },
        {
          "id": "finalize",
          "skill_id": "topic-synthesis-finalize",
          "workspace": "reuse-workflow"
        }
      ]
    }
  }
}
```

### Configuration des étapes

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique de l'étape, référencé par le handoff |
| `skill_id` | Identifiant du skill à exécuter |
| `mode` | **Requis.** Mode d'exécution : `"auto"` (non interactif) ou `"interactive"` (nécessite une saisie utilisateur) |
| `workspace` | Politique d'espace de travail. `"new"` (créer un nouvel espace de travail), `"reuse-workflow"` (réutiliser l'espace de travail parent) |
| `parameter` | Paramètres transmis au skill |
| `input` | Données d'entrée transmises au skill |
| `short_circuit` | Règles de terminaison anticipée. Voir ci-dessous |
| `fetch_type` | Spécifier le type de récupération par étape. `"bundle"` (télécharger un bundle d'artefacts zip) ; si non spécifié, utilise `result.fetch.type` au niveau du workflow |
| `apply_result` | Application du résultat au niveau de l'étape : `workflow_id` spécifie le `applyResult` de quel sous-workflow invoquer ; `on_failure` contrôle le comportement en cas d'échec (`"continue"` ou `"fail_sequence"`) |
| `include_if` | Exécution conditionnelle d'étape. Soit `{ kind: "parameter", parameter: "...", equals: ... }` pour vérifier un paramètre de workflow, soit `{ kind: "runtime", condition: "..." }` pour des conditions d'exécution |

### Terminaison anticipée (short_circuit)

Lorsque la valeur de retour d'une étape satisfait les conditions, ignorer les étapes suivantes et utiliser la sortie de l'étape courante comme résultat final.

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new",
  "short_circuit": {
    "when": {
      "path": "status",
      "equals": "canceled"
    },
    "result": "step_output"
  }
}
```

| Champ | Description |
|-------|-------------|
| `when.path` | Quel champ du JSON de sortie de l'étape vérifier |
| `when.equals` | Déclencher la terminaison lorsque la valeur du champ est égale à cette valeur |
| `result` | Résultat après terminaison : `"step_output"` (sortie complète de l'étape courante) |

### Configuration du handoff

Le handoff transmet les données d'une étape aux étapes suivantes via un tableau `bindings`. Chaque binding décrit un transfert de valeur ou de fichier unique.

**Transmission complète (tous les champs de sortie d'une étape précédente) :**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "target": "/input/handoff"
      }
    ]
  }
}
```

**Mappage sélectif de champs :**

```json
{
  "handoff": {
    "bindings": [
      {
        "kind": "value",
        "step": "step1",
        "source": "output_field_name",
        "target": "/input/field_name",
        "required": false
      },
      {
        "kind": "value",
        "step": "step1",
        "source": "status",
        "target": "/input/step1_status",
        "required": false
      }
    ]
  }
}
```

| Champ du binding | Description |
|------------------|-------------|
| `kind` | `"value"` pour les valeurs de données, `"file"` pour les références de fichiers |
| `step` | Identifiant de l'étape source (de quelle étape lire la sortie). Si omis, lit l'étape précédente immédiate |
| `source` | Nom du champ dans le JSON de sortie de l'étape source |
| `target` | Chemin JSON où la valeur doit être écrite dans l'entrée de l'étape courante (par ex. `"/input/field_name"`) |
| `required` | Si `true`, l'étape échouera si la valeur source est manquante. Par défaut `false` |
| `value` | Pour `kind: "value"`, une valeur littérale à transmettre (utilisée quand `step`/`source` sont omis) |

## generic-http.request.v1 — Appel API HTTP

Envoyer une requête HTTP unique au backend Generic HTTP.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

Couramment utilisé pour appeler des API REST externes (par ex. le service d'analyse PDF MinerU).

## generic-http.steps.v1 — Appels HTTP en plusieurs étapes

Exécuter plusieurs étapes de requêtes HTTP en séquence.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## Comment choisir le bon Provider

| Votre workflow doit... | Choisir le provider | Type de requête |
|------------------------|---------------------|-----------------|
| Effectuer des opérations purement locales, sans appels distants | `pass-through` | `pass-through.run.v1` |
| Soumettre un skill unique à Skill-Runner | `skillrunner` | `skillrunner.job.v1` |
| Enchaîner plusieurs skills en séquence | `acp` | `skillrunner.sequence.v1` |
| Appeler une API HTTP | `generic-http` | `generic-http.request.v1` |

Note : `provider` est le seul champ qui détermine les backends avec lesquels un workflow est compatible. `request.kind` est uniquement utilisé pour le routage vers le bon exécuteur et ne participe pas à l'inférence de compatibilité des backends.

## Prochaines étapes

- [Débogage et tests](debugging) — Vérifier les requêtes et réponses des workflows
- [Empaquetage et déploiement](packaging) — Publier des workflows pour les utilisateurs
