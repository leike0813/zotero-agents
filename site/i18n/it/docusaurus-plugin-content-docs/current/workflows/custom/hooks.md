# Sistema Hook

Gli hook sono i punti di estendibilità di un Workflow — in diverse fasi dell'esecuzione del Workflow, il Workflow Runtime del plugin chiama gli script Hook corrispondenti, consentendo di intervenire e controllare il flusso di esecuzione con JavaScript.

Un Workflow può contenere fino a **4 Hook**, di cui `applyResult` è l'unico obbligatorio.

> **Nota sul filtraggio degli input:** Il vecchio hook `filterInputs` è stato sostituito dal meccanismo dichiarativo `validateSelection`. Utilizzare `validateSelection` in `workflow.json` per definire i vincoli di input senza scrivere JavaScript. Vedere [Redazione del file Manifest](manifest#selection-validation) per i dettagli.

## Struttura degli script Hook

Ogni script Hook è un file `.mjs` (ES Module) che esporta funzioni con nome:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, preflight, manifest, executionOptions, runtime }) {
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
  hookName,         // Nome dell'hook corrente: "preflight" | "buildRequest" | "applyResult" | ""
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
  preflight,         // Piano/unità/contesto preflight opzionale
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Contesto di runtime
}): unknown
```

**Relazione con la richiesta dichiarativa:** `buildRequest` è mutualmente esclusivo con il campo `request` in `workflow.json`. Se entrambi esistono, `buildRequest` ha la priorità.

Quando un Workflow dichiara `hooks.preflight`, il runtime passa il contesto preflight normalizzato a `buildRequest` come `preflight`. Questo contesto non viene unito a `selectionContext`; va trattato come metadati separati di pianificazione dell'esecuzione.

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

**Esempio: richiesta che utilizza il contesto dell'unità preflight**

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

**Esempio: richiesta di sequenza multi-step**

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

## 2. preflight — Pianificare o interrompere l'esecuzione

`preflight` viene eseguito dopo la risoluzione dichiarativa della selezione e prima di `buildRequest` o della costruzione dichiarativa della richiesta. Utilizzarlo per decisioni locali leggere che necessitano dell'unità di input risolta ma non devono far parte dell'abilitazione del menu.

`preflight` non deve scrivere dati in Zotero, non deve costruire richieste al provider e non deve sostituire `validateSelection`. Tutte le scritture in Zotero rimangono in `applyResult`, e tutti i payload delle richieste al provider rimangono in `buildRequest` o nel campo `request` del manifesto.

**Firma:**

```ts
function preflight({
  selectionContext,  // Contesto dell'unità di input risolta
  parent,            // Elemento genitore per l'unità corrente, se disponibile
  attachment,        // Elemento allegato per l'unità corrente, se disponibile
  note,              // Elemento nota per l'unità corrente, se disponibile
  manifest,          // workflow.json
  executionOptions,  // { workflowParams, providerOptions }
  runtime,           // Contesto di runtime
}): PreflightOutcome
```

**Risultato: Continue**

Proseguire con la normale costruzione della richiesta e, opzionalmente, allegare il contesto di pianificazione:

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

`context` è disponibile come `preflight.context` in `buildRequest` e come `resultContext.preflight.context` in `applyResult`.

**Risultato: Skip**

Saltare solo l'unità di input corrente:

```js
export function preflight({ parent }) {
  if (!parent?.DOI) {
    return { kind: "skip", reason: "missing DOI" };
  }
  return { kind: "continue" };
}
```

Se ogni unità di input viene saltata, l'esecuzione termina senza inviare job al provider.

**Risultato: Short-Circuit Apply**

Saltare l'esecuzione del provider e chiamare direttamente il percorso standard di `applyResult`:

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

Questo è utile per Workflow come un curatore di metadati: se una ricerca locale di un identificatore affidabile ha successo, `applyResult` può aggiornare l'elemento genitore senza chiamare un backend. Se la ricerca è mancante o di bassa qualità, restituire `continue` e lasciare che `buildRequest` costruisca la normale richiesta al backend.

**Risultato: Replace Units**

Sostituire un'unità di input risolta con più unità di richiesta virtuali:

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

Ogni unità virtuale passa attraverso il normale percorso `buildRequest`. Il contesto specifico dell'unità è disponibile in `preflight.unit.context`.

**Aggregate Single Apply**

Per Workflow con input suddivisi che devono unire più risultati del provider in un'unica scrittura finale in Zotero, aggiungere un piano di aggregazione:

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

Nella v1, l'applicazione aggregata supporta solo `mode: "single-apply"`, `applyWhen: "all-succeeded"` e `orderBy: "unit.order"`. I job figli del provider vengono raccolti e `applyResult` viene chiamato una sola volta dopo che tutti i figli hanno avuto successo. Se un figlio fallisce, non viene eseguita alcuna applicazione aggregata parziale.

## 3. normalizeSettings — Normalizzazione dei parametri

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

- Validazione incrociata tra parametri (ad esempio, quando l'opzione A è impostata su un determinato valore, il valore predefinito dell'opzione B dovrebbe cambiare)
- Gestione della retrocompatibilità dei parametri (ad esempio, migrazione dei vecchi parametri alle nuove versioni)
- Pulizia dei valori non validi prima dell'esecuzione

## 4. applyResult — Gestione del risultato (Obbligatorio)

Questo è l'**unico Hook obbligatorio** per un Workflow, responsabile della scrittura dei risultati di esecuzione del backend in Zotero.

**Firma:**

```ts
function applyResult({
  parent,           // Elemento genitore Zotero
  bundleReader,     // Lettore del bundle dei risultati
  resultContext,    // Contesto strutturato dei risultati, inclusi i metadati preflight/aggregate
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

Quando `preflight` è dichiarato, `resultContext.preflight` espone il piano di esecuzione, l'id dell'unità, il contesto dell'unità e il contesto condiviso per la chiamata corrente di apply. `selectionContext` non viene modificato da preflight.

Quando `replace-units` utilizza `aggregate.single-apply`, `resultContext.aggregate.children` contiene i risultati ordinati dei figli:

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

Un `applyResult` aggregato deve leggere ogni bundle figlio da `child.bundleReader`, unire gli artifact in ordine e scrivere il risultato finale in Zotero una sola volta. Ad esempio, un Workflow in stile MinerU può inviare un PDF come più job `page_ranges`, quindi unire i file `full.md` e assegnare namespace ai percorsi delle immagini prima di creare un unico allegato Markdown finale.

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
| `basenameOrFallback(path, fallback)` | Estrarre il nome di base o restituire una stringa di ripiego |
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
