# Themensynthese erstellen

## Was ist Themensynthese?

Themensynthese ist der Prozess der systematischen Analyse und Synthese einer Gruppe verwandter Literatur. Sie extrahiert automatisch Schlüsselinformationen, identifiziert Themenstrukturen und generiert umfassende Analyseberichte durch KI-Workflows.

## Topics-Oberfläche

Auf der Seite Synthesis Workbench → Topics können Sie alle erstellten Themen durchsuchen und verwalten. Die Topics-Oberfläche unterstützt **drei Ansichtsmodi**:

| Ansicht | Beschreibung | Anwendungsfall |
|---------|-------------|----------------|
| **Graph-Ansicht** | Force-Directed-Graph mit Themen als Knoten und Beziehungen als Kanten | Themenassoziationen intuitiv verstehen |
| **Raster-Ansicht** | Karten mit Titel, Paper-Anzahl, Zusammenfassung und Aktions-Schaltflächen | Themen durchsuchen und finden |
| **Listen-Ansicht** | Tabellenansicht mit Spalten: Name, Paper-Anzahl, Erstellungszeit, Aktualisierungsdatum, Status | Sortierung und Batch-Operationen |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/topic-graph.webp" alt="Synthesis Topics Graph View" title="Synthesis Topics Graph View" loading="lazy" /><figcaption>Synthesis Topics Graph View</figcaption></figure>

### Themenverwaltungsoperationen

- **Suchen**: Nach Themenname und -beschreibung suchen
- **Sortieren**: Nach Titel, Paper-Anzahl oder Aktualisierungsdatum sortieren
- **Neues Thema erstellen**: Klicken Sie auf die Erstellen-Schaltfläche, um die Workflow-Pipeline zu starten
- **Thema aktualisieren**: Die Pipeline erneut ausführen, um die Themenanalyse zu aktualisieren
- **Thema löschen**: Nicht mehr benötigte Themen entfernen

## Erstellungsprozess

Die Themenerstellung wird durch Workflows gesteuert und ist eine mehrstufige automatisierte Pipeline:

```
1. create-topic-prepare
   → Literaturdaten sammeln, Paper-Set aufbauen
   
2. topic-synthesis-core-enrichment
   → Kernanreicherung: Informationen extrahieren, Wissen assoziieren
   
3. topic-synthesis-finalize
   → Finale Analyseartefakte und -berichte generieren

(update-topic-synthesis-prepare wird verwendet, um bestehende Themen zu aktualisieren)
```

### Voraussetzungen

- [Skill-Runner-Backend](#doc/backends%2Fskill-runner) konfiguriert
- Relevante Papers in der Bibliothek
- Papers haben generierte Zusammenfassungen und Zitationsanalysen (optional, empfohlen)

Diese Pipeline wird durch den [Topic Synthesis Creation](#doc/workflows%2Ftopic-synthesis)-Workflow orchestriert.

## Themen-Inspektor

Nach dem Erstellen eines Themas klicken Sie darauf, um in den Themen-Inspektor zu gelangen. Dies ist ein mehrseitiger Reader, der 8 Unterseiten enthält, die jeweils eine andere Dimension des Themas präsentieren.

### Überblick

- Themenname, Beschreibung, Wichtigkeits-Score
- Kernclaims-Zusammenfassung
- Statistiken (Paper-Anzahl, Kategoriensatz, Claim-Anzahl usw.)
- Zugehörige Themen-Graph-Standortinformationen

### Taxonomie

Zeigt die hierarchische Klassifikationsstruktur des Themas:

- Breitere Themen: Weitere Themenbereiche
- Engere Themen: Spezifischere Unterthemen
- Verwandte Themen: Andere assoziierte Themen
- Position und Hierarchie im Themen-Graphen

### Claims

Kernclaims und -behauptungen, die aus der Literatur extrahiert wurden:

- Jeder Claim enthält originale Beweis-Zitationen
- Markiert die Papers, aus denen Claims stammen
- Claim-Typ (Erkenntnisse / Hypothesen / Schlussfolgerungen usw.)
- Anzahl der Papers, die den Claim unterstützen

### Vergleich

Vergleich von Standpunkten über verschiedene Papers zum selben Thema:

- Vergleichsdimensionen (Methoden, Schlussfolgerungen, Datensätze usw.)
- Der Standpunkt und die Argumente jedes Papers
- Visualisierung von Konsens und Divergenz

### Zukunftsperspektiven

Forschungslücken und zukünftige Richtungen, die durch Literaturanalyse identifiziert wurden:

- Offene Fragen
- Potenzielle Forschungsrichtungen
- Verwandte Herausforderungen und Empfehlungen

### Abdeckung

Analysiert den Grad, in dem das Thema relevante Literatur abdeckt:

- Liste der vom Thema abgedeckten Papers
- Paper-Vollständigkeit (ob Zusammenfassungen/Zitationsanalyse-Artefakte vorhanden sind)
- Abgedeckte und nicht abgedeckte Aspekte

### Referenzen

Alle mit dem Thema verbundenen Referenzen, einschließlich Bindungsdetails:

- Zotero-Objektlink für jede Zitation
- Zitationsrolle im Thema (Unterstützung / Kontrast / Hintergrund)
- Zitationsquelle und -kontext

### Bericht (Vollständiger Bericht)

Der generierte strukturierte Synthese-Analysebericht (im Markdown-Format):

- Vollständiger Themenanalysetext
- Kann als Markdown oder eigenständiges HTML exportiert werden
- Geeignet als Referenzmaterial für akademisches Schreiben

## Themen-Graph

Der Themen-Graph ist ein hierarchisches Themen-Netzwerk, das Beziehungen zwischen Themen zeigt:

### Knotentypen

| Typ | Beschreibung |
|-----|-------------|
| **materialized** | Strukturierte Themen, die tatsächlich erstellt wurden |
| **placeholder** | Themen-Platzhalter, deren Existenz abgeleitet wurde, die aber noch nicht erstellt wurden |

### Kantenstatus

| Status | Beschreibung |
|--------|-------------|
| `suggested` | Vom System vorgeschlagene Beziehungen (ausstehende Prüfung) |
| `confirmed` | Vom Benutzer bestätigte Beziehungen |
| `rejected` | Vom Benutzer abgelehnte Beziehungen |
| `stale` | Veraltete Daten, ausstehende Neubewertung |
| `deleted` | Gelöschte Beziehungen |

### Beziehungstypen

| Beziehung | Beschreibung |
|-----------|-------------|
| `broader_than` | A ist ein breiteres Thema als B |
| `related_to` | Zwei Themen sind verwandt |
| `overlaps_with` | Zwei Themen überlappen sich |
| `contrasts_with` | Zwei Themen stehen im Kontrast zueinander |

### Themen verwalten

- **Neues Thema erstellen**: Klicken Sie auf "Erstellen" auf der Topics-Seite
- **Thema bearbeiten**: Name, Beschreibung, Wichtigkeit usw. ändern
- **Papers zuordnen**: Papers zu einem Thema hinzufügen oder entfernen
- **Themen-Graph durchsuchen**: Das Beziehungsnetzwerk zwischen Themen anzeigen

## Zugehörige Workflows

- [Topic Synthesis Creation](#doc/workflows%2Ftopic-synthesis) – Workflow-Details zum Erstellen von Themen
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) – Papers basierend auf Themenanalyse schreiben
