# Manuscript Literature Framing

## Zweck

Beim Schreiben der Introduction- und Related-Work-Abschnitte eines akademischen Artikels unterstützen. Durch interaktiven Dialog die Positionierung des Artikels klären, relevante Literatur sammeln, Schreibrahmen analysieren und LaTeX-Entwürfe erstellen.

## Anwendungsfälle

- Beim Verfassen eines Artikels den Literaturrahmen organisieren müssen
- Die Positionierung und Innovationen des Artikels bestimmen
- LaTeX-Entwürfe für die Abschnitte Introduction und Related Work erstellen

## Eingabebedingungen

| Bedingungstyp | Beschreibung |
|---------|------|
| Eingabeeinheit | Workflow (es müssen keine Einträge ausgewählt werden) |
| Auslösemethode | Direkt über das Dashboard ausführen |

## Ausführungsablauf

Dieser Workflow läuft interaktiv und durchläuft die folgenden Phasen:

```
1. Artikelinformationsbestätigung
   └── Artikeltitel und Forschungsbereich bestätigen
       └── Zielzeitschrift/-venue und Schreibstil klären

2. Materialsammlung
   └── Relevante Literatur aus der Zotero-Bibliothek abrufen
       └── Literaturmetadaten und Zitationsinformationen beziehen

3. Multiperspektivische Rahmenanalyse
   └── Die Positionierung des Artikels im Fachgebiet analysieren
       └── Verfügbare Schreibwinkel und Erzählfäden identifizieren

4. Schreibplan
   └── Introduction-Strukturplan erstellen
       └── Related-Work-Organisationsplan erstellen

5. Entwurfserstellung
   └── Introduction-LaTeX-Entwurf ausgeben
       └── Related-Work-LaTeX-Entwurf ausgeben
       └── Zitationszuordnung und Evidenzinventar einbeziehen
```

### Interaktionsdetails

- Jede Phase erfordert Benutzerbestätigung, bevor fortgefahren wird
- Der Benutzer kann während des Gesprächs die Richtung anpassen
- Der Fortschritt kann im Dashboard verfolgt werden

## Geschätzte Dauer

Abhängig von der Anzahl der Gesprächsrunden und der Größe der Literaturbibliothek. Die KI-Analysephase dauert etwa 5-10 Minuten, zuzüglich der Benutzerbestätigungszeit für jede Phase.

## Ausgaben

Nach Abschluss der Ausführung können Artefakte über den Apply-Result-Hook in Zotero geschrieben (als Notizen) oder heruntergeladen werden:

| Artefakt | Format | Beschreibung |
|------|------|------|
| `introduction.tex` | LaTeX | Introduction-Entwurf |
| `related-work.tex` | LaTeX | Related-Work-Entwurf |
| `framing-analysis.json` | JSON | Multiperspektivische Rahmenanalyse |
| `writing-plan.json` | JSON | Schreibplan |
| `evidence-inventory.json` | JSON | Evidenz-/Zitationsinventar |
| `citation-map.json` | JSON | Zitationszuordnungsbeziehungen |
| `intent-brief.json` | JSON | Artikelpositions-Zusammenfassung |

:::tip Zugriff auf Artefakte
Erstellte LaTeX-Entwürfe und andere Artefakte finden Sie im **Artefaktbereich des Dashboards**. Sie können die Artefakte direkt in Ihr LaTeX-Manuskript einfügen oder sie zur weiteren Verarbeitung exportieren.
:::

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `paperTitle` | string | Artikeltitel | — |
| `language` | string | Ausgabesprache | `auto` |
| `targetVenue` | string | Zielzeitschrift/Venue (optional) | Leer |
| `articleType` | string | Artikeltyp | `original research` |
| `stylePreference` | string | Schreibstilpräferenz (optional) | Leer |

### Schreibstilbeispiele

- `concise`: Knapper Stil
- `IEEE-like`: IEEE-Stil
- `Nature-like`: Nature-Stil
- `Chinese draft`: Chinesischer Entwurf

## Abhängigkeiten

- **Backend**: ACP-Backend
- **Zotero-Bibliothek**: Verwandte Artikaleinträge müssen in der Bibliothek vorhanden sein

:::tip Empfohlener Workflow
Für beste Ergebnisse wird empfohlen, vor dem Ausführen dieses Workflows die folgenden Vorbereitungen abzuschließen:
1. Eine ausreichende Anzahl verwandter Artikel sammeln und importieren
2. [Literature Analysis](literature-analysis) + [Tag Regulator](tag-regulator) auf allen Artikeln ausführen
3. Advance Matching im Synthesis Workbench ausführen und Genehmigungselemente bearbeiten
4. Mehrere verwandte [Topic Syntheses](topic-synthesis) erstellen
:::

## Modell-Empfehlung

🟡 Modelle mit **langem Kontext** werden empfohlen. Das Schreiben von Introduction und Related Work erfordert die Integration von Zusammenfassungen, Zitationsanalysen und Topic-Synthesis-Ergebnissen aus einer großen Anzahl von Artikeln, was hohe Anforderungen an das Kontextfenster stellt.

## Verwandte Workflows

- [Literature Analysis](literature-analysis) — Eine strukturierte Wissensgrundlage für Artikel schaffen
- [Topic Synthesis](topic-synthesis) — Zuerst Topic Syntheses erstellen, dann den Artikel basierend auf den Analyseergebnissen schreiben
