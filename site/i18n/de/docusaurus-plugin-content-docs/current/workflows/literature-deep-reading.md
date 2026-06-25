# Deep Reading

## Zweck

Tiefgehende Lektüre eines Artikels durchführen und eine strukturierte, multiperspektivische Leseverständnisanalyse-Ansicht erstellen. Extrahiert automatisch Kapitelstruktur, Kernkonzepte und Referenzen, unterstützt absatzweise Übersetzung und gibt ein eigenständiges HTML-Lesedokument aus.

## Anwendungsfälle

- Systematische tiefgehende Lektüre eines wichtigen Artikels
- Umfassende Analyse erhalten, einschließlich Kapitelanmerkungen, Schlüsselkonzepte und weiterführende Literatur
- Zweisprachiges paralleles Lesen benötigen (Originaltext + Zielsprachen-Übersetzung)

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

Der Deep-Reading-Workflow ist eine **vollautomatische** mehrstufige Verarbeitungspipeline, die keine Benutzereingriffe erfordert:

## Geschätzte Dauer

| Dateigröße | Geschätzte Zeit |
|---------|---------|
| Kurzer Artikel (≤10 Seiten) | 8-12 Minuten |
| Standard (10-30 Seiten) | 12-18 Minuten |
| Langer Artikel (30+ Seiten) | 18-25 Minuten |

Dieser Workflow umfasst eine mehrstufige Verarbeitung (Leitfaden → Anreicherung → Übersetzung → Organisation → Rendering) und ist damit der am längsten laufende Einzelartikel-Analyse-Workflow.

## Modell-Empfehlung

🟡 Modelle mit **starkem Textverständnis** werden empfohlen. Dieser Workflow erfordert eine mehrschichtige Tiefenanalyse des Artikels (Struktur, Konzepte, Argumentationslogik), was hohe Anforderungen an das semantische Verständnis des Modells stellt. Wenn Subagent-Delegationsfähigkeit verfügbar ist, können Phasen parallel ausgeführt werden, was die Gesamtzeit erheblich verkürzt.

## Ausgaben

```
1. Vorbereitungsphase
   └── Quelldatei hochladen, source_bundle.zip erstellen
       └── Enthält Originaltext, Bilder und bestehende Referenzen

2. Leitfaden- und Kontextsammlung
   └── Originaltextstruktur und Metadaten analysieren
       └── Verwandten Kontext über Host Bridge sammeln

3. Leseanreicherung
   └── Kapitelanmerkungen, Schlüsselkonzepte, Referenzanalyse erstellen
       └── Zusammenfassungs- und weiterführende Leseansichten

4. Blockweise Übersetzung
   └── Normalisierte Übersetzung nach stabilen Blöcken
       └── Zweisprachige parallele Übersetzungsansicht erstellen

5. Abschließendes Rendering
   └── Alle Analyseansichten integrieren
       └── Als eigenständige HTML-Datei rendern
```

## Ausgabe-Artefakte

Nach Abschluss der Ausführung wird ein verknüpfter Anhang, der auf die erstellte HTML-Datei verweist, unter dem übergeordneten Eintrag erstellt:

- **Format**: Eigenständige HTML-Datei (kann im Browser geöffnet werden)
- **Inhalt**: Vollständige Deep-Reading-Ansicht einschließlich Originaltextstruktur, Kapitelanmerkungen, Konzeptanalyse, Referenzen, zweisprachige Übersetzungen usw.
- **Lebenszyklus**: Jede Ausführung überschreibt und aktualisiert

![Deep Reading Eröffnungsleitfaden](/img/docs/workflows/literature-deep-reading_1.png)

![Deep Reading Zweisprachiges dynamisches Lesen](/img/docs/workflows/literature-deep-reading_2.png)

![Deep Reading Referenz-Abstractlesen](/img/docs/workflows/literature-deep-reading_3.png)

![Deep Reading Referenz-2-Hop-Subgraph](/img/docs/workflows/literature-deep-reading_4.png)

## Parameter

| Parameter | Typ | Beschreibung | Standard |
|------|------|------|--------|
| `target_language` | string | Zielsprache | `zh-CN` |

Verfügbare Werte: `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `ru-RU`. Benutzerdefinierte Eingabe wird ebenfalls unterstützt.

## Abhängigkeiten

- **Backend**: ACP-Backend (erfordert ACP-Protokollunterstützung)
- **Backend-Konfiguration**: Konfigurieren Sie einen ACP-Backend-Typ im Backend Manager

## Verwandte Workflows

- [Literature Analysis](literature-analysis) — Automatisch Literatur-Zusammenfassungen und Zitationsanalysen erstellen
- [Interactive Literature Explainer](literature-explainer) — Dialog mit KI für tiefes Literaturverständnis
