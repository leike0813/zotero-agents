# Hook-System

Hooks sind die Erweiterungspunkte eines Workflows — an verschiedenen Stellen der Workflow-Ausführung ruft die Workflow-Runtime des Plugins die entsprechenden Hook-Skripte auf, sodass Sie mit JavaScript in den Ausführungsablauf eingreifen und ihn steuern können.

Ein Workflow kann bis zu **3 Hooks** enthalten, wobei `applyResult` der einzige erforderliche ist.

> **Hinweis zur Eingabefilterung:** Der alte `filterInputs`-Hook wurde durch den deklarativen `validateSelection`-Mechanismus ersetzt. Verwenden Sie `validateSelection` in `workflow.json`, um Eingabeeinschränkungen ohne JavaScript zu definieren. Siehe [Manifest-Datei erstellen](#doc/workflows%2Fcustom%2Fmanifest#selection-validation) für Details.

## Hook-Skriptstruktur

Jedes Hook-Skript ist eine `.mjs`-Datei (ES-Modul), die benannte Funktionen exportiert:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // Implementierungslogik
  return requestSpec;
}
```

## Laufzeit-Kontext (runtime)

Alle Hooks erhalten einen `runtime`-Parameter, der direkten Zugriff auf Zotero und verschiedene Tools bietet.

```js
runtime = {
  zotero,           // Zotero globales Objekt
  handlers,         // Niedrigstufige Datenverarbeitungshandler
  hostApi,          // Hochstufige Host-API (empfohlen)
  helpers,          // Hook-Hilfsfunktionen
  addon,            // Plugin-Konfiguration

  workflowId,       // Aktuelle Workflow-ID
  workflowRootDir,  // Absoluter Pfad des Verzeichnisses, das workflow.json enthält
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // Besitzende Paket-ID (nur innerhalb von Workflow-Paketen verfügbar)
  packageRootDir,   // Absoluter Pfad des Paketstammverzeichnisses

  hostApiVersion,   // Host-API-Versionsnummer
  hookName,         // Aktueller Hook-Name: "buildRequest" | "applyResult" | ""
  debugMode,        // Ob im Debug-Modus

  fetch,            // Globaler Fetch (falls verfügbar)
  Buffer,           // Node.js Buffer (falls verfügbar)
  btoa,             // Base64-Kodierung (falls verfügbar)
  atob,             // Base64-Dekodierung (falls verfügbar)
  TextEncoder,      // Textkodierer (falls verfügbar)
  TextDecoder,      // Textdekodierer (falls verfügbar)
  FileReader,       // Dateileser (falls verfügbar)
  navigator,        // Navigator-Objekt (falls verfügbar)
}
```

**Best Practice:** Bevorzugen Sie `runtime.hostApi` (hochstufige API); verwenden Sie `runtime.handlers` oder `runtime.zotero` nur, wenn `hostApi` Ihre Anforderungen nicht erfüllt.

## 1. buildRequest — Anfrage erstellen

Wenn die deklarative `request` in `workflow.json` nicht ausreicht, um eine komplexe Anfrage zu beschreiben, verwenden Sie `buildRequest`, um die Anfrage-Nutzlast dynamisch zu konstruieren.

**Signatur:**

```ts
function buildRequest({
  selectionContext,  // Gefilterter Auswahlkontext
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // Laufzeit-Kontext
}): unknown
```

**Beziehung zur deklarativen Anfrage:** `buildRequest` schließt das `request`-Feld in `workflow.json` gegenseitig aus. Wenn beide vorhanden sind, hat `buildRequest` Vorrang.

**Beispiel: Pass-Through-Anfrage**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**Beispiel: Mehrstufige Sequenzanfrage**

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

## 2. normalizeSettings — Parameter normalisieren

Parameter normalisieren, bevor Einstellungen gespeichert oder vor der Ausführung.

**Signatur:** Dieser Hook erhält je nach Phase unterschiedliche Parameter:

```ts
function normalizeSettings(args: {
  // persisted-Phase: wenn Parameter in Einstellungen gespeichert werden
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // execution-Phase: vor der Ausführung
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**Anwendungsfälle:**

- Kreuzvalidierung zwischen Parametern (z. B. wenn Option A auf einen bestimmten Wert gesetzt ist, sollte sich der Standard für Option B ändern)
- Parameter-Downgrade-Behandlung (z. B. Migration alter Parameter auf neue Versionen)
- Bereinigung ungültiger Werte vor der Ausführung

## 3. applyResult — Ergebnis verarbeiten (erforderlich)

Dies ist der **einzige erforderliche Hook** für einen Workflow, verantwortlich für das Schreiben der Ausführungsergebnisse des Backends in Zotero.

**Signatur:**

```ts
function applyResult({
  parent,           // Übergeordnetes Zotero-Element
  bundleReader,     // Ergebnis-Bundle-Reader
  resultContext,    // Strukturierter Ergebnis-Kontext
  sequenceStep,     // Sequenzschritt-Metadaten (vorhanden bei Sequenzläufen)
  productStorage,   // Artefakt-Speicher-API
  request,          // Ursprüngliche gesendete Anfrage
  runResult,        // Lauf-Ergebnis-Metadaten
  manifest,         // workflow.json
  runtime,          // Laufzeit-Kontext
}): unknown

// sequenceStep-Form:
// {
//   id: string;           // Schritt-ID
//   index: number;        // Nullbasierter Index in der Sequenz
//   workflowId: string;   // Sub-Workflow-ID für diesen Schritt
//   skillId: string;      // In diesem Schritt ausgeführte Skill-ID
//   finalStep: boolean;   // Ob dies der letzte Schritt ist
//   phase: "sequence-step";
// }
```

**Verwendung von bundleReader:**

```js
// Dateien im Artefakt-ZIP-Bundle lesen
const digestMd = await bundleReader.readText("artifacts/digest.md");

// Pfad zum extrahierten Artefaktverzeichnis abrufen
const extractedDir = await bundleReader.getExtractedDir();
```

**Beispiel: Notizen aus einem Bundle schreiben**

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

**Beispiel: Dateien aus einem Bundle auf Festplatte extrahieren (MinerU-Stil)**

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

## Hook-Hilfsfunktionen (helpers)

`runtime.helpers` bietet eine Reihe von Hilfsfunktionen:

| Funktion | Beschreibung |
|----------|-------------|
| `getAttachmentParentId(entry)` | Ruft die übergeordnete Element-ID eines Anhangs ab |
| `getAttachmentFilePath(entry)` | Ruft den lokalen Dateipfad eines Anhangs ab |
| `getAttachmentFileName(entry)` | Ruft den Dateinamen des Anhangs ab |
| `getAttachmentFileStem(entry)` | Ruft den Dateinamen des Anhangs (ohne Erweiterung) ab |
| `getAttachmentDateAdded(entry)` | Ruft den `dateAdded`-Zeitstempel des Anhangs ab |
| `basenameOrFallback(path, fallback)` | Extrahiert den Basisnamen oder gibt einen Ausweich-String zurück |
| `isMarkdownAttachment(entry)` | Prüft, ob es ein Markdown-Anhang ist |
| `isPdfAttachment(entry)` | Prüft, ob es ein PDF-Anhang ist |
| `pickEarliestPdfAttachment(entries)` | Wählt das früheste PDF aus einer Anhangsliste aus |
| `cloneSelectionContext(ctx)` | Erstellt eine Tiefenkopie des Auswahlkontexts |
| `withFilteredAttachments(ctx, items)` | Behält nur die angegebenen Anhänge im Kontext |
| `resolveItemRef(ref)` | Löst eine Elementreferenz zu einem Zotero.Item auf |
| `toHtmlNote(title, body)` | Konvertiert Markdown in HTML-Notizinhalt |
| `normalizeReferenceAuthors(value)` | Normalisiert die Referenz-Autorenliste |
| `normalizeReferenceEntry(entry, index)` | Normalisiert einen einzelnen Referenzeintrag |
| `normalizeReferencesArray(value)` | Normalisiert ein Array von Referenzen |
| `normalizeReferencesPayload(payload)` | Normalisiert ein Referenzen-Nutzlastobjekt |
| `replacePayloadReferences(payload, refs)` | Ersetzt Referenzen in einer Nutzlast |
| `resolveReferenceSource(entry)` | Löst das Quellfeld einer Referenz auf |
| `renderReferenceLocator(entry)` | Rendert die Band/Ausgabe/Seiten-Locator-Zeichenfolge |
| `renderReferencesTable(references)` | Rendert Referenzen als HTML-Tabelle |

## Nächste Schritte

- [Auswahlkontext](#doc/workflows%2Fcustom%2Fselection-context) — Detaillierte Struktur von selectionContext
- [Host-API-Referenz](#doc/workflows%2Fcustom%2Fhost-api) — Vollständige API-Referenz
- [Paketerstellung & Bereitstellung](#doc/workflows%2Fcustom%2Fpackaging) — Wie man Workflows paketiert und bereitstellt
