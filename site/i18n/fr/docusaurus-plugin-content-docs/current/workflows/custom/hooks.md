# Système de Hooks

Les hooks sont les points d'extensibilité d'un workflow — à différentes étapes de l'exécution, le Workflow Runtime du plugin appelle les scripts de hook correspondants, vous permettant d'intervenir et de contrôler le flux d'exécution avec JavaScript.

Un workflow peut contenir jusqu'à **4 hooks**, dont `applyResult` est le seul requis.

> **Note sur le filtrage d'entrée :** L'ancien hook `filterInputs` a été remplacé par le mécanisme déclaratif `validateSelection`. Utilisez `validateSelection` dans `workflow.json` pour définir les contraintes d'entrée sans JavaScript. Voir [Rédaction du Manifeste](manifest#selection-validation) pour plus de détails.

## Structure du Script de Hook

Chaque script de hook est un fichier `.mjs` (ES Module) qui exporte des fonctions nommées :

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, preflight, manifest, executionOptions, runtime }) {
  // Logique d'implémentation
  return requestSpec;
}
```

## Contexte d'Exécution (runtime)

Tous les hooks reçoivent un paramètre `runtime` qui fournit un accès direct à Zotero et à divers outils.

```js
runtime = {
  zotero,           // Objet global Zotero
  handlers,         // Gestionnaires de traitement de données bas niveau
  hostApi,          // API hôte de haut niveau (recommandée)
  helpers,          // Fonctions utilitaires auxiliaires
  addon,            // Configuration du plugin

  workflowId,       // ID du workflow actuel
  workflowRootDir,  // Chemin absolu du dossier contenant workflow.json
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // ID du package propriétaire (disponible uniquement dans les packages)
  packageRootDir,   // Chemin absolu du dossier racine du package

  hostApiVersion,   // Numéro de version de l'API hôte
  hookName,         // Nom du hook actuel : "preflight" | "buildRequest" | "applyResult" | ""
  debugMode,        // Si en mode débogage

  fetch,            // fetch global (si disponible)
  Buffer,           // Buffer Node.js (si disponible)
  btoa,             // Encodage Base64 (si disponible)
  atob,             // Décodage Base64 (si disponible)
  TextEncoder,      // Encodeur de texte (si disponible)
  TextDecoder,      // Décodeur de texte (si disponible)
  FileReader,       // Lecteur de fichiers (si disponible)
  navigator,        // Objet Navigator (si disponible)
}
```

**Bonne pratique :** Préférez `runtime.hostApi` (API haut niveau) ; n'utilisez `runtime.handlers` ou `runtime.zotero` que lorsque `hostApi` ne répond pas à vos besoins.

## 1. buildRequest — Construire la Requête

Lorsque la requête déclarative `request` dans `workflow.json` ne suffit pas à décrire une requête complexe, utilisez `buildRequest` pour construire dynamiquement la charge utile.

**Signature :**

```ts
function buildRequest({
  selectionContext,  // Contexte de sélection filtré
  preflight,         // Plan/unité/contexte preflight optionnel
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Contexte d'exécution
}): unknown
```

**Relation avec la requête déclarative :** `buildRequest` est mutuellement exclusif avec `request` dans `workflow.json`. Si les deux existent, `buildRequest` est prioritaire.

Lorsqu'un workflow déclare `hooks.preflight`, le runtime transmet le contexte preflight normalisé à `buildRequest` via le paramètre `preflight`. Ce contexte n'est pas fusionné dans `selectionContext` ; traitez-le comme des métadonnées de planification d'exécution distinctes.

**Exemple : Requête pass-through**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**Exemple : Requête utilisant le contexte d'unité Preflight**

```js
export async function buildRequest({ selectionContext, preflight, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  return {
    kind: "generic-http.steps.v1",
    file: {
      path: detail.item.file.path,
      page_ranges: preflight?.unit?.context?.page_ranges,
    },
  };
}
```

**Exemple : Requête de séquence multi-étapes**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const selected = selectionContext.items.find((item) => item.kind === "attachment");
  if (!selected) throw new Error("Source attachment is required");
  const detail = await runtime.hostApi.library.getItemDetail(selected.ref);
  if (detail.kind !== "attachment" || detail.item.file.state !== "available") {
    throw new Error("Source attachment file is unavailable");
  }
  const sourcePath = detail.item.file.path;
  const language = executionOptions?.workflowParams?.language || "en-US";

  return {
    kind: "skillrunner.sequence.v1",
    sequence: {
      steps: [
        {
          id: "step1",
          skill_id: "my-analysis-skill",
          mode: "auto",
          workspace: "new",
          parameter: { language, source_path: sourcePath },
        },
        {
          id: "step2",
          skill_id: "my-enrichment-skill",
          mode: "auto",
          workspace: "reuse-workflow",
          handoff: {
            bindings: [
              {
                kind: "value",
                source: "output_field_name",
                target: "/input/field_name",
                step: "step1",
              },
            ],
          },
        },
      ],
    },
  };
}
```

## 2. preflight — Planifier ou Court-circuiter l'Exécution

`preflight` s'exécute après la résolution déclarative de la sélection et avant `buildRequest` ou la construction déclarative de la requête. Utilisez-le pour des décisions locales légères qui nécessitent l'unité d'entrée résolue mais qui ne doivent pas faire partie de l'activation du menu.

`preflight` ne doit pas écrire de données Zotero, ne doit pas construire de requêtes fournisseur et ne doit pas remplacer `validateSelection`. Toutes les écritures Zotero appartiennent toujours à `applyResult`, et toutes les charges utiles de requêtes fournisseur appartiennent toujours à `buildRequest` ou au champ `request` du manifeste.

**Signature :**

```ts
function preflight({
  selectionContext,  // Contexte de l'unité d'entrée résolue
  parent,            // Élément parent de l'unité courante, si disponible
  attachment,        // Pièce jointe de l'unité courante, si disponible
  note,              // Note de l'unité courante, si disponible
  manifest,          // workflow.json
  executionOptions,  // { workflowParams, providerOptions }
  runtime,           // Contexte d'exécution
}): PreflightOutcome
```

**Résultat : Continuer**

Poursuivre avec la construction normale de la requête et attacher optionnellement un contexte de planification :

```js
export async function preflight({ parent }) {
  return {
    kind: "continue",
    context: {
      doi: parent?.DOI || "",
      source: "selected-parent",
    },
  };
}
```

`context` est disponible sous `preflight.context` dans `buildRequest` et `resultContext.preflight.context` dans `applyResult`.

**Résultat : Ignorer**

Ignorer uniquement l'unité d'entrée courante :

```js
export function preflight({ parent }) {
  if (!parent?.DOI) {
    return { kind: "skip", reason: "missing DOI" };
  }
  return { kind: "continue" };
}
```

Si toutes les unités d'entrée sont ignorées, l'exécution se termine sans soumettre de tâches au fournisseur.

**Résultat : Court-circuiter vers Apply**

Ignorer l'exécution du fournisseur et appeler directement le chemin standard `applyResult` :

```js
export async function preflight({ parent, runtime }) {
  const metadata = await lookupMetadataLocally(parent?.DOI, runtime);
  if (!metadata) {
    return { kind: "continue" };
  }
  return {
    kind: "short-circuit-apply",
    apply: {
      result: { ok: true, source: "local-metadata", item: metadata },
      request: { kind: "local.metadata.preflight.v1" },
      runResult: { status: "success" },
    },
    context: { source: "local-metadata" },
  };
}
```

Ceci est utile pour les workflows de type curateur de métadonnées : si une recherche par identifiant de confiance réussit localement, `applyResult` peut mettre à jour l'élément parent sans appeler un backend. Si la recherche est absente ou de faible qualité, retournez `continue` et laissez `buildRequest` construire la requête backend normale.

**Résultat : Remplacer les Unités**

Remplacer une unité d'entrée résolue par plusieurs unités de requête virtuelles :

```js
export function preflight({ attachment }) {
  const chunks = [
    { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
    { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
  ];
  return {
    kind: "replace-units",
    units: chunks,
  };
}
```

Chaque unité virtuelle passe par le chemin normal `buildRequest`. Le contexte spécifique à l'unité est disponible via `preflight.unit.context`.

**Application Agrégée Unique**

Pour les workflows à entrées fractionnées qui doivent fusionner plusieurs résultats de fournisseur en une seule écriture Zotero finale, ajoutez un plan d'agrégation :

```js
export function preflight() {
  return {
    kind: "replace-units",
    units: [
      { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
      { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
    ],
    aggregate: {
      id: "pdf-pages",
      mode: "single-apply",
      applyWhen: "all-succeeded",
      orderBy: "unit.order",
    },
  };
}
```

En v1, l'application agrégée prend en charge uniquement `mode: "single-apply"`, `applyWhen: "all-succeeded"` et `orderBy: "unit.order"`. Les tâches fournisseur enfants sont collectées et `applyResult` est appelé une seule fois après que tous les enfants ont réussi. Si un enfant échoue, aucune application agrégée partielle n'est effectuée.

## 3. normalizeSettings — Normaliser les Paramètres

Normalise les paramètres avant la persistance ou l'exécution.

**Signature :** Ce hook reçoit des paramètres différents selon la phase :

```ts
function normalizeSettings(args: {
  // phase persisted : lorsque les paramètres sont sauvegardés dans les préférences
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // phase execution : avant l'exécution
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Cas d'usage :**

- Validation croisée entre paramètres (par ex. lorsque l'option A est définie à une certaine valeur, la valeur par défaut de l'option B doit changer)
- Migration de paramètres d'anciennes versions
- Nettoyage des valeurs invalides avant exécution

## 4. applyResult — Traiter le Résultat (Requis)

C'est le **seul hook requis** pour un workflow, responsable de l'écriture des résultats d'exécution du backend dans Zotero.

**Signature :**

```ts
function applyResult({
  parent,           // Élément Zotero parent
  bundleReader,     // Lecteur du bundle de résultats
  resultContext,    // Contexte de résultat structuré, incluant les métadonnées preflight/aggregate
  sequenceStep,     // Métadonnées de l'étape de séquence (présent dans les exécutions de séquence)
  productStorage,   // API de stockage d'artefacts
  request,          // Requête originale envoyée
  runResult,        // Métadonnées du résultat d'exécution
  manifest,         // workflow.json
  runtime,          // Contexte d'exécution
}): unknown

// Structure de sequenceStep :
// {
//   id: string;           // ID de l'étape
//   index: number;        // Index basé sur zéro dans la séquence
//   workflowId: string;   // ID du sous-workflow pour cette étape
//   skillId: string;      // ID de la compétence exécutée dans cette étape
//   finalStep: boolean;   // Si c'est la dernière étape
//   phase: "sequence-step";
// }
```

Lorsque `preflight` est déclaré, `resultContext.preflight` expose le plan d'exécution, l'ID d'unité, le contexte d'unité et le contexte partagé pour l'appel apply courant. `selectionContext` n'est pas modifié par preflight.

Lorsque `replace-units` utilise `aggregate.single-apply`, `resultContext.aggregate.children` contient les résultats enfants ordonnés :

```ts
resultContext.aggregate.children = [
  {
    unitId: "part-1",
    order: 0,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
  {
    unitId: "part-2",
    order: 1,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
];
```

Un `applyResult` agrégé doit lire chaque bundle enfant depuis `child.bundleReader`, fusionner les artefacts dans l'ordre et écrire le résultat Zotero final une seule fois. Par exemple, un workflow de type MinerU peut soumettre un PDF en plusieurs tâches `page_ranges`, puis fusionner les fichiers `full.md` et gérer les chemins d'images avant de créer une pièce jointe Markdown finale.

**Utilisation de bundleReader :**

```js
// Lire les fichiers dans le bundle ZIP d'artefacts
const digestMd = await bundleReader.readText("artifacts/digest.md");

// Obtenir le chemin du répertoire d'artefacts extrait
const extractedDir = await bundleReader.getExtractedDir();
```

**Exemple : Écrire des notes depuis un bundle**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");

  const htmlContent = runtime.helpers.toHtmlNote("Paper Digest", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  return { applied: true, noteId: newNote.id };
}
```

**Exemple : Extraire des fichiers d'un bundle vers le disque (style MinerU)**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const extractedDir = await bundleReader.getExtractedDir();
  const { file } = runtime.hostApi;

  const mdContent = await bundleReader.readText("full.md");
  const targetPath = `/path/to/output.md`;
  await file.writeText(targetPath, mdContent);

  return { applied: true, output_path: targetPath };
}
```

## Fonctions d'Aide (helpers)

`runtime.helpers` fournit un ensemble de fonctions auxiliaires :

| Fonction | Description |
|----------|-------------|
| `basenameOrFallback(path, fallback)` | Extraire le nom de base ou retourner une chaîne de secours |
| `resolveItemRef(ref)` | Résoudre une référence d'élément en Zotero.Item |
| `toHtmlNote(title, body)` | Convertir Markdown en contenu de note HTML |
| `normalizeReferenceAuthors(value)` | Normaliser la liste d'auteurs des références |
| `normalizeReferenceEntry(entry, index)` | Normaliser une entrée de référence unique |
| `normalizeReferencesArray(value)` | Normaliser un tableau de références |
| `normalizeReferencesPayload(payload)` | Normaliser un objet payload de références |
| `replacePayloadReferences(payload, refs)` | Remplacer les références dans un payload |
| `resolveReferenceSource(entry)` | Résoudre le champ source d'une référence |
| `renderReferenceLocator(entry)` | Rendre la chaîne de localisation volume/numéro/pages |
| `renderReferencesTable(references)` | Rendre les références sous forme de tableau HTML |

## Prochaines Étapes

- [Contexte de Sélection](selection-context) — Structure détaillée de selectionContext
- [Référence API Hôte](host-api) — Référence API complète
- [Empaquetage & Déploiement](packaging) — Comment empaqueter et déployer les workflows
