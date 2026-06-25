# Literature Analysis

## Zweck

Literatur-Zusammenfassungen, Referenzlisten und Zitationsanalyseberichte aus PDF- oder Markdown-Anhängen erstellen.

**Literature Analysis ist der Grundpfeiler des agentischen Literaturmanagements** — jeder importierte Artikel sollte durch diesen Workflow verarbeitet werden. Er schafft eine strukturierte Wissensgrundlage für jeden Artikel, und alle erweiterten Funktionen wie Zitationsgraphen und Topic Synthesis hängen von den Ausgaben dieses Workflows ab.

Dieser Workflow ruft den Skill `literature-analysis` auf dem Skill-Runner-Backend auf, um eine strukturierte Analyse akademischer Artikel durchzuführen.

:::tip Best Practices
- **Zuerst Markdown extrahieren**: Vor dem Ausführen von Literature Analysis wird empfohlen, [MinerU](mineru) zu verwenden, um PDF zuerst in Markdown umzuwandeln. Das ursprüngliche Markdown verbessert das KI-Verständnis der Papierstruktur erheblich.
- **Zuerst das Tag-Vokabular initialisieren**: Es wird empfohlen, [Tag Bootstrapper](tag-bootstrapper) auszuführen, um ein kontrolliertes Tag-Vokabular vor der ersten Literature Analysis zu initialisieren. Dadurch kann die automatische Tag-Regulierung in der Analysepipeline maximale Wirksamkeit erzielen.
:::

## Anwendungsfälle

- Schnell eine Zusammenfassung der Kerninhalte beim Lesen eines neuen Artikels erhalten
- Die vollständige Referenzliste eines Artikels sammeln
- Zitationskontext und Zitationsabsicht eines Artikels analysieren

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Anhang |
| Akzeptierte Typen | `text/markdown`, `text/x-markdown`, `text/plain`, `application/pdf` |
| Pro übergeordnetem Eintrag | Höchstens 1 Anhang |

### Auslösemethoden

- Direkt einen PDF- oder Markdown-Anhang auswählen
- Den übergeordneten Eintrag auswählen, und das Plugin erweitert automatisch seinen ersten qualifizierenden Anhang

## Ausführungsablauf

```
1. Anfrage erstellen
   └── Quelldatei zu Skill-Runner hochladen
       └── skill_id: "literature-analysis" aufrufen

2. Skill-Runner-Verarbeitung
   └── Dokumentinhalt parsen
       └── Drei Ausgaben erstellen:
           ├── digest.md          (Literatur-Zusammenfassung)
           ├── references.json    (Referenzliste)
           └── citation_analysis.json (Zitationsanalyse)

3. Ergebnisse zurückgeben
   └── Bundle (zip) herunterladen
       └── Enthält result.json und artifacts/
```

### Ausführungsmodus

Vollautomatisch, keine Benutzereingriffe erforderlich. Einfach absenden und auf den Abschluss warten.

### Ausführungskonfiguration

- `execution.mode`: `auto` — Automatische Ausführung, keine Benutzereingriffe erforderlich
- `skillrunner_mode`: `auto` — Nicht-interaktiver Modus

## Geschätzte Dauer

| Szenario | Geschätzte Zeit |
|------|---------|
| Standard-Referenzformat | 6-10 Minuten |
| Nicht-Standard-Referenzformat | 12-18 Minuten |

Die Dauer hängt hauptsächlich davon ab, ob das Referenzformat standardisiert ist — je normierter das Format (z. B. Zitationen aus ScienceDirect, IEEE und anderen führenden Fachzeitschriften), desto schneller ist die KI-Parsung. Die Artikellänge hat einen relativ geringeren Einfluss.

## Ausgaben

Nach Abschluss der Ausführung werden **3 Zotero-Notizen** unter dem übergeordneten Eintrag erstellt:

### 1. Zusammenfassungs-Notiz

- Typ: `data-zs-note-kind="digest"`
- Inhalt: HTML-gerenderte Literatur-Zusammenfassung, die Forschungshintergrund, Methoden, Ergebnisse und Schlussfolgerungen abdeckt
- Aktualisierungsstrategie: Jede Ausführung aktualisiert die Notiz mit demselben Namen (überschreibt, falls bereits vorhanden)

![Literature Analysis Zusammenfassungs-Notiz](/img/docs/workflows/literature-analysis_digest.png)

:::info Über den Notizinhalt
Der in der Notiz angezeigte Inhalt wird aus Backend-Daten **gerendert**. Das direkte Ändern des Notizinhalts in Zotero ändert **nicht** die tatsächlichen Backend-Daten. Um Analyseergebnisse zu bearbeiten, verwenden Sie die Funktion [Export/Import Notes](export-import-notes) zum Exportieren, Ändern und anschließenden Reimportieren.
:::

### 2. Referenzen-Notiz

- Typ: `data-zs-note-kind="references"`
- Inhalt: Referenzen-HTML-Tabelle (#, Jahr, Titel, Autoren, Quelle, Locator)
- Aktualisierungsstrategie: Jede Ausführung aktualisiert die Notiz mit demselben Namen

![Literature Analysis Referenzen-Notiz](/img/docs/workflows/literature-analysis_references.png)

### 3. Zitationsanalyse-Notiz

- Typ: `data-zs-note-kind="citation-analysis"`
- Inhalt: Zitationsanalysebericht einschließlich Zitationskontext und Zitationsabsicht-Klassifikation
- Aktualisierungsstrategie: Jede Ausführung aktualisiert die Notiz mit demselben Namen

![Literature Analysis Zitationsanalyse-Notiz](/img/docs/workflows/literature-analysis_citation-analysis.png)

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `language` | string | Ausgabesprache | `zh-CN` |
| `auto_tag_regulator` | boolean | Ob nach der Literature Analysis automatisch [Tag Regulator](tag-regulator) kaskadiert werden soll. **Aktivierung empfohlen** | `true` |
| `auto_tag_infer_tag` | boolean | Ob bei der kaskadierten Tag-Regulierung die KI neue Tags inferieren soll (nur sichtbar, wenn `auto_tag_regulator` aktiviert ist) | `true` |

Verfügbare Werte für `language`: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Benutzerdefinierte Eingabe wird ebenfalls unterstützt.

## Modell-Empfehlung

🔴 Modelle mit **starkem Textverständnis** werden empfohlen. Wenn das Backend Subagent-Delegation unterstützt (z. B. Claude Code, Codex), können Zusammenfassung, Referenzen und Zitationsanalyse parallel verarbeitet werden, was die Gesamtzeit erheblich verkürzt.

## Abhängigkeiten

- **Backend**: Skill-Runner-Dienst
- **Backend-Konfiguration**: Konfigurieren Sie einen Skill-Runner-Backend-Typ im Backend Manager
- **Skill**: Der Skill `literature-analysis` muss auf dem Skill-Runner bereitgestellt sein

## Verwandte Workflows

- [Tag Bootstrapper](tag-bootstrapper) — Ein kontrolliertes Tag-Vokabular vor der ersten Analyse initialisieren
- [MinerU](mineru) — PDF zuerst in Markdown umwandeln für beste Analysequalität
- [Interactive Literature Explainer](literature-explainer) — Dialog mit KI für tiefes Literaturverständnis
- [Export/Import Notes](export-import-notes) — Analyse-Artefakte exportieren oder zwischen Zotero-Instanzen migrieren
- [Tag Regulator](tag-regulator) — Tag-Regulierung unabhängig ausführen (Literature Analysis kann automatisch kaskadieren)
