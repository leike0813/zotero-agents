# ACP Skills

Der Tab ACP Skills dient zur Überwachung und Verwaltung von Skill-Ausführungen, die über das ACP-Backend ausgeführt werden. Im Gegensatz zum fortlaufenden Dialog des ACP Chat ist ACP Skills für einmalige oder periodisch ausgeführte Skill-Aufgaben konzipiert.

## Oberflächenübersicht

Das ACP Skills-Panel ist in folgende Hauptbereiche unterteilt:

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/acp-skills.webp" alt="ACP Skills-Panel" title="ACP Skills-Panel" loading="lazy" /><figcaption>ACP Skills-Panel</figcaption></figure>

```
┌─────────────────────────────────────┐
│  Banner: Task Title / Status / Backend   │
├─────────────────────────────────────┤
│  ← Run Drawer  │  Main Content Area  │  Details → │
│               │  Transcript View            │
│  Running      │  Plan Component             │
│  └─ backend1  │  Prompt Component           │
│     ├─ run A  │  Reply Area                 │
│     └─ run B  │                             │
│  Completed    │                             │
│  └─ backend1  │                             │
│     └─ run C  │                             │
└─────────────────────────────────────┘
```

## Banner

Der Banner-Bereich zeigt Metainformationen und Aktionsschaltflächen für die aktuell ausgewählte Ausführung:

- **Aufgabentitel**: Der Skill-Name der Ausführung
- **Status**: Ausführungsstatus-Anzeige (running / completed / failed / canceled usw.)
- **Backend**: Das ACP-Backend, das die Ausführung durchführt
- **Aktionsschaltflächen**: Verbinden/Trennen, Aufgabe abbrechen

## Ausführungs-Panel (links)

Das linke Panel organisiert alle ACP-Skill-Ausführungen in einer Baumstruktur:

### Gruppierung

| Gruppe | Beschreibung |
|--------|-------------|
| **Running** | Derzeit laufende Aufgaben, nach Backend gruppiert |
| **Completed** | Abgeschlossene Aufgaben, nach Backend gruppiert |

Jeder Aufgabeneintrag zeigt Zusammenfassungsinformationen (Skill-ID, Status, Zeit) und verfügt über einen Aufmerksamkeitsindikator (LED), der Statusänderungen markiert. Klicken Sie auf einen Aufgabeneintrag, um zur Detailansicht dieser Ausführung zu wechseln.

### Archivierung

Abgeschlossene Aufgaben können über die Archivierungsschaltfläche aus der Liste entfernt werden (die Archivierung blendet sie nur in der aktuellen Sitzung aus und beeinflusst nicht die Ausführungsprotokolle).

## Hauptbereich

### Transcript-Ansicht

Nach Auswahl einer Ausführung zeigt der Hauptbereich das vollständige Transcript dieser Ausführung an, einschließlich:

- **Nachrichten**: Dialoginhalte von Assistent und Benutzer
- **Tool-Aufrufe**: Von der KI aufgerufene Tools und deren Ergebnisse, mit Tool-Name, Eingabezusammenfassung und Status-LED
- **Denkprozess**: Der Denkprozess der KI (falls verfügbar)
- **Statusereignisse**: Zustandsänderungen während der Ausführung

Das Transcript unterstützt den **Plain-Modus** (Nachrichten links mit einem farbigen Rand je nach Rolle eingefärbt) und den **Bubble-Modus** (Nachrichten in Blasenform, aufeinanderfolgende Tool-Aufrufe werden automatisch zu Gruppen zusammengefasst), umschaltbar über die Schaltfläche in der oberen rechten Ecke.

### Plan-Komponente

Wenn eine Ausführung einen mehrstufigen Plan enthält, zeigt die Plan-Komponente den aktuellen Fortschritt, abgeschlossene Schritte und ausstehende Schritte an, wobei jeder Schritt ein Statussymbol hat (in-progress/completed/failed).

### Prompt-Komponente

Die Prompt-Komponente zeigt je nach Ausführungsstatus verschiedene interaktive Eingabeaufforderungen:

| Status | Anzeigeinhalt |
|--------|--------------|
| `waiting_user` | Eingabeaufforderung wartet auf Benutzerantwort, mit Kontextbeschreibung und Schnelloptionen |
| `permission` | Berechtigungsanfrage, mit Befehlsvorschau und Genehmigen/Ablehnen-Schaltflächen |
| `disconnected` | Wiederverbindungsaufforderung; klicken zum Verbinden |
| `running` | Fortschrittsanzeige |
| `completed` | Abschlussbestätigung |
| `error` | Fehlerinformationen und Fehlerbehebungsvorschläge |

### Antwortbereich

Der Antwortbereich unten enthält:

- **Texteingabefeld**: Antwortinhalt eingeben
- **Modusauswahl** (optional): Ausführungsmodus-Umschalter
- **Modellauswahl** (optional): KI-Modell-Umschalter
- **Reasoning Effort** (optional): Denkintensität
- **Senden/Abbrechen-Schaltfläche**
- **Nutzungsanzeige**: Kreisförmiges Diagramm mit dem Token-Verbrauch (used/limit)
- **Tastenkürzel-Hinweis**: Tastenkürzel zum Senden der Antwort

Antwortentwürfe werden pro Anfrage gespeichert – beim Wechsel zwischen Ausführungen und zurück bleibt der ungesendete Inhalt erhalten.

## Details-Panel (rechts)

Das rechte Panel zeigt detaillierte Informationen zur ausgewählten Ausführung mit folgenden einklappbaren Bereichen:

| Bereich | Inhalt |
|---------|--------|
| **Ausführungspfad** | Workspace-Verzeichnis, Ergebnisdateipfade |
| **Runner-Info** | backends, agent, mode, model, reasoning, skill, session |
| **Validierungsinformationen** | Validierungsstatus, Korrekturanzahl, Fehlerdetails |
| **Laufzeitabhängigkeiten** | Liste der Laufzeitumgebungsabhängigkeiten |
| **Ausgabe-Revision** | Revisionsgeschichte der Ausgabe |
| **Laufzeitprotokoll** | Protokolleinträge während der Ausführung |
| **Ergebnis-JSON** | Endgültige strukturierte Ausgabe (erweiterbar) |

## Berechtigungsverwaltung

Wenn eine Ausführung Zotero-Schreibberechtigungen oder ACP-Tool-Aufrufberechtigungen erfordert, zeigt die Prompt-Komponente eine Berechtigungsanfrage:

- **Befehlsvorschau**: Zeigt den angeforderten Vorgang
- **Quellinformation**: Wer die Anfrage initiiert hat
- **Aktionsschaltflächen**: Genehmigen / Ablehnen
- Aufklappbar für die vollständigen Anfragedetails

## Verwandte Konfiguration

Für die Nutzung des ACP Skills-Panels muss zunächst ein [ACP-Backend](#doc/backends%2Facp) konfiguriert werden.
