# Workflow-Manifest schreiben

`workflow.json` ist die Manifest-Datei für einen Workflow, die alle Metadaten und das Verhalten definiert. Der Workflow-Manager entdeckt und lädt Workflows über diese Datei.

## Grundstruktur

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Feldreferenz

### Grundidentifikation

| Feld | Erforderlich | Typ | Beschreibung |
|------|--------------|-----|-------------|
| `id` | ✅ | string | Eindeutiger Bezeichner; darf nicht dupliziert werden. kebab-case empfohlen |
| `label` | ✅ | string | Für Benutzer sichtbarer Anzeigename |
| `version` | | string | Semantische Versionsnummer, z. B. `"1.0.0"` |
| `provider` | ✅ | string | Backend-Typ. Siehe unten für verfügbare Werte |

### Provider-Werte

| Wert | Beschreibung |
|------|-------------|
| `"pass-through"` | Rein lokale Ausführung, kein Backend erforderlich. Geeignet für Dateioperationen, Exporte usw. |
| `"skillrunner"` | Skills über das Skill-Runner-Backend ausführen |
| `"acp"` | Skills über das ACP-Backend ausführen |
| `"generic-http"` | APIs über das Generic-HTTP-Backend aufrufen |

`provider` bestimmt, mit welchen Backend-Typen der Workflow kompatibel ist, und bestimmt auch, welche Backends im Dashboard als ausführbar angezeigt werden.

### Anzeigekontrolle

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Processing: {query}",
  "debug_only": false
}
```

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `display.core` | boolean | Ob als Kern-Workflow markiert (bevorzugte Anzeige im Dashboard, mit Kern-Abzeichen) |
| `display.emoji` | string | Anzeige-Präfix-Icon, z. B. `"📖"` |
| `taskNameTemplate` | string | Aufgabennamenvorlage mit `{Parametername}`-Platzhaltern, zur Laufzeit durch tatsächliche Werte ersetzt |
| `debug_only` | boolean | Wenn `true`, nur im Debug-Modus sichtbar |

### Eingabe-Definition

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| Feld | Beschreibung |
|------|-------------|
| `unit` | **Eingabeeinheitstyp**. `"attachment"` (Anhang), `"parent"` (übergeordnetes Element), `"note"` (Notiz), `"workflow"` (keine Elementauswahl erforderlich, direkt aus dem Dashboard ausgelöst) |
| `accepts.mime` | Akzeptierte MIME-Typen (nur anwendbar bei `unit: "attachment"`). Wenn nicht angegeben, werden alle Typen akzeptiert |
| `per_parent.min` | Mindestanzahl von Anhängen pro übergeordnetem Element |
| `per_parent.max` | Maximale Anzahl von Anhängen pro übergeordnetem Element |

Wenn `unit: "workflow"`, sind keine benutzerausgewählten Elemente zum Auslösen erforderlich (z. B. "Topic Synthesis erstellen").

### <a id="selection-validation"></a>validateSelection — Auswahlvalidierung

`validateSelection` ist deklarative Auswahlvalidierung. Sie deckt häufige Szenarien ab wie "Elemente überspringen, die bereits Ergebnisse haben" oder "nur Auswahlen bestimmter Typen akzeptieren" — ohne JavaScript zu schreiben.

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

### `select` — Auswahlrichtlinie

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `select.policy` | string | Auswahlrichtlinie. Unterstützte Werte unten |
| `select.unit` | string | Überschreibt die Eingabeeinheit für die Auswahlvalidierung. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**Unterstützte `select.policy`-Werte:**

| Richtlinie | Beschreibung |
|------------|-------------|
| `input-unit` | Elemente akzeptieren, die der Eingabeeinheit entsprechen |
| `literature-source` | Literaturquellen akzeptieren (Anhänge oder übergeordnete Elemente mit erweiterbaren Anhängen) |
| `pdf-attachment` | Nur PDF-Anhänge akzeptieren |
| `selected-parent` | Übergeordnete Elemente aus der Auswahl akzeptieren |
| `generated-note-candidates` | Kandidatenelemente für generierte Notizen akzeptieren |
| `digest-representative-image` | Zielelemente für repräsentative Bildextraktion |

### `require` — Auswahlanforderungen

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `require.counts.parents` | number | Mindestanzahl erforderlicher übergeordneter Elemente |
| `require.counts.attachments` | number | Mindestanzahl erforderlicher Anhangselemente |
| `require.counts.notes` | number | Mindestanzahl erforderlicher Notizelemente |
| `require.counts.children` | number | Mindestanzahl erforderlicher Kindelemente |
| `require.counts.total` | number | Mindestgesamtanzahl erforderlicher Elemente |
| `require.allowMixed` | boolean | Ob das Mischen verschiedener Elementtypen in der Auswahl erlaubt ist |

### `exclude` — Ausschlussregeln

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `exclude[]` | array | Liste von Ausschlussregeln. Wenn eine Regel zutrifft, wird das aktuelle Element übersprungen |

**Unterstützte `exclude.kind`-Werte:**

| kind | Beschreibung | Zusätzliche Parameter |
|------|-------------|----------------------|
| `generated-notes-all` | Das Element hat bereits generierte Notizen des angegebenen Typs | `noteKinds`: Liste der Notiztypen, z. B. `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | Das Element hat bereits das angegebene Artefakt (um redundante Ausführung zu vermeiden) | `target`: `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`; `parameter`: optionaler Sprachparameter für Artefaktabgleich |

