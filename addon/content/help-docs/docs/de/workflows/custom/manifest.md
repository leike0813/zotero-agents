# Workflow-Manifest schreiben

`workflow.json` ist die Manifest-Datei für einen Workflow, die alle Metadaten und das Verhalten definiert. Der Workflow-Manager entdeckt und lädt Workflows über diese Datei.

## Grundstruktur

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
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

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
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

> Der **Ausführungsmodus** (`auto` / `interactive`) wurde nach `request.create.mode` verschoben — siehe [Anfragetypen](#doc/workflows%2Fcustom%2Frequest-kinds).

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

Für detaillierte Informationen zu jedem `kind` siehe [Anfragetypen](#doc/workflows%2Fcustom%2Frequest-kinds).

### Hook-Deklaration

```json
{
  "hooks": {
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| Feld | Erforderlich | Beschreibung |
|------|--------------|-------------|
| `applyResult` | ✅ | **Erforderlich**. Skriptpfad für Ergebnisverarbeitung nach der Ausführung |
| `preflight` | | Optional. Läuft nach der Auswahlauflösung und vor der Anfragekonstruktion. Kann fortsetzen, überspringen, zu `applyResult` kurzschließen oder eine Eingabe-Unit durch virtuelle Anfrage-Units ersetzen |
| `buildRequest` | | Optional. Die an das Backend zu sendende Anfrage erstellen. Gegenseitig ausschließend mit dem `request`-Feld |
| `normalizeSettings` | | Optional. Vom Benutzer gesetzte Parameter normalisieren |

> Die **Eingabefilterung** wurde durch den deklarativen `validateSelection`-Mechanismus ersetzt — siehe [Auswahlvalidierung](#selection-validation) unten.

`preflight` nimmt nicht an der Menü-Aktivierung, der Debug-Probe-Auswahlklassifizierung oder den Host-Bridge-Bereitschaftsprüfungen teil. Behalten Sie Auswahlbeschränkungen in `validateSelection`, Provider-Anfragekonstruktion in `buildRequest` oder `request` und Zotero-Schreibvorgänge in `applyResult`.

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

Siehe die Seite [Lokalisierung](#doc/workflows%2Fcustom%2Flocalization) für detaillierte Informationen.

### Vollständiges Beispiel: Ein Literaturanalyse-Workflow mit Parametern

```json
{
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
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

- [Hook-System](#doc/workflows%2Fcustom%2Fhooks) — API-Signaturen und Schreibmethoden für jeden Hook kennenlernen
- [Parametersystem](#doc/workflows%2Fcustom%2Fparameters) — Parametertypen, Enum-Werte, dynamische Optionsquellen
- [Auswahl & Kontext](#doc/workflows%2Fcustom%2Fselection-context) — Wie man Informationen über benutzerausgewählte Elemente erhält
