# Sistema Hook

Gli hook sono i punti di estendibilità di un Workflow — in diverse fasi dell'esecuzione del Workflow, il Workflow Runtime del plugin chiama gli script Hook corrispondenti, consentendo di intervenire e controllare il flusso di esecuzione con JavaScript.

Un Workflow può contenere fino a **3 Hook**, di cui `applyResult` è l'unico obbligatorio.

> **Nota sul filtraggio degli input:** Il vecchio hook `filterInputs` è stato sostituito dal meccanismo dichiarativo `validateSelection`. Utilizzare `validateSelection` in `workflow.json` per definire i vincoli di input senza scrivere JavaScript. Vedere [Redazione del file Manifest](manifest#selection-validation) per i dettagli.

## Struttura degli script Hook

Ogni script Hook è un file `.mjs` (ES Module) che esporta funzioni con nome:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // Logica di implementazione
  return requestSpec;
}
```

## Contesto di runtime (runtime)

Tutti gli Hook ricevono un parametro `runtime` che fornisce accesso diretto a Zotero e a vari strumenti.

```js
runtime = {
  zotero,           // Oggetto globale di Zotero
  handlers,         // Handler di basso livello per l'elaborazione dei dati
  hostApi,          // API host di alto livello (consigliato)
  helpers,          // Funzioni utility ausiliarie degli hook
  addon,            // Configurazione del plugin

  workflowId,       // ID del Workflow corrente
  workflowRootDir,  // Percorso assoluto della directory contenente workflow.json
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // ID del pacchetto proprietario (disponibile solo all'interno dei pacchetti Workflow)
  packageRootDir,   // Percorso assoluto della directory radice del pacchetto

  hostApiVersion,   // Numero di versione delle API host
  hookName,         // Nome dell'hook corrente: "buildRequest" | "applyResult" | ""
  debugMode,        // Se in modalità debug

  fetch,            // Fetch globale (se disponibile)
  Buffer,           // Buffer di Node.js (se disponibile)
  btoa,             // Codifica Base64 (se disponibile)
  atob,             // Decodifica Base64 (se disponibile)
  TextEncoder,      // Codificatore di testo (se disponibile)
  TextDecoder,      // Decodificatore di testo (se disponibile)
  FileReader,       // Lettore di file (se disponibile)
  navigator,        // Oggetto Navigator (se disponibile)
}
```

**Best practice:** Preferire `runtime.hostApi` (API di alto livello); utilizzare `runtime.handlers` o `runtime.zotero` solo quando `hostApi` non soddisfa le proprie esigenze.

## 1. buildRequest — Costruzione della richiesta

Quando la `request` dichiarativa in `workflow.json` non è sufficiente per descrivere una richiesta complessa, utilizzare `buildRequest` per costruire dinamicamente il payload della richiesta.

**Firma:**

```ts
function buildRequest({
  selectionContext,  // Contesto di selezione filtrato
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Contesto di runtime
}): unknown
```

**Relazione con la richiesta dichiarativa:** `buildRequest` è mutualmente esclusivo con il campo `request` in `workflow.json`. Se entrambi esistono, `buildRequest` ha la priorità.

**Esempio: richiesta pass-through**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**Esempio: richiesta di sequenza multi-step**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveAttachmentPath(selectionContext, runtime);
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

## 2. normalizeSettings — Normalizzazione dei parametri

Normalizzare i parametri prima che le impostazioni vengano persistite o prima dell'esecuzione.

**Firma:** Questo Hook riceve parametri diversi a seconda della fase:

```ts
function normalizeSettings(args: {
  // fase persisted: quando i parametri vengono salvati nelle preferenze
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // fase execution: prima dell'esecuzione
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Casi d'uso:**

- Validazione incroicata tra parametri (ad esempio, quando l'opzione A è impostata su un determinato valore, il valore predefinito dell'opzione B dovrebbe cambiare)
- Gestione della retrocompatibilità dei parametri (ad esempio, migrazione dei vecchi parametri alle nuove versioni)
- Pulizia dei valori non validi prima dell'esecuzione

## 3. applyResult — Gestione del risultato (Obbligatorio)

Questo è l'**unico Hook obbligatorio** per un Workflow, responsabile della scrittura dei risultati di esecuzione del backend in Zotero.

**Firma:**

```ts
function applyResult({
  parent,           // Elemento genitore Zotero
  bundleReader,     // Lettore del bundle dei risultati
  resultContext,    // Contesto strutturato dei risultati
  sequenceStep,     // Metadati del passo di sequenza (presente nelle esecuzioni di sequenza)
  productStorage,   // API di archiviazione degli artifact
  request,          // Richiesta originale inviata
  runResult,        // Metadati del risultato dell'esecuzione
  manifest,         // workflow.json
  runtime,          // Contesto di runtime
}): unknown

// forma di sequenceStep:
// {
//   id: string;           // ID del passo
//   index: number;        // Indice in base zero nella sequenza
//   workflowId: string;   // ID del sotto-Workflow per questo passo
//   skillId: string;      // ID della Skill eseguita in questo passo
//   finalStep: boolean;   // Se questo è il passo finale
//   phase: "sequence-step";
// }
```

**Utilizzo di bundleReader:**

```js
// Leggere i file nel bundle ZIP degli artifact
const digestMd = await bundleReader.readText("artifacts/digest.md");

// Ottenere il percorso della directory degli artifact estratta
const extractedDir = await bundleReader.getExtractedDir();
```

**Esempio: Scrivere note da un bundle**

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

**Esempio: Estrarre file da un bundle su disco (stile MinerU)**

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

## Funzioni helper degli Hook (helpers)

`runtime.helpers` fornisce un insieme di funzioni ausiliarie:

| Funzione | Descrizione |
|----------|-------------|
| `getAttachmentParentId(entry)` | Ottenere l'ID dell'elemento genitore di un allegato |
| `getAttachmentFilePath(entry)` | Ottenere il percorso locale del file dell'allegato |
| `getAttachmentFileName(entry)` | Ottenere il nome del file dell'allegato |
| `getAttachmentFileStem(entry)` | Ottenere il nome del file dell'allegato (senza estensione) |
| `getAttachmentDateAdded(entry)` | Ottenere il timestamp `dateAdded` dell'allegato |
| `basenameOrFallback(path, fallback)` | Estrarre il nome di base o restituire una stringa di ripiego |
| `isMarkdownAttachment(entry)` | Verificare se è un allegato Markdown |
| `isPdfAttachment(entry)` | Verificare se è un allegato PDF |
| `pickEarliestPdfAttachment(entries)` | Selezionare il PDF più vecchio da un elenco di allegati |
| `cloneSelectionContext(ctx)` | Copia profonda del contesto di selezione |
| `withFilteredAttachments(ctx, items)` | Mantenere solo gli allegati specificati nel contesto |
| `resolveItemRef(ref)` | Risolvere un riferimento a un elemento in un Zotero.Item |
| `toHtmlNote(title, body)` | Convertire Markdown in contenuto di nota HTML |
| `normalizeReferenceAuthors(value)` | Normalizzare l'elenco degli autori di riferimento |
| `normalizeReferenceEntry(entry, index)` | Normalizzare una singola voce di riferimento |
| `normalizeReferencesArray(value)` | Normalizzare un array di riferimenti |
| `normalizeReferencesPayload(payload)` | Normalizzare un oggetto payload di riferimenti |
| `replacePayloadReferences(payload, refs)` | Sostituire i riferimenti in un payload |
| `resolveReferenceSource(entry)` | Risolvere il campo source di un riferimento |
| `renderReferenceLocator(entry)` | Generare la stringa locator volume/issue/pagine |
| `renderReferencesTable(references)` | Generare i riferimenti come tabella HTML |

## Prossimi passi

- [Contesto di selezione](selection-context) — Struttura dettagliata del selectionContext
- [Riferimento API host](host-api) — Riferimento API completo
- [Pacchettizzazione e distribuzione](packaging) — Come pacchettizzare e distribuire i Workflow