### `derive` — Abgeleitete Auswahlen

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `derive[]` | array | Abgeleitete Auswahloperationen. `"exportCandidates"` — Kandidaten für Notizexport ableiten; `"digestRepresentativeImageTarget"` — repräsentative Bildziele aus Digest-Notizen ableiten |

**Beispiel:**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> In diesem Beispiel werden Elemente, die bereits das Deep-Reading-HTML-Artefakt haben, automatisch übersprungen, ohne dass der Benutzer manuell filtern muss.

### Trigger-Kontrolle

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| Feld | Beschreibung |
|------|-------------|
| `requiresSelection` | Ob benutzerausgewählte Elemente zum Auslösen erforderlich sind. Standardmäßig `true`. Wenn auf `false` gesetzt, kann der Workflow aus dem Dashboard ausgeführt werden, ohne Elemente auszuwählen. Wird normalerweise auf `false` gesetzt, wenn `inputs.unit: "workflow"` |

### Ausführungskontrolle

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| Feld | Beschreibung |
|------|-------------|
| `timeout_ms` | Timeout in Millisekunden (nur wirksam für Generic-HTTP-Backends) |
| `poll_interval_ms` | Abfrageintervall in Millisekunden, steuert die Fortschrittsprüfungshäufigkeit |
| `mcp.requiredTools` | Von diesem Workflow erforderliche MCP-Tools (Array von Tool-Namen-Strings) |
| `zoteroHostAccess.required` | Ob Zotero-Host-Zugriff erforderlich ist (zum Lesen/Schreiben von Bibliotheksdaten) |
| `zoteroHostAccess.allowWriteApprovalBypass` | Ob Umgehung der Schreibgenehmigung erlaubt ist |
| `feedback.showNotifications` | Ob Benachrichtigungen angezeigt werden. Standardmäßig `true`; auf `false` setzen für stille Ausführung |

> Der **Ausführungsmodus** (`auto` / `interactive`) wurde nach `request.create.mode` verschoben — siehe [Anfragetypen](request-kinds).

### Ergebnis-Abruf

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| Feld | Beschreibung |
|------|-------------|
| `fetch.type` | Abrufmethode. `"bundle"` (ZIP-Bundle herunterladen), `"result"` (nur Ergebnis-JSON abrufen) |
| `final_step_id` | Für Sequenz-Workflows: Gibt die ID des letzten Schritts an, verwendet zur Bestimmung des Endergebnisses |
| `expects.result_json` | Erwarteter Ergebnis-JSON-Dateipfad (relativ zum Laufzeit-Arbeitsbereich) |
| `expects.artifacts` | Liste erwarteter Artefakt-Dateipfade |

### Anfrage-Definition

Deklarative Anfrage-Definition, **gegenseitig ausschließend** mit `hooks.buildRequest` (wenn beide vorhanden sind, hat `hooks.buildRequest` Vorrang).

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
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

Für detaillierte Informationen zu jedem `kind` siehe [Anfragetypen](request-kinds).

### Hook-Deklaration

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Feld | Erforderlich | Beschreibung |
|------|--------------|-------------|
| `applyResult` | ✅ | **Erforderlich**. Skriptpfad für Ergebnisverarbeitung nach der Ausführung |
| `buildRequest` | | Optional. Die an das Backend zu sendende Anfrage erstellen. Gegenseitig ausschließend mit dem `request`-Feld |
| `normalizeSettings` | | Optional. Vom Benutzer gesetzte Parameter normalisieren |

> Die **Eingabefilterung** wurde durch den deklarativen `validateSelection`-Mechanismus ersetzt — siehe [Auswahlvalidierung](#selection-validation) unten.

Pfade sind relativ zum Verzeichnis, das `workflow.json` enthält.

### Lokalisierung

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "My Workflow",
        "parameters.language.title": "Language"
      }
    }
  }
}
```

Siehe die Seite [Lokalisierung](localization) für detaillierte Informationen.

### Vollständiges Beispiel: Ein Literaturanalyse-Workflow mit Parametern

```json
{
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## Nächste Schritte

- [Hook-System](hooks) — API-Signaturen und Schreibmethoden für jeden Hook kennenlernen
- [Parametersystem](parameters) — Parametertypen, Enum-Werte, dynamische Optionsquellen
- [Auswahl & Kontext](selection-context) — Wie man Informationen über benutzerausgewählte Elemente erhält
