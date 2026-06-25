# Anfragetypen

Workflows bestimmen durch Deklaration von `request.kind`, welcher Provider (Executor) die Anfrage verarbeitet. Das System verfügt über mehrere eingebaute Anfragetypen, die verschiedenen Backends und Ausführungsmodi entsprechen.

## Anfragetypen-Übersicht

| `kind` | Anwendbarer Provider | Beschreibung |
|--------|----------------------|-------------|
| `pass-through.run.v1` | pass-through | Rein lokale Ausführung, kein Remote-Backend beteiligt |
| `skillrunner.job.v1` | skillrunner / acp | Einstufige SkillRunner-Skill-Ausführung |
| `skillrunner.sequence.v1` | acp | Mehrstufige verkettete Skill-Ausführung |
| `acp.prompt.v1` | acp | Sendet einen Prompt direkt an das ACP-Backend |
| `acp.skill.run.v1` | acp | Reicht einen Skill-Lauf direkt beim ACP-Backend ein |
| `generic-http.request.v1` | generic-http | Einstufiger HTTP-API-Aufruf |
| `generic-http.steps.v1` | generic-http | Mehrstufige HTTP-API-Aufrufe |

## pass-through.run.v1 — Rein lokale Ausführung

Kein Remote-Backend erforderlich; Ausführung direkt im Plugin. Geeignet für rein lokale Szenarien wie Dateioperationen und Datenexport.

```json
{
  "provider": "pass-through",
  "request": {
    "kind": "pass-through.run.v1"
  }
}
```

Beim Konstruieren der Anfrage im `buildRequest`-Hook werden typischerweise `selectionContext` und `parameter` übergeben:

```js
export function buildRequest({ selectionContext, executionOptions }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

## skillrunner.job.v1 — Einstufige Skill-Ausführung

Reicht eine einzelne Skill-Ausführungsanfrage beim Skill-Runner-Backend ein. Fragt nach der Einreichung Ergebnisse ab.

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

| Feld | Beschreibung |
|------|-------------|
| `create.skill_id` | Bezeichner des auszuführenden Skills |
| `create.skill_source` | Skill-Quelle. `"local-package"` (im Paket gebündelt), `"installed"` (bereits installiert) |
| `input.upload.files` | Liste der hochzuladenden Dateien. `from` kann `"selected.markdown"`, `"selected.pdf"`, `"selected.source"` sein |
| `poll.interval_ms` | Abfrageintervall (Millisekunden) |
| `poll.timeout_ms` | Gesamt-Timeout (Millisekunden) |

Wenn der Workflow das ACP-Backend wählt, passt sich `skillrunner.job.v1` automatisch an `acp.skill.run.v1` an, sodass Workflows, die als `skillrunner.job.v1` deklariert sind, auch mit dem ACP-Backend kompatibel sind.

## skillrunner.sequence.v1 — Mehrstufige Skill-Verkettung

Wenn mehrere Skills sequenziell verkettet werden müssen (wobei die Ausgabe eines Schritts zur Eingabe des nächsten wird), verwenden Sie die Sequenz-Ausführung. Typische Szenarien umfassen mehrstufige Pipelines (z. B. der dreistufige Fluss der Topic Synthesis: prepare → core enrichment → finalize), wobei jeder Schritt von einem anderen Skill verarbeitet wird und Zwischenergebnisse über den Handoff-Mechanismus weitergibt.

Verkettet mehrere Skills sequenziell, wobei die Ausgabe eines Schritts als Eingabe des nächsten dienen kann (Handoff).

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

### Schritt-Konfiguration

| Feld | Beschreibung |
|------|-------------|
| `id` | Eindeutiger Bezeichner für den Schritt, vom Handoff referenziert |
| `skill_id` | Bezeichner des auszuführenden Skills |
| `mode` | **Erforderlich.** Ausführungsmodus: `"auto"` (nicht-interaktiv) oder `"interactive"` (erfordert Benutzereingabe) |
| `workspace` | Workspace-Richtlinie. `"new"` (neuen Workspace erstellen), `"reuse-workflow"` (übergeordneten Workspace wiederverwenden) |
| `parameter` | An den Skill übergebene Parameter |
| `input` | An den Skill übergebene Eingabedaten |
| `short_circuit` | Regeln für vorzeitigen Abbruch. Siehe unten |
| `fetch_type` | Fetch-Typ pro Schritt angeben. `"bundle"` (ZIP-Artefakt-Bundle herunterladen); wenn nicht angegeben, wird der Workflow-weite `result.fetch.type` verwendet |
| `apply_result` | Schrittweise Ergebnis-Anwendung: `workflow_id` gibt an, welches Sub-Workflow-`applyResult` aufgerufen wird; `on_failure` steuert das Verhalten bei Fehlern (`"continue"` oder `"fail_sequence"`) |
| `include_if` | Bedingte Schritt-Ausführung. Entweder `{ kind: "parameter", parameter: "...", equals: ... }` zur Prüfung eines Workflow-Parameters oder `{ kind: "runtime", condition: "..." }` für Laufzeitbedingungen |

### Vorzeitiger Abbruch (short_circuit)

Wenn der Rückgabewert eines Schritts Bedingungen erfüllt, werden nachfolgende Schritte übersprungen und die Ausgabe des aktuellen Schritts als Endergebnis verwendet.

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

| Feld | Beschreibung |
|------|-------------|
| `when.path` | Welches Feld im Schritt-Ausgabe-JSON geprüft wird |
| `when.equals` | Löst Abbruch aus, wenn der Feldwert diesem Wert entspricht |
| `result` | Ergebnis nach dem Abbruch: `"step_output"` (vollständige Ausgabe des aktuellen Schritts) |

### Handoff-Konfiguration

Handoff übergibt Daten von einem Schritt an nachfolgende Schritte über ein `bindings`-Array. Jedes Binding beschreibt einen einzelnen Wert- oder Dateitransfer.

**Vollständige Durchleitung (alle Ausgabefelder eines vorangegangenen Schritts):**

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

**Selektive Feldzuordnung:**

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

| Binding-Feld | Beschreibung |
|--------------|-------------|
| `kind` | `"value"` für Datenwerte, `"file"` für Dateireferenzen |
| `step` | Quell-Schritt-ID (aus welchem Schritt die Ausgabe gelesen wird). Wenn weggelassen, wird aus dem unmittelbar vorangegangenen Schritt gelesen |
| `source` | Feldname im Ausgabe-JSON des Quell-Schritts |
| `target` | JSON-Pfad, wohin der Wert in der Eingabe des aktuellen Schritts geschrieben werden soll (z. B. `"/input/field_name"`) |
| `required` | Wenn `true`, schlägt der Schritt fehl, wenn der Quellwert fehlt. Standardmäßig `false` |
| `value` | Für `kind: "value"`, ein literaler Wert zur Übergabe (verwendet, wenn `step`/`source` weggelassen werden) |

## generic-http.request.v1 — HTTP-API-Aufruf

Sendet eine einzelne HTTP-Anfrage an das Generic-HTTP-Backend.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.request.v1"
  }
}
```

Wird häufig zum Aufruf externer REST-APIs verwendet (z. B. MinerU-PDF-Parsing-Dienst).

## generic-http.steps.v1 — Mehrstufige HTTP-Aufrufe

Führt mehrere HTTP-Anfrageschritte sequenziell aus.

```json
{
  "provider": "generic-http",
  "request": {
    "kind": "generic-http.steps.v1"
  }
}
```

## Wie wählt man den richtigen Provider

| Ihr Workflow muss... | Provider wählen | Anfragetyp |
|----------------------|-----------------|------------|
| Rein lokale Operationen durchführen, keine Remote-Aufrufe | `pass-through` | `pass-through.run.v1` |
| Einen einzelnen Skill an Skill-Runner übermitteln | `skillrunner` | `skillrunner.job.v1` |
| Mehrere Skills sequenziell verketten | `acp` | `skillrunner.sequence.v1` |
| Eine HTTP-API aufrufen | `generic-http` | `generic-http.request.v1` |

Hinweis: `provider` ist das einzige Feld, das bestimmt, mit welchen Backends ein Workflow kompatibel ist. `request.kind` wird nur zur Weiterleitung an den richtigen Executor verwendet und nimmt nicht an der Backend-Kompatibilitätsschlussfolgerung teil.

## Nächste Schritte

- [Debugging & Testen](#doc/workflows%2Fcustom%2Fdebugging) — Workflow-Anfragen und -Antworten verifizieren
- [Paketerstellung & Bereitstellung](#doc/workflows%2Fcustom%2Fpackaging) — Workflows für Benutzer veröffentlichen
