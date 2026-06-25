# Konzept-Wissensbasis

Die Konzept-Wissensbasis (Concept KB) ist eine optionale Wissensschicht im Synthesis-System, die eine strukturierte Verwaltung der in der Literatur referenzierten Kernkonzepte bietet. Konzepte können auf dem Themen-Graphen und dem Reader überlagert werden, um den Kontext für die Themensynthese anzureichern.

## Was ist ein Konzept?

Im Synthesis-System ist ein **Konzept** ein Begriff oder eine Entität mit eigenständiger Bedeutung innerhalb eines Forschungsbereichs. Im Gegensatz zur flachen Klassifikation von Tags können Konzepte eine vielschichtige Struktur haben, einschließlich Sinnvarianten, Aliasen und Beziehungen.

### Vierschichtige Struktur von Konzepten

```
Concept                 — z. B. "Transformer"
  └── Sense             — z. B. "Transformer (Machine-Learning-Architektur)"
       ├── Alias        — z. B. "Transformer-Modell", "Transformer-Netzwerk"
       └── Relation     — broader_than "Attention-Mechanismus"
```

### Konzepttypen

| Typ | Beschreibung | Beispiele |
|-----|-------------|-----------|
| `method` | Forschungsmethoden | Deep Learning, Reinforcement Learning |
| `model` | Modelle oder Architekturen | Transformer, ResNet |
| `dataset` | Datensätze | ImageNet, COCO |
| `metric` | Bewertungskennzahlen | BLEU, F1-Score |
| `field` | Forschungsfelder | Computer Vision, Natural Language Processing |
| `task` | Aufgaben | Bildklassifizierung, maschinelle Übersetzung |
| `tool` | Werkzeuge | PyTorch, TensorFlow |

## Funktionen der Concepts-Oberfläche

### Konzeptliste

Auf der Seite Synthesis Workbench → Concepts können Sie alle indizierten Konzepte durchsuchen:

- **Filtern**: Nach Typ (method / model / dataset usw.), Status oder zugehörigen Themen
- **Suchen**: Konzepte nach Name durchsuchen
- **Ansichtsumschaltung**: Kompakte / komfortable Dichte

![Synthesis Concepts Page](/img/docs/synthesis/concepts.png)

### Konjektdetails

Nach der Auswahl eines Konzepts können Sie Folgendes ansehen und bearbeiten:

| Information | Beschreibung |
|-------------|-------------|
| **Identität** | Konzept-ID, Name, Typ |
| **Status** | active / deprecated / pending |
| **Definition** | Beschreibende Definition des Konzepts |
| **Sinnvarianten** | Spezifische Bedeutungen des Konzepts in verschiedenen Kontexten |
| **Aliase** | Alternative Bezeichnungen für dasselbe Konzept |
| **Relationen** | Assoziationen mit anderen Konzepten (broader / narrower / related) |
| **Verwandte Themen** | Themen, die auf dieses Konzept verweisen |

### Sinnvarianten-Verwaltung

Dasselbe Konzept kann über Disziplinen hinweg unterschiedliche Bedeutungen haben. Der Sinnvarianten-Mechanismus ermöglicht:

- Hinzufügen mehrerer Sinnvarianten zu einem Konzept, jeweils mit eigener Definition
- Annotieren des Verwendungskontexts oder Bereichs für jede Sinnvariante
- Zuordnen spezifischer Sinnvarianten zu Papers oder Themen

### Alias-Verwaltung

- Erfassen unterschiedlicher Benennungskonventionen für dasselbe Konzept (z. B. vollständiger Name, Abkürzung, alternative Begriffe)
- Aliase werden für Zitations-Matching und Konzeptidentifikation verwendet

### Überlagerungsfunktionen

Konzeptinformationen können auf andere Oberflächen überlagert werden:

- **Überlagerung auf Themen-Graph**: Anzeigen von Konzepten, die zu einem Thema im Themen-Graphen gehören
- **Überlagerung auf Reader**: Anzeigen von Konzeptkarten auf der Themen-Detailseite

## Review

Änderungsvorschläge an der Konzept-Wissensbasis (neue Konzepte, neue Sinnvarianten, neue Beziehungen) erscheinen im Konzepte-Review-Tab des [Review-Hubs](review). Sie können diese Vorschläge prüfen und entscheiden, ob Sie sie akzeptieren möchten.

## Beziehung zu Tags

Konzepte und Tags sind zwei komplementäre Ansätze zur Wissensorganisation:

| Dimension | Tags | Konzepte |
|-----------|------|----------|
| Struktur | Flach, facet:value | Vielschichtig (Sinnvarianten + Aliase + Beziehungen) |
| Zweck | Literaturklassifizierung und -filterung | Wissensmanagement und Assoziationsanalyse |
| Quelle | Kontrolliertes Vokabular + KI-Inferenz | Automatisch aus Literatur extrahiert + benutzerverwaltet |
| Umfang | Deckt die gesamte Literatur ab | Tiefgehende Abdeckung ausgewählter Kernbegriffe |

## Nächste Schritte

- [Review-Zentrale](review) – Konzeptvorschläge prüfen
- [Tag-Verwaltung](tags) – Das kontrollierte Tag-Vokabular verwalten
- [Themensynthese](topic-synthesis) – Konzeptwissen beim Erstellen von Themensynthesen nutzen
