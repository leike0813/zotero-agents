# Système de Hooks

Les hooks sont les points d'extensibilité d'un workflow — à différentes étapes de l'exécution, le Workflow Runtime du plugin appelle les scripts de hook correspondants, vous permettant d'intervenir dans le flux d'exécution avec JavaScript.

Un workflow peut contenir jusqu'à **3 hooks**, dont `applyResult` est le seul requis.

> **Note sur le filtrage d'entrée :** L'ancien hook `filterInputs` a été remplacé par le mécanisme déclaratif `validateSelection`. Utilisez `validateSelection` dans `workflow.json` pour définir les contraintes d'entrée sans JavaScript. Voir [Rédaction du Manifeste](manifest#selection-validation) pour plus de détails.

## Structure du Script de Hook

Chaque script de hook est un fichier `.mjs` (ES Module) qui exporte des fonctions nommées :

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
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
  hookName,         // Nom du hook actuel : "buildRequest" | "applyResult" | ""
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

Lorsque la requête déclarative `request` dans `workflow.json` ne suffit pas, utilisez `buildRequest` pour construire dynamiquement la charge utile.

**Signature :**

```ts
function buildRequest({
  selectionContext,  // Contexte de sélection filtré
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Contexte d'exécution
}): unknown
```

**Relation avec la requête déclarative :** `buildRequest` est mutuellement exclusif avec `request` dans `workflow.json`. Si les deux existent, `buildRequest` est prioritaire.

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

**Exemple : Requête de séquence multi-étapes**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveAttachmentPath(selectionContext, runtime);
  const language = executionOptions?.workflowParams?.language || "fr-FR";

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

## 2. normalizeSettings — Normaliser les Paramètres

Normalise les paramètres avant la persistance ou l'exécution.

**Signature :** Ce hook reçoit des paramètres différents selon la phase :

```ts
function normalizeSettings(args: {
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Cas d'usage :**
- Validation croisée entre paramètres
- Migration de paramètres d'anciennes versions
- Nettoyage des valeurs invalides avant exécution

## 3. applyResult — Traiter le Résultat (Requis)

C'est le **seul hook requis** pour un workflow, responsable de l'écriture des résultats dans Zotero.

**Signature :**

```ts
function applyResult({
  parent,           // Élément Zotero parent
  bundleReader,     // Lecteur du bundle de résultats
  resultContext,    // Contexte de résultat structuré
  sequenceStep,     // Métadonnées de l'étape de séquence (présent dans les séquences)
  productStorage,   // API de stockage d'artefacts
  request,          // Requête originale envoyée
  runResult,        // Métadonnées du résultat d'exécution
  manifest,         // workflow.json
  runtime,          // Contexte d'exécution
}): unknown

// Structure de sequenceStep :
// {
//   id: string;           // ID de l'étape
//   index: number;        // Index basé sur zéro
//   workflowId: string;   // ID du sous-workflow
//   skillId: string;      // ID de la compétence exécutée
//   finalStep: boolean;   // Dernière étape ?
//   phase: "sequence-step";
// }
```

**Utilisation de bundleReader :**

```js
const digestMd = await bundleReader.readText("artifacts/digest.md");
const extractedDir = await bundleReader.getExtractedDir();
```

**Exemple : Écrire des notes depuis un bundle**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };
  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");
  const htmlContent = runtime.helpers.toHtmlNote("Résumé", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });
  return { applied: true, noteId: newNote.id };
}
```

## Fonctions d'Aide (helpers)

| Fonction | Description |
|----------|-------------|
| `getAttachmentParentId(entry)` | Obtenir l'ID parent d'une pièce jointe |
| `getAttachmentFilePath(entry)` | Obtenir le chemin du fichier |
| `getAttachmentFileName(entry)` | Obtenir le nom du fichier |
| `getAttachmentFileStem(entry)` | Obtenir le nom sans extension |
| `getAttachmentDateAdded(entry)` | Obtenir le timestamp dateAdded |
| `basenameOrFallback(path, fallback)` | Extraire le nom de base ou retourner une chaîne de secours |
| `isMarkdownAttachment(entry)` | Vérifier si pièce jointe Markdown |
| `isPdfAttachment(entry)` | Vérifier si pièce jointe PDF |
| `pickEarliestPdfAttachment(entries)` | Sélectionner le PDF le plus ancien |
| `cloneSelectionContext(ctx)` | Copier profondément le contexte |
| `withFilteredAttachments(ctx, items)` | Conserver uniquement les pièces jointes spécifiées |
| `resolveItemRef(ref)` | Résoudre une référence en Zotero.Item |
| `toHtmlNote(title, body)` | Convertir Markdown en HTML |
| `normalizeReferenceAuthors(value)` | Normaliser la liste d'auteurs |
| `normalizeReferenceEntry(entry, index)` | Normaliser une entrée de référence |
| `normalizeReferencesArray(value)` | Normaliser un tableau de références |
| `normalizeReferencesPayload(payload)` | Normaliser un payload de références |
| `replacePayloadReferences(payload, refs)` | Remplacer les références dans un payload |
| `resolveReferenceSource(entry)` | Résoudre la source d'une référence |
| `renderReferenceLocator(entry)` | Rendre le localisateur volume/numéro/pages |
| `renderReferencesTable(references)` | Rendre les références en tableau HTML |

## Prochaines Étapes

- [Contexte de Sélection](selection-context) — Structure détaillée de selectionContext
- [Référence API Hôte](host-api) — Référence API complète
- [Empaquetage & Déploiement](packaging) — Comment empaqueter et déployer
